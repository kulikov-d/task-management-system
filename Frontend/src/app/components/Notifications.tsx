import { useState, useEffect } from "react";
import { Bell, UserCheck, AlertTriangle, MessageSquare, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { notificationsApi } from "../api/client";

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  assign: { icon: UserCheck, color: "#22d3ee" },
  assignment: { icon: UserCheck, color: "#22d3ee" },
  overdue: { icon: AlertTriangle, color: "#ef4444" },
  comment: { icon: MessageSquare, color: "#f59e0b" },
  status: { icon: CheckCircle2, color: "#10b981" },
};

export function Notifications({ onRead }: { onRead: () => void }) {
  const notifications = useAppStore((s) => s.notifications);
  const loadNotifications = useAppStore((s) => s.loadNotifications);
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);
  useEffect(() => { setNotifs(notifications); }, [notifications]);

  const markAll = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifs(n => n.map(x => ({ ...x, read: true })));
      onRead();
    } catch (err) {
      console.error("Failed to mark all:", err);
    }
  };

  const markOne = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
      onRead();
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: "var(--background)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: "var(--foreground)" }}>Уведомления</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: "0.125rem" }}>{unread} непрочитанных</p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity" style={{ background: "var(--secondary)", color: "var(--primary)", fontSize: "0.78rem" }}>
            Отметить все как прочитанные
          </button>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {notifs.length === 0 && <div className="p-8 text-center" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>Нет уведомлений</div>}
        {notifs.map((n: any, i: number) => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.assign;
          const Icon = cfg.icon;
          return (
            <div key={n.id} onClick={() => markOne(n.id)}
              className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-black/[0.02] transition-colors"
              style={{ borderBottom: i < notifs.length - 1 ? "1px solid var(--border)" : "none", background: !n.read ? cfg.color + "06" : "transparent" }}>
              <div className="relative mt-0.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.color + "18" }}>
                  <Icon size={14} style={{ color: cfg.color }} />
                </div>
                {!n.read && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: cfg.color }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500 }}>{n.title}</p>
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", marginTop: "0.125rem" }}>{n.message}</p>
              </div>
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.68rem", whiteSpace: "nowrap" }}>
                {new Date(n.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
