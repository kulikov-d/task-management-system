import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { emitToProject } from "../../config/socket";

const createSprintSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  projectId: z.string(),
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z.string().transform((v) => new Date(v)),
});

const updateSprintSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  startDate: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  endDate: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  isActive: z.boolean().optional(),
});

export async function listSprints(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.query as { projectId?: string };
  if (!projectId) {
    return reply.code(400).send({ message: "projectId is required" });
  }

  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    include: {
      _count: { select: { tasks: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return reply.send(sprints);
}

export async function getSprint(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const sprint = await prisma.sprint.findUnique({
    where: { id },
    include: {
      _count: { select: { tasks: true } },
      tasks: {
        select: { id: true, title: true, status: true, priority: true, assigneeId: true },
      },
    },
  });
  if (!sprint) throw new AppError("Sprint not found", 404);
  return reply.send(sprint);
}

export async function createSprint(request: FastifyRequest, reply: FastifyReply) {
  const data = createSprintSchema.parse(request.body);

  if (data.endDate <= data.startDate) {
    throw new AppError("endDate must be after startDate", 400);
  }

  const sprint = await prisma.sprint.create({
    data,
    include: {
      _count: { select: { tasks: true } },
    },
  });

  emitToProject(data.projectId, "sprint:created", sprint);
  return reply.code(201).send(sprint);
}

export async function updateSprint(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const data = updateSprintSchema.parse(request.body);

  const existing = await prisma.sprint.findUnique({ where: { id } });
  if (!existing) throw new AppError("Sprint not found", 404);

  if (data.isActive === true) {
    await prisma.sprint.updateMany({
      where: { projectId: existing.projectId, isActive: true, id: { not: id } },
      data: { isActive: false },
    });
  }

  const sprint = await prisma.sprint.update({
    where: { id },
    data,
    include: {
      _count: { select: { tasks: true } },
    },
  });

  emitToProject(existing.projectId, "sprint:updated", sprint);
  return reply.send(sprint);
}

export async function deleteSprint(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const sprint = await prisma.sprint.findUnique({ where: { id } });
  if (!sprint) throw new AppError("Sprint not found", 404);

  await prisma.task.updateMany({
    where: { sprintId: id },
    data: { sprintId: null },
  });

  await prisma.sprint.delete({ where: { id } });
  emitToProject(sprint.projectId, "sprint:deleted", { sprintId: id });
  return reply.code(204).send();
}
