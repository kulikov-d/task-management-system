import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { entity, entityId, userId, page = "1", limit = "50" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (entity) where.entity = entity as string;
    if (entityId) where.entityId = entityId as string;
    if (userId) where.userId = userId as string;

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

    res.json({ logs, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    next(error);
  }
}
