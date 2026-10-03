import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { auditLog } from "../../common/middleware/audit.middleware";

const VALID_ROLES = ["admin", "lead", "developer"];

export async function getRoleSettings() {
  const settings = await prisma.roleSetting.findMany({ orderBy: { role: "asc" } });
  // Возврат с дефолтными названиями, если настройки ещё не заданы
  const defaults: Record<string, string> = {
    admin: "Администратор",
    lead: "Руководитель",
    developer: "Исполнитель",
  };
  const byRole: Record<string, string> = {};
  settings.forEach((s) => { byRole[s.role] = s.displayName; });
  return VALID_ROLES.map((role) => ({
    role,
    displayName: byRole[role] || defaults[role],
  }));
}

export async function updateRoleSettings(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { settings?: Array<{ role: string; displayName: string }> };
  const settings = Array.isArray(body?.settings) ? body.settings : [];

  if (settings.length === 0 || !settings.every((s) => VALID_ROLES.includes(s.role) && s.displayName?.trim())) {
    throw new AppError("Передайте корректные названия для всех ролей", 400);
  }

  const result = await prisma.$transaction(
    settings.map((s) =>
      prisma.roleSetting.upsert({
        where: { role: s.role as any },
        create: { role: s.role as any, displayName: s.displayName.trim() },
        update: { displayName: s.displayName.trim() },
      })
    )
  );

  await auditLog("update", "RoleSetting", "roles", { settings: settings.map((s) => ({ role: s.role, displayName: s.displayName.trim() })) }, request.userId!);

  const byRole: Record<string, string> = {};
  result.forEach((s) => { byRole[s.role] = s.displayName; });
  return reply.send({
    settings: VALID_ROLES.map((role) => ({ role, displayName: byRole[role] })),
  });
}