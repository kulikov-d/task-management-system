import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, Clock, AlertTriangle, Users, TrendingUp, ArrowRight, Flame, Plus, Play, UserPlus } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { getProjectColor } from "../utils/helpers";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { TaskDetailPanel } from "./kanban/TaskDetailPanel";
import { QuickCreateModal } from "./QuickCreateModal";

const STATUS_LABELS: Record<string, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  IN_REVIEW: "На ревью",
  DONE: "Готово",
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "#8b5cf6",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#f59e0b",
  DONE: "#10b981",
};

const STAT_CONFIG = [
  { key: "total", label: "Всего", icon: CheckCircle2, gradient: "from-violet-500 to-purple-600", bg: "bg-violet-50 dark:bg-violet-500/10" },
  { key: "inProgress", label: "В работе", icon: TrendingUp, gradient: "from-blue-500 to-cyan-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
  { key: "review", label: "На ревью", icon: Clock, gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
  { key: "overdue", label: "Просрочено", icon: AlertTriangle, gradient: "from-red-500 to-pink-500", bg: "bg-red-50 dark:bg-red-500/10" },
];

export function Dashboard({ project, onViewChange }: { project: any; onViewChange: (v: any) => void }) {
  const navigate = useNavigate();
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const projects = useAppStore((s) => s.projects);
  const taskStats = useAppStore((s) => s.taskStats);
  const loadTaskStats = useAppStore((s) => s.loadTaskStats);
  const loadTasks = useAppStore((s) => s.loadTasks);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  useEffect(() => {
    if (project?.id) loadTaskStats(project.id);
  }, [project?.id, loadTaskStats]);

  const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
  const done = projectTasks.filter((t: any) => t.status === "DONE").length;
  const inProgress = projectTasks.filter((t: any) => t.status === "IN_PROGRESS").length;
  const overdue = projectTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;
  const recentTasks = [...projectTasks].sort((a: any, b: any) => b.createdAt?.localeCompare(a.createdAt)).slice(0, 5);

  const priorityColor: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#3b82f6", LOW: "#10b981" };

  const statusDist = taskStats?.byStatus
    ? taskStats.byStatus.map((s) => ({
        status: s.status,
        label: STATUS_LABELS[s.status] || s.status,
        count: typeof s._count === "object" ? (s._count as any)._all ?? 0 : s._count,
        color: STATUS_COLORS[s.status] || "#8b5cf6",
      }))
    : Object.entries(
        projectTasks.reduce((acc: Record<string, number>, t: any) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {})
      ).map(([status, count]) => ({
        status,
        label: STATUS_LABELS[status] || status,
        count: count as number,
        color: STATUS_COLORS[status] || "#8b5cf6",
      }));

  const totalTasks = statusDist.reduce((sum, s) => sum + s.count, 0);

  const statsValues = [projectTasks.length, inProgress, projectTasks.filter((t: any) => t.status === "IN_REVIEW").length, overdue];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{project.description || ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowQuickCreate(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
            <Plus size={12} /> Задачу
          </button>
          <button onClick={() => onViewChange("tasks")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
            <Play size={12} /> Спринт
          </button>
          <button onClick={() => onViewChange("team")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
            <UserPlus size={12} /> Участника
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {STAT_CONFIG.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className={`p-4 ${stat.bg}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${stat.gradient} shadow-lg shadow-purple-500/10`}>
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{statsValues[i]}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {i === 0 && `${done} завершено`}
                {i === 1 && "активных"}
                {i === 2 && "ожидает"}
                {i === 3 && "эскалация"}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-foreground">По статусам</span>
              <button onClick={() => onViewChange("analytics")} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                Подробнее <ArrowRight size={11} />
              </button>
            </div>
            <div className="space-y-3">
              {statusDist.map((s) => (
                <div key={s.status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs font-medium text-foreground">{s.label}</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{s.count}</span>
                  </div>
                  <Progress value={s.count} max={totalTasks || 1} color={s.color} size="md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-sm font-bold text-foreground block mb-3">Прогресс</span>
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-muted/50" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="url(#progressGradient)" strokeWidth="8"
                    strokeDasharray={`${totalTasks ? (done / totalTasks) * 264 : 0} 264`} strokeLinecap="round" />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-foreground">{totalTasks ? Math.round(done / totalTasks * 100) : 0}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{done} из {totalTasks}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Последние задачи</span>
            <button onClick={() => onViewChange("tasks")} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
              Все задачи <ArrowRight size={11} />
            </button>
          </div>
          <div>
            {recentTasks.map((task: any) => {
              const assignee = task.assignee || users.find((u: any) => u.id === task.assigneeId);
              return (
                <div key={task.id} onClick={() => setSelectedTask(task)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border last:border-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: priorityColor[task.priority] }} />
                  <span className="text-xs font-medium text-foreground flex-1 truncate">{task.title}</span>
                  <Badge variant="secondary" className="shrink-0 rounded-full">{STATUS_LABELS[task.status] || task.status}</Badge>
                  {assignee && <Avatar name={assignee.name} size="sm" />}
                  {task.dueDate && (
                    <span className={`text-[11px] shrink-0 ${new Date(task.dueDate) < new Date() ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                      {new Date(task.dueDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                </div>
              );
            })}
            {recentTasks.length === 0 && <div className="p-8 text-center text-xs text-muted-foreground">Нет задач</div>}
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">Все проекты</h3>
        <div className="grid grid-cols-3 gap-4">
          {projects.map((p: any) => {
            const pTasks = tasks.filter((t: any) => t.projectId === p.id);
            const pDone = pTasks.filter((t: any) => t.status === "DONE").length;
            const total = p._count?.tasks || pTasks.length;
            return (
              <Card key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="p-4 cursor-pointer hover:scale-[1.02] transition-all duration-200">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: getProjectColor(p.key) }}>{p.key?.slice(0, 1)}</div>
                  <span className="text-sm font-bold text-foreground">{p.name}</span>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-muted-foreground">Прогресс</span>
                  <span className="text-[11px] font-bold text-foreground">{pDone}/{total}</span>
                </div>
                <Progress value={pDone} max={total || 1} color={getProjectColor(p.key)} size="sm" />
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1"><Users size={11} className="text-muted-foreground" /><span className="text-[11px] text-muted-foreground">{p._count?.members || 0}</span></div>
                  <div className="flex items-center gap-1"><Flame size={11} className="text-muted-foreground" /><span className="text-[11px] text-muted-foreground">{total - pDone} активных</span></div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => { setSelectedTask(null); if (project?.id) loadTasks(project.id); }} />
      )}
      {showQuickCreate && <QuickCreateModal onClose={() => setShowQuickCreate(false)} />}
    </div>
  );
}
