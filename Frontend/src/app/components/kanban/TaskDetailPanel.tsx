import { useState, useEffect, useRef } from "react";
import { X, MessageSquare, Paperclip, Download, Trash2, Play, Pause, Clock } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useAuthStore } from "../../stores/authStore";
import { commentsApi, attachmentsApi, timeTrackingApi } from "../../api/client";
import { getTaskTags } from "../../utils/helpers";
import { canAssignTask, canDeleteTask } from "../../utils/permissions";
import { Badge } from "../ui/badge";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { TaskForm } from "../TaskForm";
import type { TimeEntry } from "../../types/api";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "info" | "error" }> = {
  TODO: { label: "К выполнению", variant: "secondary" },
  IN_PROGRESS: { label: "В работе", variant: "info" },
  IN_REVIEW: { label: "На ревью", variant: "warning" },
  DONE: { label: "Готово", variant: "success" },
};

const PRIORITY_LABEL: Record<string, string> = { CRITICAL: "Критичный", HIGH: "Высокий", MEDIUM: "Средний", LOW: "Низкий" };

interface TaskDetailPanelProps {
  task: any;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export function TaskDetailPanel({ task, onClose, onTaskUpdated }: TaskDetailPanelProps) {
  const users = useAppStore((s) => s.users);
  const tags = useAppStore((s) => s.tags);
  const loadComments = useAppStore((s) => s.loadComments);
  const loadAttachments = useAppStore((s) => s.loadAttachments);
  const addCommentToTask = useAppStore((s) => s.addCommentToTask);
  const removeCommentFromTask = useAppStore((s) => s.removeCommentFromTask);
  const addAttachmentToTask = useAppStore((s) => s.addAttachmentToTask);
  const removeAttachmentFromTask = useAppStore((s) => s.removeAttachmentFromTask);
  const comments = useAppStore((s) => s.comments);
  const attachments = useAppStore((s) => s.attachments);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const currentUser = useAuthStore((s) => s.user);
  const activeTimer = useAppStore((s) => s.activeTimer);
  const startTimer = useAppStore((s) => s.startTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);

  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [loadingEntries, setLoadingEntries] = useState(false);

  useEffect(() => {
    loadComments(task.id);
    loadAttachments(task.id);
    loadTimeEntriesForTask();
  }, [task.id]);

  useEffect(() => {
    if (!activeTimer || activeTimer.taskId !== task.id) {
      setElapsed("00:00:00");
      return;
    }
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(activeTimer.startedAt).getTime()) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTimer?.id, activeTimer?.startedAt, task.id]);

  const loadTimeEntriesForTask = async () => {
    setLoadingEntries(true);
    try {
      const entries = await timeTrackingApi.listByTask(task.id);
      setTimeEntries(entries);
    } finally {
      setLoadingEntries(false);
    }
  };

  const isTimerActive = activeTimer?.taskId === task.id;
  const isMyTask = currentUser?.id && task.assigneeId === currentUser.id;
  const totalTime = (task.totalTimeSpent || 0) + (isTimerActive ? Math.floor((Date.now() - new Date(activeTimer!.startedAt).getTime()) / 1000) : 0);

  const handleToggleTimer = async () => {
    if (isTimerActive) {
      await stopTimer();
      await loadTimeEntriesForTask();
    } else {
      await startTimer(task.id);
    }
  };

  const assignee = task.assignee || users.find((u: any) => u.id === task.assigneeId);
  const taskTags = getTaskTags(task, tags);
  const taskComments = comments[task.id] || [];
  const taskAttachments = attachments[task.id] || [];

  const handleDelete = async () => {
    if (!confirm("Удалить задачу?")) return;
    await deleteTask(task.id);
    onClose();
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      const c = await commentsApi.create(task.id, newComment.trim());
      addCommentToTask(task.id, c);
      setNewComment("");
    } finally {
      setSendingComment(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const a = await attachmentsApi.upload(task.id, file);
      addAttachmentToTask(task.id, a);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (showForm) {
    return (
      <TaskForm task={task} projectId={task.projectId}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); onTaskUpdated?.(); }} />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-foreground leading-snug">{task.title}</h2>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Status / Priority / Assignee / Due */}
          <div className="px-4 py-3 space-y-3 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Статус</span>
              <Badge variant={STATUS_CONFIG[task.status]?.variant || "secondary"}>
                {STATUS_CONFIG[task.status]?.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Приоритет</span>
              <span className="text-xs font-medium text-foreground">{PRIORITY_LABEL[task.priority]}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Исполнитель</span>
              {assignee ? (
                <div className="flex items-center gap-1.5">
                  <Avatar name={assignee.name} size="sm" />
                  <span className="text-xs text-foreground">{assignee.name}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Не назначен</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Дедлайн</span>
              <span className="text-xs text-foreground">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString("ru-RU") : "Не установлен"}
              </span>
            </div>
          </div>

          {/* Edit button */}
          <div className="px-4 py-3 border-b border-border">
            <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
              Редактировать
            </Button>
          </div>

          {/* Time Tracking */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Трудозатраты</span>
              </div>
              {totalTime > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  Всего: {Math.floor(totalTime / 3600)}ч {Math.floor((totalTime % 3600) / 60)}м
                </span>
              )}
            </div>
            {isMyTask ? (
              <div className="flex items-center gap-2 mb-3">
                <Button
                  size="sm"
                  variant={isTimerActive ? "destructive" : "default"}
                  className="h-8 gap-1.5"
                  onClick={handleToggleTimer}
                >
                  {isTimerActive ? <Pause size={12} /> : <Play size={12} />}
                  {isTimerActive ? `Стоп (${elapsed})` : "Старт"}
                </Button>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground mb-3">Только исполнитель может запускать таймер</p>
            )}
            {timeEntries.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {timeEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {new Date(entry.startedAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <span className="text-foreground">
                      {entry.duration != null
                        ? `${Math.floor(entry.duration / 3600)}ч ${Math.floor((entry.duration % 3600) / 60)}м`
                        : "В работе"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          {taskTags.length > 0 && (
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-medium text-foreground mb-2">Теги</p>
              <div className="flex flex-wrap gap-1.5">
                {taskTags.map((tag: any) => (
                  <span key={tag.id} className="px-2 py-0.5 rounded text-[11px] font-medium"
                    style={{ background: tag.color + "18", color: tag.color }}>{tag.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-1.5 mb-3">
              <MessageSquare size={13} className="text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">
                Комментарии ({taskComments.length})
              </span>
            </div>
            <div className="space-y-2 mb-3">
              {taskComments.map((c: any) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-secondary">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={c.author?.name || "??"} size="sm" />
                      <span className="text-[11px] font-medium text-foreground">{c.author?.name}</span>
                    </div>
                    <button onClick={async () => { await commentsApi.delete(c.id); removeCommentFromTask(task.id, c.id); }}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">×</button>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newComment} onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendComment(); }}
                placeholder="Комментарий..." className="h-8 text-xs" />
              <Button size="sm" className="h-8 px-3" disabled={!newComment.trim() || sendingComment} onClick={handleSendComment}>
                Отпр.
              </Button>
            </div>
          </div>

          {/* Attachments */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Paperclip size={13} className="text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Вложения ({taskAttachments.length})
                </span>
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="text-xs px-2 py-1 rounded bg-secondary text-foreground hover:bg-accent transition-colors disabled:opacity-50">
                {uploading ? "..." : "+ Файл"}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
            </div>
            <div className="space-y-1.5">
              {taskAttachments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded bg-secondary">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Paperclip size={11} className="text-muted-foreground shrink-0" />
                    <span className="text-xs text-foreground truncate">{a.filename}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">({(a.size / 1024).toFixed(1)}KB)</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <a href={attachmentsApi.download(a.id)} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"><Download size={11} /></a>
                    <button onClick={async () => { await attachmentsApi.delete(a.id); removeAttachmentFromTask(task.id, a.id); }}
                      className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"><Trash2 size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
