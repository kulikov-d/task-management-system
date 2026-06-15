import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";
import PDFDocument from "pdfkit";

export async function getBurndown(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      res.status(400).json({ message: "projectId is required" });
      return;
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: projectId as string },
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

    res.json(burndown);
  } catch (error) {
    next(error);
  }
}

export async function getVelocity(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      res.status(400).json({ message: "projectId is required" });
      return;
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: projectId as string, status: "DONE" },
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

    res.json(velocity);
  } catch (error) {
    next(error);
  }
}

export async function getTaskStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, status, assigneeId } = req.query;
    if (!projectId) {
      res.status(400).json({ message: "projectId is required" });
      return;
    }

    const baseWhere: any = { projectId: projectId as string };
    if (status) baseWhere.status = status as string;
    if (assigneeId) baseWhere.assigneeId = assigneeId as string;

    const [total, byStatus, byPriority, byAssignee] = await Promise.all([
      prisma.task.count({ where: baseWhere }),
      prisma.task.groupBy({
        by: ["status"],
        where: { projectId: projectId as string },
        _count: true,
      }),
      prisma.task.groupBy({
        by: ["priority"],
        where: { projectId: projectId as string },
        _count: true,
      }),
      prisma.task.groupBy({
        by: ["assigneeId"],
        where: { projectId: projectId as string, assigneeId: { not: null } },
        _count: true,
      }),
    ]);

    res.json({ total, byStatus, byPriority, byAssignee });
  } catch (error) {
    next(error);
  }
}

export async function getExport(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, format } = req.query;
    if (!projectId) {
      res.status(400).json({ message: "projectId is required" });
      return;
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: projectId as string },
      include: {
        assignee: { select: { name: true } },
        tags: { include: { tag: { select: { id: true, name: true, color: true, projectId: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") {
      res.json(tasks);
      return;
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="tasks-${projectId}.pdf"`);
      doc.pipe(res);

      doc.fontSize(18).text(`Отчёт по проекту`, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#666").text(`Сформировано: ${new Date().toLocaleDateString("ru-RU")}`, { align: "center" });
      doc.moveDown(1);

      const headers = ["Задача", "Статус", "Приоритет", "Исполнитель", "Дедлайн"];
      const colWidths = [200, 80, 70, 100, 80];
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
          t.title.substring(0, 40),
          t.status,
          t.priority,
          t.assignee?.name || "—",
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

    // Default: return CSV-like data
    const csv = [
      "Title,Status,Priority,Assignee,Tags,Due Date,Created",
      ...tasks.map(
        (t) =>
          `"${t.title}",${t.status},${t.priority},${t.assignee?.name || "Unassigned"},"${t.tags.map((tt) => tt.tag.name).join("; ")}",${t.dueDate?.toISOString().split("T")[0] || ""},${t.createdAt.toISOString().split("T")[0]}`
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="tasks-${projectId}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

function getWeek(date: Date): string {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `W${week}`;
}
