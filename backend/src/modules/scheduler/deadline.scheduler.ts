import cron from "node-cron";
import { prisma } from "../../config/database";
import { emitToProject } from "../../config/socket";
import { sendOverdueEmail } from "../notifications/email.service";
import { createAndEmitNotification } from "../notifications/notification.helper";

let scheduledTask: cron.ScheduledTask | null = null;

export function startDeadlineScheduler() {
  scheduledTask = cron.schedule("*/5 * * * *", async () => {
    try {
      await checkOverdueTasks();
    } catch (error) {
      console.error("Deadline scheduler error:", error);
    }
  });

  console.log("✓ Deadline scheduler started (every 5 minutes)");
}

export function stopDeadlineScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

async function checkOverdueTasks() {
  const now = new Date();

  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { not: "DONE" },
    },
    include: {
      project: {
        include: {
          members: {
            where: { role: { in: ["lead", "admin"] } },
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  for (const task of overdueTasks) {
    // Check if we already have an ESCALATED event for this task today
    const existingEvent = await prisma.event.findFirst({
      where: {
        taskId: task.id,
        type: "OVERDUE",
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      },
    });

    if (existingEvent) continue;

    // Create event
    await prisma.event.create({
      data: {
        type: "OVERDUE",
        payload: {
          taskTitle: task.title,
          dueDate: task.dueDate,
          assignee: task.assignee?.name,
        },
        taskId: task.id,
        userId: task.authorId,
      },
    });

    // Notify lead/admin members
    for (const member of task.project.members) {
      await createAndEmitNotification({
        type: "overdue",
        title: "Task overdue",
        message: `"${task.title}" is overdue (due: ${task.dueDate?.toLocaleDateString()})`,
        userId: member.userId,
        taskId: task.id,
      });

      const user = await prisma.user.findUnique({ where: { id: member.userId }, select: { email: true } });
      if (user) {
        await sendOverdueEmail(user.email, task.title, task.dueDate, task.project.name);
      }
    }

    // Notify assignee if different from members
    if (task.assigneeId && !task.project.members.some((m) => m.userId === task.assigneeId)) {
      await createAndEmitNotification({
        type: "overdue",
        title: "Task overdue",
        message: `Your task "${task.title}" is overdue`,
        userId: task.assigneeId,
        taskId: task.id,
      });

      const assignee = await prisma.user.findUnique({ where: { id: task.assigneeId }, select: { email: true } });
      if (assignee) {
        await sendOverdueEmail(assignee.email, task.title, task.dueDate, task.project.name);
      }
    }

    // Emit socket event
    emitToProject(task.projectId, "task:overdue", {
      task: { id: task.id, title: task.title },
      escalated: true,
    });
  }

  if (overdueTasks.length > 0) {
    console.log(`⚠ ${overdueTasks.length} overdue task(s) processed`);
  }
}
