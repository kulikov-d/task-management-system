import { create } from "zustand";
import { projectsApi, tasksApi, tagsApi, usersApi, notificationsApi, auditApi, analyticsApi, sprintsApi, commentsApi, attachmentsApi, teamsApi, timeTrackingApi } from "../api/client";
import type { Team } from "../api/client";
import type { Project, Task, Tag, User, Notification, AuditLog, Sprint, Comment, Attachment, TimeEntry } from "../types/api";

interface AppState {
  projects: Project[];
  currentProject: Project | null;
  tasks: Task[];
  tags: Tag[];
  teams: Team[];
  users: User[];
  notifications: Notification[];
  unreadCount: number;
  auditLogs: AuditLog[];
  sprints: Sprint[];
  selectedSprintId: string | null;
  comments: Record<string, Comment[]>;
  attachments: Record<string, Attachment[]>;
  burndownData: any[];
  velocityData: any[];
  taskStats: any;
  isLoading: boolean;
  sidebarCollapsed: boolean;
  recentTaskIds: string[];
  favoriteProjectIds: string[];

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addRecentTask: (taskId: string) => void;
  toggleFavoriteProject: (projectId: string) => void;

  loadProjects: () => Promise<void>;
  setCurrentProject: (project: Project) => void;
  loadTasks: (projectId: string) => Promise<void>;
  loadTags: (projectId: string) => Promise<void>;
  loadUsers: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  loadAuditLogs: (params?: Record<string, string>) => Promise<void>;
  loadSprints: (projectId: string) => Promise<void>;
  setSelectedSprintId: (sprintId: string | null) => void;
  loadComments: (taskId: string) => Promise<void>;
  addCommentToTask: (taskId: string, comment: Comment) => void;
  updateCommentInTask: (taskId: string, commentId: string, content: string) => void;
  removeCommentFromTask: (taskId: string, commentId: string) => void;
  loadAttachments: (taskId: string) => Promise<void>;
  addAttachmentToTask: (taskId: string, attachment: Attachment) => void;
  removeAttachmentFromTask: (taskId: string, attachmentId: string) => void;
  loadBurndown: (projectId: string, sprintId?: string | null) => Promise<void>;
  loadVelocity: (projectId: string, sprintId?: string | null) => Promise<void>;
  loadTaskStats: (projectId: string, sprintId?: string | null) => Promise<void>;

  createTask: (data: any) => Promise<Task>;
  updateTask: (id: string, data: any) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, status: string, position: number) => Promise<void>;
  assignTask: (id: string, assigneeId: string) => Promise<void>;
  changeTaskStatus: (id: string, status: string) => Promise<void>;

  addTask: (task: Task) => void;
  updateTaskInState: (task: Task) => void;
  removeTask: (taskId: string) => void;

  addProject: (project: Project) => void;
  updateProjectInState: (project: Project) => void;
  removeProject: (projectId: string) => void;
  deleteUser: (userId: string) => Promise<void>;
  addSprint: (sprint: Sprint) => void;
  updateSprintInState: (sprint: Sprint) => void;
  removeSprint: (sprintId: string) => void;
  refreshProject: (projectId: string) => Promise<void>;

  loadTeams: () => Promise<void>;
  addTeam: (team: Team) => void;
  updateTeamInState: (team: Team) => void;
  removeTeam: (teamId: string) => void;
  updateTeamMemberInState: (teamId: string, member: any) => void;
  removeTeamMemberInState: (teamId: string, memberId: string) => void;
  updateTeamProjectInState: (teamId: string, project: any) => void;
  removeTeamProjectInState: (teamId: string, projectId: string) => void;

  activeTimer: TimeEntry | null;
  loadActiveTimer: () => Promise<void>;
  startTimer: (taskId: string, description?: string) => Promise<TimeEntry>;
  stopTimer: () => Promise<void>;
  loadTimeEntries: (taskId: string) => Promise<TimeEntry[]>;
}

export const useAppStore = create<AppState>()((set, get) => ({
  projects: [],
  currentProject: null,
  tasks: [],
  tags: [],
  teams: [],
  users: [],
  notifications: [],
  unreadCount: 0,
  auditLogs: [],
  sprints: [],
  selectedSprintId: null,
  comments: {},
  attachments: {},
  burndownData: [],
  velocityData: [],
  taskStats: null,
  isLoading: false,
  sidebarCollapsed: false,
  recentTaskIds: [],
  favoriteProjectIds: [],

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  addRecentTask: (taskId) =>
    set((state) => ({
      recentTaskIds: [taskId, ...state.recentTaskIds.filter((id) => id !== taskId)].slice(0, 10),
    })),
  toggleFavoriteProject: (projectId) =>
    set((state) => ({
      favoriteProjectIds: state.favoriteProjectIds.includes(projectId)
        ? state.favoriteProjectIds.filter((id) => id !== projectId)
        : [...state.favoriteProjectIds, projectId],
    })),

  loadProjects: async () => {
    try {
      const projects = await projectsApi.list();
      set((state) => {
        const currentStillExists = state.currentProject && projects.some((p: any) => p.id === state.currentProject!.id);
        return {
          projects,
          currentProject: currentStillExists ? state.currentProject : projects[0] || null,
        };
      });
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

  loadSprints: async (projectId) => {
    try {
      const sprints = await sprintsApi.list(projectId);
      set({ sprints });
    } catch (err) {
      console.error("Failed to load sprints:", err);
    }
  },

  setSelectedSprintId: (sprintId) => {
    set({ selectedSprintId: sprintId });
  },

  loadComments: async (taskId) => {
    try {
      const comments = await commentsApi.list(taskId);
      set((state) => ({ comments: { ...state.comments, [taskId]: comments } }));
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  },

  addCommentToTask: (taskId, comment) =>
    set((state) => ({
      comments: {
        ...state.comments,
        [taskId]: [...(state.comments[taskId] || []), comment],
      },
    })),

  updateCommentInTask: (taskId, commentId, content) =>
    set((state) => ({
      comments: {
        ...state.comments,
        [taskId]: (state.comments[taskId] || []).map((c) =>
          c.id === commentId ? { ...c, content } : c
        ),
      },
    })),

  removeCommentFromTask: (taskId, commentId) =>
    set((state) => ({
      comments: {
        ...state.comments,
        [taskId]: (state.comments[taskId] || []).filter((c) => c.id !== commentId),
      },
    })),

  loadAttachments: async (taskId) => {
    try {
      const attachments = await attachmentsApi.list(taskId);
      set((state) => ({ attachments: { ...state.attachments, [taskId]: attachments } }));
    } catch (err) {
      console.error("Failed to load attachments:", err);
    }
  },

  addAttachmentToTask: (taskId, attachment) =>
    set((state) => ({
      attachments: {
        ...state.attachments,
        [taskId]: [...(state.attachments[taskId] || []), attachment],
      },
    })),

  removeAttachmentFromTask: (taskId, attachmentId) =>
    set((state) => ({
      attachments: {
        ...state.attachments,
        [taskId]: (state.attachments[taskId] || []).filter((a) => a.id !== attachmentId),
      },
    })),

  loadBurndown: async (projectId, sprintId) => {
    try {
      const sid = sprintId !== undefined ? sprintId : get().selectedSprintId;
      const burndownData = await analyticsApi.burndown(projectId, sid || undefined);
      set({ burndownData });
    } catch (err) {
      console.error("Failed to load burndown:", err);
    }
  },

  loadVelocity: async (projectId, sprintId) => {
    try {
      const sid = sprintId !== undefined ? sprintId : get().selectedSprintId;
      const velocityData = await analyticsApi.velocity(projectId, sid || undefined);
      set({ velocityData });
    } catch (err) {
      console.error("Failed to load velocity:", err);
    }
  },

  loadTaskStats: async (projectId, sprintId) => {
    try {
      const sid = sprintId !== undefined ? sprintId : get().selectedSprintId;
      const taskStats = await analyticsApi.taskStats(projectId, sid || undefined);
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

  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project],
    })),

  updateProjectInState: (project) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === project.id ? { ...p, ...project } : p)),
      currentProject: state.currentProject?.id === project.id ? { ...state.currentProject, ...project } : state.currentProject,
    })),

  removeProject: (projectId) =>
    set((state) => {
      const remaining = state.projects.filter((p) => p.id !== projectId);
      const newCurrent = state.currentProject?.id === projectId ? remaining[0] || null : state.currentProject;
      return {
        projects: remaining,
        currentProject: newCurrent,
      };
    }),

  deleteUser: async (userId) => {
    await usersApi.delete(userId);
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
    }));
  },

  addSprint: (sprint) =>
    set((state) => ({
      sprints: [...state.sprints, sprint],
    })),

  updateSprintInState: (sprint) =>
    set((state) => ({
      sprints: state.sprints.map((s) => (s.id === sprint.id ? { ...s, ...sprint } : s)),
    })),

  removeSprint: (sprintId) =>
    set((state) => ({
      sprints: state.sprints.filter((s) => s.id !== sprintId),
    })),

  refreshProject: async (projectId) => {
    try {
      const project = await projectsApi.get(projectId);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === projectId ? { ...p, ...project } : p)),
        currentProject: state.currentProject?.id === projectId ? { ...state.currentProject, ...project } : state.currentProject,
      }));
    } catch (err) {
      console.error("Failed to refresh project:", err);
    }
  },

  loadTeams: async () => {
    try {
      const teams = await teamsApi.list();
      set({ teams });
    } catch (err) {
      console.error("Failed to load teams:", err);
    }
  },

  addTeam: (team) =>
    set((state) => ({
      teams: [...state.teams, team],
    })),

  updateTeamInState: (team) =>
    set((state) => ({
      teams: state.teams.map((t) => (t.id === team.id ? { ...t, ...team } : t)),
    })),

  removeTeam: (teamId) =>
    set((state) => ({
      teams: state.teams.filter((t) => t.id !== teamId),
    })),

  updateTeamMemberInState: (teamId, member) =>
    set((state) => ({
      teams: state.teams.map((t) =>
        t.id === teamId
          ? { ...t, members: [...t.members.filter((m) => m.id !== member.id), member], _count: { ...t._count, members: t.members.some((m) => m.id === member.id) ? t._count.members : t._count.members + 1 } }
          : t
      ),
    })),

  removeTeamMemberInState: (teamId, memberId) =>
    set((state) => ({
      teams: state.teams.map((t) =>
        t.id === teamId
          ? { ...t, members: t.members.filter((m) => m.id !== memberId), _count: { ...t._count, members: Math.max(0, t._count.members - 1) } }
          : t
      ),
    })),

  updateTeamProjectInState: (teamId, project) =>
    set((state) => ({
      teams: state.teams.map((t) =>
        t.id === teamId
          ? { ...t, projects: [...t.projects.filter((p) => p.projectId !== project.id), { id: `tp-${project.id}`, projectId: project.id, teamId, createdAt: new Date().toISOString(), project }], _count: { ...t._count, projects: t.projects.some((p) => p.projectId === project.id) ? t._count.projects : t._count.projects + 1 } }
          : t
      ),
    })),

  removeTeamProjectInState: (teamId, projectId) =>
    set((state) => ({
      teams: state.teams.map((t) =>
        t.id === teamId
          ? { ...t, projects: t.projects.filter((p) => p.projectId !== projectId), _count: { ...t._count, projects: Math.max(0, t._count.projects - 1) } }
          : t
      ),
    })),

  activeTimer: null,

  loadActiveTimer: async () => {
    try {
      const entry = await timeTrackingApi.active();
      set({ activeTimer: entry });
    } catch (err) {
      console.error("Failed to load active timer:", err);
    }
  },

  startTimer: async (taskId, description) => {
    const entry = await timeTrackingApi.start(taskId, description);
    set({ activeTimer: entry });
    return entry;
  },

  stopTimer: async () => {
    const { activeTimer } = get();
    if (!activeTimer) return;
    await timeTrackingApi.stop(activeTimer.id);
    set({ activeTimer: null });
  },

  loadTimeEntries: async (taskId) => {
    return timeTrackingApi.listByTask(taskId);
  },
}));
