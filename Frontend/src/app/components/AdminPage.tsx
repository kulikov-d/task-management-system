import { useState, useEffect } from "react";
import { UserPlus, Copy, Trash2, Clock, CheckCircle2, XCircle, Shield, Users, Loader2 } from "lucide-react";
import { invitationsApi, usersApi } from "../api/client";
import type { Invitation, RoleSetting, Role, User } from "../types/api";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { getRoleLabel, DEFAULT_ROLE_LABELS } from "../utils/helpers";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { toast } from "./ui/toast";

const ROLE_KEYS = ["admin", "lead", "developer"] as const;

export function AdminPage() {
  const roleSettings = useAppStore((s) => s.roleSettings);
  const updateRoleSettings = useAppStore((s) => s.updateRoleSettings);

  // --- Роли ---
  const [roleNames, setRoleNames] = useState<Record<string, string>>({ ...DEFAULT_ROLE_LABELS });
  const [savingRoles, setSavingRoles] = useState(false);

  useEffect(() => {
    if (roleSettings.length > 0) {
      const next: Record<string, string> = { ...DEFAULT_ROLE_LABELS };
      roleSettings.forEach((s) => { next[s.role] = s.displayName; });
      setRoleNames(next);
    }
  }, [roleSettings]);

  const handleSaveRoles = async () => {
    const settings = ROLE_KEYS.map((role) => ({
      role,
      displayName: (roleNames[role] || "").trim() || DEFAULT_ROLE_LABELS[role],
    }));
    setSavingRoles(true);
    try {
      await updateRoleSettings(settings);
      toast.success("Названия ролей сохранены");
    } catch (err: any) {
      toast.error(err.message || "Не удалось сохранить названия ролей");
    } finally {
      setSavingRoles(false);
    }
  };

  // --- Приглашения ---
  const [items, setItems] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("developer");
  const [creating, setCreating] = useState(false);

  const roleOptions = ROLE_KEYS.map((r) => ({ value: r, label: getRoleLabel(r, roleSettings) }));

  const load = async () => {
    setLoading(true);
    try {
      setItems(await invitationsApi.list());
    } catch {
      toast.error("Не удалось загрузить приглашения");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!email.trim()) { toast.error("Укажите email"); return; }
    setCreating(true);
    try {
      await invitationsApi.create({ email: email.trim(), name: name.trim() || undefined, role });
      setEmail("");
      setName("");
      toast.success("Приглашение создано");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Не удалось создать приглашение");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (inv: Invitation) => {
    const link = `${window.location.origin}/invite/${inv.token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Отменить приглашение?")) return;
    try {
      await invitationsApi.delete(id);
      toast.success("Приглашение отменено");
      await load();
    } catch {
      toast.error("Не удалось отменить приглашение");
    }
  };

  const now = Date.now();

  // --- Пользователи и роли ---
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      setUsers(await usersApi.list());
    } catch {
      toast.error("Не удалось загрузить список пользователей");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (usr: User, role: Role) => {
    if (role === usr.role) return;
    setUpdatingId(usr.id);
    try {
      const updated = await usersApi.updateRole(usr.id, role);
      setUsers((prev) => prev.map((u) => (u.id === usr.id ? { ...u, role: updated.role } : u)));
      toast.success(`Роль пользователя ${usr.name} изменена. Изменения вступят в силу после повторного входа.`);
    } catch (err: any) {
      toast.error(err.message || "Не удалось изменить роль");
      await loadUsers();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-2.5">
          <Shield size={20} className="text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Администрирование</h1>
        </div>

        <Card>
          <CardHeader><CardTitle>Названия ролей</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Названия ролей настраиваются под терминологию компании. Права ролей фиксированы.
            </p>
            <div className="space-y-3">
              {ROLE_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-muted-foreground shrink-0">Дефолт: {DEFAULT_ROLE_LABELS[key]}</span>
                  <Input
                    value={roleNames[key] || ""}
                    onChange={(e) => setRoleNames((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={DEFAULT_ROLE_LABELS[key]}
                  />
                </div>
              ))}
              <Button onClick={handleSaveRoles} disabled={savingRoles}>
                {savingRoles ? "Сохранение..." : "Сохранить названия"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Новое приглашение</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Корпоративный email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="i.ivanov@company.ru" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Имя (необязательно)</label>
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Иванов" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Роль</label>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary">
                  {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "Создание..." : "Создать приглашение"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5"><Users size={13} /> Пользователи</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Смена роли доступна только Администратору. Свою роль изменить нельзя, в системе всегда остаётся хотя бы один администратор. Роль пользователя применяется после повторного входа.
            </p>
            {loadingUsers ? (
              <p className="text-xs text-muted-foreground">Загрузка...</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-muted-foreground">Пользователей пока нет</p>
            ) : (
              <div className="space-y-1.5">
                {users.map((usr) => {
                  const isSelf = usr.id === currentUser?.id;
                  const isUpdating = updatingId === usr.id;
                  return (
                    <div key={usr.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-secondary">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={usr.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                            {usr.name}
                            {isSelf && <Badge>Это вы</Badge>}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{usr.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isUpdating && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
                        <select
                          value={usr.role}
                          disabled={isSelf || isUpdating}
                          onChange={(e) => handleRoleChange(usr, e.target.value as Role)}
                          title={isSelf ? "Свою роль изменить нельзя" : "Изменить роль"}
                          className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed">
                          {ROLE_KEYS.map((r) => <option key={r} value={r}>{getRoleLabel(r, roleSettings)}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Выданные приглашения</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-xs text-muted-foreground">Загрузка...</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-muted-foreground">Приглашений пока нет</p>
            ) : (
              <div className="space-y-1.5">
                {items.map((inv) => {
                  const expired = !inv.usedAt && new Date(inv.expiresAt).getTime() < now;
                  return (
                    <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={inv.email} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{inv.email}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={9} />
                            {new Date(inv.expiresAt).toLocaleDateString("ru-RU")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {inv.usedAt ? (
                          <Badge variant="success"><CheckCircle2 size={10} className="mr-0.5" />Использовано</Badge>
                        ) : expired ? (
                          <Badge variant="error"><XCircle size={10} className="mr-0.5" />Истекло</Badge>
                        ) : (
                          <Badge variant="warning">Ожидает</Badge>
                        )}
                        <button onClick={() => handleCopy(inv)} title="Скопировать ссылку"
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground transition-colors">
                          <Copy size={13} />
                        </button>
                        <button onClick={() => handleDelete(inv.id)} title="Отменить"
                          className="p-1.5 rounded hover:bg-accent text-status-error transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}