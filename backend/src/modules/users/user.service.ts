import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";

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
