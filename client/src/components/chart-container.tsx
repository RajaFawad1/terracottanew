import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  timePeriod?: string;
  onTimePeriodChange?: (value: string) => void;
  onExport?: () => void;
  actions?: React.ReactNode;
}

export function ChartContainer({
  title,
  children,
  timePeriod,
  onTimePeriodChange,
  onExport,
  actions
}: ChartContainerProps) {
  return (
    <Card data-testid={`card-chart-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-6">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {timePeriod && onTimePeriodChange && (
            <Select value={timePeriod} onValueChange={onTimePeriodChange}>
              <SelectTrigger className="w-32" data-testid="select-time-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          )}
          {actions}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} data-testid="button-export-chart">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
