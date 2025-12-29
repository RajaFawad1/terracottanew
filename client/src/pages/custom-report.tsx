import { ReportHeader } from "@/components/report-header";
import { ChartContainer } from "@/components/chart-container";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

interface CustomReportData {
  startDate: string;
  endDate: string;
  netRevenue: number;
  netIncome: number;
  grossRevenue: number;
  grossProfit: number;
  totalNetExpenses: number;
  totalGrossExpenses: number;
  incomeBreakdown: Array<{
    category: string;
    total: number;
    net: number;
    tax: number;
  }>;
  expenseBreakdown: Array<{
    category: string;
    type: string;
    total: number;
    net: number;
    tax: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    netIncome: number;
    netExpenses: number;
  }>;
}

export default function CustomReport() {
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(
    firstDayOfMonth.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    lastDayOfMonth.toISOString().split("T")[0]
  );

  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Fetch custom report data
  const { data, isLoading, error, refetch } = useQuery<CustomReportData>({
    queryKey: ["/api/custom-report", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", endDate);
      const res = await apiRequest("GET", `/api/custom-report?${params.toString()}`);
      return res.json();
    },
    enabled: false, // Don't fetch automatically, only when explicitly requested
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Handle generate report
  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing dates",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Invalid date range",
        description: "Start date must be before or equal to end date.",
        variant: "destructive",
      });
      return;
    }

    try {
      await refetch();
    } catch (err) {
      // Error is handled by the query
    }
  };

  // Handle PDF export
  const handleExportPDF = () => {
    if (!data) {
      toast({
        title: "No data available",
        description: "Please generate a report before exporting.",
        variant: "destructive",
      });
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const reportTitle = `Custom Report - ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`;

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
            <div class="metric-label">Net Revenue</div>
            <div class="metric-value">${formatCurrency(data.netRevenue)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Net Income</div>
            <div class="metric-value">${formatCurrency(data.netIncome)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Gross Revenue</div>
            <div class="metric-value">${formatCurrency(data.grossRevenue)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Gross Profit</div>
            <div class="metric-value">${formatCurrency(data.grossProfit)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Total Net Expenses</div>
            <div class="metric-value">${formatCurrency(data.totalNetExpenses)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Total Gross Expenses</div>
            <div class="metric-value">${formatCurrency(data.totalGrossExpenses)}</div>
          </div>
          <h2>Income Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Total</th>
                <th>Net</th>
                <th>Tax</th>
              </tr>
            </thead>
            <tbody>
              ${data.incomeBreakdown.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>${formatCurrency(item.total)}</td>
                  <td>${formatCurrency(item.net)}</td>
                  <td>${formatCurrency(item.tax)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <h2>Expense Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Type</th>
                <th>Total</th>
                <th>Net</th>
                <th>Tax</th>
              </tr>
            </thead>
            <tbody>
              ${data.expenseBreakdown.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>${item.type}</td>
                  <td>${formatCurrency(item.total)}</td>
                  <td>${formatCurrency(item.net)}</td>
                  <td>${formatCurrency(item.tax)}</td>
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
        description: "Please generate a report before exporting.",
        variant: "destructive",
      });
      return;
    }

    const fileName = `custom-report-${startDate}-to-${endDate}.csv`;

    const csvRows = [
      [`Custom Report - ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`],
      [],
      ["Metric", "Amount"],
      ["Net Revenue", formatNumber(data.netRevenue, 2)],
      ["Net Income", formatNumber(data.netIncome, 2)],
      ["Gross Revenue", formatNumber(data.grossRevenue, 2)],
      ["Gross Profit", formatNumber(data.grossProfit, 2)],
      ["Total Net Expenses", formatNumber(data.totalNetExpenses, 2)],
      ["Total Gross Expenses", formatNumber(data.totalGrossExpenses, 2)],
      [],
      ["Income Breakdown"],
      ["Category", "Total", "Net", "Tax"],
      ...data.incomeBreakdown.map(item => [
        item.category,
        formatNumber(item.total, 2),
        formatNumber(item.net, 2),
        formatNumber(item.tax, 2),
      ]),
      [],
      ["Expense Breakdown"],
      ["Category", "Type", "Total", "Net", "Tax"],
      ...data.expenseBreakdown.map(item => [
        item.category,
        item.type,
        formatNumber(item.total, 2),
        formatNumber(item.net, 2),
        formatNumber(item.tax, 2),
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
      description: `Custom report exported as ${fileName}`,
    });
  };

  // Handle print
  const handlePrint = () => {
    if (!data) {
      toast({
        title: "No data available",
        description: "Please generate a report before printing.",
        variant: "destructive",
      });
      return;
    }

    window.print();
  };

  // Member view - income only
  if (!isAdmin) {
    return (
      <div className="space-y-8" ref={printRef}>
        <ReportHeader
          title="Custom Report"
          subtitle="Generate income reports for any date range"
        />

        {/* Date Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="start-date" className="text-sm uppercase tracking-wide mb-2 block">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm uppercase tracking-wide mb-2 block">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Button onClick={handleGenerateReport} className="w-full">
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load custom report data.</p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Loading custom report data...</p>
            </CardContent>
          </Card>
        ) : !data ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Select a date range and click "Generate Report" to view the data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Metrics Cards - Income Only */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                    Net Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                    {formatCurrency(data.netRevenue)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(data.startDate)} - {formatDate(data.endDate)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                    Net Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                    {formatCurrency(data.netIncome)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(data.startDate)} - {formatDate(data.endDate)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                    Gross Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                    {formatCurrency(data.grossRevenue)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(data.startDate)} - {formatDate(data.endDate)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Net Income Graph */}
            <ChartContainer
              title="Net Income Trend"
              onExport={() => handleExportExcel()}
            >
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(value) => formatDate(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="netIncome"
                    stroke="#22c55e"
                    strokeWidth={3}
                    name="Net Income"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Income Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Income Breakdown by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {data.incomeBreakdown.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No income data available for the selected date range
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
                          {formatCurrency(item.net)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8" ref={printRef}>
      <ReportHeader
        title="Custom Report"
        subtitle="Generate financial reports for any date range"
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
      />

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="start-date" className="text-sm uppercase tracking-wide mb-2 block">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-sm uppercase tracking-wide mb-2 block">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Button onClick={handleGenerateReport} className="w-full">
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load custom report data.</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading custom report data...</p>
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Select a date range and click "Generate Report" to view the data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Net Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                  {formatCurrency(data.netRevenue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(data.startDate)} - {formatDate(data.endDate)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Net Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono">
                  {formatCurrency(data.netIncome)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(data.startDate)} - {formatDate(data.endDate)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Gross Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono text-chart-3">
                  {formatCurrency(data.grossRevenue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(data.startDate)} - {formatDate(data.endDate)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Gross Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono">
                  {formatCurrency(data.grossProfit)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(data.startDate)} - {formatDate(data.endDate)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Total Net Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono text-destructive">
                  {formatCurrency(data.totalNetExpenses)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(data.startDate)} - {formatDate(data.endDate)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Total Gross Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono text-destructive">
                  {formatCurrency(data.totalGrossExpenses)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(data.startDate)} - {formatDate(data.endDate)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Net Income Graph */}
          <ChartContainer
            title="Net Income Trend"
            onExport={() => handleExportExcel()}
          >
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.dailyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(value) => formatDate(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="netIncome"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={3}
                  name="Net Income"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Net Expenses Graph */}
          <ChartContainer
            title="Net Expenses Trend"
            onExport={() => handleExportExcel()}
          >
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data.dailyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(value) => formatDate(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="netExpenses"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={3}
                  name="Net Expenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Income Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Income Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {data.incomeBreakdown.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No income data available for the selected date range
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.incomeBreakdown.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.category}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.total)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-chart-4">
                          {formatCurrency(item.net)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.tax)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {data.expenseBreakdown.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No expense data available for the selected date range
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expenseBreakdown.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.category}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.total)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-destructive">
                          {formatCurrency(item.net)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(item.tax)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

