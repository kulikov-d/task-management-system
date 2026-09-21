import { useState, useEffect } from "react";
import { Plus, Calendar, Trash2, Pencil, CheckCircle2, Circle } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { sprintsApi } from "../api/client";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { Badge } from "./ui/badge";
import { toast } from "./ui/toast";


export function SprintManager({ project }: { project: any }) {
  const sprints = useAppStore((s) => s.sprints);
  const loadSprints = useAppStore((s) => s.loadSprints);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", startDate: "", endDate: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadSprints(project.id); }, [project.id, loadSprints]);

  const resetForm = () => { setForm({ name: "", description: "", startDate: "", endDate: "" }); setEditing(null); setShowForm(false); };

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
      name: sprint.name, description: sprint.description || "",
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
      if (editing) { await sprintsApi.update(editing.id, form); }
      else { await sprintsApi.create({ ...form, projectId: project.id }); }
      await loadSprints(project.id);
      resetForm();
    } catch (err) { toast.error("Не удалось сохранить спринт"); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить спринт?")) return;
    try { await sprintsApi.delete(id); await loadSprints(project.id); } catch {}
  };

  const handleToggleActive = async (sprint: any) => {
    try { await sprintsApi.update(sprint.id, { isActive: !sprint.isActive }); await loadSprints(project.id); } catch {}
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("ru-RU");

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Спринты</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{sprints.length} спринтов</p>
        </div>
        <Button onClick={openCreate}><Plus size={13} /> Спринт</Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">{editing ? "Редактировать спринт" : "Новый спринт"}</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><label className="text-[11px] text-muted-foreground mb-1 block">Название *</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="text-[11px] text-muted-foreground mb-1 block">Описание</label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] text-muted-foreground mb-1 block">Начало *</label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required /></div>
              <div><label className="text-[11px] text-muted-foreground mb-1 block">Окончание *</label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Отмена</Button>
              <Button type="submit" size="sm" disabled={submitting || !form.name || !form.startDate || !form.endDate}>
                {submitting ? "..." : editing ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {sprints.map((sprint: any) => (
          <Card key={sprint.id} className={`p-4 ${sprint.isActive ? "ring-1 ring-foreground/20" : ""}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleActive(sprint)} title={sprint.isActive ? "Деактивировать" : "Активировать"}>
                  {sprint.isActive ? <CheckCircle2 size={16} className="text-foreground" /> : <Circle size={16} className="text-muted-foreground" />}
                </button>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {sprint.name}
                    {sprint.isActive && <Badge variant="secondary" className="ml-2">Активный</Badge>}
                  </p>
                  {sprint.description && <p className="text-[11px] text-muted-foreground mt-0.5">{sprint.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => openEdit(sprint)} className="p-1 rounded hover:bg-accent text-muted-foreground"><Pencil size={12} /></button>
                <button onClick={() => handleDelete(sprint.id)} className="p-1 rounded hover:bg-accent text-status-error"><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar size={10} />{formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}</span>
              <span>{sprint._count?.tasks || 0} задач</span>
            </div>
          </Card>
        ))}
        {sprints.length === 0 && <Card className="p-8 text-center text-xs text-muted-foreground">Нет спринтов</Card>}
      </div>
    </div>
  );
}
