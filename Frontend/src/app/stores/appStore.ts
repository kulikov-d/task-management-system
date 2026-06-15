import { create } from "zustand";
import { projectsApi, tasksApi, tagsApi, usersApi, notificationsApi, auditApi, analyticsApi } from "../api/client";
import type { Project, Task, Tag, User, Notification, AuditLog } from "../types/api";

interface AppState {
  projects: Project[];
  currentProject: Project | null;
  tasks: Task[];
  tags: Tag[];
  users: User[];
  notifications: Notification[];
  unreadCount: number;
  auditLogs: AuditLog[];
  burndownData: any[];
  velocityData: any[];
  taskStats: any;
  isLoading: boolean;

  loadProjects: () => Promise<void>;
  setCurrentProject: (project: Project) => void;
  loadTasks: (projectId: string) => Promise<void>;
  loadTags: (projectId: string) => Promise<void>;
  loadUsers: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  loadAuditLogs: (params?: Record<string, string>) => Promise<void>;
  loadBurndown: (projectId: string) => Promise<void>;
  loadVelocity: (projectId: string) => Promise<void>;
  loadTaskStats: (projectId: string) => Promise<void>;

  createTask: (data: any) => Promise<Task>;
  updateTask: (id: string, data: any) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, status: string, position: number) => Promise<void>;
  assignTask: (id: string, assigneeId: string) => Promise<void>;
  changeTaskStatus: (id: string, status: string) => Promise<void>;

  addTask: (task: Task) => void;
  updateTaskInState: (task: Task) => void;
  removeTask: (taskId: string) => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  projects: [],
  currentProject: null,
  tasks: [],
  tags: [],
  users: [],
  notifications: [],
  unreadCount: 0,
  auditLogs: [],
  burndownData: [],
  velocityData: [],
  taskStats: null,
  isLoading: false,

  loadProjects: async () => {
    try {
      const projects = await projectsApi.list();
      set({ projects });
      if (projects.length > 0 && !get().currentProject) {
        const withTasks = projects.filter((p: any) => (p._count?.tasks || 0) > 0);
        const best = withTasks.length > 0 ? withTasks[0] : projects[0];
        set({ currentProject: best });
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  loadTasks: async (projectId) => {
    try {
      set({ isLoading: true });
      const tasks = await tasksApi.list({ projectId });
      set({ tasks, isLoading: false });
    } catch (err) {
      console.error("Failed to load tasks:", err);
      set({ isLoading: false });
    }
  },

  loadTags: async (projectId) => {
    try {
      const tags = await tagsApi.list(projectId);
      set({ tags });
    } catch (err) {
      console.error("Failed to load tags:", err);
    }
  },

  loadUsers: async () => {
    try {
      const users = await usersApi.list();
      set({ users });
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  },

  loadNotifications: async () => {
    try {
      const notifications = await notificationsApi.list();
      set({ notifications });
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  },

  loadUnreadCount: async () => {
    try {
      const { count } = await notificationsApi.unreadCount();
      set({ unreadCount: count });
    } catch (err) {
      console.error("Failed to load unread count:", err);
    }
  },

  loadAuditLogs: async (params) => {
    try {
      const data = await auditApi.list(params);
      set({ auditLogs: data.logs || [] });
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  },

  loadBurndown: async (projectId) => {
    try {
      const burndownData = await analyticsApi.burndown(projectId);
      set({ burndownData });
    } catch (err) {
      console.error("Failed to load burndown:", err);
    }
  },

  loadVelocity: async (projectId) => {
    try {
      const velocityData = await analyticsApi.velocity(projectId);
      set({ velocityData });
    } catch (err) {
      console.error("Failed to load velocity:", err);
    }
  },

  loadTaskStats: async (projectId) => {
    try {
      const taskStats = await analyticsApi.taskStats(projectId);
      set({ taskStats });
    } catch (err) {
      console.error("Failed to load task stats:", err);
    }
  },

  createTask: async (data) => {
    const task = await tasksApi.create(data);
    set((state) => ({ tasks: [...state.tasks, task] }));
    return task;
  },

  updateTask: async (id, data) => {
    const task = await tasksApi.update(id, data);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? task : t)),
    }));
    return task;
  },

  deleteTask: async (id) => {
    await tasksApi.delete(id);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },

  moveTask: async (id, status, position) => {
    const task = await tasksApi.move(id, status, position);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? task : t)),
    }));
  },

  assignTask: async (id, assigneeId) => {
    const task = await tasksApi.assign(id, assigneeId);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? task : t)),
    }));
  },

  changeTaskStatus: async (id, status) => {
    const task = await tasksApi.changeStatus(id, status);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? task : t)),
    }));
  },

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTaskInState: (task) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
    })),
  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    })),
}));
