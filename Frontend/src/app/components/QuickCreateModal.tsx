import { useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { toast } from "./ui/toast";

interface QuickCreateModalProps {
  onClose: () => void;
}

const PRIORITIES = [
  { value: "LOW", label: "Низкий" },
  { value: "MEDIUM", label: "Средний" },
  { value: "HIGH", label: "Высокий" },
  { value: "CRITICAL", label: "Критичный" },
];

export function QuickCreateModal({ onClose }: QuickCreateModalProps) {
  const currentProject = useAppStore((s) => s.currentProject);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const createTask = useAppStore((s) => s.createTask);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(currentProject?.id || projects[0]?.id || "");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !projectId) return;
    setSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        projectId,
        priority,
        assigneeId: assigneeId || undefined,
      });
      toast.success("Задача создана");
      onClose();
    } catch {
      toast.error("Ошибка создания задачи");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Новая задача</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent transition-colors">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Название</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } if (e.key === "Escape") onClose(); }}
              placeholder="Что нужно сделать?"
              autoFocus
              className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Проект</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-9 px-2 rounded-lg bg-background border border-border text-xs text-foreground outline-none focus:border-primary transition-colors">
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Приоритет</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-9 px-2 rounded-lg bg-background border border-border text-xs text-foreground outline-none focus:border-primary transition-colors">
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Исполнитель</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full h-9 px-2 rounded-lg bg-background border border-border text-xs text-foreground outline-none focus:border-primary transition-colors">
              <option value="">Не назначен</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-colors">
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={submitting || !title.trim()}
            className="px-4 py-1.5 rounded-lg gradient-primary text-white text-xs font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50">
            {submitting ? "Создание..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}
