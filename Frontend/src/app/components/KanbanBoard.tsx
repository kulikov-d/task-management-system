import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { GripVertical, MessageSquare, Paperclip, ArrowUpCircle, ArrowDownCircle, Minus, UserPlus, Trash2, Copy, Clock, Play, Pause } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { getTaskTags } from "../utils/helpers";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { KanbanFilters } from "./kanban/KanbanFilters";
import { TaskDetailPanel } from "./kanban/TaskDetailPanel";
import { toast } from "./ui/toast";
import { showContextMenu } from "./ui/context-menu";

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function formatElapsed(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = String(Math.floor(diff / 3600)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
  const s = String(diff % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const COLUMNS = [
  { id: "TODO", label: "К выполнению", color: "#8b5cf6", bg: "from-violet-50 to-purple-50", darkBg: "dark:from-violet-500/10 dark:to-purple-500/10" },
  { id: "IN_PROGRESS", label: "В работе", color: "#3b82f6", bg: "from-blue-50 to-cyan-50", darkBg: "dark:from-blue-500/10 dark:to-cyan-500/10" },
  { id: "IN_REVIEW", label: "На ревью", color: "#f59e0b", bg: "from-amber-50 to-orange-50", darkBg: "dark:from-amber-500/10 dark:to-orange-500/10" },
  { id: "DONE", label: "Готово", color: "#10b981", bg: "from-emerald-50 to-green-50", darkBg: "dark:from-emerald-500/10 dark:to-green-500/10" },
];

const PRIORITY_STYLE: Record<string, { dot: string; bg: string; text: string }> = {
  CRITICAL: { dot: "#ef4444", bg: "bg-red-50 dark:bg-red-500/15", text: "text-red-600 dark:text-red-400" },
  HIGH: { dot: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-500/15", text: "text-amber-600 dark:text-amber-400" },
  MEDIUM: { dot: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-500/15", text: "text-blue-600 dark:text-blue-400" },
  LOW: { dot: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
};
const PRIORITY_LABEL: Record<string, string> = { CRITICAL: "Критичный", HIGH: "Высокий", MEDIUM: "Средний", LOW: "Низкий" };

function TaskCard({ task, onDragStart, isDragging, onClick }: { task: any; onDragStart: (task: any) => void; isDragging?: boolean; onClick: () => void }) {
  const users = useAppStore((s) => s.users);
  const tags = useAppStore((s) => s.tags);
  const currentUser = useAuthStore((s) => s.user);
  const changeTaskStatus = useAppStore((s) => s.changeTaskStatus);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const assignTask = useAppStore((s) => s.assignTask);
  const activeTimer = useAppStore((s) => s.activeTimer);
  const startTimer = useAppStore((s) => s.startTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const assignee = task.assignee || users.find((u: any) => u.id === task.assigneeId);
  const taskTags = getTaskTags(task, tags);
  const p = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.MEDIUM;

  const isMyTask = currentUser?.id && task.assigneeId === currentUser.id;
  const isTimerOnThisTask = activeTimer?.taskId === task.id;
  const [liveElapsed, setLiveElapsed] = useState("");

  useEffect(() => {
    if (!isTimerOnThisTask || !activeTimer) { setLiveElapsed(""); return; }
    const tick = () => setLiveElapsed(formatElapsed(activeTimer.startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isTimerOnThisTask, activeTimer?.startedAt]);

  const handleToggleTimer = async () => {
    try {
      if (isTimerOnThisTask) {
        await stopTimer();
        toast.success("Таймер остановлен");
      } else {
        await startTimer(task.id);
        toast.success("Таймер запущен");
      }
    } catch { toast.error("Ошибка таймера"); }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, [
      { label: "Назначить себя", icon: UserPlus, onClick: () => { if (currentUser?.id) assignTask(task.id, currentUser.id).then(() => toast.success("Задача назначена")); } },
      ...(isMyTask ? [{
        label: isTimerOnThisTask ? "Остановить таймер" : "Запустить таймер",
        icon: isTimerOnThisTask ? Pause : Play,
        onClick: handleToggleTimer,
      }] : []),
      { divider: true, label: "", onClick: () => {} },
      { label: "К выполнению", icon: ArrowDownCircle, onClick: () => { changeTaskStatus(task.id, "TODO").then(() => toast.success("Статус изменён")); } },
      { label: "В работу", icon: GripVertical, onClick: () => { changeTaskStatus(task.id, "IN_PROGRESS").then(() => toast.success("Статус изменён")); } },
      { label: "На ревью", icon: Minus, onClick: () => { changeTaskStatus(task.id, "IN_REVIEW").then(() => toast.success("Статус изменён")); } },
      { label: "Готово", icon: ArrowUpCircle, onClick: () => { changeTaskStatus(task.id, "DONE").then(() => toast.success("Статус изменён")); } },
      { divider: true, label: "", onClick: () => {} },
      { label: "Скопировать ID", icon: Copy, onClick: () => { navigator.clipboard.writeText(task.id); toast.info("ID скопирован"); } },
      { label: "Удалить", icon: Trash2, danger: true, onClick: () => { if (confirm("Удалить задачу?")) { deleteTask(task.id).then(() => { removeTask(task.id); toast.success("Задача удалена"); }); } } },
    ]);
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart(task);
      }}
      onContextMenu={handleContextMenu}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-xl bg-card p-3 cursor-grab active:cursor-grabbing group transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10 hover:scale-[1.02] shadow-sm border ${
        isTimerOnThisTask ? "border-green-500/50 ring-1 ring-green-500/20" : "border-border/60"
      }`}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.bg} ${p.text}`}>
          {PRIORITY_LABEL[task.priority]}
        </span>
        <GripVertical size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
      </div>
      <p className="text-xs font-semibold text-foreground leading-snug mb-2">{task.title}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {taskTags.slice(0, 2).map((tag: any) => (
          <span key={tag.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: tag.color + "20", color: tag.color }}>{tag.name}</span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-border/60">
        <div className="flex items-center gap-1.5">
          {(task._count?.comments || task.commentCount || 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MessageSquare size={9} />{task._count?.comments || task.commentCount}
            </span>
          )}
          {(task._count?.attachments || task.attachmentCount || 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Paperclip size={9} />{task._count?.attachments || task.attachmentCount}
            </span>
          )}
          <span className={`flex items-center gap-0.5 text-[10px] ${isTimerOnThisTask ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}>
            {isTimerOnThisTask && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
            <Clock size={9} />
            {isTimerOnThisTask ? liveElapsed : formatTime(task.totalTimeSpent || 0)}
          </span>
        </div>
        {assignee && <Avatar name={assignee.name} size="sm" />}
      </div>
    </div>
  );
}

export function KanbanBoard({ project }: { project: any }) {
  const storeTasks = useAppStore((s) => s.tasks);
  const moveTask = useAppStore((s) => s.moveTask);
  const users = useAppStore((s) => s.users);
  const tags = useAppStore((s) => s.tags);
  const location = useLocation();
  const [tasks, setTasks] = useState<any[]>([]);
  const [draggingTask, setDraggingTask] = useState<any>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ assigneeId?: string; priority?: string; tagId?: string }>({});
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    const openTaskId = location.state?.openTaskId;
    if (openTaskId && storeTasks.length > 0) {
      const task = storeTasks.find((t: any) => t.id === openTaskId);
      if (task) setSelectedTask(task);
      window.history.replaceState({}, "");
    }
  }, [location.state, storeTasks]);

  useEffect(() => {
    let result = storeTasks.filter((t: any) => t.projectId === project.id);
    if (filters.assigneeId) result = result.filter((t: any) => t.assigneeId === filters.assigneeId);
    if (filters.priority) result = result.filter((t: any) => t.priority === filters.priority);
    if (filters.tagId) result = result.filter((t: any) => (t.tagIds || []).includes(filters.tagId) || (t.tags || []).some((t2: any) => t2.tagId === filters.tagId));
    setTasks(result);
  }, [storeTasks, project.id, filters]);

  const getColumnTasks = (status: string) =>
    tasks.filter((t: any) => t.status === status).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(colId);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const task = tasks.find((t: any) => t.id === taskId);
    if (!task || task.status === targetStatus) return;
    const targetTasks = tasks.filter((t: any) => t.status === targetStatus && t.id !== taskId);
    const newPosition = targetTasks.length;
    setTasks((prev) => prev.map((t: any) => t.id === taskId ? { ...t, status: targetStatus, position: newPosition } : t));
    moveTask(taskId, targetStatus, newPosition).catch(() => toast.error("Не удалось переместить задачу"));
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-background">
      <div className="px-4 py-2 border-b border-border bg-card">
        <KanbanFilters users={users} tags={tags} filters={filters} onChange={setFilters} />
      </div>
      <div className="flex-1 flex gap-4 p-4 overflow-x-auto bg-background">
        {COLUMNS.map(col => {
          const colTasks = getColumnTasks(col.id);
          const isOver = dragOverCol === col.id;
          return (
            <div key={col.id} className="flex flex-col w-72 shrink-0"
              onDragOver={(e) => handleDragOver(e, col.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, col.id)}>
              <div className="flex items-center gap-2 px-2 py-2 mb-3 shrink-0">
                <div className="w-3 h-3 rounded-full" style={{ background: col.color }} />
                <span className="text-sm font-bold text-foreground">{col.label}</span>
                <span className="text-xs font-medium text-muted-foreground bg-accent px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <div className={`flex-1 space-y-2.5 min-h-[100px] rounded-2xl p-2 overflow-y-auto transition-all duration-200 bg-gradient-to-b ${col.bg} ${col.darkBg} ${
                isOver ? "ring-2 ring-primary/30" : ""
              }`} style={{ minHeight: 200 }}>
                {colTasks.map((task: any) => (
                  <TaskCard key={task.id} task={task} isDragging={draggingTask?.id === task.id} onDragStart={setDraggingTask}
                    onClick={() => setSelectedTask(task)} />
                ))}
                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center h-20 rounded-2xl text-xs text-muted-foreground border-2 border-dashed border-border/50">
                    Перетащите задачу
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
