import { useEffect } from "react";
import { FileEdit, Plus, UserCheck, MessageSquare, CheckCircle2, Trash2, UserPlus, Paperclip, Flag, ArrowRight } from "lucide-react";
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
  delete: { label: "Удаление", icon: Trash2, variant: "error" },
  assign: { label: "Назначение", icon: UserCheck, variant: "info" },
  ASSIGNED: { label: "Назначение", icon: UserCheck, variant: "info" },
  comment: { label: "Комментарий", icon: MessageSquare, variant: "warning" },
  COMMENTED: { label: "Комментарий", icon: MessageSquare, variant: "warning" },
  status_change: { label: "Смена статуса", icon: ArrowRight, variant: "secondary" },
  status: { label: "Статус", icon: CheckCircle2, variant: "secondary" },
  STATUS_CHANGED: { label: "Статус", icon: CheckCircle2, variant: "secondary" },
  move: { label: "Перемещение", icon: ArrowRight, variant: "info" },
  MOVED: { label: "Перемещение", icon: ArrowRight, variant: "info" },
  complete: { label: "Завершение спринта", icon: Flag, variant: "warning" },
  invite: { label: "Приглашение", icon: UserPlus, variant: "info" },
  attachment: { label: "Вложение", icon: Paperclip, variant: "info" },
  OVERDUE: { label: "Просрочка", icon: MessageSquare, variant: "error" },
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  IN_REVIEW: "На проверке",
  DONE: "Готово",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  lead: "Руководитель",
  developer: "Исполнитель",
};

const FIELD_LABELS: Record<string, string> = {
  title: "Название",
  description: "Описание",
  priority: "Приоритет",
  assigneeName: "Исполнитель",
  assigneeId: "Исполнитель",
  sprintId: "Спринт",
  dueDate: "Срок",
  email: "Email",
  role: "Роль",
  filename: "Файл",
  movedToBacklog: "В бэклог",
};

const SKIP_FIELDS = new Set(["fromStatus", "toStatus", "oldStatus", "newStatus", "position", "size"]);

function humanStatus(v: any): string {
  return v == null || v === "" ? "" : STATUS_LABELS[String(v)] ?? String(v);
}

function formatBytes(n: any): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  if (num < 1024) return `${num} Б`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} КБ`;
  return `${(num / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDiff(diff: any): string {
  if (!diff) return "";
  if (typeof diff === "string") return diff;

  const from = diff.fromStatus ?? diff.oldStatus ?? (diff.status?.from as any);
  const to = diff.toStatus ?? diff.newStatus ?? (diff.status?.to as any);

  const parts: string[] = [];
  if (from != null && from !== "" && to != null && to !== "") {
    parts.push(`${humanStatus(from)} → ${humanStatus(to)}`);
  }

  for (const [k, v] of Object.entries(diff) as [string, any][]) {
    if (SKIP_FIELDS.has(k)) continue;
    if (k === "assigneeId" && diff.assigneeName) continue;
    if (typeof v === "object" && v !== null && "from" in v && "to" in v) {
      const f = k === "role" ? (ROLE_LABELS[String(v.from)] ?? String(v.from)) : v.from;
      const t = k === "role" ? (ROLE_LABELS[String(v.to)] ?? String(v.to)) : v.to;
      parts.push(`${FIELD_LABELS[k] ?? k}: ${f} → ${t}`);
      continue;
    }
    if (v == null || v === "" || v === false) continue;
    let value: string;
    if (k === "role") value = ROLE_LABELS[String(v)] ?? String(v);
    else if (v && typeof v === "object") value = JSON.stringify(v);
    else value = String(v);
    parts.push(`${FIELD_LABELS[k] ?? k}: ${value}`);
  }

  return parts.join(", ");
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
          style={{ gridTemplateColumns: "150px 90px 1fr 140px 110px" }}>
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
              style={{ gridTemplateColumns: "150px 90px 1fr 140px 110px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
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