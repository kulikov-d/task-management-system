import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database";
import PDFDocument from "pdfkit";
import { assertProjectAccess } from "../../common/project-access";

export async function getBurndown(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, sprintId } = request.query as { projectId?: string; sprintId?: string };
  if (!projectId) {
    return reply.code(400).send({ message: "projectId is required" });
  }
  await assertProjectAccess(request.userId!, projectId, request.userRole);

  const sprint = sprintId
    ? await prisma.sprint.findFirst({ where: { id: sprintId, projectId } })
    : await prisma.sprint.findFirst({ where: { projectId, isActive: true }, orderBy: { startDate: "desc" } });
  if (!sprint) return reply.send([]);

  const tasks = await prisma.task.findMany({
    where: { projectId, sprintId: sprint.id },
    select: {
      status: true,
      createdAt: true,
      events: {
        where: { type: "STATUS_CHANGED" },
        select: { createdAt: true, payload: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const start = new Date(sprint.startDate);
  const end = new Date(Math.min(sprint.endDate.getTime(), Date.now()));
  if (start.getTime() > end.getTime()) return reply.send([]);
  const startScope = tasks.filter((task) => task.createdAt <= start).length;
  const durationDays = Math.max(1, Math.ceil((sprint.endDate.getTime() - start.getTime()) / 86400000));
  const result: Array<{ date: string; planned: number; actual: number }> = [];

  for (let day = 0, date = new Date(start); date <= end; day++, date.setUTCDate(date.getUTCDate() + 1)) {
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);
    const remaining = tasks.reduce((count, task) => {
      if (task.createdAt > dayEnd || statusAt(task.status, task.events, dayEnd) === "DONE") return count;
      return count + 1;
    }, 0);
    const planned = Math.max(0, startScope - (startScope * day) / durationDays);
    result.push({ date: date.toISOString().slice(0, 10), planned: Math.round(planned * 10) / 10, actual: remaining });
  }

  return reply.send(result);
}

export async function getVelocity(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, sprintId } = request.query as { projectId?: string; sprintId?: string };
  if (!projectId) {
    return reply.code(400).send({ message: "projectId is required" });
  }
  await assertProjectAccess(request.userId!, projectId, request.userRole);

  const sprints = await prisma.sprint.findMany({
    where: { projectId, ...(sprintId ? { id: sprintId } : {}) },
    orderBy: { startDate: "desc" },
    take: sprintId ? 1 : 5,
    include: {
      tasks: {
        select: {
          createdAt: true,
          status: true,
          events: {
            where: { type: "STATUS_CHANGED" },
            select: { createdAt: true, payload: true },
          },
        },
      },
    },
  });

  const velocity = sprints.reverse().map((sprint) => {
    const completedTaskIndexes = new Set<number>();
    let planned = 0;
    sprint.tasks.forEach((task, index) => {
      if (task.createdAt <= sprint.startDate) planned++;
      const completedInSprint = task.events.some((event) => {
        const payload = event.payload as { newStatus?: string };
        return payload.newStatus === "DONE" && event.createdAt >= sprint.startDate && event.createdAt <= sprint.endDate;
      });
      if (completedInSprint || (task.status === "DONE" && task.createdAt >= sprint.startDate && task.createdAt <= sprint.endDate)) {
        completedTaskIndexes.add(index);
      }
    });
    return { sprint: sprint.name, completed: completedTaskIndexes.size, planned };
  });

  return reply.send(velocity);
}

function statusAt(
  currentStatus: string,
  events: Array<{ createdAt: Date; payload: unknown }>,
  at: Date,
): string {
  let status = currentStatus;
  for (const event of [...events].reverse()) {
    if (event.createdAt <= at) continue;
    const payload = event.payload as { oldStatus?: string };
    if (payload.oldStatus) status = payload.oldStatus;
  }
  return status;
}

export async function getTaskStats(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, status, assigneeId, sprintId } = request.query as any;
  if (!projectId) {
    return reply.code(400).send({ message: "projectId is required" });
  }
  await assertProjectAccess(request.userId!, projectId, request.userRole);

  const baseWhere: any = { projectId };
  if (status) baseWhere.status = status;
  if (assigneeId) baseWhere.assigneeId = assigneeId;
  if (sprintId) baseWhere.sprintId = sprintId;

  const [total, byStatus, byPriority, byAssignee] = await Promise.all([
    prisma.task.count({ where: baseWhere }),
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId, ...(sprintId ? { sprintId } : {}) },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: { projectId, ...(sprintId ? { sprintId } : {}) },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: { projectId, assigneeId: { not: null }, ...(sprintId ? { sprintId } : {}) },
      _count: true,
    }),
  ]);

  return reply.send({ total, byStatus, byPriority, byAssignee });
}

export async function getExport(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, format, sprintId } = request.query as { projectId?: string; format?: string; sprintId?: string };
  if (!projectId) {
    return reply.code(400).send({ message: "projectId is required" });
  }
  await assertProjectAccess(request.userId!, projectId, request.userRole);

  const where: any = { projectId };
  if (sprintId) where.sprintId = sprintId;

  const [project, tasks] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { name: true, key: true } }),
    prisma.task.findMany({
      where,
      include: {
        assignee: { select: { name: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true, projectId: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const projectName = project?.name || projectId;

  if (format === "json") {
    return reply.send(tasks);
  }

  if (format === "pdf") {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const pdfDone = new Promise<void>((resolve, reject) => {
      doc.on("end", () => resolve());
      doc.on("error", reject);
    });

    doc.fontSize(18).text(projectName, { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#666").text(`Отчёт по задачам`, { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#999").text(`Сформировано: ${new Date().toLocaleDateString("ru-RU")}`, { align: "center" });
    doc.moveDown(1);

    const headers = ["Задача", "Статус", "Приоритет", "Исполнитель", "Теги", "Дедлайн"];
    const colWidths = [150, 70, 60, 80, 110, 80];
    let y = doc.y;
    let x = 40;

    doc.fontSize(9).fillColor("#333");
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });

    doc.moveTo(40, y + 15).lineTo(555, y + 15).strokeColor("#ccc").stroke();
    y += 20;

    for (const t of tasks) {
      if (y > 760) {
        doc.addPage();
        y = 40;
      }
      x = 40;
      doc.fontSize(8).fillColor("#333");
      const row = [
        t.title.substring(0, 35),
        t.status,
        t.priority,
        t.assignee?.name || "—",
        t.tags.map((tt) => tt.tag.name).join(", ").substring(0, 25) || "—",
        t.dueDate?.toISOString().split("T")[0] || "—",
      ];
      row.forEach((cell, i) => {
        doc.text(cell, x, y, { width: colWidths[i] });
        x += colWidths[i];
      });
      y += 18;
    }

    doc.end();
    await pdfDone;
    const buffer = Buffer.concat(chunks);
    const safeName = ((project?.key || projectId) + "").replace(/[^a-zA-Z0-9_-]/g, "") || "tasks";
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="tasks-${safeName}.pdf"`);
    return reply.send(buffer);
  }

  const escapeCsv = (val: string) => {
    if (val.startsWith("=") || val.startsWith("+") || val.startsWith("-") || val.startsWith("@")) {
      val = "'" + val;
    }
    return `"${val.replace(/"/g, '""')}"`;
  };

  const csv = [
    "Title,Status,Priority,Assignee,Tags,Due Date,Created",
    ...tasks.map(
      (t) =>
        `${escapeCsv(t.title)},${t.status},${t.priority},${escapeCsv(t.assignee?.name || "Unassigned")},${escapeCsv(t.tags.map((tt) => tt.tag.name).join("; "))},${t.dueDate?.toISOString().split("T")[0] || ""},${t.createdAt.toISOString().split("T")[0]}`
    ),
  ].join("\n");

  reply.header("Content-Type", "text/csv");
  reply.header("Content-Disposition", `attachment; filename="tasks-${projectId}.csv"`);
  return reply.send(csv);
}
