import { ReportHeader } from "@/components/report-header";
import { ChartContainer } from "@/components/chart-container";
import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency as formatCurrencyUtil, formatNumber } from "@/lib/utils";

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface AnnualReportData {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  incomeAfterTax: number;
  yearsProfit: number;
  yearsProfitGoal: number;
  incomeBreakdown: Array<{ category: string; amount: number }>;
  expenseBreakdown: Array<{ category: string; amount: number }>;
  monthlyBreakdown: Array<{
    month: string;
    monthNumber: number;
    income: number;
    expenses: number;
    profit: number;
  }>;
}

export default function AnnualReport() {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const showExpenses = isAdmin;

  // Generate year options (current year and 10 years back)
  const yearOptions = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    return Array.from({ length: 11 }, (_, i) => ({
      value: (currentYear - i).toString(),
      label: (currentYear - i).toString(),
    }));
  }, []);

  // Fetch annual report data
  const { data, isLoading, error } = useQuery<AnnualReportData>({
    queryKey: ["/api/annual-report", year],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("year", year);
      const res = await apiRequest("GET", `/api/annual-report?${params.toString()}`);
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount);
  };

  // Prepare income breakdown data for charts
  const incomeChartData = useMemo(() => {
    if (!data?.incomeBreakdown) return [];
    const greenShades = ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d"];
    return data.incomeBreakdown.map((item, index) => ({
      name: item.category,
      value: item.amount,
      color: greenShades[index % greenShades.length],
    }));
  }, [data?.incomeBreakdown]);

  // Prepare expense breakdown data for charts
  const expenseChartData = useMemo(() => {
    if (!data?.expenseBreakdown) return [];
    return data.expenseBreakdown.map((item, index) => ({
      name: item.category,
      value: item.amount,
      color: chartColors[index % chartColors.length],
    }));
  }, [data?.expenseBreakdown]);

  // Handle PDF export
  const handleExportPDF = () => {
    if (!data) {
      toast({
        title: "No data available",
        description: "Please wait for data to load before exporting.",
        variant: "destructive",
      });
      return;
    }

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const reportTitle = `Annual Report - ${year}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { color: #666; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .metric { margin: 15px 0; padding: 10px; background-color: #f9f9f9; }
            .metric-label { font-weight: bold; color: #666; }
            .metric-value { font-size: 18px; color: #333; margin-top: 5px; }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <div class="metric">
            <div class="metric-label">Total Income</div>
            <div class="metric-value">${formatCurrency(data.totalIncome)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Total Expenses</div>
            <div class="metric-value">${formatCurrency(data.totalExpenses)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Income After Tax</div>
            <div class="metric-value">${formatCurrency(data.incomeAfterTax)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Year's Profit</div>
            <div class="metric-value">${formatCurrency(data.yearsProfit)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Year's Profit Goal</div>
            <div class="metric-value">${formatCurrency(data.yearsProfitGoal)}</div>
          </div>
          <h2>Income Breakdown by Category</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.incomeBreakdown.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>${formatCurrency(item.amount)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <h2>Expense Breakdown by Category</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.expenseBreakdown.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>${formatCurrency(item.amount)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <h2>Monthly Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Expenses</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              ${data.monthlyBreakdown.map(item => `
                <tr>
                  <td>${item.month}</td>
                  <td>${formatCurrency(item.income)}</td>
                  <td>${formatCurrency(item.expenses)}</td>
                  <td>${formatCurrency(item.profit)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Handle Excel export
  const handleExportExcel = () => {
    if (!data) {
      toast({
        title: "No data available",
        description: "Please wait for data to load before exporting.",
        variant: "destructive",
      });
      return;
    }

    const fileName = `annual-report-${year}.csv`;

    // Create CSV content
    const csvRows = [
      [`Annual Report - ${year}`],
      [],
      ["Metric", "Amount"],
      ["Total Income", formatNumber(data.totalIncome, 2)],
      ["Total Expenses", formatNumber(data.totalExpenses, 2)],
      ["Income After Tax", formatNumber(data.incomeAfterTax, 2)],
      ["Year's Profit", formatNumber(data.yearsProfit, 2)],
      ["Year's Profit Goal", formatNumber(data.yearsProfitGoal, 2)],
      [],
      ["Income Breakdown by Category"],
      ["Category", "Amount"],
      ...data.incomeBreakdown.map(item => [
        item.category,
        formatNumber(item.amount, 2),
      ]),
      [],
      ["Expense Breakdown by Category"],
      ["Category", "Amount"],
      ...data.expenseBreakdown.map(item => [
        item.category,
        formatNumber(item.amount, 2),
      ]),
      [],
      ["Monthly Breakdown"],
      ["Month", "Income", "Expenses", "Profit"],
      ...data.monthlyBreakdown.map(item => [
        item.month,
        formatNumber(item.income, 2),
        formatNumber(item.expenses, 2),
        formatNumber(item.profit, 2),
      ]),
    ];

    const csvContent = csvRows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Annual report exported as ${fileName}`,
    });
  };

  // Handle print
  const handlePrint = () => {
    if (!data) {
      toast({
        title: "No data available",
        description: "Please wait for data to load before printing.",
        variant: "destructive",
      });
      return;
    }

    window.print();
  };

  if (error) {
    return (
      <div className="space-y-8">
        <ReportHeader
          title="Annual Report"
          subtitle="Comprehensive yearly financial performance and trends"
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load annual report data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-8" ref={printRef}>
        <ReportHeader
          title="Annual Report"
          subtitle="Yearly income overview"
        />

        {/* Year Selector */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Year</span>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Loading annual report data...</p>
            </CardContent>
          </Card>
        ) : !data ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No data available for the selected year.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                    Total Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                    {formatCurrency(data.totalIncome)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Year {year}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                    Income After Tax
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                    {formatCurrency(data.incomeAfterTax)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Year {year}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                    Year's Profit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono">
                    {formatCurrency(data.yearsProfit)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Year {year}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                    Profit Goal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono">
                    {formatCurrency(data.yearsProfitGoal)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Year {year}</p>
                </CardContent>
              </Card>
            </div>

            <ChartContainer title="Monthly Income Trend">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data.monthlyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#22c55e"
                    strokeWidth={3}
                    name="Income"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Income Breakdown by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.incomeBreakdown.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No income data available
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.incomeBreakdown.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.category}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Income Breakdown by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeChartData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No income data available
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={incomeChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {incomeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8" ref={printRef}>
      <ReportHeader
        title="Annual Report"
        subtitle="Comprehensive yearly financial performance and trends"
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
      />

      {/* Year Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Year</span>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading annual report data...</p>
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No data available for the selected year.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Total Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                  {formatCurrency(data.totalIncome)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Year {year}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono text-destructive">
                  {formatCurrency(data.totalExpenses)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Year {year}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Income After Tax
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono text-chart-3">
                  {formatCurrency(data.incomeAfterTax)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Year {year}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Year's Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono">
                  {formatCurrency(data.yearsProfit)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Year {year}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Profit Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono">
                  {formatCurrency(data.yearsProfitGoal)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Year {year}</p>
              </CardContent>
            </Card>
          </div>

          {/* Annual Income vs Expenses Chart */}
          <ChartContainer
            title="Annual Income vs Expenses"
            onExport={() => handleExportExcel()}
          >
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={[{ name: year, income: data.totalIncome, expenses: data.totalExpenses }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  name="Total Income"
                />
                <Bar
                  dataKey="expenses"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  name="Total Expenses"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Annual Profit Trend Chart */}
          <ChartContainer
            title="Annual Profit Trend"
            onExport={() => handleExportExcel()}
          >
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.monthlyBreakdown.map(m => ({ ...m, profit: m.income - m.expenses }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#22c55e"
                  strokeWidth={3}
                  name="Monthly Profit"
                  dot={{ fill: "#22c55e", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Monthly Income vs Expenses Chart */}
          <ChartContainer
            title="Monthly Income vs Expenses"
            onExport={() => handleExportExcel()}
          >
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  name="Income After Tax"
                />
                <Bar
                  dataKey="expenses"
                  fill="hsl(var(--destructive))"
                  radius={[4, 4, 0, 0]}
                  name="Expenses"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Monthly Profit Trend */}
          <ChartContainer
            title="Monthly Profit Trend"
            onExport={() => handleExportExcel()}
          >
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={3}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Income Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Income Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {data.incomeBreakdown.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No income data available
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.incomeBreakdown.map((item, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-md"
                      >
                        <span className="font-medium text-green-800 dark:text-green-300">{item.category}</span>
                        <span className="ml-2 font-mono font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Income Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeChartData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No income data available
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={incomeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {incomeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Expense Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {data.expenseBreakdown.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No expense data available
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.expenseBreakdown.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.category}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-destructive">
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseChartData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No expense data available
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expenseChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

