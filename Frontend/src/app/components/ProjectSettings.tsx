import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Trash2, UserPlus, Users, X, Tags } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { projectsApi, usersApi, teamsApi, exclusionsApi, tagsApi } from "../api/client";
import type { Team, ProjectExclusion, Tag } from "../api/client";
import { canManageProject, canManageMembers } from "../utils/permissions";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Alert } from "./ui/alert";
import { toast } from "./ui/toast";

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
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [exclusions, setExclusions] = useState<ProjectExclusion[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagForm, setTagForm] = useState({ name: "", color: "#171717" });
  const [creatingTag, setCreatingTag] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      usersApi.search(searchQuery.trim()).then(results => {
        const memberIds = new Set((project?.members || []).map((m: any) => m.userId));
        setSearchResults(results.filter((u: any) => !memberIds.has(u.id)));
      });
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
      tagsApi.list(id),
    ]).then(([p, t, ex, tg]) => {
      setProject(p);
      setForm({ name: p.name, description: p.description || "" });
      setTeams(t);
      setExclusions(ex);
      setTags(tg);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const canEdit = canManageProject(user, project);
  const canManage = canManageMembers(user, project);
  const canDelete = user?.id === project?.ownerId || user?.role === "admin";

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await projectsApi.update(id, form);
      await loadProjects();
      const updated = await projectsApi.get(id);
      setProject(updated);
    } catch (err) {
      toast.error("Не удалось обновить проект");
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
    } catch (err: any) {
      alert(err?.message || "Не удалось удалить проект");
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
      toast.error("Не удалось добавить участника");
    } finally {
      setAddingMember(false);
    }
  };

  const handleCreateTag = async () => {
    if (!id || !tagForm.name.trim()) return;
    setCreatingTag(true);
    try {
      const tag = await tagsApi.create({ name: tagForm.name.trim(), color: tagForm.color, projectId: id });
      setTags((prev) => [...prev, tag]);
      setTagForm({ name: "", color: "#171717" });
    } catch (err) {
      toast.error("Не удалось создать тег");
    } finally {
      setCreatingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Удалить тег?")) return;
    try {
      await tagsApi.delete(tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (err) {
      toast.error("Не удалось удалить тег");
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Загрузка...</div>;
  if (!project) return <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Проект не найден</div>;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(`/projects/${id}`)} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground">
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-sm font-semibold text-foreground">Настройки проекта</h2>
      </div>

      {canEdit && (
        <Card>
          <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Название</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Описание</label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} disabled={saving || !form.name}>
                  {saving ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader><CardTitle>Добавить участника</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div ref={searchRef} className="flex-1 relative">
                <Input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); setMemberForm({ ...memberForm, userId: "" }); }}
                  onFocus={() => setShowDropdown(true)} placeholder="Введите имя или email..." />
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-md border border-border bg-card shadow-lg max-h-40 overflow-y-auto">
                    {searchResults.map((u: any) => (
                      <button key={u.id} onClick={() => { setMemberForm({ ...memberForm, userId: u.id }); setSearchQuery(u.name); setShowDropdown(false); }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-accent transition-colors text-left">
                        <Avatar name={u.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <select value={memberForm.role} onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="developer">Разработчик</option>
                <option value="lead">Тимлид</option>
              </select>
              <Button size="sm" onClick={handleAddMember} disabled={addingMember || !memberForm.userId}>
                <UserPlus size={12} /> Добавить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><Tags size={14} /><CardTitle>Теги проекта</CardTitle></div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.map((tag) => (
                <Badge key={tag.id} className="gap-1 cursor-pointer" onClick={() => handleDeleteTag(tag.id)}>
                  <span style={{ color: tag.color }}>{tag.name}</span> <X size={10} />
                </Badge>
              ))}
              {tags.length === 0 && <span className="text-xs text-muted-foreground">Тегов пока нет</span>}
            </div>
            <div className="flex gap-2">
              <Input value={tagForm.name} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateTag(); } }}
                placeholder="Название тега..." className="flex-1" />
              <input type="color" value={tagForm.color} onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer" />
              <Button size="sm" onClick={handleCreateTag} disabled={creatingTag || !tagForm.name.trim()}>
                {creatingTag ? "..." : "Создать"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5"><Users size={14} /><CardTitle>Команды проекта</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {teams.filter(t => t.projects.some(p => p.projectId === id)).map(team => (
              <div key={team.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-secondary">
                <Users size={12} className="text-muted-foreground" />
                <span className="text-xs text-foreground">{team.name}</span>
                <span className="text-[10px] text-muted-foreground">({team._count.members})</span>
              </div>
            ))}
            {teams.filter(t => t.projects.some(p => p.projectId === id)).length === 0 && (
              <p className="text-xs text-muted-foreground">Нет назначенных команд</p>
            )}
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader><CardTitle>Исключения из проекта</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {exclusions.map(ex => (
                <div key={ex.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary">
                  <div className="flex items-center gap-2">
                    <Avatar name={ex.user.name} size="sm" />
                    <span className="text-xs text-foreground">{ex.user.name}</span>
                    <span className="text-[10px] text-muted-foreground">{ex.user.email}</span>
                  </div>
                  <button onClick={async () => {
                    try { await exclusionsApi.remove(id!, ex.id); setExclusions(prev => prev.filter(e => e.id !== ex.id)); } catch {}
                  }} className="p-0.5 rounded hover:bg-accent text-muted-foreground"><X size={11} /></button>
                </div>
              ))}
              {exclusions.length === 0 && <p className="text-xs text-muted-foreground">Нет исключений</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {canDelete && (
        <Card>
          <CardHeader><CardTitle className="text-status-error">Опасная зона</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Удаление проекта необратимо. Все задачи и данные будут удалены.</p>
            <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 size={12} /> Удалить проект</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
