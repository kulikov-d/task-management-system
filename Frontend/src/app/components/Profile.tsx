import { useNavigate } from "react-router";
import { Trash2, Shield, Mail } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useAppStore } from "../stores/appStore";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Alert } from "./ui/alert";

const ROLE_CONFIG: Record<string, { label: string; variant: "error" | "warning" | "info" }> = {
  admin: { label: "Администратор", variant: "error" },
  lead: { label: "Тимлид", variant: "warning" },
  developer: { label: "Разработчик", variant: "info" },
};

export function Profile() {
  const { user, logout } = useAuthStore();
  const deleteUser = useAppStore((s) => s.deleteUser);
  const navigate = useNavigate();

  if (!user) return null;

  const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.developer;

  const handleDeleteProfile = async () => {
    if (!confirm("Вы уверены, что хотите удалить свой профиль?")) return;
    try { await deleteUser(user.id); logout(); navigate("/login"); } catch {}
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
      <h2 className="text-lg font-semibold text-foreground">Профиль</h2>

      <Card className="max-w-md">
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Avatar name={user.name} size="lg" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">{user.name}</h3>
              <Badge variant={cfg.variant} className="mt-1">{cfg.label}</Badge>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs text-foreground">
              <Mail size={13} className="text-muted-foreground" /> {user.email}
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground">
              <Shield size={13} className="text-muted-foreground" /> {cfg.label}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <Alert variant="error" title="Опасная зона">
              <p className="mb-2">Удаление профиля необратимо.</p>
              <Button variant="destructive" size="sm" onClick={handleDeleteProfile}>
                <Trash2 size={12} /> Удалить профиль
              </Button>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
