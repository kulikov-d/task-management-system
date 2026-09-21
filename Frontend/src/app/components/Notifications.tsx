import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Bell, UserCheck, AlertTriangle, MessageSquare, CheckCircle2 } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { notificationsApi } from "../api/client";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { toast } from "./ui/toast";

const TYPE_CONFIG: Record<string, { icon: any; variant: "info" | "error" | "warning" | "success" }> = {
  assign: { icon: UserCheck, variant: "info" },
  assignment: { icon: UserCheck, variant: "info" },
  overdue: { icon: AlertTriangle, variant: "error" },
  comment: { icon: MessageSquare, variant: "warning" },
  status: { icon: CheckCircle2, variant: "success" },
};

export function Notifications({ onRead }: { onRead: () => void }) {
  const notifications = useAppStore((s) => s.notifications);
  const loadNotifications = useAppStore((s) => s.loadNotifications);
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);
  useEffect(() => { setNotifs(notifications); }, [notifications]);

  const markAll = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifs(n => n.map(x => ({ ...x, read: true })));
      onRead();
    } catch (err) {
      toast.error("Не удалось отметить все как прочитанные");
    }
  };

  const markOne = async (id: string, taskId?: string | null) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
      onRead();
      if (taskId) navigate("/tasks", { state: { openTaskId: taskId } });
    } catch (err) {
      toast.error("Не удалось отметить как прочитанное");
    }
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Уведомления</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{unread} непрочитанных</p>
        </div>
        {unread > 0 && <Button variant="secondary" size="sm" onClick={markAll}>Отметить все</Button>}
      </div>

      <Card>
        {notifs.length === 0 && <div className="p-8 text-center text-xs text-muted-foreground">Нет уведомлений</div>}
        {notifs.map((n: any, i: number) => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.assign;
          const Icon = cfg.icon;
          return (
            <div key={n.id} onClick={() => markOne(n.id, n.taskId)}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
              style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none", background: !n.read ? "var(--status-" + cfg.variant + "-bg)" : "transparent" }}>
              <div className="relative mt-0.5">
                <Badge variant={cfg.variant} className="p-1.5"><Icon size={12} /></Badge>
                {!n.read && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{n.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {new Date(n.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
