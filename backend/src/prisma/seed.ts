import { PrismaClient, Role, TaskPriority, TaskStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const password = await bcrypt.hash("password123", 12);

  // ---------------------------------------------------------------------------
  // Очистка устаревших демо-данных (больше не входят в демо-набор)
  // ---------------------------------------------------------------------------
  const staleProjects = await prisma.project.deleteMany({ where: { key: { in: ["MOB", "ANA"] } } });
  if (staleProjects.count > 0) console.log(`✓ Removed ${staleProjects.count} stale project(s)`);

  const staleTeams = await prisma.team.deleteMany({ where: { id: { in: ["seed-team-frontend", "seed-team-backend"] } } });
  if (staleTeams.count > 0) console.log(`✓ Removed ${staleTeams.count} stale team(s)`);

  // ---------------------------------------------------------------------------
  // Пользователи — одна компания, общий набор аккаунтов
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Проекты: IT-отдел и инженерный отдел (техкарты FS ОТ)
  // ---------------------------------------------------------------------------
  const projectData = [
    {
      name: "ADD — Task Manager",
      key: "ADD",
      description: "Разработка корпоративной системы управления задачами",
      ownerId: users[0].id,
    },
    {
      name: "Техкарты — FS ОТ",
      key: "FS",
      description: "Разработка технологических карт на узлы машины FS ОТ",
      ownerId: users[1].id,
    },
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

  // ---------------------------------------------------------------------------
  // Участники проектов
  // ---------------------------------------------------------------------------
  const membersData = [
    // Отдел IT: руководитель + команда разработки
    { projectId: projects[0].id, userId: users[0].id, role: Role.admin },
    { projectId: projects[0].id, userId: users[1].id, role: Role.lead },
    { projectId: projects[0].id, userId: users[2].id, role: Role.developer },
    { projectId: projects[0].id, userId: users[3].id, role: Role.developer },
    { projectId: projects[0].id, userId: users[4].id, role: Role.developer },
    // Инженерный отдел: начальник отдела + разработчики техкарт
    { projectId: projects[1].id, userId: users[1].id, role: Role.lead },
    { projectId: projects[1].id, userId: users[2].id, role: Role.developer },
    { projectId: projects[1].id, userId: users[3].id, role: Role.developer },
    { projectId: projects[1].id, userId: users[4].id, role: Role.developer },
  ];

  for (const m of membersData) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: m.projectId, userId: m.userId } },
      update: { role: m.role },
      create: m,
    });
  }

  console.log(`✓ Upserted ${membersData.length} project members`);

  // ---------------------------------------------------------------------------
  // Команды (отделы)
  // ---------------------------------------------------------------------------
  const devTeam = await prisma.team.upsert({
    where: { id: "seed-team-dev" },
    update: { name: "Отдел разработки", description: "Разработка и поддержка ADD" },
    create: { id: "seed-team-dev", name: "Отдел разработки", description: "Разработка и поддержка ADD" },
  });
  const techTeam = await prisma.team.upsert({
    where: { id: "seed-team-tech" },
    update: { name: "Отдел техдокументации", description: "Технологические карты и регламенты" },
    create: { id: "seed-team-tech", name: "Отдел техдокументации", description: "Технологические карты и регламенты" },
  });

  console.log(`✓ Upserted 2 teams`);

  // Участники команд
  const teamMembersData = [
    { teamId: devTeam.id, userId: users[0].id, role: Role.admin },
    { teamId: devTeam.id, userId: users[1].id, role: Role.lead },
    { teamId: devTeam.id, userId: users[2].id, role: Role.developer },
    { teamId: devTeam.id, userId: users[3].id, role: Role.developer },
    { teamId: devTeam.id, userId: users[4].id, role: Role.developer },
    { teamId: techTeam.id, userId: users[1].id, role: Role.lead },
    { teamId: techTeam.id, userId: users[2].id, role: Role.developer },
    { teamId: techTeam.id, userId: users[3].id, role: Role.developer },
    { teamId: techTeam.id, userId: users[4].id, role: Role.developer },
  ];

  for (const m of teamMembersData) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: m.teamId, userId: m.userId } },
      update: { role: m.role },
      create: m,
    });
  }

  console.log(`✓ Upserted ${teamMembersData.length} team members`);

  // Связь команд с проектами
  const teamProjectsData = [
    { teamId: devTeam.id, projectId: projects[0].id },
    { teamId: techTeam.id, projectId: projects[1].id },
  ];

  for (const tp of teamProjectsData) {
    await prisma.teamProject.upsert({
      where: { teamId_projectId: { teamId: tp.teamId, projectId: tp.projectId } },
      update: {},
      create: tp,
    });
  }

  console.log(`✓ Upserted ${teamProjectsData.length} team-project assignments`);

  // ---------------------------------------------------------------------------
  // Теги
  // ---------------------------------------------------------------------------
  const tagData = [
    // ADD
    { name: "frontend", color: "#6366f1", projectId: projects[0].id, creatorId: users[0].id },
    { name: "backend", color: "#10b981", projectId: projects[0].id, creatorId: users[0].id },
    { name: "bug", color: "#ef4444", projectId: projects[0].id, creatorId: users[0].id },
    { name: "feature", color: "#22d3ee", projectId: projects[0].id, creatorId: users[0].id },
    { name: "auth", color: "#f59e0b", projectId: projects[0].id, creatorId: users[0].id },
    { name: "database", color: "#8b5cf6", projectId: projects[0].id, creatorId: users[0].id },
    { name: "api", color: "#ec4899", projectId: projects[0].id, creatorId: users[0].id },
    { name: "websocket", color: "#06b6d4", projectId: projects[0].id, creatorId: users[0].id },
    // Техкарты FS ОТ
    { name: "техкарта", color: "#6366f1", projectId: projects[1].id, creatorId: users[1].id },
    { name: "узел", color: "#10b981", projectId: projects[1].id, creatorId: users[1].id },
    { name: "чертёж", color: "#22d3ee", projectId: projects[1].id, creatorId: users[1].id },
    { name: "согласование", color: "#f59e0b", projectId: projects[1].id, creatorId: users[1].id },
    { name: "испытания", color: "#ef4444", projectId: projects[1].id, creatorId: users[1].id },
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

  // ---------------------------------------------------------------------------
  // Спринты / этапы
  // ---------------------------------------------------------------------------
  const sprintData = [
    // ADD
    {
      id: "seed-sprint-add-1",
      name: "Спринт 1 — Основа",
      description: "Базовая инфраструктура и аутентификация",
      projectId: projects[0].id,
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-14"),
      isActive: false,
    },
    {
      id: "seed-sprint-add-2",
      name: "Спринт 2 — Ядро",
      description: "Задачи, Kanban, уведомления",
      projectId: projects[0].id,
      startDate: new Date("2026-06-15"),
      endDate: new Date("2026-06-28"),
      isActive: true,
    },
    // Техкарты FS ОТ
    {
      id: "seed-sprint-fs-1",
      name: "Этап 1 — Разработка техкарт",
      description: "Разработка технологических карт на узлы машины FS ОТ",
      projectId: projects[1].id,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-08-15"),
      isActive: true,
    },
    {
      id: "seed-sprint-fs-2",
      name: "Этап 2 — Согласование и сдача",
      description: "Согласование техкарт и передача в производство",
      projectId: projects[1].id,
      startDate: new Date("2026-08-16"),
      endDate: new Date("2026-09-30"),
      isActive: false,
    },
  ];

  const sprints = [];
  for (const s of sprintData) {
    const sprint = await prisma.sprint.upsert({
      where: { id: s.id },
      update: { name: s.name, description: s.description, startDate: s.startDate, endDate: s.endDate, isActive: s.isActive },
      create: s,
    });
    sprints.push(sprint);
  }

  console.log(`✓ Upserted ${sprints.length} sprints`);

  // ---------------------------------------------------------------------------
  // Задачи
  // ---------------------------------------------------------------------------

  // --- Задачи ADD (создаются только при пустом проекте) ---
  const addTaskCount = await prisma.task.count({ where: { projectId: projects[0].id } });
  if (addTaskCount === 0) {
    const addTasks = [
      {
        title: "Реализовать JWT аутентификацию",
        description: "Access + refresh tokens, хранение в HttpOnly cookies",
        status: TaskStatus.DONE, priority: TaskPriority.HIGH,
        assigneeId: users[2].id, dueDate: new Date("2026-06-05"),
        tagIds: [tags[1].id, tags[4].id], sprintId: sprints[0].id,
      },
      {
        title: "Kanban-доска с drag & drop",
        description: "Нативный HTML5 drag-and-drop без внешних библиотек",
        status: TaskStatus.DONE, priority: TaskPriority.HIGH,
        assigneeId: users[3].id, dueDate: new Date("2026-06-08"),
        tagIds: [tags[0].id, tags[3].id], sprintId: sprints[0].id,
      },
      {
        title: "Prisma schema и миграции",
        description: "Полная схема БД с индексами и каскадными удалениями",
        status: TaskStatus.DONE, priority: TaskPriority.CRITICAL,
        assigneeId: users[2].id, dueDate: new Date("2026-06-03"),
        tagIds: [tags[1].id, tags[5].id], sprintId: sprints[0].id,
      },
      {
        title: "REST API для задач",
        description: "CRUD endpoints, фильтрация по статусу, приоритету и исполнителю",
        status: TaskStatus.IN_REVIEW, priority: TaskPriority.HIGH,
        assigneeId: users[2].id, dueDate: new Date("2026-06-10"),
        tagIds: [tags[1].id, tags[6].id], sprintId: sprints[0].id,
      },
      {
        title: "WebSocket уведомления",
        description: "Нативный ws для real-time обновлений",
        status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH,
        assigneeId: users[2].id, dueDate: new Date("2026-06-15"),
        tagIds: [tags[1].id, tags[7].id], sprintId: sprints[1].id,
      },
      {
        title: "Дашборд аналитики",
        description: "Burn-down chart, velocity chart, диаграммы",
        status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM,
        assigneeId: users[3].id, dueDate: new Date("2026-06-18"),
        tagIds: [tags[0].id, tags[3].id], sprintId: sprints[1].id,
      },
      {
        title: "RBAC middleware",
        description: "Настройка защитных пре-хендлеров для ролей: admin, lead, developer",
        status: TaskStatus.IN_REVIEW, priority: TaskPriority.CRITICAL,
        assigneeId: users[1].id, dueDate: new Date("2026-06-12"),
        tagIds: [tags[1].id, tags[4].id], sprintId: sprints[1].id,
      },
      {
        title: "Загрузка файлов-вложений",
        description: "@fastify/multipart + валидация типов, ограничение 10MB",
        status: TaskStatus.TODO, priority: TaskPriority.MEDIUM,
        assigneeId: users[3].id, dueDate: new Date("2026-06-20"),
        tagIds: [tags[0].id, tags[1].id], sprintId: sprints[1].id,
      },
      {
        title: "Docker Compose конфигурация",
        description: "Контейнеры: frontend, backend, postgres, nginx",
        status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH,
        assigneeId: users[0].id, dueDate: new Date("2026-06-16"),
        tagIds: [tags[1].id], sprintId: sprints[1].id,
      },
      {
        title: "Аудит-лог действий",
        description: "Логирование всех операций в журнал аудита",
        status: TaskStatus.TODO, priority: TaskPriority.LOW,
        assigneeId: null, dueDate: new Date("2026-06-28"),
        tagIds: [tags[1].id, tags[5].id], sprintId: sprints[1].id,
      },
    ];

    for (let i = 0; i < addTasks.length; i++) {
      const { tagIds, ...taskData } = addTasks[i];
      await prisma.task.create({
        data: {
          ...taskData,
          projectId: projects[0].id,
          authorId: users[0].id,
          position: i,
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
      });
    }

    console.log(`✓ Created ${addTasks.length} ADD tasks`);
  } else {
    console.log(`✓ ADD tasks already exist (${addTaskCount}), skipping`);
  }

  // --- Задачи техкарт FS ОТ (создаются только при пустом проекте) ---
  const fsTaskCount = await prisma.task.count({ where: { projectId: projects[1].id } });
  if (fsTaskCount === 0) {
    const fsTasks = [
      {
        title: "Техкарта: узел «Роликопровод»",
        description: "Разработать технологическую карту на ремонт узла «Роликопровод»: разборка, дефектовка, сборка, испытания",
        status: TaskStatus.DONE, priority: TaskPriority.MEDIUM,
        assigneeId: users[4].id, dueDate: new Date("2026-07-05"),
        tagIds: [tags[8].id, tags[9].id, tags[12].id], sprintId: sprints[2].id,
      },
      {
        title: "Техкарта: узел «Привод главного вала»",
        description: "Карта на ремонт привода главного вала с допусками на биение и посадки",
        status: TaskStatus.IN_REVIEW, priority: TaskPriority.HIGH,
        assigneeId: users[2].id, dueDate: new Date("2026-07-20"),
        tagIds: [tags[8].id, tags[9].id, tags[10].id], sprintId: sprints[2].id,
      },
      {
        title: "Техкарта: узел «Система смазки»",
        description: "Карта на обслуживание и ремонт системы смазки: замена фильтров, проверка магистралей",
        status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM,
        assigneeId: users[3].id, dueDate: new Date("2026-08-05"),
        tagIds: [tags[8].id, tags[9].id], sprintId: sprints[2].id,
      },
      {
        title: "Техкарта: узел «Гидросистема»",
        description: "Карта на ремонт гидросистемы: замена уплотнений, обкатка, проверка давления",
        status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH,
        assigneeId: users[4].id, dueDate: new Date("2026-08-10"),
        tagIds: [tags[8].id, tags[9].id], sprintId: sprints[2].id,
      },
      {
        title: "Техкарта: узел «Электрооборудование»",
        description: "Карта на диагностику и замену электрооборудования станции управления",
        status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM,
        assigneeId: users[2].id, dueDate: new Date("2026-08-15"),
        tagIds: [tags[8].id, tags[9].id], sprintId: sprints[2].id,
      },
      {
        title: "Техкарта: узел «Защитный кожух»",
        description: "Карта на снятие/установку защитного кожуха и ограждений, проверка креплений",
        status: TaskStatus.TODO, priority: TaskPriority.LOW,
        assigneeId: users[3].id, dueDate: new Date("2026-08-25"),
        tagIds: [tags[8].id, tags[10].id], sprintId: sprints[3].id,
      },
      {
        title: "Согласование техкарт с главным инженером",
        description: "Организовать согласование готовых техкарт, внести правки по замечаниям",
        status: TaskStatus.TODO, priority: TaskPriority.HIGH,
        assigneeId: users[1].id, dueDate: new Date("2026-09-05"),
        tagIds: [tags[11].id], sprintId: sprints[3].id,
      },
      {
        title: "Контроль комплектации по узлам 1–3",
        description: "Сверить фактические комплектации узлов с утверждёнными техкартами",
        status: TaskStatus.TODO, priority: TaskPriority.MEDIUM,
        assigneeId: users[4].id, dueDate: new Date("2026-09-20"),
        tagIds: [tags[8].id, tags[12].id], sprintId: sprints[3].id,
      },
    ];

    for (let i = 0; i < fsTasks.length; i++) {
      const { tagIds, ...taskData } = fsTasks[i];
      await prisma.task.create({
        data: {
          ...taskData,
          projectId: projects[1].id,
          authorId: users[1].id,
          position: i,
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
      });
    }

    console.log(`✓ Created ${fsTasks.length} FS tasks`);
  } else {
    console.log(`✓ FS tasks already exist (${fsTaskCount}), skipping`);
  }

  // ---------------------------------------------------------------------------
  // Подзадачи (чек-листы операций) — создаются только если у задачи их ещё нет
  // ---------------------------------------------------------------------------
  const subtaskSets: [string, { title: string; completed?: boolean }[]][] = [
    [
      "Техкарта: узел «Гидросистема»",
      [
        { title: "Снять узел с машины", completed: true },
        { title: "Дефектовка узла", completed: true },
        { title: "Замена уплотнений" },
        { title: "Сборка и обкатка" },
        { title: "Проверка рабочего давления" },
      ],
    ],
    [
      "Техкарта: узел «Привод главного вала»",
      [
        { title: "Разборка узла", completed: true },
        { title: "Замер биения вала", completed: true },
        { title: "Замена подшипников", completed: true },
        { title: "Сборка и контроль посадок" },
      ],
    ],
    [
      "Техкарта: узел «Электрооборудование»",
      [
        { title: "Диагностика станции управления", completed: true },
        { title: "Замена кабелей" },
        { title: "Проверка изоляции" },
      ],
    ],
    [
      "Техкарта: узел «Система смазки»",
      [
        { title: "Слив масла" },
        { title: "Замена фильтров" },
        { title: "Проверка магистралей" },
      ],
    ],
    [
      "Аудит-лог действий",
      [
        { title: "Спроектировать схему журнала" },
        { title: "Запись операций" },
        { title: "Вывод в интерфейсе" },
      ],
    ],
    [
      "Docker Compose конфигурация",
      [
        { title: "Составить docker-compose.yml" },
        { title: "Настроить nginx.conf" },
        { title: "Проверить связку контейнеров" },
      ],
    ],
  ];

  let subtaskCount = 0;
  for (const [title, items] of subtaskSets) {
    subtaskCount += await seedSubtasks(title, items);
  }
  if (subtaskCount > 0) console.log(`✓ Created ${subtaskCount} subtasks`);

  // ---------------------------------------------------------------------------
  // Связи задач (зависимости) — создаются только если их ещё нет
  // ---------------------------------------------------------------------------
  await seedTaskLink("Согласование техкарт с главным инженером", "Контроль комплектации по узлам 1–3", "blocks");
  await seedTaskLink("Техкарта: узел «Электрооборудование»", "Техкарта: узел «Защитный кожух»", "blocks");
  await seedTaskLink("Техкарта: узел «Привод главного вала»", "Техкарта: узел «Гидросистема»", "related");
  console.log("✓ Task links seeded");

  console.log("✓ Seed completed!");
}

// ---------------------------------------------------------------------------
// Подзадачи (чек-листы операций) — создаются только если у задачи их ещё нет
// ---------------------------------------------------------------------------
async function seedSubtasks(taskTitle: string, items: { title: string; completed?: boolean }[]) {
  const task = await prisma.task.findFirst({
    where: { title: taskTitle },
    include: { subtasks: { take: 1 } },
  });
  if (!task) return 0;
  if (task.subtasks.length > 0) return 0;
  await prisma.subtask.createMany({
    data: items.map((it, i) => ({
      taskId: task.id,
      title: it.title,
      completed: it.completed ?? false,
      position: i,
    })),
  });
  return items.length;
}

// ---------------------------------------------------------------------------
// Связи задач (зависимости) — создаются только если их ещё нет
// ---------------------------------------------------------------------------
async function seedTaskLink(sourceTitle: string, targetTitle: string, type: string) {
  const source = await prisma.task.findFirst({ where: { title: sourceTitle } });
  const target = await prisma.task.findFirst({ where: { title: targetTitle } });
  if (!source || !target) return;
  const existing = await prisma.taskLink.findUnique({
    where: { sourceTaskId_targetTaskId_type: { sourceTaskId: source.id, targetTaskId: target.id, type } },
  });
  if (existing) return;
  await prisma.taskLink.create({
    data: { sourceTaskId: source.id, targetTaskId: target.id, type },
  });
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });