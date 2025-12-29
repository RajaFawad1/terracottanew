import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface Entry {
  paymentMethodId: string;
  netAmount?: string | number;
  totalAmount?: string | number;
}

interface PaymentMethod {
  id: string;
  name: string;
}

export default function BalanceSheet() {
  const { toast } = useToast();

  const { data: incomeData, isLoading: isIncomeLoading, error: incomeError } = useQuery<{
    entries: Entry[];
  }>({
    queryKey: ["/api/income-entries"],
  });

  const { data: expenseData, isLoading: isExpenseLoading, error: expenseError } = useQuery<{
    entries: Entry[];
  }>({
    queryKey: ["/api/expense-entries"],
  });

  const {
    data: paymentMethods = [],
    isLoading: isPaymentMethodsLoading,
    error: paymentMethodsError,
  } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const isLoading = isIncomeLoading || isExpenseLoading || isPaymentMethodsLoading;
  const hasError = incomeError || expenseError || paymentMethodsError;

  const rows = useMemo(() => {
    const incomes = incomeData?.entries ?? [];
    const expenses = expenseData?.entries ?? [];

    const paymentMap = new Map<
      string,
      { account: string; income: number; expense: number; balance: number }
    >();

    paymentMethods.forEach((pm) => {
      paymentMap.set(pm.id, {
        account: pm.name,
        income: 0,
        expense: 0,
        balance: 0,
      });
    });

    const addAmount = (entry: Entry, type: "income" | "expense") => {
      if (!entry.paymentMethodId) return;
      const row = paymentMap.get(entry.paymentMethodId);
      if (!row) return;

      const raw =
        typeof entry.netAmount === "number"
          ? entry.netAmount
          : entry.netAmount
          ? parseFloat(entry.netAmount)
          : entry.totalAmount
          ? parseFloat(entry.totalAmount as any)
          : 0;

      if (Number.isNaN(raw)) return;

      if (type === "income") {
        row.income += raw;
      } else {
        row.expense += raw;
      }
      row.balance = row.income - row.expense;
    };

    incomes.forEach((entry) => addAmount(entry, "income"));
    expenses.forEach((entry) => addAmount(entry, "expense"));

    return Array.from(paymentMap.values()).filter(
      (row) => row.income !== 0 || row.expense !== 0 || row.balance !== 0,
    );
  }, [incomeData?.entries, expenseData?.entries, paymentMethods]);

  const totalBalance = rows.reduce((sum, row) => sum + row.balance, 0);

  if (hasError) {
    toast({
      title: "Failed to load balance sheet",
      description: "Please try again later.",
      variant: "destructive",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">
          Balance Sheet
        </h1>
        <p className="text-muted-foreground">
          Overview of income, expenses, and balances by payment method.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-3xl font-bold font-mono ${
              totalBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {totalBalance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">
              Loading balance sheet data...
            </p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No balance data available yet.
            </p>
          ) : (
            <div className="border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wide">Account</TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-wide text-green-600 dark:text-green-400">
                      Income
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-wide text-red-600 dark:text-red-400">
                      Expense
                    </TableHead>
                    <TableHead className="text-right text-xs uppercase tracking-wide">
                      Balance
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.account}>
                      <TableCell className="font-medium">{row.account}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-green-600 dark:text-green-400">
                        {row.income.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-red-600 dark:text-red-400">
                        {row.expense.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-bold ${
                          row.balance >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {row.balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


