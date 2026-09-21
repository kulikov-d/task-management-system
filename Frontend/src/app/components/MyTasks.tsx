import { useState } from "react";
import { ListChecks, Filter } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { getProjectColor } from "../utils/helpers";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { TaskDetailPanel } from "./kanban/TaskDetailPanel";
import { SkeletonTable } from "./ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  IN_REVIEW: "На ревью",
  DONE: "Готово",
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400",
  IN_PROGRESS: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400",
  IN_REVIEW: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
  DONE: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: "Критичный",
  HIGH: "Высокий",
  MEDIUM: "Средний",
  LOW: "Низкий",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400",
  HIGH: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
  MEDIUM: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400",
  LOW: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export function MyTasks() {
  const currentUser = useAuthStore((s) => s.user);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const allTasks = useAppStore((s) => s.tasks);
  const isLoading = useAppStore((s) => s.isLoading);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const myTasks = allTasks.filter((t: any) => t.assigneeId === currentUser?.id);

  const filtered = statusFilter === "ALL"
    ? myTasks
    : myTasks.filter((t: any) => t.status === statusFilter);

  const stats = {
    total: myTasks.length,
    todo: myTasks.filter((t: any) => t.status === "TODO").length,
    inProgress: myTasks.filter((t: any) => t.status === "IN_PROGRESS").length,
    review: myTasks.filter((t: any) => t.status === "IN_REVIEW").length,
    done: myTasks.filter((t: any) => t.status === "DONE").length,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <ListChecks size={20} className="text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Мои задачи</h1>
          </div>
          <p className="text-xs text-muted-foreground">Все задачи, назначенные на вас</p>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: "Всего", value: stats.total, color: "text-foreground" },
            { label: "К выполнению", value: stats.todo, color: "text-violet-600" },
            { label: "В работе", value: stats.inProgress, color: "text-blue-600" },
            { label: "На ревью", value: stats.review, color: "text-amber-600" },
            { label: "Готово", value: stats.done, color: "text-emerald-600" },
          ].map((s) => (
            <button key={s.label}
              onClick={() => setStatusFilter(s.label === "Всего" ? "ALL" : Object.keys(STATUS_LABELS).find((k) => STATUS_LABELS[k] === s.label) || "ALL")}
              className={`p-3 rounded-xl border transition-all ${
                (s.label === "Всего" && statusFilter === "ALL") ||
                (statusFilter !== "ALL" && STATUS_LABELS[statusFilter] === s.label)
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:shadow-md"
              }`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Filter size={13} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Фильтр:</span>
          {["ALL", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>
              {s === "ALL" ? "Все" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ListChecks size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Нет задач</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">Задача</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">Проект</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">Статус</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">Приоритет</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">Дедлайн</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task: any) => {
                  const project = projects.find((p: any) => p.id === task.projectId);
                  return (
                    <tr key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="border-b border-border/50 last:border-0 hover:bg-accent/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-foreground">{task.title}</span>
                        {task.description && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">{task.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {project && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded flex items-center justify-center text-white"
                              style={{ background: getProjectColor(project.key), fontSize: "7px", fontWeight: 700 }}>
                              {project.key?.slice(0, 1)}
                            </div>
                            <span className="text-xs text-muted-foreground">{project.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[task.status] || ""}`}>
                          {STATUS_LABELS[task.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${PRIORITY_COLORS[task.priority] || ""}`}>
                          {PRIORITY_LABEL[task.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString("ru-RU") : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedTask && (
        <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
