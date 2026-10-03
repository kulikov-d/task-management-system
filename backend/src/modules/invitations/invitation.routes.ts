import { FastifyInstance } from "fastify";
import { authenticate, authorize } from "../../common/guards/auth.guard";
import {
  listInvitations,
  getInvitationByToken,
  createInvitation,
  deleteInvitation,
} from "./invitation.service";

export async function invitationPlugin(fastify: FastifyInstance) {
  // Публичный роут: проверка приглашения по ссылке (без авторизации)
  fastify.get("/:token/public", getInvitationByToken);

  const adminOnly = { preHandler: [authenticate, authorize("admin")] };
  fastify.get("/", adminOnly, listInvitations);
  fastify.post("/", adminOnly, createInvitation);
  fastify.delete("/:id", adminOnly, deleteInvitation);
}