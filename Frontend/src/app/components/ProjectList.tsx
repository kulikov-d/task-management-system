import { useState } from "react";
import { Plus, Users, Flame } from "lucide-react";
import { useNavigate } from "react-router";
import { useAppStore } from "../stores/appStore";
import { projectsApi } from "../api/client";
import { getProjectColor } from "../utils/helpers";

export function ProjectList() {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const loadProjects = useAppStore((s) => s.loadProjects);
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", key: "", description: "" });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.key) return;
    setCreating(true);
    try {
      await projectsApi.create(form);
      await loadProjects();
      setForm({ name: "", key: "", description: "" });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: "var(--background)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: "var(--foreground)" }}>Проекты</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem", marginTop: "0.125rem" }}>{projects.length} проектов</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity" style={{ background: "var(--primary)", color: "#fff", fontSize: "0.78rem" }}>
          <Plus size={14} /> Создать проект
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--foreground)", fontSize: "0.9rem" }}>Новый проект</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>Название</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My Project"
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>Ключ</label>
              <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toUpperCase() })} placeholder="MP" maxLength={6}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
          </div>
          <div>
            <label style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>Описание</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Краткое описание проекта..." rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: "var(--muted-foreground)" }}>Отмена</button>
            <button onClick={handleCreate} disabled={creating || !form.name || !form.key}
              className="px-4 py-1.5 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "var(--primary)", color: "#fff" }}>
              {creating ? "Создание..." : "Создать"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {projects.map((p: any) => {
          const pTasks = tasks.filter((t: any) => t.projectId === p.id);
          const pDone = pTasks.filter((t: any) => t.status === "DONE").length;
          const total = p._count?.tasks || pTasks.length;
          return (
            <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
              className="rounded-xl p-5 cursor-pointer hover:shadow-sm transition-shadow" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: getProjectColor(p.key), fontSize: "0.75rem", fontWeight: 700 }}>
                  {p.key?.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ color: "var(--foreground)", fontSize: "0.85rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>{p.key}</p>
                </div>
              </div>
              {p.description && (
                <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", marginBottom: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</p>
              )}
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>Прогресс</span>
                <span style={{ color: "var(--foreground)", fontSize: "0.7rem", fontWeight: 500 }}>{pDone}/{total}</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${total ? Math.round(pDone / total * 100) : 0}%`, background: getProjectColor(p.key) }} />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1"><Users size={11} style={{ color: "var(--muted-foreground)" }} /><span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>{p._count?.members || 0}</span></div>
                <div className="flex items-center gap-1"><Flame size={11} style={{ color: "var(--muted-foreground)" }} /><span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>{total} задач</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
