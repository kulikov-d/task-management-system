import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  projectId: z.string(),
});

export async function listTags(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.query as { projectId?: string };
  const where = projectId ? { projectId } : {};

  const tags = await prisma.tag.findMany({
    where,
    include: { _count: { select: { tasks: true } } },
    orderBy: { name: "asc" },
  });
  return reply.send(tags);
}

export async function createTag(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;
  const data = createTagSchema.parse(request.body);

  const existing = await prisma.tag.findUnique({
    where: { projectId_name: { projectId: data.projectId, name: data.name } },
  });
  if (existing) throw new AppError("Tag with this name already exists in this project", 409);

  const tag = await prisma.tag.create({
    data: { ...data, creatorId: userId },
  });

  return reply.code(201).send(tag);
}

export async function deleteTag(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await prisma.tag.delete({ where: { id } });
  return reply.code(204).send();
}
