import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { AppError } from "../../common/exceptions/AppError";

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  projectId: z.string(),
});

export async function listTags(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.query;
    const where = projectId ? { projectId: projectId as string } : {};

    const tags = await prisma.tag.findMany({
      where,
      include: { _count: { select: { tasks: true } } },
      orderBy: { name: "asc" },
    });
    res.json(tags);
  } catch (error) {
    next(error);
  }
}

export async function createTag(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const data = createTagSchema.parse(req.body);

    const existing = await prisma.tag.findUnique({
      where: { projectId_name: { projectId: data.projectId, name: data.name } },
    });
    if (existing) throw new AppError("Tag with this name already exists in this project", 409);

    const tag = await prisma.tag.create({
      data: { ...data, creatorId: userId },
    });

    res.status(201).json(tag);
  } catch (error) {
    next(error);
  }
}

export async function deleteTag(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await prisma.tag.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
