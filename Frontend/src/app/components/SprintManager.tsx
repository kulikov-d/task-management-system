import { useState, useEffect } from "react";
import { Plus, Calendar, Trash2, Pencil, CheckCircle2, Circle } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { sprintsApi } from "../api/client";

const inputStyle: React.CSSProperties = {
  background: "var(--background)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
};

export function SprintManager({ project }: { project: any }) {
  const sprints = useAppStore((s) => s.sprints);
  const loadSprints = useAppStore((s) => s.loadSprints);
  const users = useAppStore((s) => s.users);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", startDate: "", endDate: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadSprints(project.id); }, [project.id, loadSprints]);

  const resetForm = () => {
    setForm({ name: "", description: "", startDate: "", endDate: "" });
    setEditing(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    setForm({ name: "", description: "", startDate: today, endDate: nextWeek });
    setShowForm(true);
  };

  const openEdit = (sprint: any) => {
    setEditing(sprint);
    setForm({
      name: sprint.name,
      description: sprint.description || "",
      startDate: sprint.startDate ? new Date(sprint.startDate).toISOString().slice(0, 10) : "",
      endDate: sprint.endDate ? new Date(sprint.endDate).toISOString().slice(0, 10) : "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) return;
    setSubmitting(true);
    try {
      if (editing) {
        await sprintsApi.update(editing.id, form);
      } else {
        await sprintsApi.create({ ...form, projectId: project.id });
      }
      await loadSprints(project.id);
      resetForm();
    } catch (err) {
      console.error("Sprint save failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить спринт? Задачи будут отвязаны.")) return;
    try {
      await sprintsApi.delete(id);
      await loadSprints(project.id);
    } catch (err) {
      console.error("Sprint delete failed:", err);
    }
  };

  const handleToggleActive = async (sprint: any) => {
    try {
      await sprintsApi.update(sprint.id, { isActive: !sprint.isActive });
      await loadSprints(project.id);
    } catch (err) {
      console.error("Sprint toggle failed:", err);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU");

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: "var(--background)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: "var(--foreground)" }}>Спринты</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: "0.125rem" }}>
            {sprints.length} спринтов
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ background: "#6366f1" }}>
          <Plus size={14} /> Спринт
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--foreground)", fontSize: "0.9rem" }}>
            {editing ? "Редактировать спринт" : "Новый спринт"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>Название *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Sprint 1" required
                className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
            </div>
            <div>
              <label style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>Описание</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2} placeholder="Описание спринта..."
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>Начало *</label>
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                  required className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>Окончание *</label>
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                  required className="w-full px-3 py-2 rounded-lg border text-sm" style={inputStyle} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={resetForm}
                className="px-3 py-1.5 rounded-lg text-sm" style={{ color: "var(--muted-foreground)" }}>Отмена</button>
              <button type="submit" disabled={submitting || !form.name || !form.startDate || !form.endDate}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ background: "#6366f1" }}>
                {submitting ? "Сохранение..." : editing ? "Сохранить" : "Создать"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {sprints.map((sprint: any) => (
          <div key={sprint.id} className="rounded-xl p-5 space-y-3"
            style={{ background: "var(--card)", border: `1px solid ${sprint.isActive ? "#6366f1" : "var(--border)"}` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleActive(sprint)} title={sprint.isActive ? "Деактивировать" : "Сделать активным"}>
                  {sprint.isActive
                    ? <CheckCircle2 size={18} style={{ color: "#6366f1" }} />
                    : <Circle size={18} style={{ color: "var(--muted-foreground)" }} />}
                </button>
                <div>
                  <p style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 600 }}>
                    {sprint.name}
                    {sprint.isActive && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ background: "#6366f120", color: "#6366f1" }}>Активный</span>
                    )}
                  </p>
                  {sprint.description && (
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.78rem", marginTop: "0.125rem" }}>{sprint.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(sprint)} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors" title="Редактировать">
                  <Pencil size={14} style={{ color: "var(--muted-foreground)" }} />
                </button>
                <button onClick={() => handleDelete(sprint.id)} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors" title="Удалить">
                  <Trash2 size={14} style={{ color: "#ef4444" }} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
              </span>
              <span>{sprint._count?.tasks || 0} задач</span>
            </div>
          </div>
        ))}
        {sprints.length === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
            Нет спринтов. Создайте первый спринт.
          </div>
        )}
      </div>
    </div>
  );
}
