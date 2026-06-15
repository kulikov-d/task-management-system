import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.event.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskTag.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 12);

  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "a.smirnov@add.dev",
        password,
        name: "Алексей Смирнов",
        role: Role.admin,
      },
    }),
    prisma.user.create({
      data: {
        email: "m.petrova@add.dev",
        password,
        name: "Мария Петрова",
        role: Role.lead,
      },
    }),
    prisma.user.create({
      data: {
        email: "d.kozlov@add.dev",
        password,
        name: "Дмитрий Козлов",
        role: Role.developer,
      },
    }),
    prisma.user.create({
      data: {
        email: "a.novikova@add.dev",
        password,
        name: "Анна Новикова",
        role: Role.developer,
      },
    }),
    prisma.user.create({
      data: {
        email: "s.ivanov@add.dev",
        password,
        name: "Сергей Иванов",
        role: Role.viewer,
      },
    }),
  ]);

  console.log(`✓ Created ${users.length} users`);

  // Create projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "ADD — Task Manager",
        key: "ADD",
        description: "Основная система управления задачами",
        ownerId: users[0].id,
        members: {
          create: [
            { userId: users[0].id, role: Role.admin },
            { userId: users[1].id, role: Role.lead },
            { userId: users[2].id, role: Role.developer },
            { userId: users[3].id, role: Role.developer },
            { userId: users[4].id, role: Role.viewer },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        name: "Мобильное приложение",
        key: "MOB",
        description: "iOS/Android клиент для ADD",
        ownerId: users[1].id,
        members: {
          create: [
            { userId: users[1].id, role: Role.lead },
            { userId: users[2].id, role: Role.developer },
            { userId: users[3].id, role: Role.developer },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        name: "Аналитика v2",
        key: "ANA",
        description: "Переработка дашборда аналитики",
        ownerId: users[0].id,
        members: {
          create: [
            { userId: users[0].id, role: Role.admin },
            { userId: users[1].id, role: Role.lead },
            { userId: users[2].id, role: Role.developer },
            { userId: users[3].id, role: Role.developer },
          ],
        },
      },
    }),
  ]);

  console.log(`✓ Created ${projects.length} projects`);

  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: "frontend", color: "#6366f1", projectId: projects[0].id, creatorId: users[0].id } }),
    prisma.tag.create({ data: { name: "backend", color: "#10b981", projectId: projects[0].id, creatorId: users[0].id } }),
    prisma.tag.create({ data: { name: "bug", color: "#ef4444", projectId: projects[0].id, creatorId: users[0].id } }),
    prisma.tag.create({ data: { name: "feature", color: "#22d3ee", projectId: projects[0].id, creatorId: users[0].id } }),
    prisma.tag.create({ data: { name: "auth", color: "#f59e0b", projectId: projects[0].id, creatorId: users[0].id } }),
    prisma.tag.create({ data: { name: "database", color: "#8b5cf6", projectId: projects[0].id, creatorId: users[0].id } }),
    prisma.tag.create({ data: { name: "api", color: "#ec4899", projectId: projects[0].id, creatorId: users[0].id } }),
    prisma.tag.create({ data: { name: "websocket", color: "#06b6d4", projectId: projects[0].id, creatorId: users[0].id } }),
  ]);

  console.log(`✓ Created ${tags.length} tags`);

  // Create tasks
  const tasksData = [
    { title: "Реализовать JWT аутентификацию", description: "Access + refresh tokens, хранение в HttpOnly cookies", status: "DONE" as const, priority: "HIGH" as const, assigneeId: users[2].id, dueDate: new Date("2026-06-05"), tagIds: [tags[1].id, tags[4].id] },
    { title: "Kanban-доска с drag & drop", description: "Реализовать перетаскивание задач между колонками с помощью dnd-kit", status: "DONE" as const, priority: "HIGH" as const, assigneeId: users[3].id, dueDate: new Date("2026-06-08"), tagIds: [tags[0].id, tags[3].id] },
    { title: "WebSocket уведомления", description: "Socket.IO интеграция для real-time обновлений", status: "IN_PROGRESS" as const, priority: "HIGH" as const, assigneeId: users[2].id, dueDate: new Date("2026-06-15"), tagIds: [tags[1].id, tags[7].id] },
    { title: "Дашборд аналитики", description: "Burn-down chart, velocity chart, pie-диаграммы", status: "IN_PROGRESS" as const, priority: "MEDIUM" as const, assigneeId: users[3].id, dueDate: new Date("2026-06-18"), tagIds: [tags[0].id, tags[3].id] },
    { title: "RBAC middleware", description: "Настройка guard'ов для ролей: admin, lead, developer, viewer", status: "IN_REVIEW" as const, priority: "CRITICAL" as const, assigneeId: users[1].id, dueDate: new Date("2026-06-12"), tagIds: [tags[1].id, tags[4].id] },
    { title: "Prisma schema и миграции", description: "Полная схема БД с индексами и каскадными удалениями", status: "DONE" as const, priority: "CRITICAL" as const, assigneeId: users[2].id, dueDate: new Date("2026-06-03"), tagIds: [tags[1].id, tags[5].id] },
    { title: "Загрузка файлов-вложений", description: "Multer + валидация типов, ограничение 10MB", status: "TODO" as const, priority: "MEDIUM" as const, assigneeId: users[3].id, dueDate: new Date("2026-06-20"), tagIds: [tags[0].id, tags[1].id] },
    { title: "Email уведомления (Nodemailer)", description: "Шаблоны писем для назначения задачи, дедлайна, эскалации", status: "TODO" as const, priority: "LOW" as const, assigneeId: users[4].id, dueDate: new Date("2026-06-25"), tagIds: [tags[1].id] },
    { title: "Планировщик дедлайнов (node-cron)", description: "Проверка просроченных задач каждые 5 минут", status: "TODO" as const, priority: "MEDIUM" as const, dueDate: new Date("2026-06-22"), tagIds: [tags[1].id] },
    { title: "REST API для задач", description: "CRUD endpoints, фильтрация по статусу/приоритету/исполнителю", status: "IN_REVIEW" as const, priority: "HIGH" as const, assigneeId: users[2].id, dueDate: new Date("2026-06-10"), tagIds: [tags[1].id, tags[6].id] },
    { title: "Docker Compose конфигурация", description: "Контейнеры: frontend, backend, postgres, nginx", status: "IN_PROGRESS" as const, priority: "HIGH" as const, assigneeId: users[0].id, dueDate: new Date("2026-06-16"), tagIds: [tags[1].id] },
    { title: "Аудит-лог действий", description: "Prisma middleware для логирования всех операций", status: "TODO" as const, priority: "LOW" as const, dueDate: new Date("2026-06-28"), tagIds: [tags[1].id, tags[5].id] },
  ];

  for (let i = 0; i < tasksData.length; i++) {
    const { tagIds, ...taskData } = tasksData[i];
    await prisma.task.create({
      data: {
        ...taskData,
        projectId: projects[0].id,
        authorId: users[0].id,
        position: i,
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
    });
  }

  console.log(`✓ Created ${tasksData.length} tasks`);

  // Create notifications
  await prisma.notification.createMany({
    data: [
      { type: "assignment", title: "New task assigned", message: "Вам назначена задача «WebSocket уведомления»", userId: users[2].id, taskId: null },
      { type: "overdue", title: "Task overdue", message: "Задача «RBAC middleware» просрочена", userId: users[1].id, taskId: null },
      { type: "comment", title: "New comment", message: "Мария Петрова прокомментировала «RBAC middleware»", userId: users[0].id, taskId: null },
    ],
  });

  console.log("✓ Created notifications");
  console.log("✓ Seed completed!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
