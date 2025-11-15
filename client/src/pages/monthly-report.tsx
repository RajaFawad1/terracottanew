import { ReportHeader } from "@/components/report-header";
import { ChartContainer } from "@/components/chart-container";
import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const monthlyData = [
  { month: "Jan", income: 45000, expenses: 32000, profit: 13000 },
  { month: "Feb", income: 52000, expenses: 35000, profit: 17000 },
  { month: "Mar", income: 48000, expenses: 33000, profit: 15000 },
  { month: "Apr", income: 61000, expenses: 38000, profit: 23000 },
  { month: "May", income: 55000, expenses: 36000, profit: 19000 },
  { month: "Jun", income: 67000, expenses: 42000, profit: 25000 },
];

const categoryBreakdown = [
  { name: "Rent", value: 145000, color: "hsl(var(--chart-1))" },
  { name: "Dividends", value: 89000, color: "hsl(var(--chart-2))" },
  { name: "Interest", value: 45000, color: "hsl(var(--chart-3))" },
  { name: "Fees", value: 32000, color: "hsl(var(--chart-4))" },
];

export default function MonthlyReport() {
  const [year, setYear] = useState("2024");

  return (
    <div className="space-y-8">
      <ReportHeader
        title="Monthly Report"
        subtitle="Detailed monthly financial performance and trends"
        filterLabel="Year"
        filterValue={year}
        filterOptions={[
          { value: "2024", label: "2024" },
          { value: "2023", label: "2023" },
          { value: "2022", label: "2022" },
        ]}
        onFilterChange={setYear}
        onExportPDF={() => console.log("Export PDF")}
        onExportExcel={() => console.log("Export Excel")}
        onPrint={() => console.log("Print")}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-chart-4">$328,000</p>
            <p className="text-sm text-muted-foreground mt-1">Year to date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-destructive">$216,000</p>
            <p className="text-sm text-muted-foreground mt-1">Year to date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">$112,000</p>
            <p className="text-sm text-muted-foreground mt-1">Year to date</p>
          </CardContent>
        </Card>
      </div>

      <ChartContainer
        title="Monthly Performance"
        onExport={() => console.log("Export chart")}
      >
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Legend />
            <Bar dataKey="income" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Profit Trend"
          onExport={() => console.log("Export chart")}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-1))" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Income by Category"
          onExport={() => console.log("Export chart")}
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}
