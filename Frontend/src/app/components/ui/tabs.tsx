import { useState } from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  active?: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className = "" }: TabsProps) {
  const [current, setCurrent] = useState(active || tabs[0]?.id);

  const handleSelect = (id: string) => {
    setCurrent(id);
    onChange(id);
  };

  return (
    <div className={`flex gap-0 border-b border-border ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleSelect(tab.id)}
          className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
            current === tab.id
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
