interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
  color?: string;
}

const heights = {
  sm: "h-1",
  md: "h-1.5",
};

export function Progress({ value, max = 100, size = "sm", className = "", color }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full rounded-full bg-muted overflow-hidden ${heights[size]} ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: color || "var(--foreground)" }}
      />
    </div>
  );
}
