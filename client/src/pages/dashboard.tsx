import { MetricCard } from "@/components/metric-card";
import { DollarSign, TrendingUp, Users, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";

export default function Dashboard() {
  const { user, member, isAdmin } = useAuth();

  const { data: members = [] } = useQuery({
    queryKey: ["/api/members"],
  });

  const { data: incomeData } = useQuery({
    queryKey: ["/api/income-entries"],
  });
  const incomeEntries = incomeData?.entries ?? [];
  const totalIncome =
    typeof incomeData?.total === "string"
      ? parseFloat(incomeData.total)
      : incomeData?.total ?? 0;

  const { data: expenseData } = useQuery({
    queryKey: ["/api/expense-entries"],
  });
  const expenseEntries = expenseData?.entries ?? [];
  const totalExpenses =
    typeof expenseData?.total === "string"
      ? parseFloat(expenseData.total)
      : expenseData?.total ?? 0;

  const { data: shareData } = useQuery({
    queryKey: ["/api/share-price"],
  });

  const { data: shareTransactions = [] } = useQuery({
    queryKey: ["/api/share-transactions"],
  });

  const totalMembers = members.length;

  // Take totals from share_transactions table
  const totalContributions = (shareTransactions as any[]).reduce(
    (sum, tx) => {
      const m = (members as any[]).find((member: any) => member.id === tx.memberId);
      if (m?.role === "non member") return sum;
      return sum + parseFloat(tx.contributions || "0");
    },
    0
  );
  const totalShares = (shareTransactions as any[]).reduce(
    (sum, tx) => {
      const m = (members as any[]).find((member: any) => member.id === tx.memberId);
      if (m?.role === "non member") return sum;
      return sum + parseFloat(tx.shares || "0");
    },
    0
  );

  const currentSharePriceRaw = shareData?.current?.sharePrice;
  const currentSharePrice =
    typeof currentSharePriceRaw === "number"
      ? currentSharePriceRaw
      : typeof currentSharePriceRaw === "string"
        ? parseFloat(currentSharePriceRaw)
        : 0;

  const currentMember = member;
  const memberShares = currentMember ? parseFloat(currentMember.shares || "0") : 0;
  const sharePercentage = totalShares > 0 ? (memberShares / totalShares) * 100 : 0;

  const memberIncomeEntries = incomeEntries.filter((entry: any) => entry.memberId === currentMember?.id);
  const memberExpenseEntries = expenseEntries.filter((entry: any) => entry.memberId === currentMember?.id);

  const memberIncome = memberIncomeEntries.reduce((sum: number, entry: any) => sum + parseFloat(entry.netAmount || "0"), 0);
  const memberExpenses = memberExpenseEntries.reduce((sum: number, entry: any) => sum + parseFloat(entry.netAmount || "0"), 0);

  if (isAdmin) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your financial performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Contributions"
            value={formatNumber(totalContributions, 2)}
            change={undefined}
            changeLabel="all time"
            trend="neutral"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="Total Members"
            value={totalMembers.toString()}
            change={undefined}
            changeLabel={undefined}
            trend="neutral"
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Total Shares"
            value={formatNumber(totalShares, 2)}
            change={undefined}
            changeLabel={undefined}
            trend="neutral"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricCard
            title="TerraCotta Share Price"
            value={formatNumber(currentSharePrice || 0, 2)}
            change={undefined}
            changeLabel={undefined}
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
                <span className="font-mono font-bold text-lg text-green-600 dark:text-green-400">
                  +{totalIncome.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Entries</span>
                <span className="font-bold">{incomeEntries.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average per Entry</span>
                <span className="font-mono">
                  {incomeEntries.length > 0 ? (totalIncome / incomeEntries.length).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}
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
                <span className="font-mono font-bold text-lg text-red-600 dark:text-red-400">
                  -{totalExpenses.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Entries</span>
                <span className="font-bold">{expenseEntries.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average per Entry</span>
                <span className="font-mono">
                  {expenseEntries.length > 0 ? (totalExpenses / expenseEntries.length).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}
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
        <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">My Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {currentMember?.firstName}! Here's your personal financial overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="My Contributions"
          value={formatNumber(parseFloat(currentMember?.contributions || "0"), 2)}
          change={undefined}
          changeLabel="total invested"
          trend="neutral"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="My Shares"
          value={formatNumber(memberShares, 2)}
          change={undefined}
          changeLabel={sharePercentage > 0 ? `${formatNumber(sharePercentage, 2)}% of total` : "of total"}
          trend="neutral"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="My Income"
          value={formatNumber(memberIncome, 2)}
          change={undefined}
          changeLabel={`${memberIncomeEntries.length} entries`}
          trend="up"
          icon={<PiggyBank className="h-4 w-4" />}
        />
        <MetricCard
          title="TerraCotta Share Price"
          value={formatNumber(currentSharePrice || 0, 2)}
          change={undefined}
          changeLabel={undefined}
          trend="neutral"
          icon={<TrendingUp className="h-4 w-4" />}
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
              <span className="font-mono font-bold text-lg text-green-600 dark:text-green-400">
                +{memberIncome.toLocaleString()}
              </span>
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
              <span className="font-mono font-bold text-lg text-primary">{sharePercentage > 0 ? `${formatNumber(sharePercentage, 2)}%` : "0%"}</span>
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
            {memberIncomeEntries
              .slice(0, 5)
              .map((entry: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">Income Entry</p>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                  </div>
                  <div className="font-mono font-bold text-base text-green-600 dark:text-green-400">
                    +{parseFloat(entry.netAmount || "0").toLocaleString()}
                  </div>
                </div>
              ))}
            {memberIncomeEntries.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
