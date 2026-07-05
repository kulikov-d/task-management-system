import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database";

export async function listAuditLogs(request: FastifyRequest, reply: FastifyReply) {
  const { entity, entityId, userId, page = "1", limit = "50" } = request.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;

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
