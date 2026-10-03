import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import {
  listSprints,
  getSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  completeSprint,
} from "./sprint.service";

export async function sprintPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/", listSprints);
  fastify.get("/:id", getSprint);
  fastify.post("/", createSprint);
  fastify.put("/:id", updateSprint);
  fastify.put("/:id/complete", completeSprint);
  fastify.delete("/:id", deleteSprint);
}
