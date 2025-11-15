import { ChartContainer } from "../chart-container";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const mockData = [
  { month: "Jan", income: 45000, expenses: 32000 },
  { month: "Feb", income: 52000, expenses: 35000 },
  { month: "Mar", income: 48000, expenses: 33000 },
  { month: "Apr", income: 61000, expenses: 38000 },
  { month: "May", income: 55000, expenses: 36000 },
  { month: "Jun", income: 67000, expenses: 42000 },
];

export default function ChartContainerExample() {
  const [timePeriod, setTimePeriod] = useState("30d");

  return (
    <div className="p-6">
      <ChartContainer
        title="Income vs Expenses"
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
        onExport={() => console.log("Export chart")}
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px"
              }}
            />
            <Line type="monotone" dataKey="income" stroke="hsl(var(--chart-4))" strokeWidth={2} />
            <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
