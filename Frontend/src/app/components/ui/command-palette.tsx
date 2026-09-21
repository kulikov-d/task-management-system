import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { Search, FileText, FolderOpen, Users, LayoutDashboard, ClipboardList, BarChart2, FolderCheck, ListChecks } from "lucide-react";
import { useAppStore } from "../../stores/appStore";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: any;
  action: () => void;
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const buildItems = useCallback((): CommandItem[] => {
    const items: CommandItem[] = [];

    [
      { path: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
      { path: "/my-tasks", label: "Мои задачи", icon: ListChecks },
      { path: "/tasks", label: "Задачи", icon: ClipboardList },
      { path: "/analytics", label: "Аналитика", icon: BarChart2 },
      { path: "/team", label: "Команда", icon: Users },
      { path: "/projects", label: "Проекты", icon: FolderOpen },
    ].forEach((n) => {
      items.push({
        id: `nav:${n.path}`,
        label: n.label,
        icon: n.icon,
        group: "Страницы",
        action: () => { navigate(n.path); setOpen(false); },
      });
    });

    projects.forEach((p: any) => {
      items.push({
        id: `project:${p.id}`,
        label: p.name,
        description: p.key,
        icon: FolderOpen,
        group: "Проекты",
        action: () => { setCurrentProject(p); navigate(`/projects/${p.id}`); setOpen(false); },
      });
    });

    tasks.slice(0, 50).forEach((t: any) => {
      items.push({
        id: `task:${t.id}`,
        label: t.title,
        description: t.status,
        icon: FileText,
        group: "Задачи",
        action: () => { navigate("/tasks", { state: { openTaskId: t.id } }); setOpen(false); },
      });
    });

    users.forEach((u: any) => {
      items.push({
        id: `user:${u.id}`,
        label: u.name,
        description: u.email,
        icon: Users,
        group: "Люди",
        action: () => { navigate(`/users/${u.id}`); setOpen(false); },
      });
    });

    return items;
  }, [projects, tasks, users, navigate, setCurrentProject]);

  const items = buildItems();
  const filtered = query.trim()
    ? items.filter((i) => {
        const q = query.toLowerCase();
        return i.label.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q);
      })
    : items;

  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const flatFiltered = Object.values(grouped).flat();

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatFiltered[selectedIdx]) {
      flatFiltered[selectedIdx].action();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  if (!open) return null;

  let globalIdx = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}             placeholder="Поиск задач, проектов, людей..."
            className="flex-1 h-10 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          <kbd className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {Object.entries(grouped).map(([group, groupItems]) => (
            <div key={group}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">{group}</p>
              {groupItems.map((item) => {
                globalIdx++;
                const idx = globalIdx;
                const isSelected = idx === selectedIdx;
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={item.action}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left transition-colors ${
                      isSelected ? "bg-accent text-foreground" : "text-foreground hover:bg-accent/50"
                    }`}>
                    <Icon size={14} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{item.label}</p>
                      {item.description && <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
          {flatFiltered.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">Ничего не найдено</div>
          )}
        </div>
      </div>
    </div>
  );
}
