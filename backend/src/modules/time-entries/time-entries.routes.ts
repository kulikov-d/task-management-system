import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import {
  startTimer,
  stopTimer,
  getActiveTimer,
  listByTask,
  listByProject,
  deleteEntry,
  getTimeStats,
} from "./time-entries.service";

export async function timeEntryPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);

  fastify.post("/", startTimer);
  fastify.put("/:id/stop", stopTimer);
  fastify.delete("/:id", deleteEntry);
  fastify.get("/active", getActiveTimer);
  fastify.get("/project/:projectId", listByProject);
  fastify.get("/project/:projectId/stats", getTimeStats);
  fastify.get("/task/:taskId", listByTask);
}
