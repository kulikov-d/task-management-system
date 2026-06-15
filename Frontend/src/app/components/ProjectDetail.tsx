import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Settings, Shield, Code, Eye } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { projectsApi } from "../api/client";
import { getInitials, getUserColor, getProjectColor } from "../utils/helpers";
import { canManageMembers } from "../utils/permissions";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: "Администратор", color: "#ef4444", icon: Shield },
  lead: { label: "Тимлид", color: "#f59e0b", icon: Shield },
  developer: { label: "Разработчик", color: "#6366f1", icon: Code },
  viewer: { label: "Наблюдатель", color: "#6b7280", icon: Eye },
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const tasks = useAppStore((s) => s.tasks);
  const [project, setProject] = useState<any>(null);
  const [tab, setTab] = useState<"tasks" | "members" | "settings">("tasks");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    projectsApi.get(id).then(p => { setProject(p); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center" style={{ color: "var(--muted-foreground)" }}>Загрузка...</div>;
  }

  if (!project) {
    return <div className="flex-1 flex items-center justify-center" style={{ color: "var(--muted-foreground)" }}>Проект не найден</div>;
  }

  const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
  const done = projectTasks.filter((t: any) => t.status === "DONE").length;
  const total = projectTasks.length;
  const canManage = canManageMembers(user, project);

  const handleRemoveMember = async (userId: string) => {
    try {
      await projectsApi.removeMember(project.id, userId);
      const updated = await projectsApi.get(project.id);
      setProject(updated);
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: "var(--background)" }}>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/projects")} className="p-1.5 rounded-lg hover:opacity-80 transition-opacity" style={{ color: "var(--muted-foreground)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: getProjectColor(project.key), fontWeight: 700, fontSize: "0.85rem" }}>
          {project.key?.slice(0, 2)}
        </div>
        <div className="flex-1">
          <h2 style={{ color: "var(--foreground)" }}>{project.name}</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>{project.description || ""}</p>
        </div>
        <button onClick={() => navigate(`/projects/${project.id}/settings`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
          <Settings size={14} /> Настройки
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Всего задач</p>
          <p style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 600 }}>{total}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Завершено</p>
          <p style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 600 }}>{done}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Участников</p>
          <p style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 600 }}>{project.members?.length || 0}</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--muted)" }}>
        {(["tasks", "members", "settings"] as const).map(t => (
          <button key={t} onClick={() => t === "settings" ? navigate(`/projects/${project.id}/settings`) : setTab(t)}
            className="flex-1 px-3 py-1.5 rounded-md text-sm transition-all"
            style={{ background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: tab === t ? 500 : 400, boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.05)" : "none" }}>
            {t === "tasks" ? "Задачи" : t === "members" ? "Участники" : "Настройки"}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {projectTasks.length === 0 && <div className="p-8 text-center" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>Нет задач</div>}
          {projectTasks.map((task: any, i: number) => {
            const assignee = task.assignee;
            return (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] transition-colors"
                style={{ borderBottom: i < projectTasks.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ flex: 1, color: "var(--foreground)", fontSize: "0.82rem" }}>{task.title}</span>
                <span className="px-2 py-0.5 rounded text-xs" style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "0.68rem" }}>{task.status}</span>
                {assignee && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: getUserColor(assignee.id), fontSize: "0.55rem", fontWeight: 600 }}>
                    {getInitials(assignee.name)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "members" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {(project.members || []).map((m: any, i: number) => {
            const cfg = ROLE_CONFIG[m.role] || ROLE_CONFIG.viewer;
            const RoleIcon = cfg.icon;
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < (project.members || []).length - 1 ? "1px solid var(--border)" : "none" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: getUserColor(m.user?.id || m.userId), fontSize: "0.65rem", fontWeight: 600 }}>
                  {getInitials(m.user?.name || "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ color: "var(--foreground)", fontSize: "0.82rem", fontWeight: 500 }}>{m.user?.name || m.userId}</p>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem" }}>{m.user?.email || ""}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: cfg.color + "18" }}>
                  <RoleIcon size={10} style={{ color: cfg.color }} />
                  <span style={{ color: cfg.color, fontSize: "0.68rem" }}>{cfg.label}</span>
                </div>
                {canManage && m.userId !== project.ownerId && (
                  <button onClick={() => handleRemoveMember(m.userId)} className="px-2 py-1 rounded text-xs hover:opacity-80 transition-opacity" style={{ color: "#ef4444", fontSize: "0.7rem" }}>
                    Удалить
                  </button>
                )}
              </div>
            );
          })}
          {(!project.members || project.members.length === 0) && (
            <div className="p-8 text-center" style={{ color: "var(--muted-foreground)", fontSize: "0.8rem" }}>Нет участников</div>
          )}
        </div>
      )}
    </div>
  );
}
