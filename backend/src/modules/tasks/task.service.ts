import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { emitToProject, emitToTask } from "../../config/socket";
import { auditLog } from "../../common/middleware/audit.middleware";
import { createAndEmitNotification } from "../notifications/notification.helper";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  projectId: z.string(),
  assigneeId: z.string().optional(),
  sprintId: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  tagIds: z.array(z.string()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  assigneeId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional().transform((v) => (v === null ? null : v ? new Date(v) : undefined)),
  tagIds: z.array(z.string()).optional(),
});

const moveTaskSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
  position: z.number().min(0),
});

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  author: { select: { id: true, name: true, email: true } },
  tags: { include: { tag: { select: { id: true, name: true, color: true, projectId: true } } } },
  _count: { select: { comments: true, attachments: true } },
};

export async function listTasks(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, status, priority, assigneeId, tagId, search, sprintId } = request.query as any;

  if (!projectId) {
    return reply.code(400).send({ message: "projectId is required" });
  }

  const where: any = { projectId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (tagId) where.tags = { some: { tagId } };
  if (search) where.title = { contains: search, mode: "insensitive" };
  if (sprintId) where.sprintId = sprintId;
  else if (sprintId === "") where.sprintId = null;

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
  });

  return reply.send(tasks);
}

export async function getTask(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      ...taskInclude,
      comments: {
        include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
      },
      attachments: {
        include: { uploadedBy: { select: { id: true, name: true } } },
      },
    },
  });
  if (!task) throw new AppError("Task not found", 404);
  return reply.send(task);
}

export async function createTask(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const data = createTaskSchema.parse(request.body);

  const maxPosition = await prisma.task.aggregate({
    where: { projectId: data.projectId, status: "TODO" },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      authorId: userId,
      assigneeId: data.assigneeId,
      sprintId: data.sprintId,
      priority: data.priority || "MEDIUM",
      dueDate: data.dueDate,
      position: (maxPosition._max.position ?? -1) + 1,
      tags: data.tagIds
        ? { create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: taskInclude,
  });

  await prisma.event.create({
    data: {
      type: "CREATED",
      payload: { title: task.title },
      taskId: task.id,
      userId,
    },
  });

  await auditLog("create", "Task", task.id, { title: task.title });

  emitToProject(task.projectId, "task:created", task);

  return reply.code(201).send(task);
}

export async function updateTask(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = updateTaskSchema.parse(request.body);

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new AppError("Task not found", 404);

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...data,
      tags: data.tagIds
        ? { deleteMany: {}, create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: taskInclude,
  });

  await prisma.event.create({
    data: {
      type: "UPDATED",
      payload: { title: task.title, changes: data },
      taskId: task.id,
      userId: request.userId!,
    },
  });

  await auditLog("update", "Task", task.id, data as Record<string, unknown>);

  emitToProject(task.projectId, "task:updated", task);

  return reply.send(task);
}

export async function deleteTask(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new AppError("Task not found", 404);

  if (task.authorId !== userId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId } },
    });
    if (!member || !["admin", "lead"].includes(member.role)) {
      throw new AppError("Insufficient permissions", 403);
    }
  }

  await prisma.task.delete({ where: { id } });
  await auditLog("delete", "Task", id);
  emitToProject(task.projectId, "task:deleted", { taskId: id });
  return reply.code(204).send();
}

export async function assignTask(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { assigneeId } = request.body as { assigneeId: string };

  const task = await prisma.task.update({
    where: { id },
    data: { assigneeId },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  await prisma.event.create({
    data: {
      type: "ASSIGNED",
      payload: { assigneeId, assigneeName: task.assignee?.name },
      taskId: task.id,
      userId: request.userId!,
    },
  });

  await auditLog("assign", "Task", task.id, { assigneeId });

  emitToProject(task.projectId, "task:assigned", { task, assignee: task.assignee });

  if (assigneeId) {
    await createAndEmitNotification({
      type: "assignment",
      title: "New task assigned",
      message: `You have been assigned to "${task.title}"`,
      userId: assigneeId,
      taskId: task.id,
    });
  }

  return reply.send(task);
}

export async function changeStatus(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { status } = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]) }).parse(request.body);

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new AppError("Task not found", 404);

  const task = await prisma.task.update({
    where: { id },
    data: { status },
    include: taskInclude,
  });

  await prisma.event.create({
    data: {
      type: "STATUS_CHANGED",
      payload: { oldStatus: existing.status, newStatus: status },
      taskId: task.id,
      userId: request.userId!,
    },
  });

  await auditLog("status_change", "Task", task.id, { oldStatus: existing.status, newStatus: status });

  emitToProject(task.projectId, "task:statusChanged", {
    task,
    oldStatus: existing.status,
    newStatus: status,
  });

  if (existing.assigneeId && existing.assigneeId !== request.userId) {
    await createAndEmitNotification({
      type: "STATUS_CHANGED",
      title: "Статус задачи изменён",
      message: `${task.title}: ${existing.status} → ${status}`,
      userId: existing.assigneeId,
      taskId: task.id,
    });
  }

  return reply.send(task);
}

export async function moveTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { status, position } = moveTaskSchema.parse(request.body);

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new AppError("Task not found", 404);

  const task = await prisma.task.update({
    where: { id },
    data: { status, position },
    include: taskInclude,
  });

  await prisma.event.create({
    data: {
      type: "MOVED",
      payload: { fromStatus: existing.status, toStatus: status, position },
      taskId: task.id,
      userId: request.userId!,
    },
  });

  await auditLog("move", "Task", task.id, { fromStatus: existing.status, toStatus: status, position });

  emitToProject(task.projectId, "task:moved", {
    task,
    fromColumn: existing.status,
    toColumn: status,
  });

  return reply.send(task);
}

export { moveTaskHandler as moveTask };

export async function addTagToTask(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { tagId } = request.body as { tagId: string };

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new AppError("Task not found", 404);

  await prisma.taskTag.create({
    data: { taskId: id, tagId },
  });

  const updatedTask = await prisma.task.findUnique({
    where: { id },
    include: taskInclude,
  });

  emitToProject(task.projectId, "task:updated", updatedTask);
  return reply.send(updatedTask);
}

export async function removeTagFromTask(request: FastifyRequest, reply: FastifyReply) {
  const { id, tagId } = request.params as { id: string; tagId: string };

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new AppError("Task not found", 404);

  await prisma.taskTag.deleteMany({
    where: { taskId: id, tagId },
  });

  const updatedTask = await prisma.task.findUnique({
    where: { id },
    include: taskInclude,
  });

  emitToProject(task.projectId, "task:updated", updatedTask);
  return reply.send(updatedTask);
}
