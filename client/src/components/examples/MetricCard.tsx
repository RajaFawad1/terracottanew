import { MetricCard } from "../metric-card";
import { DollarSign, TrendingUp, Users, PiggyBank } from "lucide-react";

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      <MetricCard
        title="Total Capital"
        value="$2,450,000"
        change={12.5}
        changeLabel="from last year"
        trend="up"
        icon={<DollarSign className="h-4 w-4" />}
      />
      <MetricCard
        title="Current Equity"
        value="$3,120,500"
        change={8.3}
        changeLabel="this quarter"
        trend="up"
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <MetricCard
        title="Active Members"
        value="24"
        change={0}
        changeLabel="no change"
        trend="neutral"
        icon={<Users className="h-4 w-4" />}
      />
      <MetricCard
        title="Monthly Profit"
        value="$45,230"
        change={-3.2}
        changeLabel="vs last month"
        trend="down"
        icon={<PiggyBank className="h-4 w-4" />}
      />
    </div>
  );
}
