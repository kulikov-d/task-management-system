import { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { auditLog } from "../../common/middleware/audit.middleware";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней
const VALID_ROLES = ["admin", "lead", "developer"];

export async function listInvitations() {
  return prisma.invitation.findMany({
    orderBy: { createdAt: "desc" },
    include: { invitedBy: { select: { id: true, name: true, email: true } } },
  });
}

export async function getInvitationByToken(request: FastifyRequest, reply: FastifyReply) {
  const { token } = request.params as { token: string };
  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) throw new AppError("Приглашение не найдено или недействительно", 404);

  const expired = invitation.expiresAt < new Date();
  return reply.send({
    id: invitation.id,
    email: invitation.email,
    name: invitation.name,
    expiresAt: invitation.expiresAt,
    used: !!invitation.usedAt,
    expired,
  });
}

export async function createInvitation(request: FastifyRequest, reply: FastifyReply) {
  const { email, name, role } = request.body as { email?: string; name?: string; role?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("Укажите корректный email", 400);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError("Пользователь с таким email уже зарегистрирован", 409);
  }

  const existingInvitation = await prisma.invitation.findFirst({ where: { email } });
  if (existingInvitation && !existingInvitation.usedAt) {
    throw new AppError("Приглашение на этот email уже отправлено", 409);
  }
  if (existingInvitation) {
    await prisma.invitation.delete({ where: { id: existingInvitation.id } });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const roleValue = VALID_ROLES.includes(role || "") ? role! : "developer";

  const invitation = await prisma.invitation.create({
    data: {
      email,
      name,
      token,
      role: roleValue as any,
      invitedById: request.userId!,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  await auditLog("invite", "Invitation", invitation.id, { email, role: roleValue }, request.userId!);

  return reply.code(201).send(invitation);
}

export async function deleteInvitation(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) throw new AppError("Приглашение не найдено", 404);

  await prisma.invitation.delete({ where: { id } });
  return reply.code(204).send();
}