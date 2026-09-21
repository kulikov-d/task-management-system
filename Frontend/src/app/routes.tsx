import { useEffect, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router";
import { useAuthStore } from "./stores/authStore";
import { useAppStore } from "./stores/appStore";
import { LoginPage } from "./components/LoginPage";
import { AppLayout } from "./components/layout/AppLayout";
import { ToastContainer } from "./components/ui/toast";

const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const TasksPage = lazy(() => import("./components/TasksPage").then(m => ({ default: m.TasksPage })));
const MyTasks = lazy(() => import("./components/MyTasks").then(m => ({ default: m.MyTasks })));
const Analytics = lazy(() => import("./components/Analytics").then(m => ({ default: m.Analytics })));
const AuditLog = lazy(() => import("./components/AuditLog").then(m => ({ default: m.AuditLog })));
const TeamView = lazy(() => import("./components/TeamView").then(m => ({ default: m.TeamView })));
const Notifications = lazy(() => import("./components/Notifications").then(m => ({ default: m.Notifications })));
const ProjectList = lazy(() => import("./components/ProjectList").then(m => ({ default: m.ProjectList })));
const ProjectDetail = lazy(() => import("./components/ProjectDetail").then(m => ({ default: m.ProjectDetail })));
const ProjectSettings = lazy(() => import("./components/ProjectSettings").then(m => ({ default: m.ProjectSettings })));
const Profile = lazy(() => import("./components/Profile").then(m => ({ default: m.Profile })));
const UserProfile = lazy(() => import("./components/UserProfile").then(m => ({ default: m.UserProfile })));
const NotFound = lazy(() => import("./components/NotFound").then(m => ({ default: m.NotFound })));
const HelpPage = lazy(() => import("./components/HelpPage").then(m => ({ default: m.HelpPage })));

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => { loadUser(); }, [loadUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xs text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DashboardRoute() {
  const { projects, currentProject } = useAppStore();
  const navigate = useNavigate();
  const project = currentProject || projects[0];
  if (!project) return <div className="p-8 text-center text-xs text-muted-foreground">Нет проектов</div>;
  return <Dashboard project={project} onViewChange={(view) => navigate(`/${view}`)} />;
}

function TasksRoute() {
  const { projects, currentProject } = useAppStore();
  const project = currentProject || projects[0];
  if (!project) return <div className="p-8 text-center text-xs text-muted-foreground">Нет проектов</div>;
  return <TasksPage project={project} />;
}

function AnalyticsRoute() {
  const { projects, currentProject } = useAppStore();
  const project = currentProject || projects[0];
  if (!project) return <div className="p-8 text-center text-xs text-muted-foreground">Нет проектов</div>;
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
        <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardRoute />} />
          <Route path="my-tasks" element={<MyTasks />} />
          <Route path="tasks" element={<TasksRoute />} />
          <Route path="analytics" element={<AnalyticsRoute />} />
          <Route path="team" element={<TeamView />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="profile" element={<Profile />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="users/:id" element={<UserProfile />} />
          <Route path="notifications" element={<NotificationsRoute />} />
          <Route path="projects" element={<ProjectList />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="projects/:id/settings" element={<ProjectSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}
