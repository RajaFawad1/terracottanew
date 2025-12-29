import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

export function MetricCard({ title, value, change, changeLabel, icon, trend }: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend || trend === "neutral") return <Minus className="h-4 w-4" />;
    return trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!trend || trend === "neutral") return "text-muted-foreground";
    return trend === "up" ? "text-chart-4" : "text-destructive";
  };

  return (
    <Card 
      data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="group relative overflow-hidden animate-fade-in"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-4/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-muted-foreground group-hover:text-primary transition-colors duration-300">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-4xl font-bold font-mono text-card-foreground group-hover:scale-105 transition-transform duration-300" data-testid={`text-metric-value`}>
          {value}
        </div>
        {change !== undefined && change !== 0 && (
          <div className={cn("flex items-center gap-1 mt-3 text-sm font-medium", getTrendColor())}>
            {getTrendIcon()}
            <span data-testid="text-metric-change">
              {change > 0 ? "+" : ""}{change}%
            </span>
            {changeLabel && <span className="text-muted-foreground font-normal ml-1">{changeLabel}</span>}
          </div>
        )}
        {changeLabel && change === undefined && (
          <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
            <span>{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
