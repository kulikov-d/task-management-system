import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  key: z.string().min(2).max(10).toUpperCase(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(projects);
  } catch (error) {
    next(error);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
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
    res.json(project);
  } catch (error) {
    next(error);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const data = createProjectSchema.parse(req.body);

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

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const data = updateProjectSchema.parse(req.body);

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new AppError("Project not found", 404);
    if (project.ownerId !== userId) throw new AppError("Only the owner can update the project", 403);

    const updated = await prisma.project.update({
      where: { id },
      data,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true, members: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new AppError("Project not found", 404);
    if (project.ownerId !== userId) throw new AppError("Only the owner can delete the project", 403);

    await prisma.project.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { userId: memberId, role } = req.body;
    const validRoles = ["admin", "lead", "developer", "viewer"];
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
        role: memberRole,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, userId: memberId } = req.params;
    const userId = req.userId!;

    const requesterMembership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
    });
    if (!requesterMembership || !["admin", "lead"].includes(requesterMembership.role)) {
      throw new AppError("Only project admins and leads can manage members", 403);
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: id, userId: memberId } },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, userId: memberId } = req.params;
    const { role } = req.body;
    const userId = req.userId!;
    const validRoles = ["admin", "lead", "developer", "viewer"];
    if (!role || !validRoles.includes(role)) {
      throw new AppError("Invalid role. Must be one of: admin, lead, developer, viewer", 400);
    }

    const requesterMembership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
    });
    if (!requesterMembership || !["admin", "lead"].includes(requesterMembership.role)) {
      throw new AppError("Only project admins and leads can manage members", 403);
    }

    const member = await prisma.projectMember.update({
      where: { projectId_userId: { projectId: id, userId: memberId } },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    res.json(member);
  } catch (error) {
    next(error);
  }
}
