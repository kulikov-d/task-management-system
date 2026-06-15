import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, Kanban, BarChart2, ClipboardList, Bell, Users, Zap, FolderOpen, LogOut, FolderPlus } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { getProjectColor, getInitials } from "../utils/helpers";

interface SidebarProps {
  activeProject: any;
  projects: any[];
  onProjectChange: (p: any) => void;
  notifCount: number;
}

const NAV = [
  { path: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { path: "/kanban", label: "Kanban-доска", icon: Kanban },
  { path: "/tasks", label: "Список задач", icon: ClipboardList },
  { path: "/analytics", label: "Аналитика", icon: BarChart2 },
  { path: "/audit", label: "Аудит", icon: FolderOpen },
  { path: "/team", label: "Команда", icon: Users },
];

export function Sidebar({ activeProject, projects, onProjectChange, notifCount }: SidebarProps) {
  const { user: me, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="flex flex-col w-60 shrink-0 h-full" style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}>
      <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--sidebar-primary)" }}>
          <Zap size={14} color="#fff" strokeWidth={2.5} />
        </div>
        <span style={{ color: "#e2e4f8", fontWeight: 600, fontSize: "0.95rem" }}>ADD System</span>
      </div>

      {/* Project switcher */}
      <div className="px-3 pt-4 pb-2">
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", paddingLeft: "0.5rem", marginBottom: "0.375rem" }}>Проект</p>
        {activeProject && (
          <button onClick={() => navigate(`/projects/${activeProject.id}`)}
            className="w-full rounded-lg px-3 py-2 flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: getProjectColor(activeProject.key), fontSize: "0.55rem", fontWeight: 700, color: "#fff" }}>
              {activeProject.key?.slice(0, 1)}
            </div>
            <span style={{ color: "var(--sidebar-accent-foreground)", fontSize: "0.8rem", fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeProject.name}
            </span>
          </button>
        )}
        <div className="mt-1 space-y-0.5">
          {projects.filter(p => p.id !== activeProject?.id).map(p => (
            <button key={p.id} onClick={() => onProjectChange(p)}
              className="w-full flex items-center gap-2 rounded px-3 py-1.5 hover:opacity-80 transition-opacity"
              style={{ background: "transparent" }}>
              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: getProjectColor(p.key), fontSize: "0.5rem", fontWeight: 700, color: "#fff" }}>
                {p.key?.slice(0, 1)}
              </div>
              <span style={{ color: "var(--sidebar-foreground)", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
            </button>
          ))}
          <button onClick={() => navigate("/projects")}
            className="w-full flex items-center gap-2 rounded px-3 py-1.5 hover:opacity-80 transition-opacity"
            style={{ background: "transparent", color: "var(--muted-foreground)" }}>
            <FolderPlus size={13} />
            <span style={{ fontSize: "0.75rem" }}>Все проекты</span>
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-3 space-y-0.5 overflow-y-auto">
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", paddingLeft: "0.5rem", marginBottom: "0.375rem" }}>Навигация</p>
        {NAV.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button key={path} onClick={() => navigate(path)}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all"
              style={{ background: active ? "var(--sidebar-primary)" : "transparent", color: active ? "#fff" : "var(--sidebar-foreground)" }}>
              <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: "0.8rem", fontWeight: active ? 500 : 400 }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Notifications */}
      <div className="px-3 pb-2 space-y-0.5">
        <button onClick={() => navigate("/notifications")}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-white/5 transition-all"
          style={{ color: location.pathname === "/notifications" ? "#fff" : "var(--sidebar-foreground)" }}>
          <Bell size={15} />
          <span style={{ fontSize: "0.8rem", flex: 1 }}>Уведомления</span>
          {notifCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--sidebar-primary)", color: "#fff", fontSize: "0.65rem" }}>{notifCount}</span>
          )}
        </button>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t flex items-center gap-2.5" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: "#6366f1", fontSize: "0.65rem", fontWeight: 600 }}>
          {getInitials(me?.name || "??")}
        </div>
        <div className="min-w-0 flex-1">
          <p style={{ color: "var(--sidebar-accent-foreground)", fontSize: "0.75rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me?.name || "Unknown"}</p>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me?.role || ""}</p>
        </div>
        <button onClick={logout} className="p-1 rounded hover:bg-white/10 transition-all" title="Выйти">
          <LogOut size={14} style={{ color: "var(--muted-foreground)" }} />
        </button>
      </div>
    </aside>
  );
}
