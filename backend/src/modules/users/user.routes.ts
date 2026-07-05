import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import { listUsers, getUser, searchUsers, softDeleteUser } from "./user.service";

export async function userPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/search", searchUsers);
  fastify.get("/", listUsers);
  fastify.get("/:id", getUser);
  fastify.delete("/:id", softDeleteUser);
}
