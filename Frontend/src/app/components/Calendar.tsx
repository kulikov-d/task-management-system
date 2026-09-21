import { useState } from "react";
import { useNavigate } from "react-router";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { getProjectColor } from "../utils/helpers";

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-amber-500",
  MEDIUM: "bg-blue-500",
  LOW: "bg-emerald-500",
};

export function Calendar() {
  const tasks = useAppStore((s) => s.tasks);
  const projects = useAppStore((s) => s.projects);
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const tasksByDate: Record<string, any[]> = {};
  tasks.forEach((t: any) => {
    if (t.dueDate) {
      const d = t.dueDate.slice(0, 10);
      if (!tasksByDate[d]) tasksByDate[d] = [];
      tasksByDate[d].push(t);
    }
  });

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = () => setCurrentDate(new Date(year, month - 1));
  const next = () => setCurrentDate(new Date(year, month + 1));

  const selectedTasks = selectedDate ? tasksByDate[selectedDate] || [] : [];

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <CalendarIcon size={20} className="text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Календарь</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>
            <span className="text-sm font-medium text-foreground min-w-[140px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {DAY_NAMES.map((d) => (
            <div key={d} className="bg-muted/50 px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="bg-card min-h-[100px]" />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayTasks = tasksByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <button key={day}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`bg-card min-h-[100px] p-1.5 text-left hover:bg-accent/50 transition-colors ${
                  isSelected ? "ring-2 ring-primary ring-inset" : ""
                }`}>
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}>
                  {day}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayTasks.slice(0, 3).map((t: any) => (
                    <div key={t.id} className="flex items-center gap-1 px-1 py-0.5 rounded bg-muted/50">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] || "bg-gray-400"}`} />
                      <span className="text-[9px] text-foreground truncate">{t.title}</span>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[9px] text-muted-foreground px-1">+{dayTasks.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-4 p-4 rounded-xl border border-border bg-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
            </h3>
            {selectedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Нет задач на этот день</p>
            ) : (
              <div className="space-y-2">
                {selectedTasks.map((t: any) => {
                  const project = projects.find((p: any) => p.id === t.projectId);
                  return (
                    <div key={t.id} onClick={() => navigate("/tasks", { state: { openTaskId: t.id } })}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority] || ""}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                        {project && <p className="text-[10px] text-muted-foreground">{project.name}</p>}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                        t.status === "DONE" ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                        t.status === "IN_PROGRESS" ? "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                        "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400"
                      }`}>
                        {t.status === "TODO" ? "К выполнению" : t.status === "IN_PROGRESS" ? "В работе" : t.status === "IN_REVIEW" ? "На ревью" : "Готово"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
