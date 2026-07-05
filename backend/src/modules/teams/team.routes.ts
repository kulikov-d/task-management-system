import { FastifyInstance } from "fastify";
import { authenticate, authorize } from "../../common/guards/auth.guard";
import {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  assignTeamToProject,
  unassignTeamFromProject,
} from "./team.service";

export async function teamPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/", listTeams);
  fastify.get("/:id", getTeam);
  fastify.post("/", { preHandler: [authorize("lead", "admin")] }, createTeam);
  fastify.put("/:id", updateTeam);
  fastify.delete("/:id", { preHandler: [authorize("admin")] }, deleteTeam);
  fastify.post("/:id/members", addTeamMember);
  fastify.delete("/:id/members/:userId", removeTeamMember);
  fastify.post("/:id/projects", assignTeamToProject);
  fastify.delete("/:id/projects/:projectId", unassignTeamFromProject);
}
