import { prisma } from "../../config/database";
import { createAndEmitNotification } from "./notification.helper";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

let isChecking = false;

async function checkDeadlines(): Promise<void> {
  if (isChecking) return;
  isChecking = true;

  try {
    const now = new Date();
    const reminderLimit = new Date(now.getTime() + REMINDER_WINDOW_MS);
    const tasks = await prisma.task.findMany({
      where: {
        status: { not: "DONE" },
        assigneeId: { not: null },
        dueDate: { lte: reminderLimit },
      },
      select: { id: true, title: true, assigneeId: true, dueDate: true },
    });

    for (const task of tasks) {
      if (!task.assigneeId || !task.dueDate) continue;
      const overdue = task.dueDate.getTime() < now.getTime();
      const type = overdue ? "deadline_overdue" : "deadline_reminder";
      const date = task.dueDate.toISOString().slice(0, 10);
      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          taskId: task.id,
          type,
          message: { contains: date },
        },
        select: { id: true },
      });

      if (alreadyNotified) continue;
      await createAndEmitNotification({
        type,
        title: overdue ? "Задача просрочена" : "Скоро срок выполнения задачи",
        message: overdue
          ? `Срок задачи «${task.title}» истёк ${date}`
          : `Срок задачи «${task.title}» наступит ${date}`,
        userId: task.assigneeId,
        taskId: task.id,
      });
    }
  } catch (error) {
    console.error("Deadline notification check failed:", error);
  } finally {
    isChecking = false;
  }
}

export function startDeadlineScheduler(): ReturnType<typeof setInterval> {
  void checkDeadlines();
  const timer = setInterval(() => void checkDeadlines(), CHECK_INTERVAL_MS);
  timer.unref();
  return timer;
}
