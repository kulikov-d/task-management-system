import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { GanttChart, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "../stores/appStore";

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-violet-400",
  IN_PROGRESS: "bg-blue-400",
  IN_REVIEW: "bg-amber-400",
  DONE: "bg-emerald-400",
};

export function Timeline() {
  const tasks = useAppStore((s) => s.tasks);
  const sprints = useAppStore((s) => s.sprints);
  const currentProject = useAppStore((s) => s.currentProject);
  const navigate = useNavigate();
  const loadSprints = useAppStore((s) => s.loadSprints);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (currentProject) loadSprints(currentProject.id);
  }, [currentProject?.id]);

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);

  const days = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const dayWidth = 40;
  const rowHeight = 36;
  const headerHeight = 48;

  const tasksWithDates = tasks.filter((t: any) => t.dueDate);
  const totalWidth = days.length * dayWidth;

  const isToday = (d: Date) => {
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <GanttChart size={20} className="text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Таймлайн</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(0)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground">
              Сегодня
            </button>
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>
            <span className="text-xs text-muted-foreground min-w-[120px] text-center">
              {days[0]?.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — {days[days.length - 1]?.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex">
            <div className="w-56 shrink-0 border-r border-border bg-muted/30">
              <div className="h-12 px-3 flex items-center border-b border-border">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">Задача</span>
              </div>
              {tasksWithDates.map((t: any) => (
                <div key={t.id} onClick={() => navigate("/tasks", { state: { openTaskId: t.id } })}
                  className="h-9 px-3 flex items-center border-b border-border/50 last:border-0 cursor-pointer hover:bg-accent/50 transition-colors">
                  <span className="text-xs text-foreground truncate">{t.title}</span>
                </div>
              ))}
              {tasksWithDates.length === 0 && (
                <div className="h-20 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Нет задач с дедлайнами</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-x-auto">
              <div style={{ width: totalWidth }}>
                <div className="h-12 flex border-b border-border bg-muted/30">
                  {days.map((d, i) => (
                    <div key={i} className={`flex items-center justify-center border-r border-border/50 ${isToday(d) ? "bg-primary/10" : ""}`}
                      style={{ width: dayWidth }}>
                      <span className="text-[9px] text-muted-foreground">{d.getDate()}</span>
                    </div>
                  ))}
                </div>
                {tasksWithDates.map((t: any) => {
                  const due = new Date(t.dueDate);
                  const start = new Date(due);
                  start.setDate(due.getDate() - 3);
                  const startIdx = days.findIndex((d) =>
                    d.getDate() === start.getDate() && d.getMonth() === start.getMonth() && d.getFullYear() === start.getFullYear()
                  );
                  const endIdx = days.findIndex((d) =>
                    d.getDate() === due.getDate() && d.getMonth() === due.getMonth() && d.getFullYear() === due.getFullYear()
                  );
                  const barStart = Math.max(0, startIdx === -1 ? 0 : startIdx);
                  const barWidth = Math.max(1, (endIdx === -1 ? barStart + 2 : endIdx) - barStart + 1);

                  return (
                    <div key={t.id} className="relative border-b border-border/50" style={{ height: rowHeight }}>
                      <div
                        onClick={() => navigate("/tasks", { state: { openTaskId: t.id } })}
                        className={`absolute top-1.5 h-5 rounded-md ${STATUS_COLORS[t.status] || "bg-gray-400"} flex items-center px-1.5 cursor-pointer hover:opacity-80 transition-opacity`}
                        style={{
                          left: barStart * dayWidth + 2,
                          width: barWidth * dayWidth - 4,
                        }}>
                        <span className="text-[8px] text-white font-medium truncate">{t.title}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
