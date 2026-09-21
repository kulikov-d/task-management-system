import { useNavigate, useLocation } from "react-router";
import { ChevronRight, Home } from "lucide-react";
import { useAppStore } from "../../stores/appStore";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Дашборд",
  "my-tasks": "Мои задачи",
  tasks: "Задачи",
  analytics: "Аналитика",
  team: "Команда",
  audit: "Аудит",
  projects: "Проекты",
  profile: "Профиль",
  notifications: "Уведомления",
  settings: "Настройки",
};

export function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentProject = useAppStore((s) => s.currentProject);

  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0 || segments[0] === "dashboard") return null;

  const crumbs: { label: string; path: string }[] = [];

  segments.forEach((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const label = ROUTE_LABELS[seg] || (seg === currentProject?.id ? currentProject?.name : seg);
    if (label) crumbs.push({ label, path });
  });

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground">
      <button onClick={() => navigate("/dashboard")} className="hover:text-primary transition-colors">
        <Home size={12} />
      </button>
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1">
          <ChevronRight size={10} className="text-muted-foreground/50" />
          {i === crumbs.length - 1 ? (
            <span className="text-foreground font-bold">{crumb.label}</span>
          ) : (
            <button onClick={() => navigate(crumb.path)} className="hover:text-primary transition-colors">
              {crumb.label}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
