import nodemailer from "nodemailer";
import { env } from "../../config/env";

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: (env.SMTP_PORT || 587) === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!transporter) {
    console.log(`📧 [DEV] Email to ${to}: ${subject}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Email send failed:", error);
    return false;
  }
}

export async function sendAssignmentEmail(
  to: string,
  assigneeName: string,
  taskTitle: string,
  projectName: string
): Promise<void> {
  await send(
    to,
    `[${projectName}] Назначена новая задача`,
    `<h2>Вам назначена задача</h2>
     <p><strong>${assigneeName}</strong>, вам назначена задача "<strong>${taskTitle}</strong>" в проекте <strong>${projectName}</strong>.</p>
     <p><a href="${env.FRONTEND_URL}">Открыть проект</a></p>`
  );
}

export async function sendOverdueEmail(
  to: string,
  taskTitle: string,
  dueDate: Date | null,
  projectName: string
): Promise<void> {
  const dateStr = dueDate ? dueDate.toLocaleDateString("ru-RU") : "не указана";
  await send(
    to,
    `[${projectName}] Просрочена задача`,
    `<h2>Задача просрочена</h2>
     <p>Задача "<strong>${taskTitle}</strong>" в проекте <strong>${projectName}</strong> просрочена (дедлайн: ${dateStr}).</p>
     <p><a href="${env.FRONTEND_URL}">Открыть проект</a></p>`
  );
}

export async function sendStatusChangeEmail(
  to: string,
  taskTitle: string,
  oldStatus: string,
  newStatus: string,
  projectName: string
): Promise<void> {
  await send(
    to,
    `[${projectName}] Статус задачи изменён`,
    `<h2>Изменён статус задачи</h2>
     <p>Задача "<strong>${taskTitle}</strong>" в проекте <strong>${projectName}</strong>: ${oldStatus} → ${newStatus}.</p>
     <p><a href="${env.FRONTEND_URL}">Открыть проект</a></p>`
  );
}
