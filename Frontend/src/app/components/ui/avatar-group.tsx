import { Avatar } from "./avatar";

interface AvatarGroupProps {
  users: any[];
  max?: number;
  size?: "sm" | "md";
}

export function AvatarGroup({ users, max = 3, size = "sm" }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((u: any, i: number) => (
        <div key={u.id} className="relative" style={{ zIndex: max - i }}>
          <Avatar name={u.name} size={size} className="ring-2 ring-card" />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`relative flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ring-2 ring-card ${
            size === "sm" ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-[10px]"
          }`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
