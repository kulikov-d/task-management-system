import { useEffect } from "react";
import { FileEdit, Plus, UserCheck, MessageSquare, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { formatDateTime } from "../utils/helpers";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";

const ACTION_CONFIG: Record<string, { label: string; icon: any; variant: "success" | "info" | "warning" | "error" | "secondary" }> = {
  create: { label: "Создание", icon: Plus, variant: "success" },
  CREATED: { label: "Создание", icon: Plus, variant: "success" },
  update: { label: "Обновление", icon: FileEdit, variant: "info" },
  UPDATED: { label: "Обновление", icon: FileEdit, variant: "info" },
  assign: { label: "Назначение", icon: UserCheck, variant: "info" },
  ASSIGNED: { label: "Назначение", icon: UserCheck, variant: "info" },
  comment: { label: "Комментарий", icon: MessageSquare, variant: "warning" },
  COMMENTED: { label: "Комментарий", icon: MessageSquare, variant: "warning" },
  status: { label: "Статус", icon: CheckCircle2, variant: "secondary" },
  STATUS_CHANGED: { label: "Статус", icon: CheckCircle2, variant: "secondary" },
  MOVED: { label: "Перемещение", icon: FileEdit, variant: "info" },
  OVERDUE: { label: "Просрочка", icon: MessageSquare, variant: "error" },
};

function formatDiff(diff: any): string {
  if (!diff) return "";
  if (typeof diff === "string") return diff;
  const entries = Object.entries(diff);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => {
    if (typeof v === "object" && v !== null && "from" in v && "to" in v) {
      return `${k}: ${v.from} → ${v.to}`;
    }
    return `${k}: ${String(v)}`;
  }).join(", ");
}

export function AuditLog({ project }: { project?: any }) {
  const auditLogs = useAppStore((s) => s.auditLogs);
  const users = useAppStore((s) => s.users);
  const loadAuditLogs = useAppStore((s) => s.loadAuditLogs);

  useEffect(() => {
    if (project?.id) {
      loadAuditLogs({ projectId: project.id });
    } else {
      loadAuditLogs();
    }
  }, [loadAuditLogs, project?.id]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-background">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Журнал аудита</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Все действия в системе</p>
      </div>

      <Card>
        <div className="grid px-4 py-2 border-b border-border bg-card"
          style={{ gridTemplateColumns: "100px 80px 1fr 120px 100px" }}>
          {["Действие", "Сущность", "Описание", "Пользователь", "Время"].map(h => (
            <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</span>
          ))}
        </div>
        {auditLogs.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground">Журнал пуст</div>
        )}
        {auditLogs.map((ev: any, i: number) => {
          const cfg = ACTION_CONFIG[ev.action] ?? ACTION_CONFIG.update;
          const Icon = cfg.icon;
          const user = ev.user || users.find((u: any) => u.id === ev.userId);
          return (
            <div key={ev.id} className="grid px-4 py-2 hover:bg-accent/50 transition-colors items-center"
              style={{ gridTemplateColumns: "100px 80px 1fr 120px 100px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
              <div className="flex items-center gap-1.5">
                <Badge variant={cfg.variant} className="p-1"><Icon size={10} /></Badge>
                <span className="text-[11px] font-medium text-foreground">{cfg.label}</span>
              </div>
              <Badge variant="secondary">{ev.entity}</Badge>
              <span className="text-xs text-foreground truncate">{formatDiff(ev.diff) || ev.entity}</span>
              <div className="flex items-center gap-1.5">
                {user && <><Avatar name={user.name} size="sm" /><span className="text-[11px] text-foreground truncate">{user.name?.split(" ")[0]}</span></>}
              </div>
              <span className="text-[11px] text-muted-foreground">{formatDateTime(ev.createdAt)}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
