import { Mail, Shield, Code, Eye } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { getInitials, getUserColor } from "../utils/helpers";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: "Администратор", color: "#ef4444", icon: Shield },
  lead: { label: "Тимлид", color: "#f59e0b", icon: Shield },
  developer: { label: "Разработчик", color: "#6366f1", icon: Code },
  viewer: { label: "Наблюдатель", color: "#6b7280", icon: Eye },
};

export function TeamView() {
  const users = useAppStore((s) => s.users);
  const tasks = useAppStore((s) => s.tasks);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: "var(--background)" }}>
      <div>
        <h2 style={{ color: "var(--foreground)" }}>Команда</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: "0.125rem" }}>{users.length} участников</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {users.map((user: any) => {
          const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.viewer;
          const RoleIcon = cfg.icon;
          const assigned = tasks.filter((t: any) => t.assigneeId === user.id);
          const done = assigned.filter((t: any) => t.status === "DONE").length;

          return (
            <div key={user.id} className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: getUserColor(user.id), fontWeight: 600, fontSize: "0.85rem" }}>
                  {getInitials(user.name)}
                </div>
                <div>
                  <p style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500 }}>{user.name}</p>
                  <div className="flex items-center gap-1.5">
                    <RoleIcon size={10} style={{ color: cfg.color }} />
                    <span style={{ color: cfg.color, fontSize: "0.68rem" }}>{cfg.label}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-3">
                <Mail size={11} style={{ color: "var(--muted-foreground)" }} />
                <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{user.email}</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Задач</span>
                  <span style={{ color: "var(--foreground)", fontSize: "0.7rem", fontWeight: 500 }}>{done}/{assigned.length}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                  <div className="h-full rounded-full" style={{ width: `${assigned.length ? Math.round(done / assigned.length * 100) : 0}%`, background: cfg.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
