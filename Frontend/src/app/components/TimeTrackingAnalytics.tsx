import { useState, useEffect } from "react";
import { Clock, Users, ListTodo } from "lucide-react";
import { timeTrackingApi } from "../api/client";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Progress } from "./ui/progress";

interface TimeStats {
  totalSeconds: number;
  totalEntries: number;
  byUser: { user: { id: string; name: string; email: string; avatar?: string }; totalSeconds: number; entries: number }[];
  byTask: { task: { id: string; title: string; status?: string }; totalSeconds: number; entries: number }[];
  byDay: { date: string; totalSeconds: number }[];
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

export function TimeTrackingAnalytics({ project }: { project: any }) {
  const [stats, setStats] = useState<TimeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!project?.id) return;
    setLoading(true);
    timeTrackingApi.stats(project.id)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [project?.id]);

  if (loading) {
    return <div className="p-6 text-xs text-muted-foreground">Загрузка...</div>;
  }

  if (!stats || stats.totalEntries === 0) {
    return (
      <div className="p-6 text-center">
        <Clock size={32} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Пока нет записей о времени</p>
        <p className="text-xs text-muted-foreground mt-1">Запустите таймер на задаче, чтобы начать трекинг</p>
      </div>
    );
  }

  const maxUserTime = Math.max(...stats.byUser.map((u) => u.totalSeconds), 1);
  const maxTaskTime = Math.max(...stats.byTask.map((t) => t.totalSeconds), 1);

  return (
    <div className="p-6 space-y-4">
      {/* Total */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground">Всего времени</span>
            <Clock size={13} className="text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">{formatDuration(stats.totalSeconds)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stats.totalEntries} записей</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground">Участники</span>
            <Users size={13} className="text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">{stats.byUser.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">тракали время</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground">Задач</span>
            <ListTodo size={13} className="text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">{stats.byTask.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">с затраченным временем</p>
        </Card>
      </div>

      {/* By User */}
      <Card>
        <CardHeader><CardTitle>По исполнителям</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.byUser.map((u) => (
              <div key={u.user.id} className="flex items-center gap-3">
                <Avatar name={u.user.name} size="sm" />
                <span className="text-xs text-foreground w-32 truncate">{u.user.name}</span>
                <Progress value={u.totalSeconds} max={maxUserTime} className="flex-1" />
                <span className="text-[11px] text-muted-foreground w-16 text-right">{formatDuration(u.totalSeconds)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Task */}
      <Card>
        <CardHeader><CardTitle>По задачам</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.byTask.map((t) => (
              <div key={t.task.id} className="flex items-center gap-3">
                <span className="text-xs text-foreground flex-1 truncate">{t.task.title}</span>
                <Progress value={t.totalSeconds} max={maxTaskTime} className="w-32" />
                <span className="text-[11px] text-muted-foreground w-16 text-right">{formatDuration(t.totalSeconds)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Day */}
      {stats.byDay.length > 0 && (
        <Card>
          <CardHeader><CardTitle>По дням</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {stats.byDay.slice(0, 14).reverse().map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-20 shrink-0">
                    {new Date(d.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(d.totalSeconds / (Math.max(...stats.byDay.map((x) => x.totalSeconds), 1))) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">{formatDuration(d.totalSeconds)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
