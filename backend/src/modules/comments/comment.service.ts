import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";
import { emitToTask } from "../../config/socket";
import { auditLog } from "../../common/middleware/audit.middleware";

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function listComments(request: FastifyRequest, reply: FastifyReply) {
  const { taskId } = request.params as { taskId: string };
  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });
  return reply.send(comments);
}

export async function createComment(request: FastifyRequest, reply: FastifyReply) {
  const { taskId } = request.params as { taskId: string };
  const userId = request.userId!;
  const { content } = createCommentSchema.parse(request.body);

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

  return reply.code(201).send(comment);
}

export async function updateComment(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;
  const { content } = createCommentSchema.parse(request.body);

  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing) throw new AppError("Comment not found", 404);
  if (existing.authorId !== userId) throw new AppError("Insufficient permissions", 403);

  const comment = await prisma.comment.update({
    where: { id },
    data: { content },
    include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
  });

  return reply.send(comment);
}

export async function deleteComment(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = request.userId!;

  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing) throw new AppError("Comment not found", 404);
  if (existing.authorId !== userId) throw new AppError("Insufficient permissions", 403);

  await prisma.comment.delete({ where: { id } });
  return reply.code(204).send();
}
