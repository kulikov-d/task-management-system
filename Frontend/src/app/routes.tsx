import { useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router";
import { useAuthStore } from "./stores/authStore";
import { useAppStore } from "./stores/appStore";
import { useSocket } from "./hooks/useSocket";
import { LoginPage } from "./components/LoginPage";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { KanbanBoard } from "./components/KanbanBoard";
import { TaskList } from "./components/TaskList";
import { Analytics } from "./components/Analytics";
import { AuditLog } from "./components/AuditLog";
import { TeamView } from "./components/TeamView";
import { Notifications } from "./components/Notifications";
import { ProjectList } from "./components/ProjectList";
import { ProjectDetail } from "./components/ProjectDetail";
import { ProjectSettings } from "./components/ProjectSettings";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-lg" style={{ color: "var(--muted-foreground)" }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthenticatedLayout() {
  const user = useAuthStore((s) => s.user);
  const projects = useAppStore((s) => s.projects);
  const currentProject = useAppStore((s) => s.currentProject);
  const loadProjects = useAppStore((s) => s.loadProjects);
  const loadUsers = useAppStore((s) => s.loadUsers);
  const loadUnreadCount = useAppStore((s) => s.loadUnreadCount);
  const loadTasks = useAppStore((s) => s.loadTasks);
  const loadTags = useAppStore((s) => s.loadTags);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const unreadCount = useAppStore((s) => s.unreadCount);
  const { joinProject, leaveProject } = useSocket();

  useEffect(() => {
    loadProjects();
    loadUsers();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadTasks(currentProject.id);
      loadTags(currentProject.id);
      joinProject(currentProject.id);
      return () => leaveProject(currentProject.id);
    }
  }, [currentProject?.id]);

  const handleProjectChange = useCallback((p: any) => {
    setCurrentProject(p);
  }, [setCurrentProject]);

  const project = currentProject || projects[0];

  return (
    <div className="size-full flex overflow-hidden" style={{ background: "var(--background)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar
        activeProject={project}
        projects={projects}
        onProjectChange={handleProjectChange}
        notifCount={unreadCount}
      />
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}

function DashboardRoute() {
  const { projects, currentProject } = useAppStore();
  const navigate = useNavigate();
  const project = currentProject || projects[0];
  if (!project) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>No projects found.</div>;
  return <Dashboard project={project} onViewChange={(view) => navigate(`/${view}`)} />;
}

function KanbanRoute() {
  const { projects, currentProject } = useAppStore();
  const project = currentProject || projects[0];
  if (!project) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>No projects found.</div>;
  return <KanbanBoard project={project} />;
}

function TasksRoute() {
  return <div className="p-8" style={{ color: "var(--foreground)" }}>Tasks page (minimal)</div>;
}

function AnalyticsRoute() {
  const { projects, currentProject } = useAppStore();
  const project = currentProject || projects[0];
  if (!project) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>No projects found.</div>;
  return <Analytics project={project} />;
}

function NotificationsRoute() {
  const { loadUnreadCount } = useAppStore();
  return <Notifications onRead={loadUnreadCount} />;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGuard><AuthenticatedLayout /></AuthGuard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardRoute />} />
          <Route path="kanban" element={<KanbanRoute />} />
          <Route path="tasks" element={<TasksRoute />} />
          <Route path="analytics" element={<AnalyticsRoute />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="team" element={<TeamView />} />
          <Route path="notifications" element={<NotificationsRoute />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="projects/:id/settings" element={<ProjectSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
