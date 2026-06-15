import { useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "../stores/appStore";

interface TaskFormProps {
  task?: any;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function TaskForm({ task, projectId, onClose, onSaved }: TaskFormProps) {
  const users = useAppStore((s) => s.users);
  const tags = useAppStore((s) => s.tags);
  const createTask = useAppStore((s) => s.createTask);
  const updateTask = useAppStore((s) => s.updateTask);

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState(task?.priority || "MEDIUM");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || "");
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    task?.tags?.map((tt: any) => tt.tagId || tt.tag?.id || tt) || []
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const data: any = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
        projectId,
        tagIds: selectedTagIds,
      };
      if (task) {
        await updateTask(task.id, data);
      } else {
        await createTask(data);
      }
      onSaved();
    } catch (err) {
      console.error("Failed to save task:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--background)",
    borderColor: "var(--border)",
    color: "var(--foreground)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-xl overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 style={{ color: "var(--foreground)", fontSize: "1rem", fontWeight: 600 }}>
            {task ? "Редактировать задачу" : "Новая задача"}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/5 transition-colors">
            <X size={16} style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>Название *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={inputStyle}
              placeholder="Название задачи"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
              style={inputStyle}
              placeholder="Описание задачи"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>Приоритет</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              >
                <option value="LOW">Низкий</option>
                <option value="MEDIUM">Средний</option>
                <option value="HIGH">Высокий</option>
                <option value="CRITICAL">Критичный</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>Исполнитель</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={inputStyle}
              >
                <option value="">Не назначен</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>Дедлайн</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={inputStyle}
            />
          </div>

          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>Теги</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: any) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="px-2 py-1 rounded text-xs font-medium transition-all"
                      style={{
                        background: selected ? tag.color + "25" : "var(--muted)",
                        color: selected ? tag.color : "var(--muted-foreground)",
                        border: `1px solid ${selected ? tag.color : "var(--border)"}`,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "var(--muted-foreground)", background: "var(--muted)" }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: "#6366f1" }}
            >
              {submitting ? "Сохранение..." : task ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
