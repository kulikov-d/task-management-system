import { useState, useEffect, useRef } from "react";
import { Bell, UserCheck, AlertTriangle, MessageSquare, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useAppStore } from "../stores/appStore";
import { notificationsApi } from "../api/client";

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  assign: { icon: UserCheck, color: "#22d3ee" },
  assignment: { icon: UserCheck, color: "#22d3ee" },
  overdue: { icon: AlertTriangle, color: "#ef4444" },
  comment: { icon: MessageSquare, color: "#f59e0b" },
  status: { icon: CheckCircle2, color: "#10b981" },
};

export function NotificationBell() {
  const notifications = useAppStore((s) => s.notifications);
  const unreadCount = useAppStore((s) => s.unreadCount);
  const loadNotifications = useAppStore((s) => s.loadNotifications);
  const loadUnreadCount = useAppStore((s) => s.loadUnreadCount);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAll = async () => {
    try {
      await notificationsApi.markAllAsRead();
      await loadUnreadCount();
      loadNotifications();
    } catch (err) {
      console.error("Failed to mark all:", err);
    }
  };

  const markOne = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      await loadUnreadCount();
      loadNotifications();
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const recent = notifications.slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:opacity-80 transition-opacity" style={{ color: "var(--muted-foreground)" }}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ background: "#ef4444", fontSize: "0.55rem", fontWeight: 600 }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <span style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500 }}>Уведомления</span>
            {unreadCount > 0 && (
              <button onClick={markAll} className="hover:opacity-70 transition-opacity" style={{ color: "var(--primary)", fontSize: "0.72rem" }}>
                Прочитать все
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 && <div className="p-6 text-center" style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>Нет уведомлений</div>}
            {recent.map((n: any) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.assign;
              const Icon = cfg.icon;
              return (
                <div key={n.id} onClick={() => { markOne(n.id); setOpen(false); }}
                  className="flex items-start gap-2.5 px-4 py-3 cursor-pointer hover:bg-black/[0.02] transition-colors"
                  style={{ background: !n.read ? cfg.color + "06" : "transparent" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.color + "18" }}>
                    <Icon size={12} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: "var(--foreground)", fontSize: "0.78rem", fontWeight: n.read ? 400 : 500 }}>{n.title}</p>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", marginTop: "0.1rem" }}>{n.message}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: cfg.color }} />}
                </div>
              );
            })}
          </div>
          <div className="border-t px-4 py-2.5" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => { setOpen(false); navigate("/notifications"); }}
              className="w-full text-center hover:opacity-70 transition-opacity" style={{ color: "var(--primary)", fontSize: "0.75rem" }}>
              Все уведомления
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
