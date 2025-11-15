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
    <Card data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold font-mono text-card-foreground" data-testid={`text-metric-value`}>
          {value}
        </div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 mt-3 text-sm font-medium", getTrendColor())}>
            {getTrendIcon()}
            <span data-testid="text-metric-change">
              {change > 0 ? "+" : ""}{change}%
            </span>
            {changeLabel && <span className="text-muted-foreground font-normal ml-1">{changeLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
