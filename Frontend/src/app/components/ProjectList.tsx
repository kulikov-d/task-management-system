import { useState, useRef, useEffect } from "react";
import { Plus, Users, Flame, X, Check, Star } from "lucide-react";
import { useNavigate } from "react-router";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { projectsApi } from "../api/client";
import { getProjectColor } from "../utils/helpers";
import { canManageProject } from "../utils/permissions";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { Avatar } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { toast } from "./ui/toast";

export function ProjectList() {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const currentUser = useAuthStore((s) => s.user);
  const loadProjects = useAppStore((s) => s.loadProjects);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const currentProject = useAppStore((s) => s.currentProject);
  const favoriteProjectIds = useAppStore((s) => s.favoriteProjectIds);
  const toggleFavoriteProject = useAppStore((s) => s.toggleFavoriteProject);
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", key: "", description: "" });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowMemberDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableUsers = users.filter(
    (u: any) => u.id !== currentUser?.id && !selectedMembers.includes(u.id) &&
    (!memberSearch || u.name.toLowerCase().includes(memberSearch.toLowerCase()) || u.email.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setMemberSearch("");
    setShowMemberDropdown(false);
  };

  const handleCreate = async () => {
    if (!form.name || !form.key) return;
    setCreating(true);
    try {
      await projectsApi.create({ ...form, memberIds: selectedMembers });
      await loadProjects();
      setForm({ name: "", key: "", description: "" });
      setSelectedMembers([]);
      setShowForm(false);
    } catch (err) {
      toast.error("Не удалось создать проект");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Проекты</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{projects.length} проектов</p>
          </div>
          {canManageProject(currentUser) && (
            <Button onClick={() => setShowForm(!showForm)}><Plus size={14} /> Создать проект</Button>
          )}
        </div>

        {showForm && (
          <div className="mb-6 p-4 rounded-lg bg-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Новый проект</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Название</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Мой проект" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Ключ</label>
                <Input value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toUpperCase() })} placeholder="МП" maxLength={6} />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1.5 block">Описание</label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Краткое описание проекта..." rows={2} />
            </div>
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1.5 block">Участники</label>
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedMembers.map((mId) => {
                    const u = users.find((u: any) => u.id === mId);
                    if (!u) return null;
                    return (
                      <span key={mId} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-xs text-foreground">
                        <Avatar name={u.name} size="sm" /> {u.name}
                        <button onClick={() => toggleMember(mId)} className="hover:text-foreground transition-colors"><X size={10} /></button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div ref={searchRef} className="relative">
                <Input value={memberSearch} onChange={(e) => { setMemberSearch(e.target.value); setShowMemberDropdown(true); }}
                  onFocus={() => setShowMemberDropdown(true)} placeholder="Добавить участника..." />
                {showMemberDropdown && availableUsers.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg bg-card shadow-lg max-h-36 overflow-y-auto">
                    {availableUsers.slice(0, 8).map((u: any) => (
                      <button key={u.id} onClick={() => toggleMember(u.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors text-left">
                        <Avatar name={u.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground">{u.name}</p>
                          <p className="text-[11px] text-muted-foreground">{u.email}</p>
                        </div>
                        <Check size={12} className={selectedMembers.includes(u.id) ? "text-foreground" : "opacity-0"} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setSelectedMembers([]); setMemberSearch(""); }}>Отмена</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating || !form.name || !form.key}>
                {creating ? "Создание..." : "Создать"}
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {projects.map((p: any) => {
            const pTasks = tasks.filter((t: any) => t.projectId === p.id);
            const pDone = pTasks.filter((t: any) => t.status === "DONE").length;
            const total = p._count?.tasks || pTasks.length;
            return (
              <div key={p.id}
                className={`group p-4 rounded-lg transition-all cursor-pointer ${
                  currentProject?.id === p.id
                    ? 'bg-primary/10 ring-2 ring-primary shadow-md'
                    : 'bg-card hover:shadow-md'
                }`}
                onClick={() => { setCurrentProject(p); navigate("/dashboard"); }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: getProjectColor(p.key) }}>
                    {p.key?.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.key}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleFavoriteProject(p.id); }}
                    className="p-1 rounded-lg hover:bg-accent transition-colors shrink-0">
                    <Star size={14} className={favoriteProjectIds.includes(p.id) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                  </button>
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
                )}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground">Прогресс</span>
                    <span className="text-[11px] font-medium text-foreground">{pDone}/{total}</span>
                  </div>
                  <Progress value={pDone} max={total || 1} color={getProjectColor(p.key)} size="sm" />
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Users size={11} className="text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{p._count?.members || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame size={11} className="text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{total} задач</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
