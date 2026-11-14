import { prisma } from "../config/database";
import { AppError } from "./exceptions/AppError";

export async function assertProjectAccess(userId: string, projectId: string, role?: string) {
  if (role === "admin" || role === "lead") return;
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      exclusions: { none: { userId } },
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
  if (!project) throw new AppError("Insufficient permissions", 403);
}
