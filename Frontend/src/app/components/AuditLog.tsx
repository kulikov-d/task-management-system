import { useEffect } from "react";
import { FileEdit, Plus, UserCheck, MessageSquare, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { getInitials, getUserColor, formatDateTime } from "../utils/helpers";

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  create: { label: "Создание", icon: Plus, color: "#10b981" },
  CREATED: { label: "Создание", icon: Plus, color: "#10b981" },
  update: { label: "Обновление", icon: FileEdit, color: "#6366f1" },
  UPDATED: { label: "Обновление", icon: FileEdit, color: "#6366f1" },
  assign: { label: "Назначение", icon: UserCheck, color: "#22d3ee" },
  ASSIGNED: { label: "Назначение", icon: UserCheck, color: "#22d3ee" },
  comment: { label: "Комментарий", icon: MessageSquare, color: "#f59e0b" },
  COMMENTED: { label: "Комментарий", icon: MessageSquare, color: "#f59e0b" },
  status: { label: "Статус", icon: CheckCircle2, color: "#8b5cf6" },
  STATUS_CHANGED: { label: "Статус", icon: CheckCircle2, color: "#8b5cf6" },
  MOVED: { label: "Перемещение", icon: FileEdit, color: "#06b6d4" },
  OVERDUE: { label: "Просрочка", icon: MessageSquare, color: "#ef4444" },
};

export function AuditLog() {
  const auditLogs = useAppStore((s) => s.auditLogs);
  const users = useAppStore((s) => s.users);
  const loadAuditLogs = useAppStore((s) => s.loadAuditLogs);

  useEffect(() => { loadAuditLogs(); }, [loadAuditLogs]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: "var(--background)" }}>
      <div>
        <h2 style={{ color: "var(--foreground)" }}>Журнал аудита</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: "0.125rem" }}>Все действия в системе</p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="grid px-5 py-2.5 border-b" style={{ gridTemplateColumns: "100px 90px 1fr 130px 110px", borderColor: "var(--border)", background: "var(--muted)" }}>
          {["Действие", "Сущность", "Описание", "Пользователь", "Время"].map(h => (
            <span key={h} style={{ color: "var(--muted-foreground)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
          ))}
        </div>
        {auditLogs.length === 0 && (
          <div className="p-8 text-center" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>Журнал пуст</div>
        )}
        {auditLogs.map((ev: any, i: number) => {
          const cfg = ACTION_CONFIG[ev.action] ?? ACTION_CONFIG.update;
          const Icon = cfg.icon;
          const user = ev.user || users.find((u: any) => u.id === ev.userId);
          return (
            <div key={ev.id} className="grid px-5 py-3 hover:bg-black/[0.02] transition-colors items-center"
              style={{ gridTemplateColumns: "100px 90px 1fr 130px 110px", borderBottom: i < auditLogs.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: cfg.color + "18" }}>
                  <Icon size={11} style={{ color: cfg.color }} />
                </div>
                <span style={{ color: cfg.color, fontSize: "0.72rem", fontWeight: 500 }}>{cfg.label}</span>
              </div>
              <span className="px-2 py-0.5 rounded w-fit text-xs" style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "0.68rem" }}>{ev.entity}</span>
              <span style={{ color: "var(--foreground)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{JSON.stringify(ev.diff) || ev.entity}</span>
              <div className="flex items-center gap-2">
                {user && (
                  <>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: getUserColor(user.id), fontSize: "0.5rem", fontWeight: 600 }}>{getInitials(user.name)}</div>
                    <span style={{ color: "var(--foreground)", fontSize: "0.72rem" }}>{user.name?.split(" ")[0]}</span>
                  </>
                )}
              </div>
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{formatDateTime(ev.createdAt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
