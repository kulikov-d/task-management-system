import { useState } from "react";
import { useNavigate } from "react-router";
import { Zap } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Alert } from "./ui/alert";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3 bg-foreground">
            <Zap size={20} className="text-background" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-foreground">ADD System</h1>
          <p className="text-xs text-muted-foreground mt-1">Система управления задачами</p>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-medium text-foreground mb-1">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="a.smirnov@add.dev" />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-foreground mb-1">Пароль</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password123" />
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <Button onClick={handleLogin} className="w-full mb-3">
          Войти
        </Button>

        <div className="mt-5 p-3 rounded-lg bg-secondary text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Регистрация по приглашению</p>
          <p>Новые пользователи попадают в систему по ссылке-приглашению, которую отправляет администратор.</p>
        </div>
      </Card>
    </div>
  );
}