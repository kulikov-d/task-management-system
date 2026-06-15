# ADD — Task Management System

Система управления задачами с канбан-доской, аналитикой и real-time обновлениями.

## Запуск через Docker

```bash
docker compose up -d
```

Открой `http://localhost`. При первом запуске база заполняется тестовыми данными.

## Переменные окружения

Скопируй и отредактируй `.env.example` → `.env`:

```bash
cp .env.example .env
```

Обязательные: `DB_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. SMTP опционален — без него не будет писем, но всё остальное работает.

## Тестовые аккаунты

| Email | Пароль | Роль |
|---|---|---|
| a.smirnov@add.dev | password123 | Администратор |
| i.ivanov@add.dev | password123 | Руководитель |
| e.sokolova@add.dev | password123 | Разработчик |
| d.petrov@add.dev | password123 | Разработчик |
| o.kuznetsova@add.dev | password123 | Разработчик |

## Остановка

```bash
docker compose down
```

Данные БД сохраняются в volume `postgres_data`. Чтобы сбросить всё:

```bash
docker compose down -v
```

## Тесты

```bash
cd backend
npm test
```

25 тестов (аналитика, валидация, аутентификация) — все проходят.
