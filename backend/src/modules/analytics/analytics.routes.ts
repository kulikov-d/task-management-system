import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import {
  getBurndown,
  getVelocity,
  getTaskStats,
  getExport,
} from "./analytics.service";

export async function analyticsPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/burndown", getBurndown);
  fastify.get("/velocity", getVelocity);
  fastify.get("/tasks", getTaskStats);
  fastify.get("/export", getExport);
}
