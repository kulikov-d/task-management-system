import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Mail, Flame, CheckCircle2 } from "lucide-react";
import { usersApi, tasksApi } from "../api/client";
import { formatDate } from "../utils/helpers";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";

const ROLE_CONFIG: Record<string, { label: string; variant: "error" | "warning" | "info" }> = {
  admin: { label: "Администратор", variant: "error" },
  lead: { label: "Тимлид", variant: "warning" },
  developer: { label: "Разработчик", variant: "info" },
};

interface UserTask {
  id: string; title: string; status: string; priority: string;
  dueDate?: string | null; project?: { id: string; name: string; key: string } | null;
}

export function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([usersApi.get(id), tasksApi.list({ assigneeId: id })])
      .then(([u, t]) => { setUser(u); setTasks(t); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [id]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Загрузка...</div>;
  if (error || !user) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <p className="text-xs text-muted-foreground">Пользователь не найден</p>
      <Button onClick={() => navigate("/")}>На главную</Button>
    </div>
  );

  const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.developer;
  const done = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
      <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground">
        <ArrowLeft size={16} />
      </button>

      <Card className="max-w-md">
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Avatar name={user.name} size="lg" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">{user.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Mail size={10} />{user.email}</span>
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary"><Flame size={10} /> {tasks.length} задач</Badge>
                <Badge variant="success"><CheckCircle2 size={10} /> {done} выполнено</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Задачи исполнителя</CardTitle></CardHeader>
        <CardContent className="p-0">
          {tasks.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">Нет задач</div>}
          {tasks.map((task) => (
            <div key={task.id} onClick={() => navigate("/tasks", { state: { openTaskId: task.id } })}
              className="flex items-center justify-between py-2 px-4 hover:bg-accent/50 cursor-pointer transition-colors"
              style={{ borderTop: "1px solid var(--border)" }}>
              <div className="min-w-0">
                <p className="text-xs text-foreground truncate">{task.title}</p>
                {task.project && <p className="text-[10px] text-muted-foreground">{task.project.name}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {task.dueDate && <span className="text-[10px] text-muted-foreground">{formatDate(task.dueDate)}</span>}
                <Badge variant="secondary">{task.status.replace("_", " ")}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
