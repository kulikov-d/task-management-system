import { FastifyInstance } from "fastify";
import { authenticate, authorize } from "../../common/guards/auth.guard";
import { listUsers, getUser, searchUsers, softDeleteUser, updateUserRole } from "./user.service";

export async function userPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/search", searchUsers);
  fastify.get("/", listUsers);
  fastify.get("/:id", getUser);
  fastify.put("/:id/role", { preHandler: [authorize("admin")] }, updateUserRole);
  fastify.delete("/:id", softDeleteUser);
}
