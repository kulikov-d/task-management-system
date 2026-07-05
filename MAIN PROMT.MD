Now I have a complete picture. Let me generate the comprehensive prompt for implementing this diploma project as a working application.

---

## 📋 PROMPT FOR IMPLEMENTING DIPLOMA PROJECT "ADD" (Task Management System)

### **Project Overview**
Build a **full-stack task management system "ADD"** based on the diploma thesis specification. The system follows IDEF0 decomposition (A0 → A0.1–A0.5) with real-time collaboration, Kanban board, analytics, and role-based access control.

---

### **Tech Stack (Mandatory)**
| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18 + TypeScript + Vite, Zustand (state), Lucide React (icons), Tailwind CSS |
| **Backend** | Node.js 20 + Fastify, ws (WebSocket), Prisma ORM, jose (JWT) + bcrypt, Zod validation |
| **Database** | PostgreSQL 15+ (via Prisma) |
| **Auth** | JWT (access + refresh tokens via jose), RBAC: `admin` | `lead` | `developer` |
| **Real-time** | Native WebSocket (ws library) with rooms |
| **File Upload** | @fastify/multipart (local storage) |
| **Deployment** | Docker Compose (frontend, backend, postgres, nginx) |

---

### **Database Schema (Prisma)**

```prisma
// schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { admin lead developer }
enum TaskStatus { TODO IN_PROGRESS IN_REVIEW DONE }
enum TaskPriority { LOW MEDIUM HIGH CRITICAL }
enum EventType { CREATED UPDATED ASSIGNED STATUS_CHANGED COMMENTED ATTACHMENT MOVED OVERDUE ESCALATED }

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String
  name      String
  role      Role      @default(developer)
  avatar    String?
  deletedAt DateTime?  // Soft delete: profile removed, tasks preserved
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  ownedProjects    Project[]      @relation("ProjectOwner")
  assignedTasks    Task[]         @relation("TaskAssignee")
  authoredTasks    Task[]         @relation("TaskAuthor")
  comments         Comment[]
  events           Event[]
  notifications    Notification[]
  tags             Tag[]
  teamMemberships  TeamMember[]
  projectExclusions ProjectExclusion[]
}

model Team {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     TeamMember[]
  projects    TeamProject[]
}

model TeamMember {
  id        String   @id @default(cuid())
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role     @default(developer) // Role within the team
  createdAt DateTime @default(now())

  @@unique([teamId, userId])
  @@index([teamId])
  @@index([userId])
}

model TeamProject {
  id        String   @id @default(cuid())
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([teamId, projectId])
  @@index([teamId])
  @@index([projectId])
}

model ProjectExclusion {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  key         String   @unique // e.g., "ADD", "PROJ"
  ownerId     String
  owner       User     @relation("ProjectOwner", fields: [ownerId], references: [id])
  members     ProjectMember[]
  tasks       Task[]
  exclusions  ProjectExclusion[]
  teamProjects TeamProject[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([ownerId])
}

model Sprint {
  id          String   @id @default(cuid())
  name        String
  description String?
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(false)
  tasks       Task[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId])
  @@index([projectId, isActive])
}

model ProjectMember {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role     @default(developer)
  createdAt DateTime @default(now())

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
}

model Task {
  id          String       @id @default(cuid())
  title       String
  description String?      @db.Text
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  projectId   String
  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  authorId    String
  author      User         @relation("TaskAuthor", fields: [authorId], references: [id])
  assigneeId  String?
  assignee    User?        @relation("TaskAssignee", fields: [assigneeId], references: [id])
  sprintId    String?
  sprint      Sprint?      @relation(fields: [sprintId], references: [id], onDelete: SetNull)
  dueDate     DateTime?
  position    Int          @default(0) // for Kanban ordering
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  tags        TaskTag[]
  comments    Comment[]
  attachments Attachment[]
  events      Event[]

  @@index([projectId, status])
  @@index([assigneeId])
  @@index([dueDate])
}

model Tag {
  id        String     @id @default(cuid())
  name      String
  color     String     @default("#6366f1")
  projectId String
  project   Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks     TaskTag[]

  @@unique([projectId, name])
  @@index([projectId])
}

model TaskTag {
  id     String @id @default(cuid())
  taskId String
  task   Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  tagId  String
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([taskId, tagId])
}

model Comment {
  id        String   @id @default(cuid())
  content   String   @db.Text
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([taskId])
}

model Attachment {
  id        String   @id @default(cuid())
  filename  String
  url       String
  mimeType  String
  size      Int
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  uploadedById String
  uploadedBy User    @relation(fields: [uploadedById], references: [id])
  createdAt DateTime @default(now())

  @@index([taskId])
}

model Event {
  id        String     @id @default(cuid())
  type      EventType
  payload   Json
  taskId    String?
  task      Task?      @relation(fields: [taskId], references: [id], onDelete: SetNull)
  userId    String
  user      User       @relation(fields: [userId], references: [id])
  createdAt DateTime   @default(now())

  @@index([taskId])
  @@index([userId])
  @@index([createdAt])
}

model Notification {
  id        String   @id @default(cuid())
  type      String
  title     String
  message   String
  read      Boolean  @default(false)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskId    String?
  createdAt DateTime @default(now())

  @@index([userId, read])
  @@index([createdAt])
}

model AuditLog {
  id        String   @id @default(cuid())
  action    String
  entity    String
  entityId  String
  diff      Json?
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@index([entity, entityId])
  @@index([createdAt])
}
```

---

### **Backend Architecture (Modular Fastify)**

```
backend/src/
├── main.ts                 # Fastify app setup, plugins, routes, WebSocket init
├── config/
│   ├── env.ts              # Validated env (Zod)
│   ├── database.ts         # Prisma client
│   └── socket.ts           # WebSocket (ws) setup + rooms + emitToProject/Task/User/All helpers
├── modules/
│   ├── auth/               # JWT (jose), register/login/me/refresh
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   └── auth.service.ts
│   ├── users/
│   │   ├── user.routes.ts
│   │   └── user.service.ts       # list, get, search, softDelete (reassign tasks)
│   ├── teams/              # NEW: Multi-team management
│   │   ├── team.routes.ts
│   │   └── team.service.ts  # CRUD + members + assign to projects
│   ├── search/
│   │   ├── search.routes.ts
│   │   └── search.service.ts     # Global search: tasks + projects + users
│   ├── projects/           # Project CRUD, members, exclusions
│   │   ├── project.routes.ts
│   │   └── project.service.ts  # Emits: project:created/updated/deleted/memberAdded/memberRemoved
│   ├── tasks/              # Core task logic
│   │   ├── task.routes.ts
│   │   └── task.service.ts     # Emits: task:created/updated/deleted/assigned/statusChanged/moved
│   ├── sprints/            # Sprint CRUD
│   │   ├── sprint.routes.ts
│   │   └── sprint.service.ts   # Emits: sprint:created/updated/deleted
│   ├── comments/
│   │   ├── comment.routes.ts
│   │   └── comment.service.ts  # Emits: comment:new
│   ├── attachments/
│   │   ├── attachment.routes.ts
│   │   └── attachment.service.ts  # @fastify/multipart file upload
│   ├── tags/
│   │   ├── tag.routes.ts
│   │   └── tag.service.ts
│   ├── analytics/          # Burndown, velocity, taskStats, export
│   │   ├── analytics.routes.ts
│   │   └── analytics.service.ts  # CSV + PDF export (pdfkit)
│   ├── notifications/
│   │   ├── notification.routes.ts
│   │   ├── notification.service.ts
│   │   └── notification.helper.ts  # Emits: notification:new
│   ├── audit/
│   │   ├── audit.routes.ts
│   │   └── audit.service.ts
├── common/
│   ├── guards/
│   │   └── auth.guard.ts   # Fastify preHandler hooks (authenticate, authorize)
│   ├── middleware/
│   │   └── audit.middleware.ts  # AsyncLocalStorage for audit context
│   └── exceptions/
│       ├── AppError.ts     # Custom error class
│       └── errorHandler.ts # Fastify error handler
├── types/
│   └── fastify.d.ts        # FastifyRequest augmentation (userId, userRole)
└── prisma/
    ├── schema.prisma
    └── seed.ts             # Demo data: 5 users, 2 teams, 3 projects, 2 sprints, 12 tasks
```

---

### **Multi-Team Platform Architecture**

#### **Concept**
Platform for a company with multiple teams (e.g., Frontend Team, Backend Team, DevOps Team). Users register on the platform and are invited to teams. One user can be in multiple teams.

#### **Visibility Rules**
```
Admin/Lead (global role) → see ALL projects and sprints
Developer → see projects where their team is assigned AND they are not excluded
```

#### **Team → Project Flow**
1. Admin creates a team
2. Admin adds users to the team
3. Admin assigns the team to a project (TeamProject)
4. All team members can now see the project
5. Admin can exclude specific users from specific projects (ProjectExclusion)

#### **Profile Deletion**
When a user deletes their profile:
1. Set `deletedAt = now()` (soft delete)
2. Set `assigneeId = null` on all tasks where `assigneeId = userId`
3. Remove from all teams (TeamMember records deleted)
4. Remove from all project exclusions (ProjectExclusion records deleted)
5. Keep: authored tasks, comments, audit logs (for history)

#### **New API Endpoints**

```
#### **Teams (NEW)**
GET    /api/teams                    # List all teams (admin/lead see all, dev sees own teams)
POST   /api/teams                    # Create team (admin only)
GET    /api/teams/:id                # Team details with members
PUT    /api/teams/:id                # Update team (admin/team admin)
DELETE /api/teams/:id                # Delete team (admin only)

POST   /api/teams/:id/members        # Add member to team (admin/team admin)
DELETE /api/teams/:id/members/:userId # Remove from team

POST   /api/teams/:id/projects       # Assign team to project (admin/team admin)
DELETE /api/teams/:id/projects/:projectId # Unassign team from project

#### **Project Exclusions (NEW)**
POST   /api/projects/:id/exclusions   # Exclude user from project (admin/lead)
DELETE /api/projects/:id/exclusions/:userId # Remove exclusion

#### **Users (Updated)**
DELETE /api/users/:id                # Soft delete profile (admin or self)
                                   # Tasks → assigneeId = null, remove from teams
```

#### **Updated Frontend Components**

```
Frontend/src/app/
├── components/
│   ├── TeamView.tsx          # REWRITE: Full team management (CRUD, members, assign to projects)
│   ├── ProjectSettings.tsx   # UPDATE: Show team assignments + individual exclusions
│   ├── ProjectList.tsx       # UPDATE: Filter by visibility rules
│   ├── Sidebar.tsx           # UPDATE: Filter projects by visibility
│   ├── UserMenu.tsx          # NEW: Profile settings + delete account
│   └── ...
├── stores/
│   ├── appStore.ts           # UPDATE: teams[], loadTeams(), addTeam(), etc.
│   └── ...
└── utils/
    └── permissions.ts        # UPDATE: canSeeProject(), canManageTeam(), etc.
```

#### **Updated Seed Data**
```typescript
// seed.ts - Demo data
const teams = [
  { name: "Frontend Team", description: "React/Vue разработка" },
  { name: "Backend Team", description: "Node.js/Python разработка" },
];

const teamMembers = [
  { teamId: "frontend", userId: "admin", role: "admin" },
  { teamId: "frontend", userId: "lead", role: "lead" },
  { teamId: "frontend", userId: "dev1", role: "developer" },
  { teamId: "backend", userId: "admin", role: "admin" },
  { teamId: "backend", userId: "dev2", role: "developer" },
];

const teamProjects = [
  { teamId: "frontend", projectId: "project1" },
  { teamId: "backend", projectId: "project1" },
  { teamId: "backend", projectId: "project2" },
];
```

---

### **API Endpoints (REST + WebSocket)**

#### **Auth**
```
POST   /api/auth/register           # Register (admin only in prod)
POST   /api/auth/login              # Login → access + refresh tokens
POST   /api/auth/refresh            # Refresh access token
GET    /api/auth/me                 # Current user profile
```

#### **Projects**
```
POST   /api/projects                # Create project (lead+)
GET    /api/projects                # List my projects (filtered by visibility)
GET    /api/projects/:id            # Project details
PUT    /api/projects/:id            # Update project (owner/lead)
DELETE /api/projects/:id            # Delete project (owner)
POST   /api/projects/:id/members    # Add member (lead+)
PUT    /api/projects/:id/members/:userId # Update member role
DELETE /api/projects/:id/members/:userId # Remove member
POST   /api/projects/:id/exclusions  # Exclude user from project (admin/lead)
DELETE /api/projects/:id/exclusions/:userId # Remove exclusion
```

#### **Teams (NEW)**
```
GET    /api/teams                    # List all teams
POST   /api/teams                    # Create team (admin only)
GET    /api/teams/:id                # Team details with members
PUT    /api/teams/:id                # Update team (admin/team admin)
DELETE /api/teams/:id                # Delete team (admin only)
POST   /api/teams/:id/members        # Add member to team (admin/team admin)
DELETE /api/teams/:id/members/:userId # Remove from team
POST   /api/teams/:id/projects       # Assign team to project (admin/team admin)
DELETE /api/teams/:id/projects/:projectId # Unassign team from project
```

#### **Sprints**
```
GET    /api/sprints?projectId=X     # List sprints for project
GET    /api/sprints/:id             # Sprint details with tasks
POST   /api/sprints                 # Create sprint
PUT    /api/sprints/:id             # Update sprint
DELETE /api/sprints/:id             # Delete sprint (unlinks tasks)
```

#### **Tasks (A0.1, A0.2, A0.3)**
```
POST   /api/tasks                   # Create task (A0.1)
GET    /api/tasks                   # List tasks (filters: project, status, assignee, tag, priority)
GET    /api/tasks/:id               # Get task with relations
PUT    /api/tasks/:id               # Update task (A0.1)
DELETE /api/tasks/:id               # Delete task (author/lead)
PUT    /api/tasks/:id/assign        # Assign task (A0.2) → WS: task:assigned
PUT    /api/tasks/:id/status        # Change status (A0.2) → WS: task:statusChanged
PUT    /api/tasks/:id/move          # Move in Kanban (A0.3) → WS: task:moved
POST   /api/tasks/:id/tags          # Add tags
DELETE /api/tasks/:id/tags/:tagId   # Remove tag
```

#### **Comments (A0.3)**
```
POST   /api/tasks/:id/comments      # Add comment → WS: comment:new
GET    /api/tasks/:id/comments      # List comments
PUT    /api/comments/:id            # Edit comment
DELETE /api/comments/:id            # Delete comment
```

#### **Attachments (A0.3)**
```
POST   /api/tasks/:id/attachments   # Upload file (multipart)
GET    /api/tasks/:id/attachments   # List attachments
GET    /api/attachments/:id/download # Download file
DELETE /api/attachments/:id         # Delete attachment
```

#### **Analytics (A0.5)**
```
GET    /api/analytics/burndown?projectId=X&sprintId=Y
GET    /api/analytics/velocity?projectId=X
GET    /api/analytics/tasks?projectId=X&status=DONE&assigneeId=Y
GET    /api/analytics/export?projectId=X&format=pdf&sprintId=Y
```

#### **Users**
```
GET    /api/users                    # List all users
GET    /api/users/:id                # Get user by ID
GET    /api/users/search?q=query     # Search users by name/email (limit 10)
DELETE /api/users/:id                # Soft delete profile (admin or self)
                                   # Tasks → assigneeId = null, remove from teams
```

#### **Search**
```
GET    /api/search?q=query           # Global search: tasks (5) + projects (3) + users (3)
```

#### **Audit (A0.4)**
```
GET    /api/audit?entity=Task&entityId=X
GET    /api/audit?userId=X
```

#### **Notifications**
```
GET    /api/notifications           # List my notifications
PUT    /api/notifications/:id/read  # Mark as read
PUT    /api/notifications/read-all  # Mark all as read
```

---

### **WebSocket Events (ws — Native WebSocket)**

```typescript
// Connection: ws://localhost:3000/ws?token=<jwt>

// Client → Server
{ event: 'join:project', data: { projectId } }
{ event: 'leave:project', data: { projectId } }
{ event: 'join:task', data: { taskId } }
{ event: 'leave:task', data: { taskId } }

// Server → Client — Tasks
{ event: 'task:created', data: task }
{ event: 'task:updated', data: task }
{ event: 'task:assigned', data: { task, assignee } }
{ event: 'task:statusChanged', data: { task, oldStatus, newStatus } }
{ event: 'task:moved', data: { task, fromColumn, toColumn } }

// Server → Client — Projects (real-time)
{ event: 'project:created', data: project }
{ event: 'project:updated', data: project }
{ event: 'project:deleted', data: { projectId } }
{ event: 'project:memberAdded', data: { projectId, member } }
{ event: 'project:memberRemoved', data: { projectId, userId } }

// Server → Client — Teams (real-time)
{ event: 'team:created', data: team }
{ event: 'team:updated', data: team }
{ event: 'team:deleted', data: { teamId } }
{ event: 'team:memberAdded', data: { teamId, member } }
{ event: 'team:memberRemoved', data: { teamId, userId } }
{ event: 'team:projectAssigned', data: { teamId, project } }
{ event: 'team:projectUnassigned', data: { teamId, projectId } }

// Server → Client — Sprints (real-time)
{ event: 'sprint:created', data: sprint }
{ event: 'sprint:updated', data: sprint }
{ event: 'sprint:deleted', data: { sprintId } }

// Server → Client — Comments (real-time)
{ event: 'comment:new', data: { comment, taskId } }

// Server → Client — Notifications
{ event: 'notification:new', data: notification }
{ event: 'user:joined', data: { userId } }
{ event: 'user:left', data: { userId } }
```

**Rooms:** Managed server-side via `Map<string, Set<WebSocket>>`. Auto-join `user:<userId>` and `projects:global` on connect.

---

### **Frontend Architecture (React + TypeScript + Vite)**

```
Frontend/src/app/
├── main.tsx
├── routes.tsx                # React Router with lazy-loaded routes
├── api/
│   └── client.ts             # Fetch-based API client with token refresh, search API
├── stores/
│   ├── authStore.ts          # user, tokens, login/logout
│   └── appStore.ts           # projects, tasks, sprints, tags, users, notifications, audit, comments, attachments
├── hooks/
│   └── useSocket.ts          # Native WebSocket client with auto-reconnect
├── components/
│   ├── LoginPage.tsx         # Auth form
│   ├── Sidebar.tsx           # Navigation + project switcher
│   ├── Dashboard.tsx         # Overview with stats and progress bars
│   ├── KanbanBoard.tsx       # Native HTML5 drag-and-drop
│   ├── TaskList.tsx          # Table view + task detail panel
│   ├── TaskForm.tsx          # Create/Edit modal (title, description, priority, assignee, dueDate, sprint, tags)
│   ├── Analytics.tsx         # Burndown, Velocity, TaskStats with sprint filter
│   ├── AuditLog.tsx          # Audit trail table
│   ├── TeamView.tsx          # Team members list
│   ├── Notifications.tsx     # Notifications list
│   ├── ProjectList.tsx       # Project cards + create form
│   ├── ProjectDetail.tsx     # Project overview, tasks, members tabs
│   ├── ProjectSettings.tsx   # Edit project, manage members, delete
│   ├── SprintManager.tsx     # Sprint CRUD, activate/deactivate toggle
│   ├── SearchResults.tsx     # Global search dropdown (tasks/projects/users)
├── types/
│   └── api.ts                # TypeScript interfaces
└── utils/
    ├── helpers.ts            # getInitials, getUserColor, getProjectColor, formatDate, getTaskTags
    └── permissions.ts        # canManageProject, canManageMembers, canCreateTask, canDeleteTask, canAssignTask
```

---

### **Key Implementation Details**

#### **1. Sprint Management UI (Frontend)**
- **Page:** `/sprints` route with `SprintManager` component
- **Features:** Create, edit, delete sprints; activate/deactivate sprint toggle
- **Sprint form:** Name, description, start date, end date
- **Real-time:** Sprint events (`sprint:created`, `sprint:updated`, `sprint:deleted`) via WebSocket
- **Integration:** TaskForm includes sprint dropdown; Analytics has sprint filter
- **Store:** `sprints[]`, `selectedSprintId`, `loadSprints()`, `addSprint()`, `updateSprintInState()`, `removeSprint()`

#### **2. RBAC Middleware (Backend)**

#### **3. Audit Logging (A0.4)**
```typescript
// common/middleware/audit.middleware.ts
// AsyncLocalStorage stores userId per-request context
// Set via userContext.enterWith({ userId }) in authenticate hook
// Used by auditLog() function called from service handlers
```

#### **4. Kanban Drag & Drop (A0.3 - Frontend)**
- Native HTML5 drag-and-drop (no external libraries)
- Drag start → store original column and position
- Drop → calculate new position, call PUT /api/tasks/:id/move
- Real-time: WebSocket `task:moved` updates board for all users
- Visual feedback: background color change on drag over columns

#### **5. Analytics Queries (A0.5)**
- Burndown: planned (linear decrease) vs actual (tasks completed per day)
- Velocity: tasks completed per sprint
- TaskStats: count by status, priority, assignee
- Sprint filter: all queries support sprintId parameter
- Export: CSV (with CSV injection protection), PDF (via PDFKit with project name, tags column), JSON

#### **6. Comments & Attachments UI**
- Task detail panel: comment list (author avatar, name, text, delete), comment input (Enter to send)
- Task detail panel: attachment list (filename, size, download, delete), file upload button
- Store: `comments[taskId]`, `attachments[taskId]`, load/add/update/delete actions

#### **7. Global Search**
- Backend: `GET /api/search?q=` → tasks (5), projects (3), users (3) via ILIKE
- Frontend: Search input in Sidebar, dropdown with categorized results
- Click task → navigate to kanban, click project → navigate to project

#### **8. User Search (Autocomplete)**
- Backend: `GET /api/users/search?q=` → users by name/email (limit 10)
- Frontend: ProjectSettings member form uses autocomplete with debounce 300ms
- Dropdown shows avatar, name, email; excludes existing project members

---

### **Docker Compose (Production-Ready)**

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: add_db
      POSTGRES_USER: add_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U add_user -d add_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://add_user:${DB_PASSWORD}@postgres:5432/add_db?schema=public
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
    depends_on:
      postgres:
        condition: service_healthy
    ports: ["3000:3000"]

  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: http://localhost:3000/api
      VITE_WS_URL: http://localhost:3000
    ports: ["5173:5173"]
    depends_on: [backend]

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on: [frontend, backend]

volumes:
  postgres_data:
```

---

### **Environment Variables**

```bash
# .env
DATABASE_URL="postgresql://add_user:secure_password@localhost:5432/add_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-different-from-above"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3000"
NODE_ENV="development"
```

---

### **Implemented Features (Current State)**

| Feature | Status | Notes |
|---------|--------|-------|
| JWT Auth (login/register/me/refresh) | ✅ Done | Access + refresh tokens, HttpOnly cookies |
| RBAC (admin/lead/developer) | ✅ Done | No viewer role |
| Projects CRUD | ✅ Done | Create, update, delete, members |
| Tasks CRUD | ✅ Done | Create, update, delete, assign, status, move |
| Tags | ✅ Done | Create, delete, assign to tasks |
| Kanban Board | ✅ Done | Native HTML5 drag-and-drop, real-time |
| Task List | ✅ Done | Table view with filters, detail panel, edit button |
| Sprint Model | ✅ Done | Schema, CRUD API, real-time events |
| Sprint Management UI | ✅ Done | Create, edit, delete, activate/deactivate |
| TaskForm (Create/Edit) | ✅ Done | Title, description, priority, assignee, dueDate, sprint, tags |
| Analytics | ✅ Done | Burndown, velocity, task stats with sprint filter |
| Audit Log | ✅ Done | Event tracking, table view, projectId scoped |
| Notifications | ✅ Done | In-app, unread count, mark as read |
| Real-time: Tasks | ✅ Done | create/update/delete/move/status/assign via WebSocket |
| Real-time: Projects | ✅ Done | create/update/delete/member events via WebSocket |
| Real-time: Sprints | ✅ Done | create/update/delete via WebSocket |
| Real-time: Comments | ✅ Done | comment:new via WebSocket |
| Dashboard | ✅ Done | Overview with stats and progress bars |
| File Upload/Attachments | ✅ Done | API + UI: list, upload, download, delete in task detail panel |
| Comments UI | ✅ Done | API + UI: list, add, delete comments in task detail panel |
| PDF Export | ✅ Done | PDFKit with project name, sprint filter, tags column |
| CSV Export | ✅ Done | CSV with injection protection |
| User Search | ✅ Done | GET /api/users/search?q= + autocomplete in ProjectSettings |
| Global Search | ✅ Done | GET /api/search?q= + dropdown in Sidebar |
| Multi-Team Management | 🔄 To Do | Team CRUD, members, assign to projects |
| Project Exclusions | ✅ Done | Exclude users from specific projects |
| Profile Deletion | ✅ Done | Soft delete, tasks become unassigned |
| Team-based Visibility | ✅ Done | Devs see only projects where their team is assigned |
| Unit Tests | ✅ Done | 25 tests (analytics, validation, auth) |

---

### **Non-Functional Requirements Checklist**

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| API Response Time | < 200ms | Prisma indexes, query optimization |
| Real-time Latency | < 100ms | WebSocket (ws library), room-based routing |
| Concurrent Users | 20+ | Docker horizontal scaling |
| Auth Security | jose JWT + RBAC | HttpOnly cookies, short-lived access tokens, refresh rotation |
| Audit Trail | 100% coverage | AsyncLocalStorage context in Fastify hooks |
| File Upload | ≤ 10MB | @fastify/multipart + validation |
| Drag & Drop | 60fps | Native HTML5 DnD + CSS transforms |
| Analytics | < 1s | GROUP BY indexes |
| Deployment | Zero-downtime | Docker healthchecks |

---

### **Development Phases**

| Phase | Deliverables | Est. Time |
|-------|--------------|-----------|
| **1. Foundation** | Repo setup, Docker, Prisma schema, Auth module (jose) | 1 week |
| **2. Core (A0.1)** | Projects, Tasks CRUD, Tags, RBAC, Basic UI | 1.5 weeks |
| **3. Real-time (A0.2)** | WebSocket (ws), Assignment, Status changes, Notifications | 1 week |
| **4. Kanban (A0.3)** | Drag&drop board, Comments, Attachments | 1.5 weeks |
| **5. Control (A0.4)** | Audit log, Notifications | 1 week |
| **6. Analytics (A0.5)** | Dashboard, Burn-down, Velocity, Export | 1 week |
| **7. Multi-Team Platform** | Team CRUD, Team→Project assignment, Exclusions, Profile deletion, Visibility rules | 2 weeks |
| **8. Polish** | Bug fixes, Fastify migration, Docker prod, Nginx SSL, Docs | 1 week |

**Total: ~9 weeks**

---

### **Acceptance Criteria (Definition of Done)**

- [x] All 5 IDEF0 functions (A0.1–A0.5) implemented
- [x] JWT auth with 3 roles working end-to-end
- [x] Real-time updates via WebSocket
- [x] Kanban drag&drop with native HTML5 DnD
- [x] File upload/download working
- [x] In-app notifications for assignments/status changes
- [x] Audit log captures all create/update/delete
- [x] Analytics dashboard: burn-down, velocity, task stats
- [x] CSV export with injection protection
- [x] Docker Compose starts full stack
- [x] Docker: WebSocket proxy /ws, SPA fallback, idempotent seed
- [x] Backend: RBAC fixes (lead can edit projects, role update emits WS event)
- [x] Multi-team management (CRUD teams, members, assign to projects)
- [x] Project exclusions (exclude users from specific projects)
- [x] Profile deletion (soft delete, tasks become unassigned)
- [x] Team-based visibility (devs see only projects where their team is assigned)
- [x] Unit tests for critical paths (25 tests)

---

### **Optional Enhancements (Post-MVP)**
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Task templates
- [ ] Time tracking
- [ ] Team chat/messaging
- [ ] Email notifications
- [ ] Two-factor authentication

---

This prompt contains **everything needed** to implement the diploma project as a production-ready application. The specification is derived directly from your thesis documents (markdown + Word chapters).

**Ready to start?** Tell me which phase you want to begin with, or if you need any clarification on specific modules.