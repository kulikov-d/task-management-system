import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

type Variant = "default" | "success" | "error" | "warning" | "info";

interface AlertProps {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const icons = {
  default: null,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<Variant, string> = {
  default: "border-border bg-card text-foreground",
  success: "border-status-success/20 bg-status-success-bg text-status-success",
  error: "border-status-error/20 bg-status-error-bg text-status-error",
  warning: "border-status-warning/20 bg-status-warning-bg text-status-warning",
  info: "border-status-info/20 bg-status-info-bg text-status-info",
};

export function Alert({ variant = "default", title, children, className = "" }: AlertProps) {
  const Icon = icons[variant];

  return (
    <div className={`rounded-lg border p-3 ${styles[variant]} ${className}`}>
      <div className="flex gap-2">
        {Icon && <Icon size={14} className="mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          {title && <h4 className="text-sm font-medium mb-0.5">{title}</h4>}
          <div className="text-xs opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
}
