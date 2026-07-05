import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  changeStatus,
  moveTask,
  addTagToTask,
  removeTagFromTask,
} from "./task.service";

export async function taskPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/", listTasks);
  fastify.get("/:id", getTask);
  fastify.post("/", createTask);
  fastify.put("/:id", updateTask);
  fastify.delete("/:id", deleteTask);
  fastify.put("/:id/assign", assignTask);
  fastify.put("/:id/status", changeStatus);
  fastify.put("/:id/move", moveTask);
  fastify.post("/:id/tags", addTagToTask);
  fastify.delete("/:id/tags/:tagId", removeTagFromTask);
}
