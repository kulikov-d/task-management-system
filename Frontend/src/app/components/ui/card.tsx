interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className = "", children }: CardProps) {
  return (
    <div className={`rounded-xl bg-card text-card-foreground transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children }: CardProps) {
  return <div className={`flex flex-col space-y-1.5 p-4 ${className}`}>{children}</div>;
}

export function CardTitle({ className = "", children }: CardProps) {
  return <h3 className={`text-sm font-bold leading-none ${className}`}>{children}</h3>;
}

export function CardDescription({ className = "", children }: CardProps) {
  return <p className={`text-xs text-muted-foreground ${className}`}>{children}</p>;
}

export function CardContent({ className = "", children }: CardProps) {
  return <div className={`p-4 pt-0 ${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }: CardProps) {
  return <div className={`flex items-center p-4 pt-0 ${className}`}>{children}</div>;
}
