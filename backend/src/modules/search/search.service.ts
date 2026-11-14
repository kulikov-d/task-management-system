import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database";

export async function globalSearch(request: FastifyRequest, reply: FastifyReply) {
  const { q } = request.query as { q?: string };
  if (!q || q.trim().length < 1) {
    return reply.send({ tasks: [], projects: [], users: [] });
  }
  const query = q.trim();
  const userId = request.userId!;
  const visibleProjects = request.userRole === "admin" || request.userRole === "lead"
    ? {}
    : {
        exclusions: { none: { userId } },
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      };

  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      where: { title: { contains: query, mode: "insensitive" }, project: visibleProjects },
      select: { id: true, title: true, status: true, projectId: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: { name: { contains: query, mode: "insensitive" }, ...visibleProjects },
      select: { id: true, name: true, key: true },
      take: 3,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 3,
    }),
  ]);

  return reply.send({ tasks, projects, users });
}
