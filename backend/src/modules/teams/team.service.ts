import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { emitToAll } from "../../config/socket";

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export async function listTeams(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const userRole = request.userRole!;

  let teams;
  if (userRole === "admin" || userRole === "lead") {
    teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
          },
        },
        projects: {
          include: {
            project: { select: { id: true, name: true, key: true, description: true } },
          },
        },
        _count: { select: { members: true, projects: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  } else {
    teams = await prisma.team.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
          },
        },
        projects: {
          include: {
            project: { select: { id: true, name: true, key: true, description: true } },
          },
        },
        _count: { select: { members: true, projects: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  return reply.send(teams);
}

export async function getTeam(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
        },
      },
      projects: {
        include: {
          project: { select: { id: true, name: true, key: true, description: true } },
        },
      },
      _count: { select: { members: true, projects: true } },
    },
  });

  if (!team) throw new AppError("Team not found", 404);
  return reply.send(team);
}

export async function createTeam(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const data = createTeamSchema.parse(request.body);

  const team = await prisma.team.create({
    data: {
      ...data,
      members: {
        create: { userId, role: "admin" },
      },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
      _count: { select: { members: true, projects: true } },
    },
  });

  emitToAll("team:created", team);
  return reply.code(201).send(team);
}

export async function updateTeam(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;
  const data = updateTeamSchema.parse(request.body);

  const team = await prisma.team.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!team) throw new AppError("Team not found", 404);

  const membership = team.members.find((m) => m.userId === userId);
  if (!membership || !["admin"].includes(membership.role)) {
    throw new AppError("Only team admins can update the team", 403);
  }

  const updated = await prisma.team.update({
    where: { id },
    data,
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
      _count: { select: { members: true, projects: true } },
    },
  });

  emitToAll("team:updated", updated);
  return reply.send(updated);
}

export async function deleteTeam(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };

  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) throw new AppError("Team not found", 404);

  await prisma.team.delete({ where: { id } });
  emitToAll("team:deleted", { teamId: id });
  return reply.code(204).send();
}

export async function addTeamMember(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;
  const { userId: memberId, role } = request.body as { userId: string; role?: string };
  const validRoles = ["admin", "lead", "developer"];
  const memberRole = role && validRoles.includes(role) ? role : "developer";

  const team = await prisma.team.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!team) throw new AppError("Team not found", 404);

  const requesterMembership = team.members.find((m) => m.userId === userId);
  if (!requesterMembership || !["admin"].includes(requesterMembership.role)) {
    throw new AppError("Only team admins can manage members", 403);
  }

  const existing = team.members.find((m) => m.userId === memberId);
  if (existing) throw new AppError("User is already a member of this team", 409);

  const member = await prisma.teamMember.create({
    data: {
      teamId: id,
      userId: memberId,
      role: memberRole as any,
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  emitToAll("team:memberAdded", { teamId: id, member });
  return reply.code(201).send(member);
}

export async function removeTeamMember(request: FastifyRequest, reply: FastifyReply) {
  const { id, userId: memberId } = request.params as { id: string; userId: string };
  const userId = request.userId!;

  const team = await prisma.team.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!team) throw new AppError("Team not found", 404);

  const requesterMembership = team.members.find((m) => m.userId === userId);
  if (!requesterMembership || !["admin"].includes(requesterMembership.role)) {
    throw new AppError("Only team admins can manage members", 403);
  }

  await prisma.teamMember.delete({
    where: { teamId_userId: { teamId: id, userId: memberId } },
  });

  emitToAll("team:memberRemoved", { teamId: id, userId: memberId });
  return reply.code(204).send();
}

export async function assignTeamToProject(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;
  const { projectId } = request.body as { projectId: string };

  const team = await prisma.team.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!team) throw new AppError("Team not found", 404);

  const requesterMembership = team.members.find((m) => m.userId === userId);
  if (!requesterMembership || !["admin"].includes(requesterMembership.role)) {
    throw new AppError("Only team admins can manage project assignments", 403);
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError("Project not found", 404);

  const existing = await prisma.teamProject.findUnique({
    where: { teamId_projectId: { teamId: id, projectId } },
  });
  if (existing) throw new AppError("Team is already assigned to this project", 409);

  const teamProject = await prisma.teamProject.create({
    data: { teamId: id, projectId },
    include: {
      project: { select: { id: true, name: true, key: true } },
    },
  });

  emitToAll("team:projectAssigned", { teamId: id, project: teamProject.project });
  return reply.code(201).send(teamProject);
}

export async function unassignTeamFromProject(request: FastifyRequest, reply: FastifyReply) {
  const { id, projectId } = request.params as { id: string; projectId: string };
  const userId = request.userId!;

  const team = await prisma.team.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!team) throw new AppError("Team not found", 404);

  const requesterMembership = team.members.find((m) => m.userId === userId);
  if (!requesterMembership || !["admin"].includes(requesterMembership.role)) {
    throw new AppError("Only team admins can manage project assignments", 403);
  }

  await prisma.teamProject.delete({
    where: { teamId_projectId: { teamId: id, projectId } },
  });

  emitToAll("team:projectUnassigned", { teamId: id, projectId });
  return reply.code(204).send();
}
