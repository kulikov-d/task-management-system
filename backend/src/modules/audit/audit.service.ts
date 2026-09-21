import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database";

export async function listAuditLogs(request: FastifyRequest, reply: FastifyReply) {
  const { entity, entityId, userId, projectId, page = "1", limit = "50" } = request.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (projectId) {
    const taskIds = (
      await prisma.task.findMany({
        where: { projectId },
        select: { id: true },
      })
    ).map((t) => t.id);
    where.OR = [
      { entity: "Task", entityId: { in: taskIds } },
      { entity: "Project", entityId: projectId },
      { entity: "Sprint", entityId: projectId },
      { entity: "Tag", entityId: projectId },
      { entityId: projectId },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.auditLog.count({ where }),
  ]);

  return reply.send({ logs, total, page: Number(page), limit: Number(limit) });
}
