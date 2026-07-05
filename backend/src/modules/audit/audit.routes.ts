import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import { listAuditLogs } from "./audit.service";

export async function auditPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/", listAuditLogs);
}
