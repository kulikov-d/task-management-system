import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { auditLog } from "../../common/middleware/audit.middleware";

const VALID_ROLES = ["admin", "lead", "developer"];

export async function listUsers(_request: FastifyRequest, reply: FastifyReply) {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      createdAt: true,
      _count: {
        select: { assignedTasks: true, authoredTasks: true },
      },
    },
    orderBy: { name: "asc" },
  });
  return reply.send(users);
}

export async function getUser(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      createdAt: true,
      _count: {
        select: { assignedTasks: true, authoredTasks: true, ownedProjects: true },
      },
    },
  });
  if (!user) {
    return reply.code(404).send({ message: "User not found" });
  }
  return reply.send(user);
}

export async function searchUsers(request: FastifyRequest, reply: FastifyReply) {
  const { q } = request.query as { q?: string };
  if (!q || q.trim().length < 1) {
    return reply.send([]);
  }
  const query = q.trim();
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
    },
    take: 10,
    orderBy: { name: "asc" },
  });
  return reply.send(users);
}

export async function softDeleteUser(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;
  const userRole = request.userRole!;

  if (id !== userId && userRole !== "admin") {
    throw new AppError("Only admins can delete other users' profiles", 403);
  }

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });
  if (!user) throw new AppError("User not found", 404);

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
    prisma.task.updateMany({
      where: { assigneeId: id },
      data: { assigneeId: null },
    }),
    prisma.teamMember.deleteMany({
      where: { userId: id },
    }),
    prisma.projectExclusion.deleteMany({
      where: { userId: id },
    }),
  ]);

  return reply.code(204).send();
}

export async function updateUserRole(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { role } = request.body as { role?: string };
  const actorId = request.userId!;

  if (!role || !VALID_ROLES.includes(role)) {
    throw new AppError("Некорректная роль", 400);
  }
  if (id === actorId) {
    throw new AppError("Нельзя изменить собственную роль", 400);
  }

  const target = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, role: true },
  });
  if (!target) throw new AppError("Пользователь не найден", 404);

  // Нельзя понизить последнего администратора
  if (target.role === "admin" && role !== "admin") {
    const adminCount = await prisma.user.count({
      where: { role: "admin", deletedAt: null },
    });
    if (adminCount <= 1) {
      throw new AppError("В системе должен остаться хотя бы один администратор", 400);
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: role as any },
    select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
  });

  await auditLog(
    "update",
    "User",
    id,
    { role: { from: target.role, to: role } },
    actorId
  );

  return reply.send(updated);
}
