import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Zap, CheckCircle2, XCircle } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { invitationsApi } from "../api/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Alert } from "./ui/alert";

export function InvitePage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { register, error, clearError } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    invitationsApi.publicInfo(token)
      .then((info) => {
        if (cancelled) return;
        if (info.used || info.expired) {
          setInvalid(info.used ? "Это приглашение уже использовано." : "Срок действия приглашения истёк.");
          return;
        }
        setEmail(info.email);
        if (info.name) setName(info.name);
      })
      .catch((err) => { if (!cancelled) setInvalid(err.message || "Приглашение недействительно"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const handleRegister = async () => {
    clearError();
    if (!name.trim() || password.length < 8) {
      setInvalid(password.length < 8 ? "Пароль должен быть не короче 8 символов" : null);
      return;
    }
    setSubmitting(true);
    try {
      await register(token, password, name.trim());
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setInvalid(err?.message || "Не удалось создать аккаунт");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3 bg-foreground">
            <Zap size={20} className="text-background" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-foreground">Приглашение в ADD System</h1>
        </div>

        {loading && <p className="text-center text-xs text-muted-foreground">Проверка приглашения...</p>}

        {invalid && !loading && (
          <div className="text-center">
            <XCircle size={36} className="text-status-error mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">{invalid}</p>
            <Button variant="secondary" onClick={() => navigate("/login")}>На главную</Button>
          </div>
        )}

        {!invalid && !loading && (
          <>
            <div className="mb-3 p-3 rounded-lg bg-secondary text-xs">
              <CheckCircle2 size={14} className="inline mr-1 text-status-success" />
              <span className="text-foreground font-medium">Приглашение действительно</span>
              <p className="text-muted-foreground mt-1">Аккаунт будет создан для {email}</p>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-foreground mb-1">Имя</label>
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-foreground mb-1">Пароль</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 8 символов" />
            </div>

            {error && <Alert variant="error" className="mb-4">{error}</Alert>}

            <Button onClick={handleRegister} className="w-full" disabled={submitting}>
              {submitting ? "Создание аккаунта..." : "Создать аккаунт"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}