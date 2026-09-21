import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Undo2 } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

let listeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notify(message: string, variant: ToastVariant = "info", action?: ToastAction) {
  const id = Date.now().toString();
  toasts = [...toasts, { id, message, variant, action }];
  listeners.forEach((l) => l([...toasts]));

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((l) => l([...toasts]));
  }, action ? 6000 : 3000);
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  listeners.forEach((l) => l([...toasts]));
}

export const toast = {
  success: (msg: string) => notify(msg, "success"),
  error: (msg: string) => notify(msg, "error"),
  info: (msg: string) => notify(msg, "info"),
  warning: (msg: string) => notify(msg, "warning"),
  withUndo: (msg: string, undoAction: () => void) =>
    notify(msg, "success", { label: "Отменить", onClick: undoAction }),
};

const icons: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles: Record<ToastVariant, string> = {
  success: "border-status-success/20 bg-status-success-bg text-status-success",
  error: "border-status-error/20 bg-status-error-bg text-status-error",
  info: "border-status-info/20 bg-status-info-bg text-status-info",
  warning: "border-status-warning/20 bg-status-warning-bg text-status-warning",
};

export function ToastContainer() {
  const [current, setCurrent] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setCurrent);
    return () => {
      listeners = listeners.filter((l) => l !== setCurrent);
    };
  }, []);

  if (current.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {current.map((t) => {
        const Icon = icons[t.variant];
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg animate-in slide-in-from-bottom-5 ${styles[t.variant]}`}
          >
            <Icon size={14} className="shrink-0" />
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium hover:bg-black/10 transition-colors"
              >
                <Undo2 size={11} />
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="p-0.5 hover:opacity-70 transition-opacity ml-1">
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
