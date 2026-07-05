import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  meHandler,
  logoutHandler,
} from "./auth.controller";

export async function authPlugin(fastify: FastifyInstance) {
  fastify.post("/register", registerHandler);
  fastify.post("/login", loginHandler);
  fastify.post("/refresh", refreshHandler);
  fastify.get("/me", { preHandler: [authenticate] }, meHandler);
  fastify.post("/logout", logoutHandler);
}
