import { useAppStore } from "../stores/appStore";
import { KanbanBoard } from "./KanbanBoard";

export function TasksPage({ project }: { project: any }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <KanbanBoard project={project} />
    </div>
  );
}
