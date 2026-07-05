import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database";

export async function listNotifications(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return reply.send(notifications);
}

export async function markAsRead(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;
  const notification = await prisma.notification.findUnique({ where: { id }, select: { userId: true } });
  if (!notification || notification.userId !== userId) {
    return reply.code(404).send({ message: "Notification not found" });
  }
  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  return reply.send({ success: true });
}

export async function markAllAsRead(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return reply.send({ success: true });
}

export async function getUnreadCount(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const count = await prisma.notification.count({
    where: { userId, read: false },
  });
  return reply.send({ count });
}
