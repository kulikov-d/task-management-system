import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { emitToTask } from "../../config/socket";
import { auditLog } from "../../common/middleware/audit.middleware";

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function listComments(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = req.params.taskId as string;
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(comments);
  } catch (error) {
    next(error);
  }
}

export async function createComment(req: Request, res: Response, next: NextFunction) {
  try {
    const taskId = req.params.taskId as string;
    const userId = req.userId!;
    const { content } = createCommentSchema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new AppError("Task not found", 404);

    const comment = await prisma.comment.create({
      data: { content, taskId, authorId: userId },
      include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    await prisma.event.create({
      data: {
        type: "COMMENTED",
        payload: { content: content.substring(0, 100) },
        taskId,
        userId,
      },
    });

    emitToTask(taskId, "comment:new", { comment, taskId });

    await auditLog("comment", "Task", taskId, { content: content.substring(0, 100) });

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
}

export async function updateComment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { content } = createCommentSchema.parse(req.body);

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) throw new AppError("Comment not found", 404);
    if (existing.authorId !== userId) throw new AppError("Insufficient permissions", 403);

    const comment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    res.json(comment);
  } catch (error) {
    next(error);
  }
}

export async function deleteComment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) throw new AppError("Comment not found", 404);
    if (existing.authorId !== userId) throw new AppError("Insufficient permissions", 403);

    await prisma.comment.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
