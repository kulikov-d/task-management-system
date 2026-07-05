import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import { globalSearch } from "./search.service";

export async function searchPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/", globalSearch);
}
