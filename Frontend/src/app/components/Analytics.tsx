import { useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAppStore } from "../stores/appStore";
import { TrendingUp, Target, CheckCircle, Clock } from "lucide-react";
import { getInitials, getUserColor } from "../utils/helpers";

export function Analytics({ project }: { project: any }) {
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const burndownData = useAppStore((s) => s.burndownData);
  const velocityData = useAppStore((s) => s.velocityData);
  const taskStats = useAppStore((s) => s.taskStats);
  const loadBurndown = useAppStore((s) => s.loadBurndown);
  const loadVelocity = useAppStore((s) => s.loadVelocity);
  const loadTaskStats = useAppStore((s) => s.loadTaskStats);

  useEffect(() => {
    if (project?.id) {
      loadBurndown(project.id);
      loadVelocity(project.id);
      loadTaskStats(project.id);
    }
  }, [project?.id, loadBurndown, loadVelocity, loadTaskStats]);

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

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: "var(--background)" }}>
      <div>
        <h2 style={{ color: "var(--foreground)" }}>Аналитика</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: "0.125rem" }}>{project.name}</p>
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
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={burndownData}>
              <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="planned" name="План" stroke="#6366f1" strokeWidth={2} fill="none" dot={false} />
              <Area type="monotone" dataKey="actual" name="Факт" stroke="#22d3ee" strokeWidth={2} fill="none" dot={false} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--foreground)", marginBottom: "1rem" }}>Скорость</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={velocityData}>
              <XAxis dataKey="sprint" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="planned" name="План" fill="#6366f140" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Факт" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
