# ADD — Task Management System

Система управления задачами с канбан-доской, аналитикой, real-time обновлениями и мульти-командной архитектурой.

## Технологии

### Backend
- **Runtime**: Node.js 20 + Fastify
- **БД**: PostgreSQL + Prisma ORM
- **Аутентификация**: JWT (jose) + bcrypt
- **Real-time**: WebSocket (ws)
- **Тестирование**: Vitest

### Frontend
- **Framework**: React 18 + React Router
- **Состояние**: Zustand
- **Сборка**: Vite
- **Стили**: Tailwind CSS
- **Иконки**: Lucide React

### Инфраструктура
- Docker Compose (4 сервиса)
- Nginx (reverse proxy + SPA)
- PostgreSQL (persistent volume)

## Архитектура

```
nginx (80/443)
  ├── /api → backend:3000
  ├── /ws → backend:3000 (WebSocket)
  └── /* → frontend:80

backend:3000
  ├── Fastify REST API
  ├── WebSocket server
  └── Prisma → PostgreSQL

frontend:80
  ├── Vite build → nginx
  └── SPA (client-side routing)
```

## Мульти-командная архитектура

Система поддерживает организационные команды для управления видимостью проектов:

- **Admin/Lead** — видят все проекты
- **Developer** — видят проекты, назначенные их команде, за вычетом исключений

### Модели данных
- `Team` — команда (Frontend Team, Backend Team)
- `TeamMember` — участник команды с ролью
- `TeamProject` — назначение команды на проект
- `ProjectExclusion` — исключение пользователя из проекта

### API Команд
```
GET    /api/teams           — список команд
POST   /api/teams           — создать команду
PATCH  /api/teams/:id       — обновить команду
DELETE /api/teams/:id       — удалить команду
POST   /api/teams/:id/members       — добавить участника
DELETE /api/teams/:id/members/:mid  — удалить участника
POST   /api/teams/:id/projects      — назначить проект
DELETE /api/teams/:id/projects/:pid — отвязать проект
```

### API Исключений
```
GET    /api/projects/:id/exclusions       — список исключений
POST   /api/projects/:id/exclusions       — добавить исключение
DELETE /api/projects/:id/exclusions/:eid  — удалить исключение
```

## Запуск

### Docker (продакшен)
```bash
docker compose up -d
```
Открой `http://localhost`.

### Локальная разработка

**Backend:**
```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

**Frontend:**
```bash
cd Frontend
npm install
npm run dev
```

## Переменные окружения

Скопируй и отредактируй `.env.example` → `.env`:

```bash
cp .env.example .env
```

| Переменная | Описание | Обязательна |
|---|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL | Да |
| `JWT_SECRET` | Секрет для access токенов | Да |
| `JWT_REFRESH_SECRET` | Секрет для refresh токенов | Да |
| `SMTP_HOST` | SMTP сервер для писем | Нет |
| `SMTP_PORT` | Порт SMTP | Нет |
| `SMTP_USER` | Пользователь SMTP | Нет |
| `SMTP_PASS` | Пароль SMTP | Нет |

## Тестовые аккаунты

| Email | Пароль | Роль |
|---|---|---|
| a.smirnov@add.dev | password123 | Администратор |
| m.petrova@add.dev | password123 | Тимлид |
| d.kozlov@add.dev | password123 | Разработчик |
| a.novikova@add.dev | password123 | Разработчик |
| s.ivanov@add.dev | password123 | Разработчик |

## API Endpoints

### Аутентификация
```
POST   /api/auth/login      — вход
POST   /api/auth/register   — регистрация
POST   /api/auth/refresh    — обновление токена
GET    /api/auth/me         — текущий пользователь
```

### Проекты
```
GET    /api/projects        — список проектов (с фильтрацией по ролям)
POST   /api/projects        — создать проект
GET    /api/projects/:id    — получить проект
PATCH  /api/projects/:id    — обновить проект
DELETE /api/projects/:id    — удалить проект
POST   /api/projects/:id/members  — добавить участника
DELETE /api/projects/:id/members/:uid — удалить участника
```

### Задачи
```
GET    /api/tasks           — список задач
POST   /api/tasks           — создать задачу
PATCH  /api/tasks/:id       — обновить задачу
DELETE /api/tasks/:id       — удалить задачу
PATCH  /api/tasks/:id/status — изменить статус
PATCH  /api/tasks/:id/assign — назначить исполнителя
```

### Команды
```
GET    /api/teams           — список команд
POST   /api/teams           — создать команду
GET    /api/teams/:id       — получить команду
PATCH  /api/teams/:id       — обновить команду
DELETE /api/teams/:id       — удалить команду
POST   /api/teams/:id/members       — добавить участника
DELETE /api/teams/:id/members/:mid  — удалить участника
POST   /api/teams/:id/projects      — назначить проект
DELETE /api/teams/:id/projects/:pid — отвязать проект
```

### Пользователи
```
GET    /api/users           — список пользователей
GET    /api/users/search    — поиск пользователей
DELETE /api/users/:id       — удалить пользователя (soft delete)
```

### Аналитика
```
GET    /api/analytics/burndown   — график сгорания
GET    /api/analytics/velocity   — скорость команды
GET    /api/analytics/tasks      — статистика задач
GET    /api/analytics/export/csv — экспорт в CSV
```

### Прочее
```
GET    /api/health          — проверка здоровья
GET    /api/search          — глобальный поиск
GET    /api/tags            — теги проекта
GET    /api/sprints         — спринты проекта
GET    /api/audit           — аудит-лог
GET    /api/notifications   — уведомления
GET    /api/notifications/unread — непрочитанные
PATCH  /api/notifications/:id/read — пометить прочитанным
```

## Структура проекта

```
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          — аутентификация
│   │   │   ├── projects/      — проекты
│   │   │   ├── tasks/         — задачи
│   │   │   ├── teams/         — команды
│   │   │   ├── users/         — пользователи
│   │   │   ├── analytics/     — аналитика
│   │   │   ├── sprints/       — спринты
│   │   │   ├── tags/          — теги
│   │   │   ├── comments/      — комментарии
│   │   │   ├── attachments/   — вложения
│   │   │   ├── audit/         — аудит-лог
│   │   │   └── notifications/ — уведомления
│   │   ├── common/
│   │   │   ├── middleware/     — middleware
│   │   │   └── validation/    — валидация (Zod)
│   │   ├── prisma/
│   │   │   ├── schema.prisma  — схема БД
│   │   │   └── seed.ts        — заполнение тестовыми данными
│   │   ├── config.ts          — конфигурация
│   │   ├── websocket.ts       — WebSocket сервер
│   │   └── main.ts            — точка входа
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/           — API клиент
│   │   │   ├── components/    — React компоненты
│   │   │   ├── hooks/         — кастомные хуки
│   │   │   ├── stores/        — Zustand stores
│   │   │   ├── utils/         — утилиты
│   │   │   ├── types/         — TypeScript типы
│   │   │   └── routes.tsx     — маршруты
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── nginx.conf
├── .env
└── MAIN PROMT.MD              — спека проекта
```

## Команды

```bash
# Запуск всех сервисов
docker compose up -d

# Просмотр логов
docker compose logs -f backend

# Остановка
docker compose down

# Сброс данных
docker compose down -v

# Тесты
cd backend && npm test

# Пересборка backend
docker compose up -d --build backend

# Пересборка frontend
docker compose up -d --build frontend
```
