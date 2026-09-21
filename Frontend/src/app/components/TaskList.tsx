import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { getTaskTags } from "../utils/helpers";
import { TaskForm } from "./TaskForm";
import { TaskDetailPanel } from "./kanban/TaskDetailPanel";
import { canCreateTask } from "../utils/permissions";
import { useAuthStore } from "../stores/authStore";
import { toast } from "./ui/toast";
import { Input } from "./ui/input";
import { Select } from "./ui/dropdown";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "info" | "error" }> = {
  TODO: { label: "К выполнению", variant: "secondary" },
  IN_PROGRESS: { label: "В работе", variant: "info" },
  IN_REVIEW: { label: "На ревью", variant: "warning" },
  DONE: { label: "Готово", variant: "success" },
};

const PRIORITY_DOT: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#3b82f6", LOW: "#22c55e" };
const PRIORITY_LABEL: Record<string, string> = { CRITICAL: "Критичный", HIGH: "Высокий", MEDIUM: "Средний", LOW: "Низкий" };

export function TaskList({ project, showHeader = true }: { project: any; showHeader?: boolean }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const storeTasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const tags = useAppStore((s) => s.tags);
  const loadTasks = useAppStore((s) => s.loadTasks);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const currentUser = useAuthStore((s) => s.user);

  const tasks = storeTasks.filter((t: any) => {
    if (t.projectId !== project.id) return false;
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Удалить задачу?")) return;
    try {
      await deleteTask(taskId);
      setSelected(null);
      toast.success("Задача удалена");
    } catch (err) {
      toast.error("Не удалось удалить задачу");
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {showHeader && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск задач..." className="pl-8 h-7 text-xs" />
            </div>
            <Select value={statusFilter} onChange={setStatusFilter} options={[
              { value: "ALL", label: "Все статусы" },
              ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
            ]} />
            <Select value={priorityFilter} onChange={setPriorityFilter} options={[
              { value: "ALL", label: "Все приоритеты" },
              ...Object.entries(PRIORITY_LABEL).map(([k, v]) => ({ value: k, label: v })),
            ]} />
            <span className="ml-auto text-xs text-muted-foreground">{tasks.length}</span>
            {canCreateTask(currentUser?.role || "") && (
              <Button size="sm" onClick={() => { setEditingTask(null); setShowForm(true); }}>
                <Plus size={13} /> Задача
              </Button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Задача</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-24">Статус</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-24">Приоритет</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-32">Исполнитель</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-24">Дедлайн</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task: any) => {
                const assignee = task.assignee || users.find((u: any) => u.id === task.assigneeId);
                const taskTags = getTaskTags(task, tags);
                return (
                  <tr key={task.id} onClick={() => setSelected(task)}
                    className="hover:bg-accent/50 transition-colors cursor-pointer border-b border-border last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_DOT[task.priority] }} />
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-foreground truncate block">{task.title}</span>
                          {taskTags.length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {taskTags.slice(0, 3).map((tag: any) => (
                                <span key={tag.id} className="px-1.5 py-0 rounded text-[10px] font-medium"
                                  style={{ background: tag.color + "18", color: tag.color }}>{tag.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_CONFIG[task.status]?.variant || "secondary"}>
                        {STATUS_CONFIG[task.status]?.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-muted-foreground">{PRIORITY_LABEL[task.priority]}</span>
                    </td>
                    <td className="px-3 py-2">
                      {assignee && (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={assignee.name} size="sm" />
                          <span className="text-xs text-foreground truncate">{assignee.name?.split(" ")[0]}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs ${task.dueDate && new Date(task.dueDate) < new Date() ? "text-status-error" : "text-muted-foreground"}`}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Нет задач</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <TaskDetailPanel task={selected} onClose={() => setSelected(null)}
          onTaskUpdated={() => { setSelected(null); loadTasks(project.id); }} />
      )}

      {showForm && (
        <TaskForm task={editingTask} projectId={project.id}
          onClose={() => { setShowForm(false); setEditingTask(null); }}
          onSaved={() => { setShowForm(false); setEditingTask(null); loadTasks(project.id); }} />
      )}
    </div>
  );
}
