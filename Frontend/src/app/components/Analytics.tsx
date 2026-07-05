import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { TrendingUp, Target, CheckCircle, Clock } from "lucide-react";
import { getInitials, getUserColor } from "../utils/helpers";

export function Analytics({ project }: { project: any }) {
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const sprints = useAppStore((s) => s.sprints);
  const selectedSprintId = useAppStore((s) => s.selectedSprintId);
  const setSelectedSprintId = useAppStore((s) => s.setSelectedSprintId);
  const burndownData = useAppStore((s) => s.burndownData);
  const velocityData = useAppStore((s) => s.velocityData);
  const taskStats = useAppStore((s) => s.taskStats);
  const loadBurndown = useAppStore((s) => s.loadBurndown);
  const loadVelocity = useAppStore((s) => s.loadVelocity);
  const loadTaskStats = useAppStore((s) => s.loadTaskStats);
  const loadSprints = useAppStore((s) => s.loadSprints);

  useEffect(() => {
    if (project?.id) loadSprints(project.id);
  }, [project?.id, loadSprints]);

  useEffect(() => {
    if (project?.id) {
      loadBurndown(project.id);
      loadVelocity(project.id);
      loadTaskStats(project.id);
    }
  }, [project?.id, selectedSprintId, loadBurndown, loadVelocity, loadTaskStats]);

  const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
  const done = projectTasks.filter((t: any) => t.status === "DONE").length;
  const pct = projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0;
  const overdue = projectTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;

  const currentVelocity = velocityData.length > 0 ? velocityData[velocityData.length - 1]?.completed ?? 0 : 0;
  const avgVelocity = velocityData.length > 0
    ? Math.round(velocityData.reduce((sum: number, v: any) => sum + (v.completed || 0), 0) / velocityData.length * 10) / 10
    : 0;

  const assigneeStats = users.map((u: any) => ({
    id: u.id, name: u.name,
    total: projectTasks.filter((t: any) => t.assigneeId === u.id).length,
    done: projectTasks.filter((t: any) => t.assigneeId === u.id && t.status === "DONE").length,
  })).filter((s) => s.total > 0);

  const cards = [
    { label: "Завершено", value: `${pct}%`, sub: `${done} из ${projectTasks.length} задач`, icon: CheckCircle, color: "#10b981" },
    { label: "Текущая скорость", value: String(currentVelocity), sub: "задач за спринт", icon: TrendingUp, color: "#6366f1" },
    { label: "Средняя скорость", value: String(avgVelocity), sub: "задач за спринт", icon: Target, color: "#22d3ee" },
    { label: "Просрочено", value: overdue, sub: "нужна эскалация", icon: Clock, color: "#ef4444" },
  ];

  const maxVelocity = Math.max(...velocityData.map((v: any) => Math.max(v.planned || 0, v.completed || 0)), 1);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: "var(--background)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: "var(--foreground)" }}>Аналитика</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: "0.125rem" }}>{project.name}</p>
        </div>
        <select
          value={selectedSprintId || ""}
          onChange={(e) => setSelectedSprintId(e.target.value || null)}
          className="rounded-lg px-3 py-1.5 text-sm"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          <option value="">Все спринты</option>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{label}</span>
              <Icon size={14} style={{ color }} />
            </div>
            <p style={{ color: "var(--foreground)", fontSize: "1.4rem", fontWeight: 600 }}>{value}</p>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.68rem" }}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--foreground)", marginBottom: "1rem" }}>Burn-down</h3>
          {burndownData.length > 0 ? (
            <div className="space-y-2">
              {burndownData.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", width: 50, flexShrink: 0 }}>{d.date}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                      <div className="h-full rounded-full" style={{ width: `${d.planned ? (d.planned / (burndownData[0]?.planned || 1)) * 100 : 0}%`, background: "#6366f1" }} />
                    </div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                      <div className="h-full rounded-full" style={{ width: `${d.actual ? (d.actual / (burndownData[0]?.planned || 1)) * 100 : 0}%`, background: "#22d3ee" }} />
                    </div>
                  </div>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.65rem", width: 50, textAlign: "right" }}>{d.actual ?? "—"}</span>
                </div>
              ))}
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: "#6366f1" }} /><span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>План</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: "#22d3ee" }} /><span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Факт</span></div>
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>Нет данных</p>
          )}
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--foreground)", marginBottom: "1rem" }}>Скорость</h3>
          {velocityData.length > 0 ? (
            <div className="space-y-3">
              {velocityData.map((v: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ color: "var(--foreground)", fontSize: "0.78rem" }}>{v.sprint}</span>
                    <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>{v.completed}/{v.planned}</span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ background: "var(--muted)" }}>
                    <div className="h-full rounded-full" style={{ width: `${v.planned ? (v.planned / maxVelocity) * 100 : 0}%`, background: "#6366f140" }} />
                    <div className="h-full rounded-full -ml-full" style={{ width: `${v.completed ? (v.completed / maxVelocity) * 100 : 0}%`, background: "#6366f1" }} />
                  </div>
                </div>
              ))}
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded" style={{ background: "#6366f140" }} /><span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>План</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded" style={{ background: "#6366f1" }} /><span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Факт</span></div>
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>Нет данных</p>
          )}
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 style={{ color: "var(--foreground)", marginBottom: "1rem" }}>По исполнителям</h3>
        <div className="space-y-3">
          {assigneeStats.map(s => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: getUserColor(s.id), fontSize: "0.55rem", fontWeight: 600 }}>{getInitials(s.name)}</div>
              <span style={{ color: "var(--foreground)", fontSize: "0.8rem", width: 140 }}>{s.name}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                <div className="h-full rounded-full" style={{ width: `${s.total ? Math.round(s.done / s.total * 100) : 0}%`, background: "#6366f1" }} />
              </div>
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.72rem" }}>{s.done}/{s.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
