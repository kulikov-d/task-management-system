import { useState, useEffect, useCallback, useRef } from "react";

interface MenuItem {
  label: string;
  icon?: any;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

let contextMenuListeners: ((state: ContextMenuState | null) => void)[] = [];

export function showContextMenu(x: number, y: number, items: MenuItem[]) {
  const state = { x, y, items };
  contextMenuListeners.forEach((l) => l(state));
}

export function ContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = (state: ContextMenuState | null) => setMenu(state);
    contextMenuListeners.push(listener);
    return () => { contextMenuListeners = contextMenuListeners.filter((l) => l !== listener); };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const handler = () => setMenu(null);
    document.addEventListener("scroll", handler, true);
    return () => document.removeEventListener("scroll", handler, true);
  }, [menu]);

  if (!menu) return null;

  const adjustedX = Math.min(menu.x, window.innerWidth - 200);
  const adjustedY = Math.min(menu.y, window.innerHeight - menu.items.length * 36 - 16);

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[180px] rounded-xl border border-border bg-card shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {menu.items.map((item, i) => {
        if (item.divider) {
          return <div key={i} className="my-1 border-t border-border" />;
        }
        return (
          <button
            key={i}
            onClick={() => { item.onClick(); setMenu(null); }}
            disabled={item.disabled}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
              item.danger
                ? "text-red-500 hover:bg-red-50"
                : item.disabled
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-foreground hover:bg-accent"
            }`}
          >
            {item.icon && <item.icon size={13} className="shrink-0" />}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
