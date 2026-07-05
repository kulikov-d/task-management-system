import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Trash2, UserPlus, Users, X } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { projectsApi, usersApi, teamsApi, exclusionsApi } from "../api/client";
import type { Team, ProjectExclusion } from "../api/client";
import { canManageProject, canManageMembers } from "../utils/permissions";
import { getInitials, getUserColor } from "../utils/helpers";

export function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const loadProjects = useAppStore((s) => s.loadProjects);
  const removeProject = useAppStore((s) => s.removeProject);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const projects = useAppStore((s) => s.projects);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [memberForm, setMemberForm] = useState({ userId: "", role: "developer" });
  const [addingMember, setAddingMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [exclusions, setExclusions] = useState<ProjectExclusion[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      usersApi.search(searchQuery.trim()).then(results => {
        const memberIds = new Set((project?.members || []).map((m: any) => m.userId));
        setSearchResults(results.filter((u: any) => !memberIds.has(u.id)));
      }).finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, project?.members]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      projectsApi.get(id),
      teamsApi.list(),
      exclusionsApi.list(id),
    ]).then(([p, t, ex]) => {
      setProject(p);
      setForm({ name: p.name, description: p.description || "" });
      setTeams(t);
      setExclusions(ex);
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
      const remaining = projects.filter((p: any) => p.id !== id);
      setCurrentProject(remaining[0] || null);
      removeProject(id);
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
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      console.error("Failed to add member:", err);
    } finally {
      setAddingMember(false);
    }
  };

  const selectUser = (u: any) => {
    setMemberForm({ ...memberForm, userId: u.id });
    setSearchQuery(u.name || u.email);
    setShowDropdown(false);
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
            <div ref={searchRef} className="flex-1 relative">
              <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); setMemberForm({ ...memberForm, userId: "" }); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Введите имя или email..."
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }} />
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg border shadow-lg max-h-48 overflow-y-auto" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  {searchResults.map((u: any) => (
                    <button key={u.id} onClick={() => selectUser(u)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:opacity-80 transition-opacity text-left">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: getUserColor(u.id), fontSize: "0.45rem", fontWeight: 600 }}>
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p style={{ fontSize: "0.75rem", color: "var(--foreground)", fontWeight: 500 }}>{u.name}</p>
                        <p style={{ fontSize: "0.65rem", color: "var(--muted-foreground)" }}>{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select value={memberForm.role} onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
              className="px-3 py-2 rounded-lg border text-sm" style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}>
              <option value="developer">Разработчик</option>
              <option value="lead">Тимлид</option>
            </select>
            <button onClick={handleAddMember} disabled={addingMember || !memberForm.userId}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "var(--primary)", color: "#fff" }}>
              <UserPlus size={14} /> Добавить
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 style={{ color: "var(--foreground)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Users size={16} /> Команды проекта
        </h3>
        <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
          Команды, назначенные на проект, определяют видимость для разработчиков.
        </p>
        <div className="space-y-2">
          {teams.filter(t => t.projects.some(p => p.projectId === id)).map(team => (
            <div key={team.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "var(--muted)" }}>
              <div className="flex items-center gap-2">
                <Users size={14} style={{ color: "var(--primary)" }} />
                <span style={{ color: "var(--foreground)", fontSize: "0.8rem" }}>{team.name}</span>
                <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>({team._count.members} участников)</span>
              </div>
            </div>
          ))}
          {teams.filter(t => t.projects.some(p => p.projectId === id)).length === 0 && (
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Нет назначенных команд. Назначьте команду через страницу команд.</p>
          )}
        </div>
      </div>

      {canManage && (
        <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--foreground)", fontSize: "0.9rem" }}>Исключения из проекта</h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
            Пользователи, исключённые из проекта, не будут его видеть, даже если их команда назначена.
          </p>
          <div className="space-y-2">
            {exclusions.map(ex => (
              <div key={ex.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "var(--muted)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: getUserColor(ex.user.id), fontSize: "0.5rem", fontWeight: 600 }}>
                    {getInitials(ex.user.name)}
                  </div>
                  <span style={{ color: "var(--foreground)", fontSize: "0.78rem" }}>{ex.user.name}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>{ex.user.email}</span>
                </div>
                <button onClick={async () => {
                  try {
                    await exclusionsApi.remove(id!, ex.id);
                    setExclusions(prev => prev.filter(e => e.id !== ex.id));
                  } catch (err) {
                    console.error("Failed to remove exclusion:", err);
                  }
                }} className="p-1 rounded hover:opacity-80" style={{ color: "var(--destructive)" }}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {exclusions.length === 0 && (
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Нет исключений</p>
            )}
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
