import { FastifyInstance } from "fastify";
import { authenticate, authorize } from "../../common/guards/auth.guard";
import { getRoleSettings, updateRoleSettings } from "./settings.service";

export async function settingsPlugin(fastify: FastifyInstance) {
  const adminOnly = { preHandler: [authenticate, authorize("admin")] };
  fastify.get("/roles", { preHandler: [authenticate] }, getRoleSettings);
  fastify.put("/roles", adminOnly, updateRoleSettings);
}