import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { emitToProject } from "../../config/socket";

const startTimerSchema = z.object({
  taskId: z.string(),
  description: z.string().max(500).optional(),
});

const listByTaskSchema = z.object({
  taskId: z.string(),
});

const statsQuerySchema = z.object({
  projectId: z.string(),
  sprintId: z.string().optional(),
});

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export async function startTimer(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const { taskId, description } = startTimerSchema.parse(request.body);

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true, assigneeId: true } });
  if (!task) throw new AppError("Task not found", 404);
  if (task.assigneeId !== userId) throw new AppError("Only the assignee can track time on this task", 403);

  // Стопаем любой предыдущий активный таймер
  const activeEntry = await prisma.timeEntry.findFirst({
    where: { userId, stoppedAt: null },
  });
  if (activeEntry) {
    const now = new Date();
    const duration = Math.floor((now.getTime() - activeEntry.startedAt.getTime()) / 1000);
    await prisma.timeEntry.update({
      where: { id: activeEntry.id },
      data: { stoppedAt: now, duration },
    });
    emitToProject(task.projectId, "time:stopped", { entryId: activeEntry.id, taskId: activeEntry.taskId, userId });
  }

  const entry = await prisma.timeEntry.create({
    data: { taskId, userId, description },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  emitToProject(task.projectId, "time:started", entry);

  return reply.code(201).send(entry);
}

export async function stopTimer(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const { id } = request.params as { id: string };

  const entry = await prisma.timeEntry.findUnique({ where: { id }, include: { task: { select: { projectId: true } } } });
  if (!entry) throw new AppError("Time entry not found", 404);
  if (entry.userId !== userId) throw new AppError("Not your timer", 403);
  if (entry.stoppedAt) throw new AppError("Timer already stopped", 400);

  const now = new Date();
  const duration = Math.floor((now.getTime() - entry.startedAt.getTime()) / 1000);

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: { stoppedAt: now, duration },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  emitToProject(entry.task.projectId, "time:stopped", { entryId: id, taskId: entry.taskId, userId });

  return reply.send(updated);
}

export async function getActiveTimer(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;

  const entry = await prisma.timeEntry.findFirst({
    where: { userId, stoppedAt: null },
    include: {
      task: { select: { id: true, title: true, projectId: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return reply.send(entry || null);
}

export async function listByTask(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const { taskId } = request.params as { taskId: string };

  const entries = await prisma.timeEntry.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { startedAt: "desc" },
  });

  return reply.send(entries);
}

export async function listByProject(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const { projectId } = request.params as { projectId: string };

  const entries = await prisma.timeEntry.findMany({
    where: { task: { projectId } },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      task: { select: { id: true, title: true, status: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  return reply.send(entries);
}

export async function deleteEntry(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const { id } = request.params as { id: string };

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) throw new AppError("Time entry not found", 404);
  if (entry.userId !== userId) throw new AppError("Not your entry", 403);

  await prisma.timeEntry.delete({ where: { id } });

  return reply.code(204).send();
}

export async function getTimeStats(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const { sprintId } = request.query as { sprintId?: string };

  const taskWhere: any = { projectId };
  if (sprintId) taskWhere.sprintId = sprintId;

  const timeWhere: any = { task: taskWhere };

  const [totalResult, byUser, byTask, byDay] = await Promise.all([
    prisma.timeEntry.aggregate({
      where: timeWhere,
      _sum: { duration: true },
      _count: true,
    }),
    prisma.timeEntry.groupBy({
      by: ["userId"],
      where: timeWhere,
      _sum: { duration: true },
      _count: true,
      orderBy: { _sum: { duration: "desc" } },
    }),
    prisma.timeEntry.groupBy({
      by: ["taskId"],
      where: timeWhere,
      _sum: { duration: true },
      _count: true,
      orderBy: { _sum: { duration: "desc" } },
      take: 10,
    }),
    prisma.$queryRaw`
      SELECT DATE("startedAt") as date, SUM("duration") as "totalSeconds"
      FROM "TimeEntry"
      WHERE "taskId" IN (SELECT id FROM "Task" WHERE "projectId" = ${projectId})
        AND "duration" IS NOT NULL
      GROUP BY DATE("startedAt")
      ORDER BY date DESC
      LIMIT 30
    `,
  ]);

  // Подтягиваем имена юзеров
  const userIds = byUser.map((u) => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, avatar: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  // Подтягиваем названия задач
  const taskIds = byTask.map((t) => t.taskId);
  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds } },
    select: { id: true, title: true, status: true },
  });
  const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]));

  return reply.send({
    totalSeconds: Number(totalResult._sum.duration || 0),
    totalEntries: totalResult._count,
    byUser: byUser.map((u) => ({
      user: userMap[u.userId] || { id: u.userId, name: "Unknown" },
      totalSeconds: Number(u._sum.duration || 0),
      entries: u._count,
    })),
    byTask: byTask.map((t) => ({
      task: taskMap[t.taskId] || { id: t.taskId, title: "Unknown" },
      totalSeconds: Number(t._sum.duration || 0),
      entries: t._count,
    })),
    byDay: (byDay as any[]).map((d: any) => ({
      date: d.date?.toISOString?.() || d.date,
      totalSeconds: Number(d.totalSeconds || 0),
    })),
  });
}
