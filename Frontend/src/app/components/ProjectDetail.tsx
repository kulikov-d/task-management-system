import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Settings } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { projectsApi } from "../api/client";
import { getProjectColor } from "../utils/helpers";
import { canManageMembers } from "../utils/permissions";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { toast } from "./ui/toast";

const ROLE_CONFIG: Record<string, { label: string; variant: "error" | "warning" | "info" }> = {
  admin: { label: "Администратор", variant: "error" },
  lead: { label: "Тимлид", variant: "warning" },
  developer: { label: "Разработчик", variant: "info" },
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

  if (loading) return <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Загрузка...</div>;
  if (!project) return <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Проект не найден</div>;

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
      toast.error("Не удалось удалить участника");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/projects")} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground">
          <ArrowLeft size={16} />
        </button>
        <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
          style={{ background: getProjectColor(project.key) }}>{project.key?.slice(0, 2)}</div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">{project.name}</h2>
          <p className="text-xs text-muted-foreground">{project.description || ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}/settings`)}>
          <Settings size={12} /> Настройки
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3"><p className="text-[11px] text-muted-foreground">Всего задач</p><p className="text-lg font-semibold text-foreground">{total}</p></Card>
        <Card className="p-3"><p className="text-[11px] text-muted-foreground">Завершено</p><p className="text-lg font-semibold text-foreground">{done}</p></Card>
        <Card className="p-3"><p className="text-[11px] text-muted-foreground">Участников</p><p className="text-lg font-semibold text-foreground">{project.members?.length || 0}</p></Card>
      </div>

      <div className="flex gap-0.5 bg-secondary p-0.5 rounded-md">
        {(["tasks", "members", "settings"] as const).map(t => (
          <button key={t} onClick={() => t === "settings" ? navigate(`/projects/${project.id}/settings`) : setTab(t)}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t === "tasks" ? "Задачи" : t === "members" ? "Участники" : "Настройки"}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <Card>
          {projectTasks.length === 0 && <div className="p-8 text-center text-xs text-muted-foreground">Нет задач</div>}
          {projectTasks.map((task: any, i: number) => (
            <div key={task.id} onClick={() => navigate("/tasks", { state: { openTaskId: task.id } })}
              className="flex items-center gap-3 px-4 py-2 hover:bg-accent/50 cursor-pointer transition-colors"
              style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
              <span className="text-xs text-foreground flex-1 truncate">{task.title}</span>
              <Badge variant="secondary">{task.status}</Badge>
              {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
            </div>
          ))}
        </Card>
      )}

      {tab === "members" && (
        <Card>
          {(project.members || []).map((m: any, i: number) => {
            const cfg = ROLE_CONFIG[m.role] || ROLE_CONFIG.developer;
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2"
                style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                <Avatar name={m.user?.name || "?"} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{m.user?.name || m.userId}</p>
                  <p className="text-[10px] text-muted-foreground">{m.user?.email || ""}</p>
                </div>
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
                {canManage && m.userId !== project.ownerId && (
                  <button onClick={() => handleRemoveMember(m.userId)} className="text-[10px] text-status-error hover:underline">Удалить</button>
                )}
              </div>
            );
          })}
          {(!project.members || project.members.length === 0) && <div className="p-8 text-center text-xs text-muted-foreground">Нет участников</div>}
        </Card>
      )}
    </div>
  );
}
