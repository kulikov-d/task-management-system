import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "default" | "ghost" | "outline" | "destructive" | "secondary" | "gradient";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-destructive/20",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  gradient: "text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-4 text-sm gap-2 rounded-xl",
  lg: "h-10 px-5 text-sm gap-2 rounded-xl",
  icon: "h-9 w-9 p-0 justify-center rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
