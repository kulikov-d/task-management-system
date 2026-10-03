import { useState, useEffect } from "react";
import { Timer, Square, Play, Search } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { Dialog, DialogHeader, DialogTitle, DialogClose } from "./ui/dialog";
import { Input } from "./ui/input";
import { toast } from "./ui/toast";

function formatElapsed(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = String(Math.floor(diff / 3600)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
  const s = String(diff % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function TimerBar() {
  const activeTimer = useAppStore((s) => s.activeTimer);
  const startTimer = useAppStore((s) => s.startTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const tasks = useAppStore((s) => s.tasks);
  const currentProject = useAppStore((s) => s.currentProject);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!activeTimer) { setElapsed(""); return; }
    const tick = () => setElapsed(formatElapsed(activeTimer.startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTimer?.id, activeTimer?.startedAt]);

  const activeTask = activeTimer ? tasks.find((t: any) => t.id === activeTimer.taskId) : null;

  const projectTasks = currentProject ? tasks.filter((t: any) => t.projectId === currentProject.id) : tasks;
  const filtered = projectTasks
    .filter((t: any) => t.status !== "DONE")
    .filter((t: any) => t.title.toLowerCase().includes(search.toLowerCase()));

  const handleStart = async (taskId: string) => {
    try {
      await startTimer(taskId);
      setOpen(false);
      setSearch("");
      toast.success("Таймер запущен");
    } catch (err: any) {
      toast.error(err.message || "Не удалось запустить таймер");
    }
  };

  const handleStop = async () => {
    try {
      await stopTimer();
      toast.success("Таймер остановлен");
    } catch (err: any) {
      toast.error(err.message || "Не удалось остановить таймер");
    }
  };

  return (
    <>
      {activeTimer ? (
        <span className="ml-2 flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg border border-status-info/30 bg-status-info/10 text-foreground transition-colors">
          <Timer size={13} className="text-status-info" />
          <span className="max-w-[160px] truncate text-[11px]">{activeTask?.title || "Задача"}</span>
          <span className="font-mono tabular-nums text-[11px]">{elapsed}</span>
          <button onClick={handleStop} title="Остановить таймер"
            className="p-1 rounded-md hover:bg-status-error/15 text-status-error transition-colors">
            <Square size={11} />
          </button>
        </span>
      ) : (
        <button onClick={() => setOpen(true)} title="Запустить таймер"
          className="ml-2 flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-[11px]">
          <Timer size={13} />
          Таймер
        </button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogClose onClick={() => setOpen(false)} />
        <DialogHeader>
          <DialogTitle>Запустить таймер</DialogTitle>
          <p className="text-xs text-muted-foreground">Выберите задачу, чтобы начать учёт времени</p>
        </DialogHeader>
        <div className="relative mb-3">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию задачи..." className="pl-8" autoFocus />
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1">
          {filtered.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">Задач не найдено</p>}
          {filtered.map((t: any) => (
            <button key={t.id} onClick={() => handleStart(t.id)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors">
              <span className="text-xs text-foreground truncate">{t.title}</span>
              <Play size={12} className="shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </Dialog>
    </>
  );
}