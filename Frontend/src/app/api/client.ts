import type { User, Project, ProjectMember, Task, Tag, Comment, Attachment, Notification, AuditLog, AuthResponse, PaginatedResponse, Sprint } from "../types/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      const retryRes = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
      if (!retryRes.ok) {
        const error = await retryRes.json().catch(() => ({ message: "Request failed" }));
        throw new Error(error.message || "Request failed");
      }
      return retryRes.json();
    }
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    accessToken = data.accessToken;
    return true;
  } catch {
    return false;
  }
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, name: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  me: () => request<User>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
};

// Projects
export const projectsApi = {
  list: () => request<Project[]>("/projects"),
  get: (id: string) => request<Project & { members: ProjectMember[] }>(`/projects/${id}`),
  create: (data: { name: string; key: string; description?: string }) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string }) =>
    request<Project>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/projects/${id}`, { method: "DELETE" }),
  addMember: (projectId: string, userId: string, role: string) =>
    request<ProjectMember>(`/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    }),
  removeMember: (projectId: string, userId: string) =>
    request<void>(`/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
};

// Tasks
export const tasksApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<Task[]>(`/tasks${query}`);
  },
  get: (id: string) => request<Task>(`/tasks/${id}`),
  create: (data: { title: string; description?: string; priority?: string; assigneeId?: string; sprintId?: string | null; dueDate?: string; projectId: string; tagIds?: string[] }) =>
    request<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { title?: string; description?: string; priority?: string; assigneeId?: string; sprintId?: string | null; dueDate?: string; tagIds?: string[] }) =>
    request<Task>(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/tasks/${id}`, { method: "DELETE" }),
  assign: (id: string, assigneeId: string) =>
    request<Task>(`/tasks/${id}/assign`, {
      method: "PUT",
      body: JSON.stringify({ assigneeId }),
    }),
  changeStatus: (id: string, status: string) =>
    request<Task>(`/tasks/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  move: (id: string, status: string, position: number) =>
    request<Task>(`/tasks/${id}/move`, {
      method: "PUT",
      body: JSON.stringify({ status, position }),
    }),
};

// Comments
export const commentsApi = {
  list: (taskId: string) => request<Comment[]>(`/tasks/${taskId}/comments`),
  create: (taskId: string, content: string) =>
    request<Comment>(`/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  update: (id: string, content: string) =>
    request<Comment>(`/comments/${id}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  delete: (id: string) =>
    request<void>(`/comments/${id}`, { method: "DELETE" }),
};

// Tags
export const tagsApi = {
  list: (projectId?: string) => {
    const query = projectId ? `?projectId=${projectId}` : "";
    return request<Tag[]>(`/tags${query}`);
  },
  create: (data: { name: string; color?: string; projectId: string }) =>
    request<Tag>("/tags", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/tags/${id}`, { method: "DELETE" }),
};

// Attachments
export const attachmentsApi = {
  list: (taskId: string) => request<Attachment[]>(`/tasks/${taskId}/attachments`),
  upload: async (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    const res = await fetch(`${API_BASE}/tasks/${taskId}/attachments`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json() as Promise<Attachment>;
  },
  download: (id: string) => `${API_BASE}/attachments/${id}/download`,
  delete: (id: string) =>
    request<void>(`/attachments/${id}`, { method: "DELETE" }),
};

// Analytics
export const analyticsApi = {
  burndown: (projectId: string, sprintId?: string) => {
    const params = `?projectId=${projectId}${sprintId ? `&sprintId=${sprintId}` : ""}`;
    return request<{ date: string; ideal: number; actual: number }[]>(`/analytics/burndown${params}`);
  },
  velocity: (projectId: string, sprintId?: string) => {
    const params = `?projectId=${projectId}${sprintId ? `&sprintId=${sprintId}` : ""}`;
    return request<{ sprint: string; completed: number; planned: number }[]>(`/analytics/velocity${params}`);
  },
  taskStats: (projectId: string, sprintId?: string) => {
    const params = `?projectId=${projectId}${sprintId ? `&sprintId=${sprintId}` : ""}`;
    return request<{ total: number; byStatus: { status: string; _count: number }[]; byPriority: { priority: string; _count: number }[]; byAssignee: { assigneeId: string; _count: number }[] }>(`/analytics/tasks${params}`);
  },
  exportData: (projectId: string, format: string = "csv") =>
    request<any>(`/analytics/export?projectId=${projectId}&format=${format}`),
  exportPdfUrl: (projectId: string, sprintId?: string) => {
    const params = `?projectId=${projectId}&format=pdf${sprintId ? `&sprintId=${sprintId}` : ""}`;
    return `${API_BASE}/analytics/export${params}`;
  },
};

// Notifications
export const notificationsApi = {
  list: () => request<Notification[]>("/notifications"),
  unreadCount: () => request<{ count: number }>("/notifications/unread"),
  markAsRead: (id: string) =>
    request<void>(`/notifications/${id}/read`, { method: "PUT" }),
  markAllAsRead: () =>
    request<void>("/notifications/read-all", { method: "PUT" }),
};

// Audit
export const auditApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<PaginatedResponse<AuditLog>>(`/audit${query}`);
  },
};

// Sprints
export const sprintsApi = {
  list: (projectId: string) =>
    request<Sprint[]>(`/sprints?projectId=${projectId}`),
  get: (id: string) => request<Sprint>(`/sprints/${id}`),
  create: (data: { name: string; description?: string; projectId: string; startDate: string; endDate: string }) =>
    request<Sprint>("/sprints", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string; startDate?: string; endDate?: string; isActive?: boolean }) =>
    request<Sprint>(`/sprints/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/sprints/${id}`, { method: "DELETE" }),
};

// Search
export const searchApi = {
  global: (q: string) => request<{ tasks: any[]; projects: any[]; users: any[] }>(`/search?q=${encodeURIComponent(q)}`),
};

// Users
export const usersApi = {
  list: () => request<User[]>("/users"),
  get: (id: string) => request<User>(`/users/${id}`),
  search: (q: string) => request<User[]>(`/users/search?q=${encodeURIComponent(q)}`),
  delete: (id: string) => request<void>(`/users/${id}`, { method: "DELETE" }),
};

// Teams
export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
  projects: TeamProject[];
  _count: { members: number; projects: number };
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  createdAt: string;
  user: User;
}

export interface TeamProject {
  id: string;
  projectId: string;
  teamId: string;
  createdAt: string;
  project: Project;
}

export interface ProjectExclusion {
  id: string;
  projectId: string;
  userId: string;
  createdAt: string;
  user: User;
}

export const teamsApi = {
  list: () => request<Team[]>("/teams"),
  get: (id: string) => request<Team>(`/teams/${id}`),
  create: (data: { name: string; description?: string }) =>
    request<Team>("/teams", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string }) =>
    request<Team>(`/teams/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/teams/${id}`, { method: "DELETE" }),
  addMember: (id: string, data: { userId: string; role: string }) =>
    request<TeamMember>(`/teams/${id}/members`, { method: "POST", body: JSON.stringify(data) }),
  removeMember: (id: string, memberId: string) =>
    request<void>(`/teams/${id}/members/${memberId}`, { method: "DELETE" }),
  assignProject: (id: string, data: { projectId: string }) =>
    request<TeamProject>(`/teams/${id}/projects`, { method: "POST", body: JSON.stringify(data) }),
  unassignProject: (id: string, projectId: string) =>
    request<void>(`/teams/${id}/projects/${projectId}`, { method: "DELETE" }),
};

// Project Exclusions
export const exclusionsApi = {
  list: (projectId: string) => request<ProjectExclusion[]>(`/projects/${projectId}/exclusions`),
  add: (projectId: string, userId: string) =>
    request<ProjectExclusion>(`/projects/${projectId}/exclusions`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  remove: (projectId: string, exclusionId: string) =>
    request<void>(`/projects/${projectId}/exclusions/${exclusionId}`, { method: "DELETE" }),
};
