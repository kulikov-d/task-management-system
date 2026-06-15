export type Role = "admin" | "lead" | "developer" | "viewer";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  ownerId: string;
  owner?: User;
  members?: ProjectMember[];
  _count?: { tasks: number; members: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user: User;
  role: Role;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  authorId: string;
  author?: User;
  assigneeId?: string | null;
  assignee?: User | null;
  dueDate?: string | null;
  position: number;
  tags: TaskTag[];
  _count?: { comments: number; attachments: number };
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  projectId: string;
  _count?: { tasks: number };
}

export interface TaskTag {
  id: string;
  taskId: string;
  tagId: string;
  tag: Tag;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author: User;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  taskId: string;
  uploadedById: string;
  uploadedBy: User;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  userId: string;
  taskId?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  diff?: any;
  userId: string;
  user: User;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface PaginatedResponse<T> {
  logs: T[];
  total: number;
  page: number;
  limit: number;
}
