import { useFiltersStore } from "../stores/filtersStore";
import { useAppStore } from "../stores/appStore";
import { X } from "lucide-react";

export function FiltersPanel() {
  const {
    status, priority, assigneeId, search,
    setStatus, setPriority, setAssigneeId, setSearch, resetFilters,
  } = useFiltersStore();
  const users = useAppStore((s) => s.users);

  const hasFilters = status || priority || assigneeId || search;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input
        type="text"
        placeholder="Поиск задач..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-sm"
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none", width: 200 }}
      />

      <select
        value={status || ""}
        onChange={(e) => setStatus(e.target.value || null)}
        className="px-3 py-1.5 rounded-lg text-sm"
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none" }}
      >
        <option value="">Все статусы</option>
        <option value="TODO">К выполнению</option>
        <option value="IN_PROGRESS">В работе</option>
        <option value="IN_REVIEW">На ревью</option>
        <option value="DONE">Готово</option>
      </select>

      <select
        value={priority || ""}
        onChange={(e) => setPriority(e.target.value || null)}
        className="px-3 py-1.5 rounded-lg text-sm"
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none" }}
      >
        <option value="">Все приоритеты</option>
        <option value="LOW">Низкий</option>
        <option value="MEDIUM">Средний</option>
        <option value="HIGH">Высокий</option>
        <option value="CRITICAL">Критический</option>
      </select>

      <select
        value={assigneeId || ""}
        onChange={(e) => setAssigneeId(e.target.value || null)}
        className="px-3 py-1.5 rounded-lg text-sm"
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none" }}
      >
        <option value="">Все исполнители</option>
        {users.map((u: any) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:opacity-70 transition-opacity"
          style={{ color: "var(--muted-foreground)" }}
        >
          <X size={12} /> Сбросить
        </button>
      )}
    </div>
  );
}
