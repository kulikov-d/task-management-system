import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { getInitials, getUserColor } from "../utils/helpers";
import { TaskForm } from "./TaskForm";
import { FileUpload } from "./FileUpload";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  TODO: { label: "К выполнению", color: "#6b7280" },
  IN_PROGRESS: { label: "В работе", color: "#6366f1" },
  IN_REVIEW: { label: "На ревью", color: "#f59e0b" },
  DONE: { label: "Готово", color: "#10b981" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: "Критичный", color: "#ef4444" },
  HIGH: { label: "Высокий", color: "#f59e0b" },
  MEDIUM: { label: "Средний", color: "#6366f1" },
  LOW: { label: "Низкий", color: "#10b981" },
};

function getTaskTags(task: any, allTags: any[]) {
  if (!task.tags) return [];
  return task.tags.map((tt: any) => {
    if (tt.tag) return tt.tag;
    return allTags.find((t: any) => t.id === tt);
  }).filter(Boolean);
}

export function TaskList({ project }: { project: any }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<any | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const storeTasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const tags = useAppStore((s) => s.tags);
  const loadTasks = useAppStore((s) => s.loadTasks);

  const tasks = storeTasks.filter((t: any) => {
    if (t.projectId !== project.id) return false;
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск задач..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border text-sm" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}>
            <option value="ALL">Все статусы</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}>
            <option value="ALL">Все приоритеты</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <span className="ml-auto text-sm" style={{ color: "var(--muted-foreground)" }}>{tasks.length} задач</span>
          <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90" style={{ background: "#6366f1" }}>
            <Plus size={14} /> Задача
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid px-6 py-2 border-b sticky top-0" style={{ gridTemplateColumns: "1fr 120px 110px 140px 100px", borderColor: "var(--border)", background: "var(--muted)" }}>
            {["Задача", "Статус", "Приоритет", "Исполнитель", "Дедлайн"].map(h => (
              <span key={h} style={{ color: "var(--muted-foreground)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>
          {tasks.map((task: any, i: number) => {
            const assignee = task.assignee || users.find((u: any) => u.id === task.assigneeId);
            const taskTags = getTaskTags(task, tags);
            return (
              <div key={task.id} onClick={() => setSelected(task)}
                className="grid px-6 py-3 hover:bg-black/[0.02] transition-colors cursor-pointer items-center"
                style={{ gridTemplateColumns: "1fr 120px 110px 140px 100px", borderBottom: i < tasks.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <p style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500 }}>{task.title}</p>
                  <div className="flex gap-1 mt-1">
                    {taskTags.slice(0, 3).map((tag: any) => (
                      <span key={tag.id} className="px-1.5 py-0.5 rounded" style={{ background: tag.color + "18", color: tag.color, fontSize: "0.6rem" }}>{tag.name}</span>
                    ))}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded w-fit text-xs" style={{ background: STATUS_CONFIG[task.status]?.color + "18", color: STATUS_CONFIG[task.status]?.color, fontSize: "0.68rem" }}>
                  {STATUS_CONFIG[task.status]?.label}
                </span>
                <span className="px-2 py-0.5 rounded w-fit text-xs" style={{ background: PRIORITY_CONFIG[task.priority]?.color + "18", color: PRIORITY_CONFIG[task.priority]?.color, fontSize: "0.68rem" }}>
                  {PRIORITY_CONFIG[task.priority]?.label}
                </span>
                <div className="flex items-center gap-2">
                  {assignee && (
                    <>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: getUserColor(assignee.id), fontSize: "0.5rem", fontWeight: 600 }}>{getInitials(assignee.name)}</div>
                      <span style={{ color: "var(--foreground)", fontSize: "0.72rem" }}>{assignee.name?.split(" ")[0]}</span>
                    </>
                  )}
                </div>
                <span style={{ color: task.dueDate && new Date(task.dueDate) < new Date() ? "#ef4444" : "var(--muted-foreground)", fontSize: "0.72rem" }}>
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString("ru-RU") : "—"}
                </span>
              </div>
            );
          })}
          {tasks.length === 0 && <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>Нет задач</div>}
        </div>
      </div>

      {/* Side panel */}
      {selected && (
        <div className="w-80 border-l overflow-y-auto p-5 space-y-4 shrink-0" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-start justify-between">
            <h3 style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 600, flex: 1 }}>{selected.title}</h3>
            <button onClick={() => setSelected(null)} className="text-sm ml-2" style={{ color: "var(--muted-foreground)" }}>✕</button>
          </div>
          {selected.description && <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", lineHeight: 1.5 }}>{selected.description}</p>}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Статус</span>
              <span className="px-2 py-0.5 rounded text-xs" style={{ background: STATUS_CONFIG[selected.status]?.color + "18", color: STATUS_CONFIG[selected.status]?.color }}>{STATUS_CONFIG[selected.status]?.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Приоритет</span>
              <span className="px-2 py-0.5 rounded text-xs" style={{ background: PRIORITY_CONFIG[selected.priority]?.color + "18", color: PRIORITY_CONFIG[selected.priority]?.color }}>{PRIORITY_CONFIG[selected.priority]?.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Исполнитель</span>
              <span style={{ color: "var(--foreground)", fontSize: "0.75rem" }}>{selected.assignee?.name || "Не назначен"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Дедлайн</span>
              <span style={{ color: "var(--foreground)", fontSize: "0.75rem" }}>{selected.dueDate ? new Date(selected.dueDate).toLocaleDateString("ru-RU") : "Не установлен"}</span>
            </div>
          </div>
          {getTaskTags(selected, tags).length > 0 && (
            <div>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>Теги</p>
              <div className="flex flex-wrap gap-1">
                {getTaskTags(selected, tags).map((tag: any) => (
                  <span key={tag.id} className="px-2 py-0.5 rounded" style={{ background: tag.color + "18", color: tag.color, fontSize: "0.7rem" }}>{tag.name}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>Вложения</p>
            <FileUpload taskId={selected.id} onUploaded={() => loadTasks(project.id)} />
          </div>
          <button onClick={() => { setEditingTask(selected); setSelected(null); }}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
            Редактировать
          </button>
        </div>
      )}

      {showCreateForm && (
        <TaskForm projectId={project.id} onClose={() => setShowCreateForm(false)} onSaved={() => { setShowCreateForm(false); loadTasks(project.id); }} />
      )}
      {editingTask && (
        <TaskForm task={editingTask} projectId={project.id} onClose={() => setEditingTask(null)} onSaved={() => { setEditingTask(null); loadTasks(project.id); }} />
      )}
    </div>
  );
}
