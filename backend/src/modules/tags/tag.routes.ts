import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import { listTags, createTag, deleteTag } from "./tag.service";

export async function tagPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/", listTags);
  fastify.post("/", createTag);
  fastify.delete("/:id", deleteTag);
}
