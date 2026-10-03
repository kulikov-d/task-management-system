import { useState, useEffect, useRef } from "react";
import { X, MessageSquare, Paperclip, Download, Trash2, Play, Pause, Clock, Check, Link2, Lock, ListChecks } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useAuthStore } from "../../stores/authStore";
import { commentsApi, attachmentsApi, timeTrackingApi, getAccessToken, tasksApi } from "../../api/client";
import { getTaskTags, getUserLabel } from "../../utils/helpers";
import { canAssignTask, canDeleteTask } from "../../utils/permissions";
import { Badge } from "../ui/badge";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select } from "../ui/dropdown";
import { TaskForm } from "../TaskForm";
import { toast } from "../ui/toast";
import type { TimeEntry, TaskLink } from "../../types/api";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "info" | "error" }> = {
  TODO: { label: "К выполнению", variant: "secondary" },
  IN_PROGRESS: { label: "В работе", variant: "info" },
  IN_REVIEW: { label: "На проверке", variant: "warning" },
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
  const roleSettings = useAppStore((s) => s.roleSettings);
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
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [linksIn, setLinksIn] = useState<TaskLink[]>([]);
  const [linksOut, setLinksOut] = useState<TaskLink[]>([]);
  const [linkTarget, setLinkTarget] = useState("");
  const [linkType, setLinkType] = useState("blocks");
  const storeTasks = useAppStore((s) => s.tasks);
  const updateTaskInStore = useAppStore((s) => s.updateTaskInState);

  useEffect(() => {
    loadComments(task.id);
    loadAttachments(task.id);
    loadTimeEntriesForTask();
    loadDetail();
  }, [task.id]);

  const loadDetail = async () => {
    try {
      const d = await tasksApi.get(task.id);
      setSubtasks(d.subtasks || []);
      setLinksIn(d.linksIn || []);
      setLinksOut(d.linksOut || []);
    } catch { /* детали не критичны для остальных секций */ }
  };

  // Обновляет задачу в сторе, чтобы карточка Kanban сразу отразила прогресс подзадач и блокировки
  const refreshTaskInStore = (nextSubtasks: any[], nextLinksIn: TaskLink[]) => {
    const current = useAppStore.getState().tasks.find((t: any) => t.id === task.id);
    if (!current) return;
    updateTaskInStore({
      ...current,
      subtasks: nextSubtasks.map((s: any) => ({ id: s.id, completed: s.completed })),
      linksIn: nextLinksIn
        .filter((l) => l.type === "blocks")
        .map((l) => ({ id: l.id, sourceTask: { id: l.sourceTaskId, status: l.sourceTask?.status } })),
    } as any);
  };

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
    } catch {
      setTimeEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  };

  const isTimerActive = activeTimer?.taskId === task.id;
  const isMyTask = currentUser?.id && task.assigneeId === currentUser.id;
  const totalTime = (task.totalTimeSpent || 0) + (isTimerActive ? Math.floor((Date.now() - new Date(activeTimer!.startedAt).getTime()) / 1000) : 0);

  const handleToggleTimer = async () => {
    try {
      if (isTimerActive) {
        await stopTimer();
        await loadTimeEntriesForTask();
        toast.success("Таймер остановлен");
      } else {
        await startTimer(task.id);
        toast.success("Таймер запущен");
      }
    } catch { toast.error("Не удалось изменить таймер"); }
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
    } catch { toast.error("Не удалось отправить комментарий"); } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = async (c: any) => {
    if (!confirm("Удалить комментарий?")) return;
    try { await commentsApi.delete(c.id); removeCommentFromTask(task.id, c.id); toast.success("Комментарий удалён"); }
    catch { toast.error("Не удалось удалить комментарий"); }
  };

  const handleDownloadAttachment = async (a: any) => {
    try {
      const res = await fetch(attachmentsApi.download(a.id), {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = a.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error("Не удалось скачать файл"); }
  };

  const handleDeleteAttachment = async (a: any) => {
    if (!confirm("Удалить вложение?")) return;
    try { await attachmentsApi.delete(a.id); removeAttachmentFromTask(task.id, a.id); toast.success("Вложение удалено"); }
    catch { toast.error("Не удалось удалить вложение"); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const a = await attachmentsApi.upload(task.id, file);
      addAttachmentToTask(task.id, a);
      toast.success("Файл загружен");
    } catch { toast.error("Не удалось загрузить файл"); } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const doneCount = subtasks.filter((s: any) => s.completed).length;
  const linkOptions = storeTasks
    .filter((t: any) => t.projectId === task.projectId && t.id !== task.id)
    .map((t: any) => ({ value: t.id, label: t.title }));

  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || addingSubtask) return;
    setAddingSubtask(true);
    try {
      const s = await tasksApi.createSubtask(task.id, newSubtask.trim());
      const next = [...subtasks, s];
      setSubtasks(next);
      refreshTaskInStore(next, linksIn);
      setNewSubtask("");
      toast.success("Подзадача добавлена");
    } catch { toast.error("Не удалось добавить подзадачу"); } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (s: any) => {
    try {
      const updated = await tasksApi.updateSubtask(s.id, { completed: !s.completed });
      const next = subtasks.map((x) => (x.id === s.id ? updated : x));
      setSubtasks(next);
      refreshTaskInStore(next, linksIn);
    } catch { toast.error("Не удалось обновить подзадачу"); }
  };

  const handleDeleteSubtask = async (s: any) => {
    if (!confirm("Удалить подзадачу?")) return;
    try {
      await tasksApi.deleteSubtask(s.id);
      const next = subtasks.filter((x) => x.id !== s.id);
      setSubtasks(next);
      refreshTaskInStore(next, linksIn);
      toast.success("Подзадача удалена");
    } catch { toast.error("Не удалось удалить подзадачу"); }
  };

  const handleAddLink = async () => {
    if (!linkTarget) return;
    try {
      const l = await tasksApi.createTaskLink(task.id, { targetTaskId: linkTarget, type: linkType });
      const nextOut = [...linksOut, l];
      setLinksOut(nextOut);
      refreshTaskInStore(subtasks, linksIn);
      setLinkTarget("");
      toast.success(linkType === "blocks" ? "Связь «блокирует» создана" : "Связь создана");
    } catch (err: any) {
      toast.error(err?.message || "Не удалось создать связь");
    }
  };

  const handleDeleteLink = async (l: TaskLink) => {
    if (!confirm("Удалить связь?")) return;
    try {
      await tasksApi.deleteTaskLink(task.id, l.id);
      const nextIn = linksIn.filter((x) => x.id !== l.id);
      const nextOut = linksOut.filter((x) => x.id !== l.id);
      setLinksIn(nextIn);
      setLinksOut(nextOut);
      refreshTaskInStore(subtasks, nextIn);
      toast.success("Связь удалена");
    } catch { toast.error("Не удалось удалить связь"); }
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
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <Avatar name={assignee.name} size="sm" />
                    <span className="text-xs text-foreground">{assignee.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{getUserLabel(assignee, roleSettings).replace(assignee.name + " — ", "")}</span>
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

          {/* Подзадачи (чек-лист) */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-1.5 mb-3">
              <ListChecks size={13} className="text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Подзадачи ({doneCount}/{subtasks.length})</span>
            </div>
            {subtasks.length > 0 && (
              <div className="w-full h-1.5 rounded-full bg-secondary mb-3 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(doneCount / subtasks.length) * 100}%` }} />
              </div>
            )}
            <div className="space-y-1.5 mb-3">
              {subtasks.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2">
                  <button onClick={() => handleToggleSubtask(s)} title={s.completed ? "Отметить как невыполненную" : "Отметить выполненной"}
                    className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-colors ${s.completed ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"}`}>
                    {s.completed && <Check size={10} strokeWidth={3} />}
                  </button>
                  <span className={`text-xs flex-1 leading-snug ${s.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{s.title}</span>
                  <button onClick={() => handleDeleteSubtask(s)} title="Удалить подзадачу"
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-status-error transition-colors shrink-0">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); }}
                placeholder="Новая подзадача..." className="h-8 text-xs" />
              <Button size="sm" className="h-8 px-3" disabled={!newSubtask.trim() || addingSubtask} onClick={handleAddSubtask}>
                +
              </Button>
            </div>
          </div>

          {/* Связи задач (зависимости) */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-1.5 mb-3">
              <Link2 size={13} className="text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Связи задач</span>
            </div>
            {linksIn.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Блокируется задачами</p>
                <div className="space-y-1.5">
                  {linksIn.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Lock size={11} className={l.sourceTask?.status === "DONE" ? "text-emerald-500 shrink-0" : "text-status-error shrink-0"} />
                        <span className="text-xs text-foreground truncate">{l.sourceTask?.title}</span>
                      </div>
                      <button onClick={() => handleDeleteLink(l)} title="Удалить связь"
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-status-error transition-colors shrink-0">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {linksOut.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{linksOut.some((l) => l.type === "blocks") ? "Блокирует задачи" : "Связана с задачами"}</p>
                <div className="space-y-1.5">
                  {linksOut.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {l.type === "blocks"
                          ? <Lock size={11} className="text-muted-foreground shrink-0" />
                          : <Link2 size={11} className="text-muted-foreground shrink-0" />}
                        <span className="text-xs text-foreground truncate">{l.targetTask?.title}</span>
                      </div>
                      <button onClick={() => handleDeleteLink(l)} title="Удалить связь"
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-status-error transition-colors shrink-0">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Select value={linkTarget} onChange={setLinkTarget} options={[
                { value: "", label: "Выбрать задачу..." },
                ...linkOptions,
              ]} />
              <div className="flex gap-2">
                <Select value={linkType} onChange={setLinkType} options={[
                  { value: "blocks", label: "Блокирует (жёстко)" },
                  { value: "related", label: "Просто связана" },
                ]} />
                <Button size="sm" className="h-8 flex-1" disabled={!linkTarget} onClick={handleAddLink}>
                  Связать
                </Button>
              </div>
            </div>
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
                    {currentUser?.id === c.author?.id && (
                      <button onClick={() => handleDeleteComment(c)}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">×</button>
                    )}
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
                    <button onClick={() => handleDownloadAttachment(a)} title="Скачать"
                      className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"><Download size={11} /></button>
                    <button onClick={() => handleDeleteAttachment(a)} title="Удалить"
                      className="p-1 rounded hover:bg-accent text-status-error transition-colors"><Trash2 size={11} /></button>
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
