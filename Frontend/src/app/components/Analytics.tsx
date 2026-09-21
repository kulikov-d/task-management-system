import { useEffect, useState } from "react";
import { useAppStore } from "../stores/appStore";
import { TrendingUp, Target, CheckCircle, Clock, BarChart3, Timer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { Select } from "./ui/dropdown";
import { Workload } from "./Workload";
import { TimeTrackingAnalytics } from "./TimeTrackingAnalytics";

const ANALYTICS_TABS = [
  { id: "overview", label: "Обзор", icon: TrendingUp },
  { id: "workload", label: "Загруженность", icon: BarChart3 },
  { id: "time", label: "Трудозатраты", icon: Timer },
];

export function Analytics({ project }: { project: any }) {
  const [activeTab, setActiveTab] = useState("overview");
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const sprints = useAppStore((s) => s.sprints);
  const selectedSprintId = useAppStore((s) => s.selectedSprintId);
  const setSelectedSprintId = useAppStore((s) => s.setSelectedSprintId);
  const burndownData = useAppStore((s) => s.burndownData);
  const velocityData = useAppStore((s) => s.velocityData);
  const taskStats = useAppStore((s) => s.taskStats);
  const loadBurndown = useAppStore((s) => s.loadBurndown);
  const loadVelocity = useAppStore((s) => s.loadVelocity);
  const loadTaskStats = useAppStore((s) => s.loadTaskStats);
  const loadSprints = useAppStore((s) => s.loadSprints);

  useEffect(() => {
    if (project?.id) loadSprints(project.id);
  }, [project?.id, loadSprints]);

  useEffect(() => {
    if (project?.id) {
      loadBurndown(project.id);
      loadVelocity(project.id);
      loadTaskStats(project.id);
    }
  }, [project?.id, selectedSprintId, loadBurndown, loadVelocity, loadTaskStats]);

  const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
  const done = projectTasks.filter((t: any) => t.status === "DONE").length;
  const pct = projectTasks.length ? Math.round(done / projectTasks.length * 100) : 0;
  const overdue = projectTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;

  const currentVelocity = velocityData.length > 0 ? velocityData[velocityData.length - 1]?.completed ?? 0 : 0;
  const avgVelocity = velocityData.length > 0
    ? Math.round(velocityData.reduce((sum: number, v: any) => sum + (v.completed || 0), 0) / velocityData.length * 10) / 10
    : 0;

  const assigneeStats = users.map((u: any) => ({
    id: u.id, name: u.name,
    total: projectTasks.filter((t: any) => t.assigneeId === u.id).length,
    done: projectTasks.filter((t: any) => t.assigneeId === u.id && t.status === "DONE").length,
  })).filter((s) => s.total > 0);

  const cards = [
    { label: "Завершено", value: `${pct}%`, sub: `${done} из ${projectTasks.length}`, icon: CheckCircle },
    { label: "Скорость", value: String(currentVelocity), sub: "задач/спринт", icon: TrendingUp },
    { label: "Средняя", value: String(avgVelocity), sub: "задач/спринт", icon: Target },
    { label: "Просрочено", value: String(overdue), sub: "нужна эскалация", icon: Clock },
  ];

  const maxVelocity = Math.max(...velocityData.map((v: any) => Math.max(v.planned || 0, v.completed || 0)), 1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-3 border-b border-border shrink-0" style={{ background: "linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Аналитика</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{project.name}</p>
          </div>
          {activeTab === "overview" && (
            <Select value={selectedSprintId || ""} onChange={(v) => setSelectedSprintId(v || null)}
              options={[{ value: "", label: "Все спринты" }, ...sprints.map((s) => ({ value: s.id, label: s.name }))]} />
          )}
        </div>
        <div className="flex items-center gap-1 -mb-px">
          {ANALYTICS_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all ${
                activeTab === id
                  ? "border-primary text-primary bg-accent/50"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30"
              }`}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {cards.map(({ label, value, sub, icon: Icon }) => (
                <Card key={label} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                    <Icon size={13} className="text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader><CardTitle>Burn-down</CardTitle></CardHeader>
                <CardContent>
                  {burndownData.length > 0 ? (
                    <div className="space-y-1.5">
                      {burndownData.map((d: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-10 shrink-0">{d.date}</span>
                          <div className="flex-1 flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-foreground" style={{ width: `${d.planned ? (d.planned / (burndownData[0]?.planned || 1)) * 100 : 0}%` }} />
                            </div>
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-muted-foreground" style={{ width: `${d.actual ? (d.actual / (burndownData[0]?.planned || 1)) * 100 : 0}%` }} />
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{d.actual ?? "—"}</span>
                        </div>
                      ))}
                      <div className="flex gap-3 mt-2">
                        <div className="flex items-center gap-1"><div className="w-2 h-0.5 rounded bg-foreground" /><span className="text-[10px] text-muted-foreground">План</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-0.5 rounded bg-muted-foreground" /><span className="text-[10px] text-muted-foreground">Факт</span></div>
                      </div>
                    </div>
                  ) : <p className="text-xs text-muted-foreground">Нет данных</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Скорость</CardTitle></CardHeader>
                <CardContent>
                  {velocityData.length > 0 ? (
                    <div className="space-y-2">
                      {velocityData.map((v: any, i: number) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-foreground">{v.sprint}</span>
                            <span className="text-[10px] text-muted-foreground">{v.completed}/{v.planned}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                            <div className="h-full bg-muted-foreground/30" style={{ width: `${v.planned ? (v.planned / maxVelocity) * 100 : 0}%` }} />
                            <div className="h-full bg-foreground -ml-full" style={{ width: `${v.completed ? (v.completed / maxVelocity) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-muted-foreground">Нет данных</p>}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>По исполнителям</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assigneeStats.map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <Avatar name={s.name} size="sm" />
                      <span className="text-xs text-foreground w-32 truncate">{s.name}</span>
                      <Progress value={s.done} max={s.total || 1} className="flex-1" />
                      <span className="text-[11px] text-muted-foreground">{s.done}/{s.total}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : activeTab === "workload" ? (
          <Workload />
        ) : (
          <TimeTrackingAnalytics project={project} />
        )}
      </div>
    </div>
  );
}
