import { useState } from "react";
import { ListOrdered, ArrowUpCircle, ArrowDownCircle, Minus } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { getProjectColor } from "../utils/helpers";
import { Avatar } from "./ui/avatar";
import { TaskDetailPanel } from "./kanban/TaskDetailPanel";

const PRIORITY_ICON: Record<string, any> = {
  CRITICAL: { Icon: ArrowUpCircle, color: "text-red-500" },
  HIGH: { Icon: ArrowUpCircle, color: "text-amber-500" },
  MEDIUM: { Icon: Minus, color: "text-blue-500" },
  LOW: { Icon: ArrowDownCircle, color: "text-emerald-500" },
};

const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: "Критичный",
  HIGH: "Высокий",
  MEDIUM: "Средний",
  LOW: "Низкий",
};

export function Backlog() {
  const tasks = useAppStore((s) => s.tasks);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const sprints = useAppStore((s) => s.sprints);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [sprintFilter, setSprintFilter] = useState<string | null>(null);

  const sprintTasks = sprintFilter
    ? tasks.filter((t: any) => t.sprintId === sprintFilter)
    : [];
  const backlogTasks = tasks.filter((t: any) => !t.sprintId);

  const activeSprints = sprints.filter((s: any) => s.isActive);

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <ListOrdered size={20} className="text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Backlog</h1>
          </div>
          <span className="text-xs text-muted-foreground">{backlogTasks.length} задач в очереди</span>
        </div>

        {activeSprints.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-foreground">Спринты</span>
              {sprintFilter && (
                <button onClick={() => setSprintFilter(null)}
                  className="text-[11px] text-primary hover:underline">
                  Сбросить
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {activeSprints.map((s: any) => (
                <button key={s.id} onClick={() => setSprintFilter(sprintFilter === s.id ? null : s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sprintFilter === s.id
                      ? "gradient-primary text-white shadow-sm"
                      : "bg-card border border-border text-foreground hover:shadow-md"
                  }`}>
                  {s.name}
                  <span className="ml-1.5 text-[10px] opacity-70">
                    {tasks.filter((t: any) => t.sprintId === s.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {sprintFilter && sprintTasks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              {sprints.find((s: any) => s.id === sprintFilter)?.name}
            </h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {sprintTasks.map((task: any, idx: number) => (
                <TaskRow key={task.id} task={task} projects={projects} users={users}
                  onClick={() => setSelectedTask(task)} idx={idx} />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Очередь</h2>
          {backlogTasks.length === 0 ? (
            <div className="text-center py-12">
              <ListOrdered size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Backlog пуст</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {backlogTasks.map((task: any, idx: number) => (
                <TaskRow key={task.id} task={task} projects={projects} users={users}
                  onClick={() => setSelectedTask(task)} idx={idx} />
              ))}
            </div>
          )}
        </div>
      </div>
      {selectedTask && (
        <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}

function TaskRow({ task, projects, users, onClick, idx }: { task: any; projects: any[]; users: any[]; onClick: () => void; idx: number }) {
  const project = projects.find((p: any) => p.id === task.projectId);
  const assignee = users.find((u: any) => u.id === task.assigneeId);
  const p = PRIORITY_ICON[task.priority] || PRIORITY_ICON.MEDIUM;
  const PIcon = p.Icon;

  return (
    <div onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-accent/50 cursor-pointer transition-colors">
      <PIcon size={14} className={`${p.color} shrink-0`} />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground">{task.title}</span>
      </div>
      {project && (
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-3.5 h-3.5 rounded flex items-center justify-center text-white"
            style={{ background: getProjectColor(project.key), fontSize: "7px", fontWeight: 700 }}>
            {project.key?.slice(0, 1)}
          </div>
          <span className="text-[10px] text-muted-foreground">{project.key}</span>
        </div>
      )}
      {assignee && (
        <Avatar name={assignee.name} size="sm" />
      )}
      <span className="text-[10px] text-muted-foreground shrink-0">
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : ""}
      </span>
    </div>
  );
}
