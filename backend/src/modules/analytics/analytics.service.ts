import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database";
import PDFDocument from "pdfkit";

export async function getBurndown(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, sprintId } = request.query as { projectId?: string; sprintId?: string };
  if (!projectId) {
    return reply.code(400).send({ message: "projectId is required" });
  }

  const where: any = { projectId };
  if (sprintId) where.sprintId = sprintId;

  const tasks = await prisma.task.findMany({
    where,
    select: { createdAt: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const total = tasks.length;
  const grouped: Record<string, { total: number; done: number }> = {};

  for (const task of tasks) {
    const date = task.createdAt.toISOString().split("T")[0];
    if (!grouped[date]) grouped[date] = { total: 0, done: 0 };
    grouped[date].total++;
    if (task.status === "DONE") grouped[date].done++;
  }

  const dates = Object.keys(grouped).sort();
  let cumTotal = 0;
  let cumDone = 0;
  const burndown = dates.map((date) => {
    cumTotal += grouped[date].total;
    cumDone += grouped[date].done;
    return {
      date,
      planned: total - Math.round((total / dates.length) * dates.indexOf(date)),
      actual: cumTotal - cumDone,
    };
  });

  return reply.send(burndown);
}

export async function getVelocity(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, sprintId } = request.query as { projectId?: string; sprintId?: string };
  if (!projectId) {
    return reply.code(400).send({ message: "projectId is required" });
  }

  const where: any = { projectId, status: "DONE" };
  if (sprintId) where.sprintId = sprintId;

  const tasks = await prisma.task.findMany({
    where,
    select: { updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const grouped: Record<string, number> = {};
  for (const task of tasks) {
    const week = getWeek(task.updatedAt);
    grouped[week] = (grouped[week] || 0) + 1;
  }

  const velocity = Object.entries(grouped)
    .map(([sprint, completed]) => ({ sprint, completed, planned: 10 }))
    .reverse()
    .slice(-5);

  return reply.send(velocity);
}

export async function getTaskStats(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, status, assigneeId, sprintId } = request.query as any;
  if (!projectId) {
    return reply.code(400).send({ message: "projectId is required" });
  }

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
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tasks-${projectName}.pdf"`,
    });
    doc.pipe(reply.raw);

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
    return;
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

function getWeek(date: Date): string {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `W${week}`;
}
