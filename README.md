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
- Docker Compose (пять сервисов, включая плановое резервное копирование)
- Nginx (reverse proxy + SPA + TLS)
- PostgreSQL (persistent data volume)
- Ежедневные резервные копии в отдельном Docker-томе с хранением за семь дней

## Архитектура

```
nginx (HTTP 80 → HTTPS 443)
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

## Команды и доступ к проектам

Команды объединяют сотрудников и могут быть связаны с проектами. Права на проект задаются отдельно:

- **Admin/Lead** — видят все проекты
- **Developer** — видит проект, если добавлен непосредственно в его участники и не исключён из проекта
- Связь команды с проектом сама по себе не открывает участникам команды доступ к задачам

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

Вложения хранятся в именованном томе `uploads_data`, подключённом к `/app/uploads`.
Пересоздание backend не удаляет этот том; `docker compose down -v` удаляет тома и данные.
Контейнер `backup` создаёт отдельные архивы PostgreSQL и вложений в `postgres_backups`.
Оба архива одной даты нужно сохранять и восстанавливать вместе.
Файлы скачиваются через `/api/attachments/:id/download` после проверки токена и доступа к проекту;
прямой адрес `/uploads/...` закрыт.

Backend в Compose запускает только сервер: автоматический seed и `db push --accept-data-loss`
при каждом старте отключены. Для новой пустой базы перед запуском backend выполните
`docker compose run --rm backend npx prisma migrate deploy --schema=./src/prisma/schema.prisma`.
Миграция `20261109190000_align_schema` добавляет таблицы, которых не было в прежней истории
миграций. Если существующую базу ранее обновляли через `prisma db push`, перед применением
миграций необходимо отдельно сопоставить её фактическую схему с историей миграций.
Не запускайте `migrate deploy` вслепую на такой базе: уже созданные таблицы вызовут конфликт.
В проверенной работающей базе таблицы `_prisma_migrations` нет, но сравнение Prisma
с текущей моделью не выявило различий в схеме. Дамп этой базы был восстановлен
в отдельный PostgreSQL 15: после отметки пяти миграций как применённых `migrate status`
показал актуальное состояние, а `migrate diff` не нашёл различий. Исходная база
не менялась. Перед повторением процедуры на рабочей базе сохраните её резервную
копию и ещё раз проверьте соответствие схемы; не запускайте на ней `migrate deploy`
до базирования истории. Порядок отметки миграций на проверенной копии:

```bash
npx prisma migrate resolve --applied 20260612110047_init --schema=src/prisma/schema.prisma
npx prisma migrate resolve --applied 20260619001000_remove_viewer_role --schema=src/prisma/schema.prisma
npx prisma migrate resolve --applied 20260619010000_add_sprint --schema=src/prisma/schema.prisma
npx prisma migrate resolve --applied 20260915183000_add_time_entries --schema=src/prisma/schema.prisma
npx prisma migrate resolve --applied 20261109190000_align_schema --schema=src/prisma/schema.prisma
npx prisma migrate status --schema=src/prisma/schema.prisma
```
Порт PostgreSQL в Compose доступен только с самого хоста (`127.0.0.1:5432`).
Демонстрационные данные добавляйте только в тестовую базу отдельной командой
`docker compose run --rm backend tsx src/prisma/seed.ts`.

### Docker (продакшен)
```bash
docker compose up -d
```
Открой `https://localhost`. Перед запуском положи сертификат и закрытый ключ в `ssl/cert.pem` и `ssl/key.pem`. Для локальной проверки подойдёт самоподписанный сертификат; браузер покажет предупреждение. Для рабочего развёртывания используй сертификат своей организации.

Резервные копии базы (`add_*.dump`) и вложений (`uploads_*.tar.gz`) создаются контейнером `backup` раз в сутки в Docker-том `postgres_backups`; архивы старше семи дней удаляются. Интервал и срок хранения настраиваются через `BACKUP_INTERVAL` (секунды) и `BACKUP_RETENTION_DAYS`.
Для проверки восстановления используйте отдельную тестовую базу и отдельный каталог файлов, затем сверьте записи `Attachment` с извлечёнными файлами. Не восстанавливайте архив поверх рабочей базы.

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
| `BACKUP_INTERVAL` | Интервал резервного копирования в секундах | Нет |
| `BACKUP_RETENTION_DAYS` | Срок хранения резервных копий в днях | Нет |

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
