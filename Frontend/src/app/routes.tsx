import { useEffect, useCallback, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router";
import { useAuthStore } from "./stores/authStore";
import { useAppStore } from "./stores/appStore";
import { useSocket } from "./hooks/useSocket";
import { LoginPage } from "./components/LoginPage";
import { Sidebar } from "./components/Sidebar";

const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const KanbanBoard = lazy(() => import("./components/KanbanBoard").then(m => ({ default: m.KanbanBoard })));
const TaskList = lazy(() => import("./components/TaskList").then(m => ({ default: m.TaskList })));
const Analytics = lazy(() => import("./components/Analytics").then(m => ({ default: m.Analytics })));
const AuditLog = lazy(() => import("./components/AuditLog").then(m => ({ default: m.AuditLog })));
const TeamView = lazy(() => import("./components/TeamView").then(m => ({ default: m.TeamView })));
const Notifications = lazy(() => import("./components/Notifications").then(m => ({ default: m.Notifications })));
const ProjectList = lazy(() => import("./components/ProjectList").then(m => ({ default: m.ProjectList })));
const ProjectDetail = lazy(() => import("./components/ProjectDetail").then(m => ({ default: m.ProjectDetail })));
const ProjectSettings = lazy(() => import("./components/ProjectSettings").then(m => ({ default: m.ProjectSettings })));
const SprintManager = lazy(() => import("./components/SprintManager").then(m => ({ default: m.SprintManager })));
const Profile = lazy(() => import("./components/Profile").then(m => ({ default: m.Profile })));

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
        <Suspense fallback={<div className="flex-1 flex items-center justify-center" style={{ color: "var(--muted-foreground)" }}>Loading...</div>}>
          <Outlet />
        </Suspense>
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
  const { projects, currentProject } = useAppStore();
  const project = currentProject || projects[0];
  if (!project) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>No projects found.</div>;
  return <TaskList project={project} />;
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

function SprintRoute() {
  const { projects, currentProject } = useAppStore();
  const project = currentProject || projects[0];
  if (!project) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>No projects found.</div>;
  return <SprintManager project={project} />;
}

function AuditRoute() {
  const { projects, currentProject } = useAppStore();
  const project = currentProject || projects[0];
  if (!project) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>No projects found.</div>;
  return <AuditLog project={project} />;
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
          <Route path="sprints" element={<SprintRoute />} />
          <Route path="audit" element={<AuditRoute />} />
          <Route path="team" element={<TeamView />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<NotificationsRoute />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="projects/:id/settings" element={<ProjectSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
