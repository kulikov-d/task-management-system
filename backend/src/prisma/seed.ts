import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const password = await bcrypt.hash("password123", 12);

  // Upsert users
  const userData = [
    { email: "a.smirnov@add.dev", name: "Алексей Смирнов", role: Role.admin },
    { email: "m.petrova@add.dev", name: "Мария Петрова", role: Role.lead },
    { email: "d.kozlov@add.dev", name: "Дмитрий Козлов", role: Role.developer },
    { email: "a.novikova@add.dev", name: "Анна Новикова", role: Role.developer },
    { email: "s.ivanov@add.dev", name: "Сергей Иванов", role: Role.developer },
  ];

  const users = [];
  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { ...u, password },
    });
    users.push(user);
  }

  console.log(`✓ Upserted ${users.length} users`);

  // Upsert projects
  const projectData = [
    { name: "ADD — Task Manager", key: "ADD", description: "Основная система управления задачами", ownerId: users[0].id },
    { name: "Мобильное приложение", key: "MOB", description: "iOS/Android клиент для ADD", ownerId: users[1].id },
    { name: "Аналитика v2", key: "ANA", description: "Переработка дашборда аналитики", ownerId: users[0].id },
  ];

  const projects = [];
  for (const p of projectData) {
    const project = await prisma.project.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description },
      create: p,
    });
    projects.push(project);
  }

  console.log(`✓ Upserted ${projects.length} projects`);

  // Upsert project members
  const membersData = [
    { projectId: projects[0].id, userId: users[0].id, role: Role.admin },
    { projectId: projects[0].id, userId: users[1].id, role: Role.lead },
    { projectId: projects[0].id, userId: users[2].id, role: Role.developer },
    { projectId: projects[0].id, userId: users[3].id, role: Role.developer },
    { projectId: projects[0].id, userId: users[4].id, role: Role.developer },
    { projectId: projects[1].id, userId: users[1].id, role: Role.lead },
    { projectId: projects[1].id, userId: users[2].id, role: Role.developer },
    { projectId: projects[1].id, userId: users[3].id, role: Role.developer },
    { projectId: projects[2].id, userId: users[0].id, role: Role.admin },
    { projectId: projects[2].id, userId: users[1].id, role: Role.lead },
    { projectId: projects[2].id, userId: users[2].id, role: Role.developer },
    { projectId: projects[2].id, userId: users[3].id, role: Role.developer },
  ];

  for (const m of membersData) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: m.projectId, userId: m.userId } },
      update: { role: m.role },
      create: m,
    });
  }

  console.log(`✓ Upserted ${membersData.length} project members`);

  // Upsert teams
  const frontendTeam = await prisma.team.upsert({
    where: { id: "seed-team-frontend" },
    update: { name: "Frontend Team", description: "React/Vue разработка" },
    create: { id: "seed-team-frontend", name: "Frontend Team", description: "React/Vue разработка" },
  });
  const backendTeam = await prisma.team.upsert({
    where: { id: "seed-team-backend" },
    update: { name: "Backend Team", description: "Node.js/Python разработка" },
    create: { id: "seed-team-backend", name: "Backend Team", description: "Node.js/Python разработка" },
  });

  console.log(`✓ Upserted 2 teams`);

  // Upsert team members
  const teamMembersData = [
    { teamId: frontendTeam.id, userId: users[0].id, role: Role.admin },
    { teamId: frontendTeam.id, userId: users[1].id, role: Role.lead },
    { teamId: frontendTeam.id, userId: users[2].id, role: Role.developer },
    { teamId: frontendTeam.id, userId: users[3].id, role: Role.developer },
    { teamId: backendTeam.id, userId: users[0].id, role: Role.admin },
    { teamId: backendTeam.id, userId: users[2].id, role: Role.developer },
    { teamId: backendTeam.id, userId: users[4].id, role: Role.developer },
  ];

  for (const m of teamMembersData) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: m.teamId, userId: m.userId } },
      update: { role: m.role },
      create: m,
    });
  }

  console.log(`✓ Upserted ${teamMembersData.length} team members`);

  // Upsert team-project assignments
  const teamProjectsData = [
    { teamId: frontendTeam.id, projectId: projects[0].id },
    { teamId: frontendTeam.id, projectId: projects[2].id },
    { teamId: backendTeam.id, projectId: projects[0].id },
    { teamId: backendTeam.id, projectId: projects[1].id },
  ];

  for (const tp of teamProjectsData) {
    await prisma.teamProject.upsert({
      where: { teamId_projectId: { teamId: tp.teamId, projectId: tp.projectId } },
      update: {},
      create: tp,
    });
  }

  console.log(`✓ Upserted ${teamProjectsData.length} team-project assignments`);

  // Upsert tags
  const tagData = [
    { name: "frontend", color: "#6366f1", projectId: projects[0].id, creatorId: users[0].id },
    { name: "backend", color: "#10b981", projectId: projects[0].id, creatorId: users[0].id },
    { name: "bug", color: "#ef4444", projectId: projects[0].id, creatorId: users[0].id },
    { name: "feature", color: "#22d3ee", projectId: projects[0].id, creatorId: users[0].id },
    { name: "auth", color: "#f59e0b", projectId: projects[0].id, creatorId: users[0].id },
    { name: "database", color: "#8b5cf6", projectId: projects[0].id, creatorId: users[0].id },
    { name: "api", color: "#ec4899", projectId: projects[0].id, creatorId: users[0].id },
    { name: "websocket", color: "#06b6d4", projectId: projects[0].id, creatorId: users[0].id },
  ];

  const tags = [];
  for (const t of tagData) {
    const tag = await prisma.tag.upsert({
      where: { projectId_name: { projectId: t.projectId, name: t.name } },
      update: { color: t.color },
      create: t,
    });
    tags.push(tag);
  }

  console.log(`✓ Upserted ${tags.length} tags`);

  // Upsert sprints
  const sprintData = [
    { name: "Спринт 1 — Основа", description: "Базовая инфраструктура и аутентификация", projectId: projects[0].id, startDate: new Date("2026-06-01"), endDate: new Date("2026-06-14"), isActive: false },
    { name: "Спринт 2 — Ядро", description: "Задачи, Kanban, уведомления", projectId: projects[0].id, startDate: new Date("2026-06-15"), endDate: new Date("2026-06-28"), isActive: true },
  ];

  const sprints = [];
  for (const s of sprintData) {
    const sprint = await prisma.sprint.upsert({
      where: { id: `seed-sprint-${s.name}` },
      update: { description: s.description, startDate: s.startDate, endDate: s.endDate, isActive: s.isActive },
      create: { ...s, id: `seed-sprint-${s.name}` },
    });
    sprints.push(sprint);
  }

  console.log(`✓ Upserted ${sprints.length} sprints`);

  // Create tasks (only if none exist for the project)
  const existingTaskCount = await prisma.task.count({ where: { projectId: projects[0].id } });
  if (existingTaskCount === 0) {
    const tasksData = [
      { title: "Реализовать JWT аутентификацию", description: "Access + refresh tokens, хранение в HttpOnly cookies", status: "DONE" as const, priority: "HIGH" as const, assigneeId: users[2].id, dueDate: new Date("2026-06-05"), tagIds: [tags[1].id, tags[4].id], sprintId: sprints[0].id },
      { title: "Kanban-доска с drag & drop", description: "Нативный HTML5 drag-and-drop без внешних библиотек", status: "DONE" as const, priority: "HIGH" as const, assigneeId: users[3].id, dueDate: new Date("2026-06-08"), tagIds: [tags[0].id, tags[3].id], sprintId: sprints[0].id },
      { title: "Prisma schema и миграции", description: "Полная схема БД с индексами и каскадными удалениями", status: "DONE" as const, priority: "CRITICAL" as const, assigneeId: users[2].id, dueDate: new Date("2026-06-03"), tagIds: [tags[1].id, tags[5].id], sprintId: sprints[0].id },
      { title: "REST API для задач", description: "CRUD endpoints, фильтрация по статусу/приоритету/исполнителю", status: "IN_REVIEW" as const, priority: "HIGH" as const, assigneeId: users[2].id, dueDate: new Date("2026-06-10"), tagIds: [tags[1].id, tags[6].id], sprintId: sprints[0].id },
      { title: "WebSocket уведомления", description: "Нативный ws для real-time обновлений", status: "IN_PROGRESS" as const, priority: "HIGH" as const, assigneeId: users[2].id, dueDate: new Date("2026-06-15"), tagIds: [tags[1].id, tags[7].id], sprintId: sprints[1].id },
      { title: "Дашборд аналитики", description: "Burn-down chart, velocity chart, pie-диаграммы", status: "IN_PROGRESS" as const, priority: "MEDIUM" as const, assigneeId: users[3].id, dueDate: new Date("2026-06-18"), tagIds: [tags[0].id, tags[3].id], sprintId: sprints[1].id },
      { title: "RBAC middleware", description: "Настройка guard'ов для ролей: admin, lead, developer", status: "IN_REVIEW" as const, priority: "CRITICAL" as const, assigneeId: users[1].id, dueDate: new Date("2026-06-12"), tagIds: [tags[1].id, tags[4].id], sprintId: sprints[1].id },
      { title: "Загрузка файлов-вложений", description: "@fastify/multipart + валидация типов, ограничение 10MB", status: "TODO" as const, priority: "MEDIUM" as const, assigneeId: users[3].id, dueDate: new Date("2026-06-20"), tagIds: [tags[0].id, tags[1].id], sprintId: sprints[1].id },
      { title: "Docker Compose конфигурация", description: "Контейнеры: frontend, backend, postgres, nginx", status: "IN_PROGRESS" as const, priority: "HIGH" as const, assigneeId: users[0].id, dueDate: new Date("2026-06-16"), tagIds: [tags[1].id], sprintId: sprints[1].id },
      { title: "Аудит-лог действий", description: "AsyncLocalStorage для логирования всех операций", status: "TODO" as const, priority: "LOW" as const, dueDate: new Date("2026-06-28"), tagIds: [tags[1].id, tags[5].id], sprintId: sprints[1].id },
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
  } else {
    console.log(`✓ Tasks already exist (${existingTaskCount}), skipping`);
  }

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
