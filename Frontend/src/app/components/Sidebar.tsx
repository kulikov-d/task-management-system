import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BarChart2, ClipboardList, Bell, Users, Zap, LogOut, Search, FolderKanban, Settings, Star, ChevronLeft, ChevronRight, ListChecks, Shield, HelpCircle } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useAppStore } from "../stores/appStore";
import { getProjectColor } from "../utils/helpers";
import { searchApi } from "../api/client";
import { Avatar } from "./ui/avatar";
import { TaskDetailPanel } from "./kanban/TaskDetailPanel";

interface SidebarProps {
  activeProject: any;
  projects: any[];
  onProjectChange: (p: any) => void;
  notifCount: number;
}

const NAV = [
  { path: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { path: "/my-tasks", label: "Мои задачи", icon: ListChecks },
  { path: "/tasks", label: "Задачи", icon: ClipboardList },
  { path: "/analytics", label: "Аналитика", icon: BarChart2 },
  { path: "/team", label: "Команда", icon: Users },
  { path: "/audit", label: "Аудит", icon: Shield, adminOnly: true },
  { path: "/help", label: "Помощь", icon: HelpCircle },
];

export function Sidebar({ activeProject, projects, onProjectChange, notifCount }: SidebarProps) {
  const { user: me, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const recentTaskIds = useAppStore((s) => s.recentTaskIds);
  const tasks = useAppStore((s) => s.tasks);
  const favoriteProjectIds = useAppStore((s) => s.favoriteProjectIds);
  const toggleFavoriteProject = useAppStore((s) => s.toggleFavoriteProject);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ tasks: any[]; projects: any[]; users: any[] }>({ tasks: [], projects: [], users: [] });
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults({ tasks: [], projects: [], users: [] }); return; }
    const t = setTimeout(() => {
      searchApi.global(searchQuery.trim()).then(setSearchResults).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const recentTasks = recentTaskIds
    .map((id) => tasks.find((t: any) => t.id === id))
    .filter(Boolean)
    .slice(0, 5);

  const favoriteProjects = projects.filter((p: any) => favoriteProjectIds.includes(p.id));

  const w = collapsed ? "w-14" : "w-56";

  return (
    <>
    <aside className={`flex flex-col ${w} shrink-0 h-full text-white transition-all duration-300`} style={{ background: "var(--gradient-sidebar)" }}>
      <div className={`flex items-center ${collapsed ? "justify-center px-0 py-4" : "gap-2.5 px-4 py-4"}`}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm shrink-0">
          <Zap size={16} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && <span className="text-sm font-bold text-white tracking-tight">ADD System</span>}
      </div>

      {!collapsed && activeProject && (
        <div className="mx-2 mb-2 flex items-center gap-1.5">
          <button onClick={() => navigate("/dashboard")}
            className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 transition-all duration-200">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-bold shrink-0"
              style={{ background: getProjectColor(activeProject.key) }}>
              {activeProject.key?.slice(0, 1)}
            </div>
            <span className="text-xs font-semibold text-white truncate">{activeProject.name}</span>
          </button>
          <button onClick={() => navigate(`/projects/${activeProject.id}`)}
            className="p-2 rounded-xl text-white/50 hover:bg-white/15 hover:text-white transition-all duration-200"
            title="Настройки проекта">
            <Settings size={14} />
          </button>
        </div>
      )}

      {!collapsed && !activeProject && (
        <button onClick={() => navigate("/projects")}
          className="mx-2 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/20 hover:bg-white/10 transition-all duration-200">
          <FolderKanban size={14} className="text-white/50" />
          <span className="text-xs text-white/60">Выберите проект</span>
        </button>
      )}

      {collapsed && activeProject && (
        <button onClick={() => navigate("/dashboard")} className="mx-auto mb-2 p-2 rounded-xl bg-white/15 hover:bg-white/20 transition-all" title={activeProject.name}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-bold"
            style={{ background: getProjectColor(activeProject.key) }}>
            {activeProject.key?.slice(0, 1)}
          </div>
        </button>
      )}

      <nav className={`flex-1 ${collapsed ? "px-1.5" : "px-2"} pt-1 space-y-0.5 overflow-y-auto`}>
        {NAV.filter((item) => !item.adminOnly || me?.role === "admin" || me?.role === "lead").map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button key={path} onClick={() => navigate(path)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-2.5 rounded-xl ${collapsed ? "justify-center px-2" : "px-2.5"} py-2 transition-all duration-200 ${
                active ? "bg-white/20 font-medium text-white shadow-lg shadow-purple-500/10" : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}>
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              {!collapsed && <span className="text-xs">{label}</span>}
            </button>
          );
        })}

        {!collapsed && favoriteProjects.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] font-semibold uppercase text-white/30 px-2.5 mb-1">Избранные</p>
            {favoriteProjects.map((p: any) => (
              <button key={p.id} onClick={() => { onProjectChange(p); navigate("/dashboard"); }}
                className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-all duration-200 text-white/60 hover:bg-white/10 hover:text-white">
                <div className="w-4 h-4 rounded flex items-center justify-center text-white shrink-0"
                  style={{ background: getProjectColor(p.key), fontSize: "7px", fontWeight: 700 }}>
                  {p.key?.slice(0, 1)}
                </div>
                <span className="text-[11px] truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {!collapsed && recentTasks.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] font-semibold uppercase text-white/30 px-2.5 mb-1">Недавние</p>
            {recentTasks.map((t: any) => (
              <button key={t.id} onClick={() => { setSelectedTask(t); }}
                className="w-full text-left flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-all duration-200 text-white/60 hover:bg-white/10 hover:text-white">
                <span className="text-[11px] truncate">{t.title}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className={`${collapsed ? "px-1.5" : "px-2"} pb-2`} ref={searchRef}>
        {!collapsed && (
          <div className="relative mb-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              placeholder="Поиск..."
              className="w-full h-8 pl-8 pr-3 rounded-xl bg-white/10 border border-white/10 text-white text-xs placeholder:text-white/40 outline-none focus:bg-white/20 focus:border-white/20 transition-all"
            />
          </div>
        )}
        {collapsed && (
          <button onClick={() => toggleSidebar()} className="w-full flex justify-center py-2 rounded-xl hover:bg-white/10 transition-all" title="Поиск">
            <Search size={16} className="text-white/60" />
          </button>
        )}
        {showSearch && !collapsed && (searchResults.tasks.length > 0 || searchResults.projects.length > 0 || searchResults.users.length > 0) && (
          <div className="mt-1 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-xl max-h-64 overflow-y-auto p-2 space-y-2">
            {searchResults.tasks.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase text-white/50 mb-1 px-2">Задачи</p>
                {searchResults.tasks.map((t: any) => (
                  <button key={t.id} onClick={() => { setSelectedTask(t); setSearchQuery(""); setShowSearch(false); }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <p className="text-xs text-white">{t.title}</p>
                  </button>
                ))}
              </div>
            )}
            {searchResults.projects.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase text-white/50 mb-1 px-2">Проекты</p>
                {searchResults.projects.map((p: any) => (
                  <button key={p.id} onClick={() => { onProjectChange(p); navigate("/dashboard"); setSearchQuery(""); setShowSearch(false); }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2">
                    <div className="w-3 h-3 rounded flex items-center justify-center text-white"
                      style={{ background: getProjectColor(p.key), fontSize: "6px", fontWeight: 700 }}>{p.key?.slice(0, 1)}</div>
                    <p className="text-xs text-white">{p.name}</p>
                  </button>
                ))}
              </div>
            )}
            {searchResults.users.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase text-white/50 mb-1 px-2">Пользователи</p>
                {searchResults.users.map((u: any) => (
                  <button key={u.id} onClick={() => { navigate(`/users/${u.id}`); setSearchQuery(""); setShowSearch(false); }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2">
                    <Avatar name={u.name} size="sm" />
                    <p className="text-xs text-white">{u.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`${collapsed ? "px-1.5" : "px-2"} pb-1 space-y-0.5`}>
        <button onClick={() => navigate("/projects")} title={collapsed ? "Проекты" : undefined}
          className={`w-full flex items-center gap-2.5 rounded-xl ${collapsed ? "justify-center px-2" : "px-2.5"} py-2 transition-all duration-200 ${
            location.pathname === "/projects" ? "bg-white/20 font-medium text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
          }`}>
          <FolderKanban size={16} />
          {!collapsed && <span className="text-xs">Проекты</span>}
        </button>
        <button onClick={() => navigate("/notifications")} title={collapsed ? "Уведомления" : undefined}
          className={`w-full flex items-center gap-2.5 rounded-xl ${collapsed ? "justify-center px-2" : "px-2.5"} py-2 transition-all duration-200 ${
            location.pathname === "/notifications" ? "bg-white/20 font-medium text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
          }`}>
          <Bell size={16} />
          {!collapsed && <span className="text-xs flex-1 text-left">Уведомления</span>}
          {!collapsed && notifCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500 text-white font-bold">{notifCount}</span>
          )}
          {collapsed && notifCount > 0 && (
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-pink-500" />
          )}
        </button>
      </div>

      <div className={`${collapsed ? "px-1.5 py-3" : "px-2 py-3"} border-t border-white/10`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2 px-2"}`}>
          <div className="relative shrink-0">
            <Avatar name={me?.name || "??"} size="sm" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#1a1035]" />
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate">{me?.name || "Unknown"}</p>
                <p className="text-[10px] text-white/50 truncate">{me?.role || ""}</p>
              </div>
              <button onClick={logout} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Выйти">
                <LogOut size={13} className="text-white/50" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`${collapsed ? "px-1.5 pb-2" : "px-2 pb-2"}`}>
        <button onClick={toggleSidebar}
          className={`w-full flex items-center gap-2 rounded-xl ${collapsed ? "justify-center px-2" : "px-2.5"} py-2 text-white/50 hover:bg-white/15 hover:text-white transition-all border border-white/10 hover:border-white/20`}
          title={collapsed ? "Развернуть" : "Свернуть"}>
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span className="text-[11px]">Свернуть</span></>}
        </button>
      </div>
    </aside>
    {selectedTask && (
      <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
    )}
    </>
  );
}
