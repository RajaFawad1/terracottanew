import { MetricCard } from "@/components/metric-card";
import { DollarSign, TrendingUp, Users, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { user, member, isAdmin } = useAuth();

  const { data: members = [] } = useQuery({
    queryKey: ["/api/members"],
  });

  const { data: incomeData } = useQuery({
    queryKey: ["/api/income-entries"],
  });
  const incomeEntries = incomeData?.entries ?? [];
  const totalIncome = typeof incomeData?.total === "string"
    ? parseFloat(incomeData.total)
    : (incomeData?.total ?? 0);

  const { data: expenseData } = useQuery({
    queryKey: ["/api/expense-entries"],
  });
  const expenseEntries = expenseData?.entries ?? [];
  const totalExpenses = typeof expenseData?.total === "string"
    ? parseFloat(expenseData.total)
    : (expenseData?.total ?? 0);

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const totalProfit = totalIncome - totalExpenses;

  const totalMembers = members.length;
  const activeMembers = members.filter((m: any) => m.userId).length;

  const totalContributions = members.reduce((sum: number, m: any) => sum + parseFloat(m.contributions || "0"), 0);
  const totalShares = members.reduce((sum: number, m: any) => sum + parseFloat(m.shares || "0"), 0);

  const currentMember = member;
  const memberShares = currentMember ? parseFloat(currentMember.shares || "0") : 0;
  const sharePercentage = totalShares > 0 ? (memberShares / totalShares) * 100 : 0;

  const memberIncomeEntries = incomeEntries.filter((entry: any) => entry.memberId === currentMember?.id);
  const memberExpenseEntries = expenseEntries.filter((entry: any) => entry.memberId === currentMember?.id);

  const memberIncome = memberIncomeEntries.reduce((sum: number, entry: any) => sum + parseFloat(entry.netAmount || "0"), 0);
  const memberExpenses = memberExpenseEntries.reduce((sum: number, entry: any) => sum + parseFloat(entry.netAmount || "0"), 0);

  const currency = settings?.currency || "USD";

  if (isAdmin) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your financial performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Contributions"
            value={`${currency} $${totalContributions.toLocaleString()}`}
            change={0}
            changeLabel="all time"
            trend="neutral"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="Current Profit"
            value={`${currency} $${totalProfit.toLocaleString()}`}
            change={0}
            changeLabel="income - expenses"
            trend={totalProfit >= 0 ? "up" : "down"}
            icon={<PiggyBank className="h-4 w-4" />}
          />
          <MetricCard
            title="Active Members"
            value={activeMembers.toString()}
            change={0}
            changeLabel={`of ${totalMembers} total`}
            trend="neutral"
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Total Shares"
            value={totalShares.toLocaleString()}
            change={0}
            changeLabel="distributed"
            trend="neutral"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Income Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Income</span>
                <span className="font-mono font-bold text-lg text-chart-4">
                  +${totalIncome.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Entries</span>
                <span className="font-bold">{incomeEntries.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average per Entry</span>
                <span className="font-mono">
                  ${incomeEntries.length > 0 ? (totalIncome / incomeEntries.length).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Expenses</span>
                <span className="font-mono font-bold text-lg text-destructive">
                  -${totalExpenses.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Entries</span>
                <span className="font-bold">{expenseEntries.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average per Entry</span>
                <span className="font-mono">
                  ${expenseEntries.length > 0 ? (totalExpenses / expenseEntries.length).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Member Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.slice(0, 5).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{m.firstName} {m.lastName}</p>
                    <p className="text-sm text-muted-foreground">Shares: {parseFloat(m.shares || "0").toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Ownership</p>
                    <p className="font-mono font-bold">{m.sharePercentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">My Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {currentMember?.firstName}! Here's your personal financial overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="My Contributions"
          value={`${currency} $${parseFloat(currentMember?.contributions || "0").toLocaleString()}`}
          change={0}
          changeLabel="total invested"
          trend="neutral"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="My Shares"
          value={memberShares.toLocaleString()}
          change={0}
          changeLabel={`${sharePercentage.toFixed(2)}% of total`}
          trend="neutral"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="My Income"
          value={`${currency} $${memberIncome.toLocaleString()}`}
          change={0}
          changeLabel={`${memberIncomeEntries.length} entries`}
          trend="up"
          icon={<PiggyBank className="h-4 w-4" />}
        />
        <MetricCard
          title="My Expenses"
          value={`${currency} $${memberExpenses.toLocaleString()}`}
          change={0}
          changeLabel={`${memberExpenseEntries.length} entries`}
          trend="down"
          icon={<PiggyBank className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Income</span>
              <span className="font-mono font-bold text-lg text-chart-4">+${memberIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Expenses</span>
              <span className="font-mono font-bold text-lg text-destructive">-${memberExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Net Profit</span>
              <span className="font-mono font-bold text-lg">${(memberIncome - memberExpenses).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Ownership Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Shares</span>
              <span className="font-mono font-bold text-lg">{memberShares.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ownership Percentage</span>
              <span className="font-mono font-bold text-lg text-primary">{sharePercentage.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Company Total Shares</span>
              <span className="font-mono">{totalShares.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...memberIncomeEntries, ...memberExpenseEntries]
              .slice(0, 5)
              .map((entry: any, index: number) => {
                const isIncome = entry.paymentMethodId !== undefined;
                return (
                  <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{isIncome ? "Income Entry" : "Expense Entry"}</p>
                      <p className="text-xs text-muted-foreground">{entry.date}</p>
                    </div>
                    <div className={`font-mono font-bold text-base ${isIncome ? "text-chart-4" : "text-destructive"}`}>
                      {isIncome ? "+" : "-"}${parseFloat(entry.netAmount || "0").toLocaleString()}
                    </div>
                  </div>
                );
              })}
            {memberIncomeEntries.length === 0 && memberExpenseEntries.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
