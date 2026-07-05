import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { emitToProject, emitToAll } from "../../config/socket";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  key: z.string().min(2).max(10).toUpperCase(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export async function listProjects(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const userRole = request.userRole!;

  let projects;

  if (userRole === "admin" || userRole === "lead") {
    projects = await prisma.project.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { tasks: true, members: true } },
        teamProjects: {
          include: {
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  } else {
    projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
          {
            teamProjects: {
              some: {
                team: {
                  members: { some: { userId } },
                },
              },
            },
          },
        ],
        exclusions: {
          none: { userId },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { tasks: true, members: true } },
        teamProjects: {
          include: {
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  return reply.send(projects);
}

export async function getProject(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
        },
      },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) throw new AppError("Project not found", 404);
  return reply.send(project);
}

export async function createProject(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const data = createProjectSchema.parse(request.body);

  const existingKey = await prisma.project.findUnique({ where: { key: data.key } });
  if (existingKey) throw new AppError("Project key already exists", 409);

  const project = await prisma.project.create({
    data: {
      ...data,
      ownerId: userId,
      members: {
        create: { userId, role: "admin" },
      },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { tasks: true, members: true } },
    },
  });

  emitToAll("project:created", project);
  return reply.code(201).send(project);
}

export async function updateProject(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;
  const data = updateProjectSchema.parse(request.body);

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new AppError("Project not found", 404);

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  });
  const isOwner = project.ownerId === userId;
  const isAdminOrLead = membership && ["admin", "lead"].includes(membership.role);
  if (!isOwner && !isAdminOrLead) throw new AppError("Only owner, admin or lead can update the project", 403);

  const updated = await prisma.project.update({
    where: { id },
    data,
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { tasks: true, members: true } },
    },
  });

  emitToProject(id, "project:updated", updated);
  emitToAll("project:updated", updated);
  return reply.send(updated);
}

export async function deleteProject(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new AppError("Project not found", 404);
  if (project.ownerId !== userId) throw new AppError("Only the owner can delete the project", 403);

  await prisma.project.delete({ where: { id } });
  emitToAll("project:deleted", { projectId: id });
  return reply.code(204).send();
}

export async function addMember(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;
  const { userId: memberId, role } = request.body as { userId: string; role?: string };
  const validRoles = ["admin", "lead", "developer"];
  const memberRole = role && validRoles.includes(role) ? role : "developer";

  const requesterMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  });
  if (!requesterMembership || !["admin", "lead"].includes(requesterMembership.role)) {
    throw new AppError("Only project admins and leads can manage members", 403);
  }

  const member = await prisma.projectMember.create({
    data: {
      projectId: id,
      userId: memberId,
      role: memberRole as any,
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  emitToProject(id, "project:memberAdded", { projectId: id, member });
  return reply.code(201).send(member);
}

export async function removeMember(request: FastifyRequest, reply: FastifyReply) {
  const { id, userId: memberId } = request.params as { id: string; userId: string };
  const userId = request.userId!;

  const requesterMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  });
  if (!requesterMembership || !["admin", "lead"].includes(requesterMembership.role)) {
    throw new AppError("Only project admins and leads can manage members", 403);
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId: id, userId: memberId } },
  });

  emitToProject(id, "project:memberRemoved", { projectId: id, userId: memberId });
  return reply.code(204).send();
}

export async function updateMemberRole(request: FastifyRequest, reply: FastifyReply) {
  const { id, userId: memberId } = request.params as { id: string; userId: string };
  const { role } = request.body as { role: string };
  const userId = request.userId!;
  const validRoles = ["admin", "lead", "developer"];
  if (!role || !validRoles.includes(role)) {
    throw new AppError("Invalid role. Must be one of: admin, lead, developer", 400);
  }

  const requesterMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  });
  if (!requesterMembership || !["admin", "lead"].includes(requesterMembership.role)) {
    throw new AppError("Only project admins and leads can manage members", 403);
  }

  const member = await prisma.projectMember.update({
    where: { projectId_userId: { projectId: id, userId: memberId } },
    data: { role: role as any },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  emitToProject(id, "project:memberUpdated", { projectId: id, member });
  return reply.send(member);
}

export async function addExclusion(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;
  const { userId: excludedUserId } = request.body as { userId: string };

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new AppError("Project not found", 404);

  const requesterMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  });
  if (!requesterMembership || !["admin", "lead"].includes(requesterMembership.role)) {
    throw new AppError("Only project admins and leads can manage exclusions", 403);
  }

  const existing = await prisma.projectExclusion.findUnique({
    where: { projectId_userId: { projectId: id, userId: excludedUserId } },
  });
  if (existing) throw new AppError("User is already excluded from this project", 409);

  const exclusion = await prisma.projectExclusion.create({
    data: { projectId: id, userId: excludedUserId },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  return reply.code(201).send(exclusion);
}

export async function removeExclusion(request: FastifyRequest, reply: FastifyReply) {
  const { id, userId: excludedUserId } = request.params as { id: string; userId: string };
  const userId = request.userId!;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new AppError("Project not found", 404);

  const requesterMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  });
  if (!requesterMembership || !["admin", "lead"].includes(requesterMembership.role)) {
    throw new AppError("Only project admins and leads can manage exclusions", 403);
  }

  await prisma.projectExclusion.delete({
    where: { projectId_userId: { projectId: id, userId: excludedUserId } },
  });

  return reply.code(204).send();
}

export async function getExclusions(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };

  const exclusions = await prisma.projectExclusion.findMany({
    where: { projectId: id },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });

  return reply.send(exclusions);
}
