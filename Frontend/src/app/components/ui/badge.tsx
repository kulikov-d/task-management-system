type Variant = "default" | "secondary" | "success" | "error" | "warning" | "info" | "outline";

interface BadgeProps {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
}

const variants: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-status-success-bg text-status-success",
  error: "bg-status-error-bg text-status-error",
  warning: "bg-status-warning-bg text-status-warning",
  info: "bg-status-info-bg text-status-info",
  outline: "border border-border text-foreground",
};

export function Badge({ variant = "default", className = "", children, onClick }: BadgeProps) {
  return (
    <span onClick={onClick} className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
