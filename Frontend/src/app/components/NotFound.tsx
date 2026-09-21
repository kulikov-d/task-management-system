import { useNavigate } from "react-router";
import { Compass } from "lucide-react";
import { Button } from "./ui/button";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 bg-secondary">
          <Compass size={22} className="text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-1">404</h1>
        <p className="text-xs text-muted-foreground mb-4">Страница не найдена</p>
        <Button onClick={() => navigate("/dashboard")}>Вернуться на дашборд</Button>
      </div>
    </div>
  );
}
