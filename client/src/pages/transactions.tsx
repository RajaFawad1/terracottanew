import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Transactions() {
  const [activeTab, setActiveTab] = useState("income");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch data
  const { data: incomeData } = useQuery({
    queryKey: ["/api/income-entries"],
  });
  const incomeEntries = incomeData?.entries ?? [];
  const incomeTotalAll = typeof incomeData?.total === "string" ? parseFloat(incomeData.total) : (incomeData?.total ?? 0);

  const { data: expenseData } = useQuery({
    queryKey: ["/api/expense-entries"],
  });
  const expenseEntries = expenseData?.entries ?? [];
  const expenseTotalAll = typeof expenseData?.total === "string" ? parseFloat(expenseData.total) : (expenseData?.total ?? 0);

  const { data: members = [] } = useQuery({
    queryKey: ["/api/members"],
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["/api/payment-methods"],
  });

  const { data: incomeCategories = [] } = useQuery({
    queryKey: ["/api/income-categories"],
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ["/api/expense-categories"],
  });

  // Add entry dialog state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    memberId: "",
    totalAmount: "",
    taxPercentage: "0",
    categoryId: "",
    paymentMethodId: "",
  });

  // Create mutations
  const createIncome = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/income-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create income entry");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/income-entries"] });
      toast({ title: "Success", description: "Income entry created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
  });

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/expense-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create expense entry");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-entries"] });
      toast({ title: "Success", description: "Expense entry created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      memberId: "",
      totalAmount: "",
      taxPercentage: "0",
      categoryId: "",
      paymentMethodId: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.memberId || !formData.totalAmount || !formData.categoryId) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const totalAmount = parseFloat(formData.totalAmount);
    const taxPercentage = parseFloat(formData.taxPercentage);
    const taxAmount = (totalAmount * taxPercentage) / 100;
    const netAmount = totalAmount - taxAmount;

    const payload = {
      date: formData.date,
      memberId: parseInt(formData.memberId),
      totalAmount: totalAmount.toString(),
      taxPercentage: taxPercentage.toString(),
      taxAmount: taxAmount.toString(),
      netAmount: netAmount.toString(),
      categoryId: parseInt(formData.categoryId),
      ...(activeTab === "income" && formData.paymentMethodId ? { paymentMethodId: parseInt(formData.paymentMethodId) } : {}),
    };

    if (activeTab === "income") {
      createIncome.mutate(payload);
    } else {
      createExpense.mutate(payload);
    }
  };

  // Filter and calculate totals for income
  const filteredIncome = incomeEntries.filter((entry: any) => {
    const member = members.find((m: any) => m.id === entry.memberId);
    const searchLower = searchTerm.toLowerCase();
    return (
      member?.firstName?.toLowerCase().includes(searchLower) ||
      member?.lastName?.toLowerCase().includes(searchLower) ||
      entry.date?.includes(searchTerm)
    );
  });

  const incomeTotal = filteredIncome.reduce((sum: number, entry: any) => sum + parseFloat(entry.totalAmount || "0"), 0);
  const incomeTaxTotal = filteredIncome.reduce((sum: number, entry: any) => sum + parseFloat(entry.taxAmount || "0"), 0);
  const incomeNetTotal = filteredIncome.reduce((sum: number, entry: any) => sum + parseFloat(entry.netAmount || "0"), 0);

  // Filter and calculate totals for expenses
  const filteredExpenses = expenseEntries.filter((entry: any) => {
    const member = members.find((m: any) => m.id === entry.memberId);
    const searchLower = searchTerm.toLowerCase();
    return (
      member?.firstName?.toLowerCase().includes(searchLower) ||
      member?.lastName?.toLowerCase().includes(searchLower) ||
      entry.date?.includes(searchTerm)
    );
  });

  const expenseTotal = filteredExpenses.reduce((sum: number, entry: any) => sum + parseFloat(entry.totalAmount || "0"), 0);
  const expenseTaxTotal = filteredExpenses.reduce((sum: number, entry: any) => sum + parseFloat(entry.taxAmount || "0"), 0);
  const expenseNetTotal = filteredExpenses.reduce((sum: number, entry: any) => sum + parseFloat(entry.netAmount || "0"), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Transactions</h1>
          <p className="text-muted-foreground">Manage all income and expense records</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-transaction">
          <Plus className="h-4 w-4 mr-2" />
          Add {activeTab === "income" ? "Income" : "Expense"}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or date..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-transactions"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="income" data-testid="tab-income">Income</TabsTrigger>
          <TabsTrigger value="expense" data-testid="tab-expense">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-6 space-y-4">
          {/* Totals for Income */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" data-testid="text-income-total">
                  ${incomeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tax Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" data-testid="text-income-tax-total">
                  ${incomeTaxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" data-testid="text-income-net-total">
                  ${incomeNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border border-border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">First Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Last Name</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Total Amount</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Tax %</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Tax Amount</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Net Amount</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncome.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No income entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncome.map((entry: any, index: number) => {
                    const member = members.find((m: any) => m.id === entry.memberId);
                    const paymentMethod = paymentMethods.find((pm: any) => pm.id === entry.paymentMethodId);
                    return (
                      <TableRow key={entry.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">{entry.date}</TableCell>
                        <TableCell>{member?.firstName || "-"}</TableCell>
                        <TableCell>{member?.lastName || "-"}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${parseFloat(entry.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">{entry.taxPercentage}%</TableCell>
                        <TableCell className="text-right font-mono">
                          ${parseFloat(entry.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${parseFloat(entry.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{paymentMethod?.name || "-"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="expense" className="mt-6 space-y-4">
          {/* Totals for Expenses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" data-testid="text-expense-total">
                  ${expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tax Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" data-testid="text-expense-tax-total">
                  ${expenseTaxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono" data-testid="text-expense-net-total">
                  ${expenseNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border border-border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Category</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">First Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Last Name</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Total Amount</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Tax %</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Tax Amount</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Net Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No expense entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((entry: any, index: number) => {
                    const member = members.find((m: any) => m.id === entry.memberId);
                    const category = expenseCategories.find((c: any) => c.id === entry.categoryId);
                    return (
                      <TableRow key={entry.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">{entry.date}</TableCell>
                        <TableCell>{category?.name || "-"}</TableCell>
                        <TableCell>{member?.firstName || "-"}</TableCell>
                        <TableCell>{member?.lastName || "-"}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${parseFloat(entry.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">{entry.taxPercentage}%</TableCell>
                        <TableCell className="text-right font-mono">
                          ${parseFloat(entry.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          ${parseFloat(entry.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Entry Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add {activeTab === "income" ? "Income" : "Expense"} Entry</DialogTitle>
            <DialogDescription>
              Enter the details for the new {activeTab} entry
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto pr-2 flex-1">
            <div className="space-y-4">
              <div>
                <Label htmlFor="date" className="text-xs uppercase tracking-wide">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-2"
                  data-testid="input-entry-date"
                />
              </div>
              <div>
                <Label htmlFor="member" className="text-xs uppercase tracking-wide">Member</Label>
                <Select value={formData.memberId} onValueChange={(v) => setFormData({ ...formData, memberId: v })}>
                  <SelectTrigger id="member" className="mt-2" data-testid="select-entry-member">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member: any) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.firstName} {member.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category" className="text-xs uppercase tracking-wide">Category</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger id="category" className="mt-2" data-testid="select-entry-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(activeTab === "income" ? incomeCategories : expenseCategories).map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {activeTab === "income" && (
                <div>
                  <Label htmlFor="payment-method" className="text-xs uppercase tracking-wide">Payment Method</Label>
                  <Select value={formData.paymentMethodId} onValueChange={(v) => setFormData({ ...formData, paymentMethodId: v })}>
                    <SelectTrigger id="payment-method" className="mt-2" data-testid="select-entry-payment-method">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method: any) => (
                        <SelectItem key={method.id} value={method.id.toString()}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="total-amount" className="text-xs uppercase tracking-wide">Total Amount</Label>
                <Input
                  id="total-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="mt-2"
                  data-testid="input-entry-total-amount"
                />
              </div>
              <div>
                <Label htmlFor="tax-percentage" className="text-xs uppercase tracking-wide">Tax Percentage</Label>
                <Input
                  id="tax-percentage"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.taxPercentage}
                  onChange={(e) => setFormData({ ...formData, taxPercentage: e.target.value })}
                  className="mt-2"
                  data-testid="input-entry-tax-percentage"
                />
              </div>
              {formData.totalAmount && formData.taxPercentage && (
                <div className="p-4 bg-muted/30 rounded-md space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax Amount:</span>
                    <span className="font-mono font-bold">
                      ${((parseFloat(formData.totalAmount) * parseFloat(formData.taxPercentage)) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Net Amount:</span>
                    <span className="font-mono font-bold">
                      ${(parseFloat(formData.totalAmount) - (parseFloat(formData.totalAmount) * parseFloat(formData.taxPercentage)) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createIncome.isPending || createExpense.isPending} data-testid="button-submit-entry">
              {createIncome.isPending || createExpense.isPending ? "Adding..." : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}