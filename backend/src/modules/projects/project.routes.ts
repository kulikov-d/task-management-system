import { FastifyInstance } from "fastify";
import { authenticate, authorize } from "../../common/guards/auth.guard";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole,
  addExclusion,
  removeExclusion,
  getExclusions,
} from "./project.service";

export async function projectPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/", listProjects);
  fastify.get("/:id", getProject);
  fastify.post("/", { preHandler: [authorize("lead", "admin")] }, createProject);
  fastify.put("/:id", updateProject);
  fastify.delete("/:id", deleteProject);
  fastify.post("/:id/members", addMember);
  fastify.put("/:id/members/:userId", updateMemberRole);
  fastify.delete("/:id/members/:userId", removeMember);
  fastify.get("/:id/exclusions", getExclusions);
  fastify.post("/:id/exclusions", addExclusion);
  fastify.delete("/:id/exclusions/:userId", removeExclusion);
}
