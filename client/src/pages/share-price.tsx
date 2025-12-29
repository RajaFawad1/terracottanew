import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/chart-container";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, DollarSign } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function SharePrice() {
  const { data, isLoading, error } = useQuery<{
    current?: {
      valuation?: number | string;
      sharePrice?: number | string;
      totalInflows?: number | string;
      totalOutflows?: number | string;
      totalFlows?: number | string;
      totalSharesPreviousMonth?: number | string;
    };
    history?: Array<{
      valuation?: number | string;
      sharePrice?: number | string;
      totalInflows?: number | string;
      totalOutflows?: number | string;
      totalFlows?: number | string;
      totalSharesPreviousMonth?: number | string;
      monthLabel?: string;
      month?: number;
      year?: number;
      [key: string]: any;
    }>;
  }>({
    queryKey: ["/api/share-price"],
    staleTime: 0, // Data is always considered stale to allow refetching
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    refetchOnMount: true, // Refetch when component mounts
  });

  // Safely parse numeric values from API response
  const currentData = data?.current;
  const current = {
    valuation: typeof currentData?.valuation === "number" 
      ? currentData.valuation 
      : (typeof currentData?.valuation === "string" ? parseFloat(currentData.valuation) : 0) || 0,
    sharePrice: typeof currentData?.sharePrice === "number" 
      ? currentData.sharePrice 
      : (typeof currentData?.sharePrice === "string" ? parseFloat(currentData.sharePrice) : 0) || 0,
    totalInflows: typeof currentData?.totalInflows === "number" 
      ? currentData.totalInflows 
      : (typeof currentData?.totalInflows === "string" ? parseFloat(currentData.totalInflows) : 0) || 0,
    totalOutflows: typeof currentData?.totalOutflows === "number" 
      ? currentData.totalOutflows 
      : (typeof currentData?.totalOutflows === "string" ? parseFloat(currentData.totalOutflows) : 0) || 0,
    totalFlows: typeof currentData?.totalFlows === "number" 
      ? currentData.totalFlows 
      : (typeof currentData?.totalFlows === "string" ? parseFloat(currentData.totalFlows) : 0) || 0,
    totalSharesPreviousMonth: typeof currentData?.totalSharesPreviousMonth === "number" 
      ? currentData.totalSharesPreviousMonth 
      : (typeof currentData?.totalSharesPreviousMonth === "string" ? parseFloat(currentData.totalSharesPreviousMonth) : 0) || 0,
  };

  // Parse history data and ensure all numeric values are properly converted
  const parsedHistory = (data?.history || []).map((item: any) => {
    const valuation = typeof item.valuation === "number" 
      ? item.valuation 
      : (typeof item.valuation === "string" ? parseFloat(item.valuation) : 0) || 0;
    const sharePrice = typeof item.sharePrice === "number" 
      ? item.sharePrice 
      : (typeof item.sharePrice === "string" ? parseFloat(item.sharePrice) : 0) || 0;
    return {
      ...item,
      valuation: isNaN(valuation) ? 0 : Number(valuation),
      sharePrice: isNaN(sharePrice) ? 0 : Number(sharePrice),
      totalInflows: typeof item.totalInflows === "number" ? Number(item.totalInflows) : (typeof item.totalInflows === "string" ? parseFloat(item.totalInflows) : 0) || 0,
      totalOutflows: typeof item.totalOutflows === "number" ? Number(item.totalOutflows) : (typeof item.totalOutflows === "string" ? parseFloat(item.totalOutflows) : 0) || 0,
      totalFlows: typeof item.totalFlows === "number" ? Number(item.totalFlows) : (typeof item.totalFlows === "string" ? parseFloat(item.totalFlows) : 0) || 0,
      totalSharesPreviousMonth: typeof item.totalSharesPreviousMonth === "number" ? Number(item.totalSharesPreviousMonth) : (typeof item.totalSharesPreviousMonth === "string" ? parseFloat(item.totalSharesPreviousMonth) : 0) || 0,
    };
  });

  // Add current month to history if it's not already included
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentMonthLabel = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][currentMonth - 1] + ` ${currentYear}`;
  
  const currentMonthInHistory = parsedHistory.some(h => h.month === currentMonth && h.year === currentYear);
  const history = currentMonthInHistory 
    ? parsedHistory 
    : [
        ...parsedHistory,
        {
          month: currentMonth,
          year: currentYear,
          monthLabel: currentMonthLabel,
          valuation: current.valuation,
          sharePrice: current.sharePrice,
          totalInflows: current.totalInflows,
          totalOutflows: current.totalOutflows,
          totalFlows: current.totalFlows,
          totalSharesPreviousMonth: current.totalSharesPreviousMonth,
        }
      ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Share Price</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Share Price</h1>
          <p className="text-muted-foreground text-destructive">Error loading share price data. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Share Price</h1>
        <p className="text-muted-foreground">TerraCotta Valuation and Share Price Overview</p>
      </div>

      {/* Current Values */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              TerraCotta Valuation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">
              {formatNumber(current.valuation, 2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              TerraCotta Share Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">
              {formatNumber(current.sharePrice, 2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Share Price History Graph */}
      {history.length > 0 && (
        <ChartContainer
          title="Share Price History"
        >
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="monthLabel" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickFormatter={(value) => formatNumber(value, 2)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="sharePrice" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
                name="Share Price"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {/* Valuation History Graph */}
      {history.length > 0 && (
        <ChartContainer
          title="Valuation History"
        >
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="monthLabel" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickFormatter={(value) => formatNumber(value, 2)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                formatter={(value: number) => formatNumber(value, 2)}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="valuation" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
                name="Valuation"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}

      {history.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No share price history available. Add income and expense entries to see calculations.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

