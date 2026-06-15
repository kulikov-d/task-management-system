import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { emitToProject, emitToTask } from "../../config/socket";
import { auditLog } from "../../common/middleware/audit.middleware";
import { sendAssignmentEmail, sendStatusChangeEmail } from "../notifications/email.service";
import { createAndEmitNotification } from "../notifications/notification.helper";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  projectId: z.string(),
  assigneeId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  tagIds: z.array(z.string()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional().transform((v) => (v === null ? null : v ? new Date(v) : undefined)),
  tagIds: z.array(z.string()).optional(),
});

const moveTaskSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
  position: z.number().min(0),
});

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, status, priority, assigneeId, tagId, search } = req.query;

    const where: any = {};
    if (projectId) where.projectId = projectId as string;
    if (status) where.status = status as string;
    if (priority) where.priority = priority as string;
    if (assigneeId) where.assigneeId = assigneeId as string;
    if (tagId) where.tags = { some: { tagId: tagId as string } };
    if (search) where.title = { contains: search as string, mode: "insensitive" };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        author: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true, projectId: true } } } },
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        author: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true, projectId: true } } } },
        comments: {
          include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
        },
        attachments: {
          include: { uploadedBy: { select: { id: true, name: true } } },
        },
      },
    });
    if (!task) throw new AppError("Task not found", 404);
    res.json(task);
  } catch (error) {
    next(error);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const data = createTaskSchema.parse(req.body);

    const maxPosition = await prisma.task.aggregate({
      where: { projectId: data.projectId, status: "TODO" },
      _max: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        authorId: userId,
        assigneeId: data.assigneeId,
        priority: data.priority || "MEDIUM",
        dueDate: data.dueDate,
        position: (maxPosition._max.position ?? -1) + 1,
        tags: data.tagIds
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        author: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true, projectId: true } } } },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    await prisma.event.create({
      data: {
        type: "CREATED",
        payload: { title: task.title },
        taskId: task.id,
        userId,
      },
    });

    await auditLog("create", "Task", task.id, { title: task.title });

    emitToProject(task.projectId, "task:created", task);

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = updateTaskSchema.parse(req.body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new AppError("Task not found", 404);

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        tags: data.tagIds
          ? { deleteMany: {}, create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        author: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true, projectId: true } } } },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    await prisma.event.create({
      data: {
        type: "UPDATED",
        payload: { title: task.title, changes: data },
        taskId: task.id,
        userId: req.userId!,
      },
    });

    await auditLog("update", "Task", task.id, data as Record<string, unknown>);

    emitToProject(task.projectId, "task:updated", task);

    res.json(task);
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError("Task not found", 404);

    if (task.authorId !== userId) {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId } },
      });
      if (!member || !["admin", "lead"].includes(member.role)) {
        throw new AppError("Insufficient permissions", 403);
      }
    }

    await prisma.task.delete({ where: { id } });
    await auditLog("delete", "Task", id);
    emitToProject(task.projectId, "task:deleted", { taskId: id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function assignTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { assigneeId } = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: { assigneeId },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    await prisma.event.create({
      data: {
        type: "ASSIGNED",
        payload: { assigneeId, assigneeName: task.assignee?.name },
        taskId: task.id,
        userId: req.userId!,
      },
    });

    await auditLog("assign", "Task", task.id, { assigneeId });

    emitToProject(task.projectId, "task:assigned", { task, assignee: task.assignee });

    if (assigneeId) {
      await createAndEmitNotification({
        type: "assignment",
        title: "New task assigned",
        message: `You have been assigned to "${task.title}"`,
        userId: assigneeId,
        taskId: task.id,
      });

      const assignee = await prisma.user.findUnique({ where: { id: assigneeId }, select: { email: true, name: true } });
      const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } });
      if (assignee && project) {
        sendAssignmentEmail(assignee.email, assignee.name, task.title, project.name);
      }
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
}

export async function changeStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]) }).parse(req.body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new AppError("Task not found", 404);

    const task = await prisma.task.update({
      where: { id },
      data: { status },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        author: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true, projectId: true } } } },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    await prisma.event.create({
      data: {
        type: "STATUS_CHANGED",
        payload: { oldStatus: existing.status, newStatus: status },
        taskId: task.id,
        userId: req.userId!,
      },
    });

    await auditLog("status_change", "Task", task.id, { oldStatus: existing.status, newStatus: status });

    emitToProject(task.projectId, "task:statusChanged", {
      task,
      oldStatus: existing.status,
      newStatus: status,
    });

    if (existing.assigneeId && existing.assigneeId !== req.userId) {
      const assignee = await prisma.user.findUnique({ where: { id: existing.assigneeId }, select: { email: true } });
      const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } });
      if (assignee && project) {
        sendStatusChangeEmail(assignee.email, task.title, existing.status, status, project.name);
      }
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
}

export async function moveTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, position } = moveTaskSchema.parse(req.body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new AppError("Task not found", 404);

    const task = await prisma.task.update({
      where: { id },
      data: { status, position },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        author: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true, projectId: true } } } },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    await prisma.event.create({
      data: {
        type: "MOVED",
        payload: { fromStatus: existing.status, toStatus: status, position },
        taskId: task.id,
        userId: req.userId!,
      },
    });

    await auditLog("move", "Task", task.id, { fromStatus: existing.status, toStatus: status, position });

    emitToProject(task.projectId, "task:moved", {
      task,
      fromColumn: existing.status,
      toColumn: status,
    });

    res.json(task);
  } catch (error) {
    next(error);
  }
}

export async function addTagToTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { tagId } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError("Task not found", 404);

    await prisma.taskTag.create({
      data: { taskId: id, tagId },
    });

    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        author: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true, projectId: true } } } },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    emitToProject(task.projectId, "task:updated", updatedTask);
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
}

export async function removeTagFromTask(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, tagId } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError("Task not found", 404);

    await prisma.taskTag.deleteMany({
      where: { taskId: id, tagId },
    });

    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        author: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true, projectId: true } } } },
        _count: { select: { comments: true, attachments: true } },
      },
    });

    emitToProject(task.projectId, "task:updated", updatedTask);
    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
}
