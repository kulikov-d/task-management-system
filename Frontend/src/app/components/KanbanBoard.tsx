import { useState, useEffect, useRef } from "react";
import { GripVertical, MessageSquare, Paperclip } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { getInitials, getUserColor, getTaskTags } from "../utils/helpers";

const COLUMNS = [
  { id: "TODO", label: "К выполнению", color: "#6b7280", bg: "#6b728015" },
  { id: "IN_PROGRESS", label: "В работе", color: "#6366f1", bg: "#6366f115" },
  { id: "IN_REVIEW", label: "На ревью", color: "#f59e0b", bg: "#f59e0b15" },
  { id: "DONE", label: "Готово", color: "#10b981", bg: "#10b98115" },
];

const PRIORITY_COLOR: Record<string, string> = { CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#6366f1", LOW: "#10b981" };
const PRIORITY_LABEL: Record<string, string> = { CRITICAL: "Критичный", HIGH: "Высокий", MEDIUM: "Средний", LOW: "Низкий" };

function TaskCard({ task, onDragStart, isDragging }: { task: any; onDragStart: (task: any) => void; isDragging?: boolean }) {
  const users = useAppStore((s) => s.users);
  const tags = useAppStore((s) => s.tags);
  const assignee = task.assignee || users.find((u: any) => u.id === task.assigneeId);
  const taskTags = getTaskTags(task, tags);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart(task);
      }}
      className="rounded-lg p-3 cursor-grab active:cursor-grabbing group transition-shadow hover:shadow-md"
      style={{ background: "var(--card)", border: "1px solid var(--border)", opacity: isDragging ? 0.4 : 1 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: PRIORITY_COLOR[task.priority] + "20", color: PRIORITY_COLOR[task.priority], fontSize: "0.65rem", fontWeight: 500 }}>
          {PRIORITY_LABEL[task.priority]}
        </span>
        <GripVertical size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--muted-foreground)" }} />
      </div>
      <p style={{ color: "var(--foreground)", fontSize: "0.8rem", fontWeight: 500, lineHeight: 1.35, marginBottom: "0.5rem" }}>{task.title}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {taskTags.slice(0, 2).map((tag: any) => (
            <span key={tag.id} className="px-1.5 py-0.5 rounded" style={{ background: tag.color + "18", color: tag.color, fontSize: "0.6rem" }}>{tag.name}</span>
          ))}
          {(task._count?.comments || task.commentCount || 0) > 0 && (
            <span className="flex items-center gap-0.5 ml-1" style={{ color: "var(--muted-foreground)", fontSize: "0.6rem" }}>
              <MessageSquare size={10} />{task._count?.comments || task.commentCount}
            </span>
          )}
          {(task._count?.attachments || task.attachmentCount || 0) > 0 && (
            <span className="flex items-center gap-0.5" style={{ color: "var(--muted-foreground)", fontSize: "0.6rem" }}>
              <Paperclip size={10} />{task._count?.attachments || task.attachmentCount}
            </span>
          )}
        </div>
        {assignee && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: getUserColor(assignee.id), fontSize: "0.5rem", fontWeight: 700 }}>
            {getInitials(assignee.name)}
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ project }: { project: any }) {
  const storeTasks = useAppStore((s) => s.tasks);
  const moveTask = useAppStore((s) => s.moveTask);
  const [tasks, setTasks] = useState<any[]>([]);
  const [draggingTask, setDraggingTask] = useState<any>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  useEffect(() => {
    setTasks(storeTasks.filter((t: any) => t.projectId === project.id));
  }, [storeTasks, project.id]);

  const getColumnTasks = (status: string) =>
    tasks.filter((t: any) => t.status === status).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(colId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t: any) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    setTasks((prev) => prev.map((t: any) => t.id === taskId ? { ...t, status: targetStatus } : t));
    moveTask(taskId, targetStatus, 0).catch(console.error);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div>
          <h2 style={{ color: "var(--foreground)" }}>Kanban-доска</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>{project.key} · {tasks.length} задач</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {COLUMNS.map(col => {
          const colTasks = getColumnTasks(col.id);
          const isOver = dragOverCol === col.id;
          return (
            <div
              key={col.id}
              className="flex flex-col w-64 shrink-0"
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="flex items-center gap-2 px-2 py-2 mb-2 rounded-lg" style={{ background: isOver ? col.color + "30" : col.bg, transition: "background 0.15s" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span style={{ color: col.color, fontSize: "0.78rem", fontWeight: 600 }}>{col.label}</span>
                <span className="ml-auto px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "0.65rem" }}>{colTasks.length}</span>
              </div>
              <div className="flex-1 space-y-2 min-h-[100px] rounded-lg p-1" style={{ background: isOver ? col.color + "08" : "var(--muted)", minHeight: 200, transition: "background 0.15s" }}>
                {colTasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDragging={draggingTask?.id === task.id}
                    onDragStart={setDraggingTask}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
                    Перетащите задачу
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
