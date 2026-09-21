import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Select } from "../ui/dropdown";

interface KanbanFiltersProps {
  users: any[];
  tags: any[];
  filters: { assigneeId?: string; priority?: string; tagId?: string };
  onChange: (filters: { assigneeId?: string; priority?: string; tagId?: string }) => void;
}

export function KanbanFilters({ users, tags, filters, onChange }: KanbanFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeCount = [filters.assigneeId, filters.priority, filters.tagId].filter(Boolean).length;

  const clear = (key: string) => {
    onChange({ ...filters, [key]: undefined });
  };

  const clearAll = () => onChange({});

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
          activeCount > 0 ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}>
        <Filter size={12} />
        Фильтр
        {activeCount > 0 && <span className="ml-0.5 text-[10px] bg-foreground text-background w-4 h-4 rounded-full flex items-center justify-center">{activeCount}</span>}
      </button>

      {activeCount > 0 && (
        <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Сбросить
        </button>
      )}

      {open && (
        <div className="flex items-center gap-1.5">
          <Select value={filters.assigneeId || ""} onChange={(v) => onChange({ ...filters, assigneeId: v || undefined })}
            options={[
              { value: "", label: "Все исполнители" },
              ...users.map((u: any) => ({ value: u.id, label: u.name })),
            ]} />
          <Select value={filters.priority || ""} onChange={(v) => onChange({ ...filters, priority: v || undefined })}
            options={[
              { value: "", label: "Любой приоритет" },
              { value: "CRITICAL", label: "Критичный" },
              { value: "HIGH", label: "Высокий" },
              { value: "MEDIUM", label: "Средний" },
              { value: "LOW", label: "Низкий" },
            ]} />
          {tags.length > 0 && (
            <Select value={filters.tagId || ""} onChange={(v) => onChange({ ...filters, tagId: v || undefined })}
              options={[
                { value: "", label: "Любой тег" },
                ...tags.map((t: any) => ({ value: t.id, label: t.name })),
              ]} />
          )}
        </div>
      )}

      {filters.assigneeId && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-xs text-foreground">
          {users.find((u: any) => u.id === filters.assigneeId)?.name}
          <button onClick={() => clear("assigneeId")} className="text-muted-foreground hover:text-foreground"><X size={10} /></button>
        </span>
      )}
      {filters.priority && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-xs text-foreground">
          {filters.priority}
          <button onClick={() => clear("priority")} className="text-muted-foreground hover:text-foreground"><X size={10} /></button>
        </span>
      )}
      {filters.tagId && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-xs text-foreground">
          {tags.find((t: any) => t.id === filters.tagId)?.name}
          <button onClick={() => clear("tagId")} className="text-muted-foreground hover:text-foreground"><X size={10} /></button>
        </span>
      )}
    </div>
  );
}
