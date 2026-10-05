# ADD — система управления задачами

Веб-приложение для управления задачами в команде. Поддерживает канбан-доску, спринты, встроенный таймер учёта трудозатрат, подзадачи-чек-листы, связи задач с контролем зависимостей, аналитику, уведомления в реальном времени, многопользовательскую работу и ролевую модель доступа с возможностью настраивать названия ролей.

## Технологии

### Backend
- **Язык/платформа**: Node.js 20, TypeScript
- **Фреймворк**: Fastify 5
- **База данных**: PostgreSQL 16 + Prisma ORM
- **Аутентификация**: JWT (jose), bcrypt
- **Реальное время**: WebSocket (ws)
- **Валидация**: Zod
- **Тестирование**: Vitest

### Frontend
- **Фреймворк**: React 18 + React Router v6
- **Управление состоянием**: Zustand
- **Сборка**: Vite 5
- **Стили**: Tailwind CSS v4
- **Иконки**: Lucide React
- **Клиент WS**: ws/socket.io-client

### Инфраструктура
- Docker, Docker Compose
- Nginx (reverse proxy, раздача статики SPA)
- PostgreSQL (том для хранения данных)

## Архитектура

```text
nginx (80/443)
  ├── /api  → backend:3000 (REST API)
  ├── /ws   → backend:3000 (WebSocket)
  └── /*    → frontend:80 (SPA)

backend (3000)
  ├── Fastify REST API
  ├── WebSocket-сервер
  └── Prisma ORM → PostgreSQL (5432)

frontend (80)
  └── Собранный статический бандл Vite (отдаётся через Nginx)
```

Всё разворачивается одним набором контейнеров через `docker compose`.

## Возможности

- Канбан-доска с перетаскиванием карточек задач между колонками
- Спринты с ручным завершением и возвратом незавершённых задач в бэклог
- Таймер учёта трудозатрат с сохранением истории по задачам
- Подзадачи-чек-листы с автоматическим расчётом прогресса
- Связи задач (типы «блокирует» и «связана») с жёстким запретом перевода заблокированной задачи в работу
- Ролевая модель (Администратор, Руководитель, Исполнитель) с возможностью настраивать отображаемые названия ролей
- Приглашения в систему по электронной почте
- Комментарии, вложения и уведомления в реальном времени
- Аналитика: burn-down, velocity, распределение задач, трудозатраты
- Глобальный поиск, фильтры, календарь, диаграмма Ганта
- Журнал аудита действий пользователей

## Мульти-командная архитектура

Система позволяет объединять пользователей в команды и управлять видимостью проектов:

- **Администратор / Руководитель** — видят все проекты
- **Исполнитель** — видит проекты, назначенные его команде, за исключением тех, где он добавлен в список исключений

### Сущности
- `Team` — команда
- `TeamMember` — участник команды с ролью
- `TeamProject` — привязка проекта к команде
- `ProjectExclusion` — исключение отдельного пользователя из проекта

## Запуск

### Через Docker (основной вариант)

```bash
docker compose up -d
```

После запуска приложение будет доступно по адресу: [http://localhost](http://localhost)

### Локальная разработка

**Backend:**
```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

**Frontend:**
```bash
cd Frontend
npm install
npm run dev
```

Фронтенд в режиме разработки будет доступен по адресу `http://localhost:5173`, бэкенд — `http://localhost:3000`.

## Переменные окружения

Для запуска нужно создать `.env` на основе шаблона:

```bash
cp .env.example .env
```

| Переменная | Назначение | Обязательна |
|---|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL | Да |
| `JWT_SECRET` | Секрет для access-токенов | Да |
| `JWT_REFRESH_SECRET` | Секрет для refresh-токенов | Да |
| `SMTP_HOST` | SMTP-сервер для отправки приглашений | Нет |
| `SMTP_PORT` | Порт SMTP | Нет |
| `SMTP_USER` | Логин SMTP | Нет |
| `SMTP_PASS` | Пароль SMTP | Нет |
| `PORT` | Порт бэкенда (по умолчанию 3000) | Нет |

## Демонстрационные данные

После `npx prisma db seed` создаются тестовые аккаунты:

| E-mail | Пароль | Роль |
|---|---|---|
| a.smirnov@add.dev | password123 | Администратор |
| m.petrova@add.dev | password123 | Руководитель |
| d.kozlov@add.dev | password123 | Исполнитель |
| a.novikova@add.dev | password123 | Исполнитель |
| s.ivanov@add.dev | password123 | Исполнитель |

## Основные API-эндпоинты

### Аутентификация
```http
POST   /api/auth/login      — вход
POST   /api/auth/refresh    — обновление токена
GET    /api/auth/me         — текущий пользователь
```

### Проекты
```http
GET    /api/projects                       — список проектов
POST   /api/projects                       — создать проект
GET    /api/projects/:id                   — получить проект
PATCH  /api/projects/:id                   — изменить проект
DELETE /api/projects/:id                   — удалить проект
POST   /api/projects/:id/members           — добавить участника
DELETE /api/projects/:id/members/:uid      — удалить участника
```

### Задачи
```http
GET    /api/tasks                — список задач
POST   /api/tasks                — создать задачу
GET    /api/tasks/:id            — получить задачу
PATCH  /api/tasks/:id            — изменить задачу
DELETE /api/tasks/:id            — удалить задачу
PATCH  /api/tasks/:id/status     — изменить статус
PATCH  /api/tasks/:id/assign     — назначить исполнителя
```

### Спринты
```http
GET    /api/sprints              — список спринтов
POST   /api/sprints              — создать спринт
PATCH  /api/sprints/:id          — изменить спринт
POST   /api/sprints/:id/complete — завершить спринт
DELETE /api/sprints/:id          — удалить спринт
```

### Таймер трудозатрат
```http
POST   /api/time-tracking/start  — запустить таймер
POST   /api/time-tracking/stop   — остановить таймер
GET    /api/time-tracking/active — активный таймер
GET    /api/time-tracking        — история записей времени
```

### Аналитика
```http
GET    /api/analytics/burndown   — burn-down
GET    /api/analytics/velocity   — velocity
GET    /api/analytics/tasks      — статистика по задачам
GET    /api/analytics/export/csv — экспорт в CSV
```

### Пользователи, команды, уведомления, аудит
```http
GET    /api/users                — список пользователей
GET    /api/users/search         — поиск пользователей
PATCH  /api/users/:id/role       — изменить роль пользователя
GET    /api/teams                — команды
GET    /api/notifications        — уведомления
PATCH  /api/notifications/:id/read — отметить прочитанным
GET    /api/audit                — журнал аудита
GET    /api/health               — проверка работоспособности
```

## Структура проекта

```text
├── backend/
│   ├── src/
│   │   ├── modules/           — бизнес-модули (auth, tasks, projects, sprints, ...)
│   │   ├── common/            — middleware, утилиты, обработка ошибок
│   │   ├── prisma/            — схема БД, миграции, сиды
│   │   ├── config/            — конфигурация, WebSocket
│   │   ├── main.ts            — точка входа
│   │   └── types/             — типы
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/           — клиент API
│   │   │   ├── components/    — React-компоненты
│   │   │   ├── hooks/         — хуки
│   │   │   ├── stores/        — хранилища Zustand
│   │   │   ├── types/         — типы TypeScript
│   │   │   ├── utils/         — утилиты
│   │   │   └── routes.tsx     — маршрутизация
│   ├── Dockerfile
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml
├── nginx.conf
├── .env.example
└── README.md
```

## Полезные команды

```bash
# Запуск всех сервисов в фоне
docker compose up -d

# Просмотр логов бэкенда
docker compose logs -f backend

# Остановка сервисов
docker compose down

# Остановка с удалением томов (очистка БД)
docker compose down -v

# Пересборка и перезапуск бэкенда
docker compose up -d --build backend

# Пересборка и перезапуск фронтенда
docker compose up -d --build frontend

# Тесты бэкенда
cd backend && npm test
```