import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Trash2, UserPlus } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { projectsApi } from "../api/client";
import { canManageProject, canManageMembers } from "../utils/permissions";

export function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const loadProjects = useAppStore((s) => s.loadProjects);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [memberForm, setMemberForm] = useState({ userId: "", role: "developer" });
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    projectsApi.get(id).then(p => {
      setProject(p);
      setForm({ name: p.name, description: p.description || "" });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const canEdit = canManageProject(user, project);
  const canManage = canManageMembers(user, project);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await projectsApi.update(id, form);
      await loadProjects();
      const updated = await projectsApi.get(id);
      setProject(updated);
    } catch (err) {
      console.error("Failed to update project:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Вы уверены, что хотите удалить проект?")) return;
    try {
      await projectsApi.delete(id);
      await loadProjects();
      navigate("/projects");
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const handleAddMember = async () => {
    if (!id || !memberForm.userId) return;
    setAddingMember(true);
    try {
      await projectsApi.addMember(id, memberForm.userId, memberForm.role);
      const updated = await projectsApi.get(id);
      setProject(updated);
      setMemberForm({ userId: "", role: "developer" });
    } catch (err) {
      console.error("Failed to add member:", err);
    } finally {
      setAddingMember(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center" style={{ color: "var(--muted-foreground)" }}>Загрузка...</div>;
  }

  if (!project) {
    return <div className="flex-1 flex items-center justify-center" style={{ color: "var(--muted-foreground)" }}>Проект не найден</div>;
  }

  const memberIds = new Set((project.members || []).map((m: any) => m.userId));
  const availableUsers = users.filter((u: any) => !memberIds.has(u.id));

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: "var(--background)" }}>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/projects/${id}`)} className="p-1.5 rounded-lg hover:opacity-80 transition-opacity" style={{ color: "var(--muted-foreground)" }}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ color: "var(--foreground)" }}>Настройки проекта</h2>
      </div>

      {canEdit && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--foreground)", fontSize: "0.9rem" }}>Основная информация</h3>
          <div>
            <label style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>Название</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
          </div>
          <div>
            <label style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>Описание</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving || !form.name}
              className="px-4 py-1.5 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "var(--primary)", color: "#fff" }}>
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      )}

      {canManage && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--foreground)", fontSize: "0.9rem" }}>Добавить участника</h3>
          <div className="flex gap-3">
            <select value={memberForm.userId} onChange={e => setMemberForm({ ...memberForm, userId: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}>
              <option value="">Выберите пользователя</option>
              {availableUsers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={memberForm.role} onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}>
              <option value="developer">Разработчик</option>
              <option value="lead">Тимлид</option>
              <option value="viewer">Наблюдатель</option>
            </select>
            <button onClick={handleAddMember} disabled={addingMember || !memberForm.userId}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "var(--primary)", color: "#fff" }}>
              <UserPlus size={14} /> Добавить
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 style={{ color: "#ef4444", fontSize: "0.9rem" }}>Опасная зона</h3>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>Удаление проекта необратимо. Все задачи и данные будут удалены.</p>
        <button onClick={handleDelete}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity" style={{ background: "#ef4444", color: "#fff" }}>
          <Trash2 size={14} /> Удалить проект
        </button>
      </div>
    </div>
  );
}
