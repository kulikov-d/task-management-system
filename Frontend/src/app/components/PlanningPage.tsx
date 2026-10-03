import { useState } from "react";
import { List, CalendarDays, GanttChart } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { TaskList } from "./TaskList";
import { Calendar } from "./Calendar";
import { Timeline } from "./Timeline";

const TABS = [
  { id: "list", label: "Список", icon: List },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "gantt", label: "Диаграмма Ганта", icon: GanttChart },
];

export function PlanningPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const [tab, setTab] = useState("list");

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-border">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === "list" && currentProject && <TaskList project={currentProject} />}
        {tab === "calendar" && <Calendar />}
        {tab === "gantt" && <Timeline />}
      </div>
    </div>
  );
}