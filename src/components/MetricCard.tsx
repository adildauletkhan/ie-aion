import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: "default" | "success" | "destructive" | "warning" | "primary";
}

const variantStyles = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  destructive: "text-destructive",
  warning: "text-accent",
};

export function MetricCard({ title, value, subtitle, icon, variant = "default" }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">
            {title}
          </span>
          <span className={variantStyles[variant]}>{icon}</span>
        </div>
        <div className={`text-3xl font-bold tracking-tight ${variantStyles[variant]}`}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
