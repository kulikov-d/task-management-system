import { useEffect, useCallback, Suspense, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useAppStore } from "../../stores/appStore";
import { useSocket } from "../../hooks/useSocket";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { Sidebar } from "../Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { CommandPalette } from "../ui/command-palette";
import { ContextMenu } from "../ui/context-menu";
import { ThemeToggle } from "../ui/theme-toggle";
import { QuickCreateModal } from "../QuickCreateModal";

export function AppLayout() {
  const projects = useAppStore((s) => s.projects);
  const currentProject = useAppStore((s) => s.currentProject);
  const loadProjects = useAppStore((s) => s.loadProjects);
  const loadUsers = useAppStore((s) => s.loadUsers);
  const loadUnreadCount = useAppStore((s) => s.loadUnreadCount);
  const loadTasks = useAppStore((s) => s.loadTasks);
  const loadTags = useAppStore((s) => s.loadTags);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const notifCount = useAppStore((s) => s.unreadCount);
  const { joinProject, leaveProject } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  useEffect(() => {
    loadProjects();
    loadUsers();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    const match = location.pathname.match(/^\/projects\/([^/]+)/);
    if (match && projects.length > 0) {
      const projectId = match[1];
      const found = projects.find((p: any) => p.id === projectId);
      if (found && found.id !== currentProject?.id) {
        setCurrentProject(found);
      }
    }
  }, [location.pathname, projects]);

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

  useKeyboardShortcuts({
    "[": toggleSidebar,
    c: () => setShowQuickCreate(true),
  }, [toggleSidebar]);

  const project = currentProject || projects[0];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background relative">
      <Sidebar activeProject={project} projects={projects} onProjectChange={handleProjectChange} notifCount={notifCount || 0} />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <Breadcrumbs />
          <div className="flex items-center">
            <ThemeToggle />
            <button onClick={() => setShowQuickCreate(true)}
              className="ml-4 flex items-center gap-1.5 px-4 py-2.5 rounded-lg gradient-primary text-white text-xs font-medium shadow-sm hover:shadow-md transition-all active:scale-95">
              <Plus size={14} />
              Задача
            </button>
          </div>
        </div>
        <main className="flex-1 overflow-hidden flex flex-col mt-2">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Загрузка...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <CommandPalette />
      <ContextMenu />
      {showQuickCreate && <QuickCreateModal onClose={() => setShowQuickCreate(false)} />}
    </div>
  );
}
