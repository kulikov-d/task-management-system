import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
} from "./comment.service";

export async function commentPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/tasks/:taskId/comments", listComments);
  fastify.post("/tasks/:taskId/comments", createComment);
  fastify.put("/comments/:id", updateComment);
  fastify.delete("/comments/:id", deleteComment);
}
