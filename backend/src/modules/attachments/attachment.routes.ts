import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import {
  listAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
} from "./attachment.service";

export async function attachmentPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/tasks/:taskId/attachments", listAttachments);
  fastify.post("/tasks/:taskId/attachments", uploadAttachment);
  fastify.get("/attachments/:id/download", downloadAttachment);
  fastify.delete("/attachments/:id", deleteAttachment);
}
