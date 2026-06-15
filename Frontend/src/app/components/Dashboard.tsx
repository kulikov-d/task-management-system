import { useEffect } from "react";
import { CheckCircle2, Clock, AlertTriangle, Users, TrendingUp, ArrowRight, Flame } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAppStore } from "../stores/appStore";
import { getInitials, getUserColor, getProjectColor } from "../utils/helpers";

const STATUS_COLORS: Record<string, string> = {
  TODO: "#6b7280",
  IN_PROGRESS: "#6366f1",
  IN_REVIEW: "#f59e0b",
  DONE: "#10b981",
};
const STATUS_LABELS: Record<string, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  IN_REVIEW: "На ревью",
  DONE: "Готово",
};

export function Dashboard({ project, onViewChange }: { project: any; onViewChange: (v: any) => void }) {
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const projects = useAppStore((s) => s.projects);
  const burndownData = useAppStore((s) => s.burndownData);
  const taskStats = useAppStore((s) => s.taskStats);
  const loadBurndown = useAppStore((s) => s.loadBurndown);
  const loadTaskStats = useAppStore((s) => s.loadTaskStats);

  useEffect(() => {
    if (project?.id) {
      loadBurndown(project.id);
      loadTaskStats(project.id);
    }
  }, [project?.id, loadBurndown, loadTaskStats]);

  const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
  const done = projectTasks.filter((t: any) => t.status === "DONE").length;
  const inProgress = projectTasks.filter((t: any) => t.status === "IN_PROGRESS").length;
  const overdue = projectTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;
  const recentTasks = [...projectTasks].sort((a: any, b: any) => b.createdAt?.localeCompare(a.createdAt)).slice(0, 5);

  const priorityColor: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#6366f1", LOW: "#10b981" };

  const statusDist = taskStats?.byStatus
    ? taskStats.byStatus.map((s) => ({
        name: STATUS_LABELS[s.status] || s.status,
        value: typeof s._count === "object" ? (s._count as any)._all ?? 0 : s._count,
        color: STATUS_COLORS[s.status] || "#6b7280",
      }))
    : Object.entries(
        projectTasks.reduce((acc: Record<string, number>, t: any) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {})
      ).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count as number,
        color: STATUS_COLORS[status] || "#6b7280",
      }));

  const stats = [
    { label: "Всего задач", value: projectTasks.length, icon: CheckCircle2, color: "#6366f1", sub: `${done} завершено` },
    { label: "В работе", value: inProgress, icon: TrendingUp, color: "#22d3ee", sub: "активных задач" },
    { label: "На ревью", value: projectTasks.filter((t: any) => t.status === "IN_REVIEW").length, icon: Clock, color: "#f59e0b", sub: "ждут проверки" },
    { label: "Просрочено", value: overdue, icon: AlertTriangle, color: "#ef4444", sub: "нужна эскалация" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: "var(--background)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ color: "var(--foreground)" }}>{project.name}</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: "0.125rem" }}>{project.description || ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {users.slice(0, 4).map((u: any) => (
              <div key={u.id} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-white" style={{ background: getUserColor(u.id), borderColor: "var(--background)", fontSize: "0.6rem", fontWeight: 600 }}>
                {getInitials(u.name)}
              </div>
            ))}
          </div>
          <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{users.length} участников</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "18" }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <p style={{ color: "var(--foreground)", fontSize: "1.6rem", fontWeight: 600, lineHeight: 1 }}>{value}</p>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", marginTop: "0.25rem" }}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: "var(--foreground)" }}>Burn-down график</h3>
            <button onClick={() => onViewChange("analytics")} className="flex items-center gap-1 hover:opacity-70 transition-opacity" style={{ color: "var(--primary)", fontSize: "0.75rem" }}>
              Подробнее <ArrowRight size={12} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={burndownData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="planned" name="Плановые" stroke="#6366f1" strokeWidth={2} fill="url(#gradPlanned)" dot={false} />
              <Area type="monotone" dataKey="actual" name="Фактические" stroke="#22d3ee" strokeWidth={2} fill="url(#gradActual)" dot={false} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: "#6366f1" }} /><span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Плановые</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: "#22d3ee" }} /><span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Фактические</span></div>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--foreground)", marginBottom: "1rem" }}>По статусам</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={statusDist} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" strokeWidth={0}>
                {statusDist.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {statusDist.map((s: any) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>{s.name}</span>
                </div>
                <span style={{ color: "var(--foreground)", fontSize: "0.7rem", fontWeight: 500 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 style={{ color: "var(--foreground)" }}>Последние задачи</h3>
          <button onClick={() => onViewChange("tasks")} className="flex items-center gap-1 hover:opacity-70 transition-opacity" style={{ color: "var(--primary)", fontSize: "0.75rem" }}>
            Все задачи <ArrowRight size={12} />
          </button>
        </div>
        <div>
          {recentTasks.map((task: any, i: number) => {
            const assignee = task.assignee || users.find((u: any) => u.id === task.assigneeId);
            return (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] transition-colors cursor-pointer" style={{ borderBottom: i < recentTasks.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: priorityColor[task.priority] }} />
                <span style={{ flex: 1, color: "var(--foreground)", fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
                <span className="px-2 py-0.5 rounded text-xs shrink-0" style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "0.68rem" }}>{STATUS_LABELS[task.status] || task.status}</span>
                {assignee && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: getUserColor(assignee.id), fontSize: "0.55rem", fontWeight: 600 }}>{getInitials(assignee.name)}</div>
                )}
                {task.dueDate && (
                  <span style={{ color: new Date(task.dueDate) < new Date() ? "#ef4444" : "var(--muted-foreground)", fontSize: "0.7rem", flexShrink: 0, whiteSpace: "nowrap" }}>
                    {new Date(task.dueDate).toLocaleDateString("ru-RU")}
                  </span>
                )}
              </div>
            );
          })}
          {recentTasks.length === 0 && <div className="p-4 text-center" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>Нет задач</div>}
        </div>
      </div>

      <div>
        <h3 style={{ color: "var(--foreground)", marginBottom: "0.75rem" }}>Все проекты</h3>
        <div className="grid grid-cols-3 gap-3">
          {projects.map((p: any) => {
            const pTasks = tasks.filter((t: any) => t.projectId === p.id);
            const pDone = pTasks.filter((t: any) => t.status === "DONE").length;
            const total = p._count?.tasks || pTasks.length;
            return (
              <div key={p.id} className="rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-white" style={{ background: getProjectColor(p.key), fontSize: "0.65rem", fontWeight: 700 }}>{p.key?.slice(0, 1)}</div>
                  <span style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500 }}>{p.name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Прогресс</span>
                  <span style={{ color: "var(--foreground)", fontSize: "0.7rem", fontWeight: 500 }}>{pDone}/{total}</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${total ? Math.round(pDone / total * 100) : 0}%`, background: getProjectColor(p.key) }} />
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1"><Users size={11} style={{ color: "var(--muted-foreground)" }} /><span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>{p._count?.members || 0}</span></div>
                  <div className="flex items-center gap-1"><Flame size={11} style={{ color: "var(--muted-foreground)" }} /><span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>{total - pDone} активных</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
