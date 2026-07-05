import { useNavigate } from "react-router";
import { Trash2, Shield, Code, Mail } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useAppStore } from "../stores/appStore";
import { getInitials, getUserColor } from "../utils/helpers";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: "Администратор", color: "#ef4444", icon: Shield },
  lead: { label: "Тимлид", color: "#f59e0b", icon: Shield },
  developer: { label: "Разработчик", color: "#6366f1", icon: Code },
};

export function Profile() {
  const { user, logout } = useAuthStore();
  const deleteUser = useAppStore((s) => s.deleteUser);
  const navigate = useNavigate();

  if (!user) return null;

  const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.developer;
  const RoleIcon = cfg.icon;

  const handleDeleteProfile = async () => {
    if (!confirm("Вы уверены, что хотите удалить свой профиль? Это действие необратимо.")) return;
    try {
      await deleteUser(user.id);
      logout();
      navigate("/login");
    } catch (err) {
      console.error("Failed to delete profile:", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: "var(--background)" }}>
      <h2 style={{ color: "var(--foreground)" }}>Профиль</h2>

      <div className="rounded-xl p-6 space-y-6" style={{ background: "var(--card)", border: "1px solid var(--border)", maxWidth: "480px" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ background: getUserColor(user.id), fontWeight: 600, fontSize: "1.5rem" }}>
            {getInitials(user.name)}
          </div>
          <div>
            <h3 style={{ color: "var(--foreground)", fontSize: "1.1rem", fontWeight: 600 }}>{user.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <RoleIcon size={14} style={{ color: cfg.color }} />
              <span style={{ color: cfg.color, fontSize: "0.8rem" }}>{cfg.label}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <Mail size={16} style={{ color: "var(--muted-foreground)" }} />
            <span style={{ color: "var(--foreground)", fontSize: "0.85rem" }}>{user.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield size={16} style={{ color: "var(--muted-foreground)" }} />
            <span style={{ color: "var(--foreground)", fontSize: "0.85rem" }}>{cfg.label}</span>
          </div>
        </div>

        <div className="pt-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
          <h4 style={{ color: "#ef4444", fontSize: "0.9rem" }}>Опасная зона</h4>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
            Удаление профиля необратимо. Ваши задачи станут неназначенными, вы будете удалены из всех команд.
          </p>
          <button
            onClick={handleDeleteProfile}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
            style={{ background: "#ef4444", color: "#fff" }}
          >
            <Trash2 size={14} /> Удалить профиль
          </button>
        </div>
      </div>
    </div>
  );
}
