import { useState, useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { canAssignTask } from "../utils/permissions";
import { SlideOver } from "./ui/slide-over";
import { Input, Textarea } from "./ui/input";
import { Select } from "./ui/dropdown";
import { Button } from "./ui/button";
import { toast } from "./ui/toast";

interface TaskFormProps {
  task?: any;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function TaskForm({ task, projectId, onClose, onSaved }: TaskFormProps) {
  const users = useAppStore((s) => s.users);
  const tags = useAppStore((s) => s.tags);
  const sprints = useAppStore((s) => s.sprints);
  const loadSprints = useAppStore((s) => s.loadSprints);
  const createTask = useAppStore((s) => s.createTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const currentUser = useAuthStore((s) => s.user);

  const canAssign = canAssignTask(currentUser?.role || "");

  useEffect(() => { loadSprints(projectId); }, [projectId, loadSprints]);

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState(task?.priority || "MEDIUM");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || "");
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  const [sprintId, setSprintId] = useState(task?.sprintId || "");
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
        sprintId: sprintId || null,
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
      toast.error("Не удалось сохранить задачу");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <SlideOver open onClose={onClose} title={task ? "Редактировать задачу" : "Новая задача"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit as any} disabled={submitting || !title.trim()}>
            {submitting ? "Сохранение..." : task ? "Сохранить" : "Создать"}
          </Button>
        </>
      }>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Название *</label>
          <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Название задачи" />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Описание</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Описание задачи" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Приоритет</label>
            <Select value={priority} onChange={setPriority} options={[
              { value: "LOW", label: "Низкий" },
              { value: "MEDIUM", label: "Средний" },
              { value: "HIGH", label: "Высокий" },
              { value: "CRITICAL", label: "Критичный" },
            ]} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Исполнитель</label>
            <Select value={assigneeId} onChange={setAssigneeId} options={[
              { value: "", label: "Не назначен" },
              ...users.map((u: any) => ({ value: u.id, label: u.name })),
            ]} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Дедлайн</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Спринт</label>
            <Select value={sprintId} onChange={setSprintId} options={[
              { value: "", label: "Без спринта" },
              ...sprints.map((s: any) => ({ value: s.id, label: s.name })),
            ]} />
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Теги</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag: any) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border ${
                      selected ? "border-current" : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                    style={selected ? { background: tag.color + "20", color: tag.color } : {}}>
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </SlideOver>
  );
}
