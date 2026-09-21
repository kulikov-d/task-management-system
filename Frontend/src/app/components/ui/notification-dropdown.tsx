import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { notificationsApi } from "../../api/client";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const loadUnreadCount = useAppStore((s) => s.loadUnreadCount);

  useEffect(() => {
    if (open) {
      notificationsApi.list().then(setNotifs).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifs.filter((n) => !n.read).length;

  const markRead = async (id: string, taskId?: string | null) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifs((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
      loadUnreadCount();
      setOpen(false);
      if (taskId) navigate("/tasks", { state: { openTaskId: taskId } });
    } catch {}
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-destructive" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Уведомления</span>
            {unread > 0 && (
              <button onClick={async () => {
                await notificationsApi.markAllAsRead();
                setNotifs((n) => n.map((x) => ({ ...x, read: true })));
                loadUnreadCount();
              }} className="text-xs text-muted-foreground hover:text-foreground">Прочитать все</button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">Нет уведомлений</div>}
            {notifs.slice(0, 8).map((n: any) => (
              <div key={n.id} onClick={() => markRead(n.id, n.taskId)}
                className={`px-3 py-2.5 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border last:border-0 ${
                  !n.read ? "bg-status-info-bg" : ""
                }`}>
                <p className="text-xs font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
