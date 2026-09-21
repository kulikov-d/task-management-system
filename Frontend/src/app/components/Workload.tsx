import { BarChart3 } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { Avatar } from "./ui/avatar";

const STATUS_LABELS: Record<string, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  IN_REVIEW: "На ревью",
  DONE: "Готово",
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-violet-400",
  IN_PROGRESS: "bg-blue-400",
  IN_REVIEW: "bg-amber-400",
  DONE: "bg-emerald-400",
};

export function Workload() {
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);

  const allMembers = users;

  const memberData = allMembers.map((u: any) => {
    const memberTasks = tasks.filter((t: any) => t.assigneeId === u.id);
    const active = memberTasks.filter((t: any) => t.status !== "DONE");
    return {
      user: u,
      total: memberTasks.length,
      active: active.length,
      done: memberTasks.length - active.length,
      byStatus: {
        TODO: memberTasks.filter((t: any) => t.status === "TODO").length,
        IN_PROGRESS: memberTasks.filter((t: any) => t.status === "IN_PROGRESS").length,
        IN_REVIEW: memberTasks.filter((t: any) => t.status === "IN_REVIEW").length,
        DONE: memberTasks.filter((t: any) => t.status === "DONE").length,
      },
    };
  }).sort((a, b) => b.active - a.active);

  const maxTasks = Math.max(1, ...memberData.map((m) => m.total));

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <BarChart3 size={20} className="text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Загруженность команды</h1>
          </div>
          <span className="text-xs text-muted-foreground">{tasks.length} задач всего</span>
        </div>

        <div className="space-y-3">
          {memberData.map(({ user, total, active, done, byStatus }) => (
            <div key={user.id} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={user.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-[11px] text-muted-foreground">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{active}</p>
                  <p className="text-[10px] text-muted-foreground">активных</p>
                </div>
              </div>

              <div className="h-2.5 rounded-full bg-muted overflow-hidden flex mb-2">
                {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const).map((status) => {
                  const count = byStatus[status];
                  if (count === 0) return null;
                  return (
                    <div key={status}
                      className={`${STATUS_COLORS[status]} transition-all`}
                      style={{ width: `${(count / maxTasks) * 100}%` }}
                      title={`${STATUS_LABELS[status]}: ${count}`}
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-4">
                {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const).map((status) => (
                  <div key={status} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
                    <span className="text-[10px] text-muted-foreground">{STATUS_LABELS[status]}: {byStatus[status]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
