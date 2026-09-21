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
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const { login, register, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch {}
  };

  const handleRegister = async () => {
    clearError();
    try {
      await register(email, password, name);
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

        {isRegister && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-foreground mb-1">Имя</label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" />
          </div>
        )}

        <div className="mb-3">
          <label className="block text-xs font-medium text-foreground mb-1">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="a.smirnov@add.dev" />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-foreground mb-1">Пароль</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password123" />
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <Button onClick={isRegister ? handleRegister : handleLogin} className="w-full mb-3">
          {isRegister ? "Зарегистрироваться" : "Войти"}
        </Button>

        <button onClick={() => { setIsRegister(!isRegister); clearError(); }}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
          {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
        </button>

        <div className="mt-5 p-3 rounded-lg bg-secondary text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Демо-аккаунты:</p>
          <p>a.smirnov@add.dev / password123 (администратор)</p>
          <p>m.petrova@add.dev / password123 (тимлид)</p>
          <p>d.kozlov@add.dev / password123 (разработчик)</p>
        </div>
      </Card>
    </div>
  );
}
