import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Edit, Trash } from "lucide-react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export default function Transactions() {
  const [activeTab, setActiveTab] = useState("income");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{ type: "income" | "expense"; id: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

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
    date: new Date().toISOString().split("T")[0],
    memberId: "",
    totalAmount: "",
    taxPercentage: "0",
    categoryId: "",
    paymentMethodId: "",
    description: "",
  });

  // Create mutations with optimistic-style cache updates
  const createIncome = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/income-entries", data);
      return res.json();
    },
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey: ["/api/income-entries"] });
      const previous = queryClient.getQueryData<any>(["/api/income-entries"]);
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(["/api/income-entries"], (old: any = { entries: [], total: 0 }) => ({
        ...old,
        entries: [{ id: tempId, ...newEntry }, ...(old.entries || [])],
      }));
      return { previous, tempId };
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/income-entries"], context.previous);
      }
      toast({
        title: "Failed to create income entry",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSuccess: (data, _vars, context) => {
      queryClient.setQueryData(["/api/income-entries"], (old: any = { entries: [], total: 0 }) => ({
        ...old,
        entries: (old.entries || []).map((e: any) => (e.id === context?.tempId ? data : e)),
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/income-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/share-price"] });
      toast({ title: "Success", description: "Income entry created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
  });

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/expense-entries", data);
      return res.json();
    },
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey: ["/api/expense-entries"] });
      const previous = queryClient.getQueryData<any>(["/api/expense-entries"]);
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(["/api/expense-entries"], (old: any = { entries: [], total: 0 }) => ({
        ...old,
        entries: [{ id: tempId, ...newEntry }, ...(old.entries || [])],
      }));
      return { previous, tempId };
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/expense-entries"], context.previous);
      }
      toast({
        title: "Failed to create expense entry",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSuccess: (data, _vars, context) => {
      queryClient.setQueryData(["/api/expense-entries"], (old: any = { entries: [], total: 0 }) => ({
        ...old,
        entries: (old.entries || []).map((e: any) => (e.id === context?.tempId ? data : e)),
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/expense-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/share-price"] });
      toast({ title: "Success", description: "Expense entry created successfully" });
      setIsAddDialogOpen(false);
      resetForm();
    },
  });

  const updateIncome = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/income-entries/${id}`, data);
      try {
        return await res.json();
      } catch {
        // In case the server responds with 200 but an empty/invalid JSON body,
        // treat the operation as successful and just return null.
        return null;
      }
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/income-entries"] });
      const previous = queryClient.getQueryData<any>(["/api/income-entries"]);
      queryClient.setQueryData(["/api/income-entries"], (old: any = { entries: [], total: 0 }) => ({
        ...old,
        entries: (old.entries || []).map((e: any) => (e.id === id ? { ...e, ...data } : e)),
      }));
      return { previous };
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/income-entries"], context.previous);
      }
      toast({
        title: "Failed to update income entry",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      // Mirror update logic used in setup.tsx: update cached entry by id, then invalidate.
      if (data && (data as any).id) {
        queryClient.setQueryData(["/api/income-entries"], (old: any = { entries: [], total: 0 }) => ({
          ...old,
          entries: (old.entries || []).map((e: any) => (e.id === (data as any).id ? data : e)),
        }));
      } else if (variables?.id) {
        // Fallback: if API didn't return the updated row, keep optimistic data already applied in onMutate.
        queryClient.setQueryData(["/api/income-entries"], (old: any = { entries: [], total: 0 }) => ({
          ...old,
          entries: (old.entries || []).map((e: any) => (e.id === variables.id ? { ...e, ...variables.data } : e)),
        }));
      }

      queryClient.invalidateQueries({ queryKey: ["/api/income-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/share-price"] });
      toast({ title: "Success", description: "Income entry updated successfully" });
      setIsAddDialogOpen(false);
      setEditingEntry(null);
      resetForm();
    },
  });

  const deleteIncome = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/income-entries/${id}`);
      return { id };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/income-entries"] });
      const previous = queryClient.getQueryData<any>(["/api/income-entries"]);
      queryClient.setQueryData(["/api/income-entries"], (old: any = { entries: [], total: 0 }) => ({
        ...old,
        entries: (old.entries || []).filter((e: any) => e.id !== id),
      }));
      return { previous };
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/income-entries"], context.previous);
      }
      toast({
        title: "Failed to delete income entry",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/income-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/share-price"] });
      toast({ title: "Success", description: "Income entry deleted successfully" });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/expense-entries/${id}`, data);
      try {
        return await res.json();
      } catch {
        // In case the server responds with 200 but an empty/invalid JSON body,
        // treat the operation as successful and just return null.
        return null;
      }
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/expense-entries"] });
      const previous = queryClient.getQueryData<any>(["/api/expense-entries"]);
      queryClient.setQueryData(["/api/expense-entries"], (old: any = { entries: [], total: 0 }) => ({
        ...old,
        entries: (old.entries || []).map((e: any) => (e.id === id ? { ...e, ...data } : e)),
      }));
      return { previous };
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/expense-entries"], context.previous);
      }
      toast({
        title: "Failed to update expense entry",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      // Mirror update logic used in setup.tsx: update cached entry by id, then invalidate.
      if (data && (data as any).id) {
        queryClient.setQueryData(["/api/expense-entries"], (old: any = { entries: [], total: 0 }) => ({
          ...old,
          entries: (old.entries || []).map((e: any) => (e.id === (data as any).id ? data : e)),
        }));
      } else if (variables?.id) {
        // Fallback: if API didn't return the updated row, keep optimistic data already applied in onMutate.
        queryClient.setQueryData(["/api/expense-entries"], (old: any = { entries: [], total: 0 }) => ({
          ...old,
          entries: (old.entries || []).map((e: any) => (e.id === variables.id ? { ...e, ...variables.data } : e)),
        }));
      }

      queryClient.invalidateQueries({ queryKey: ["/api/expense-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/share-price"] });
      toast({ title: "Success", description: "Expense entry updated successfully" });
      setIsAddDialogOpen(false);
      setEditingEntry(null);
      resetForm();
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/expense-entries/${id}`);
      return { id };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/expense-entries"] });
      const previous = queryClient.getQueryData<any>(["/api/expense-entries"]);
      queryClient.setQueryData(["/api/expense-entries"], (old: any = { entries: [], total: 0 }) => ({
        ...old,
        entries: (old.entries || []).filter((e: any) => e.id !== id),
      }));
      return { previous };
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/expense-entries"], context.previous);
      }
      toast({
        title: "Failed to delete expense entry",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/share-price"] });
      toast({ title: "Success", description: "Expense entry deleted successfully" });
    },
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      memberId: "",
      totalAmount: "",
      taxPercentage: "0",
      categoryId: "",
      paymentMethodId: "",
      description: "",
    });
  };

  const openForEdit = (entry: any, type: "income" | "expense") => {
    setActiveTab(type);
    setEditingEntry({ type, id: entry.id });
    setFormData({
      date: new Date(entry.date).toISOString().split("T")[0],
      memberId: entry.memberId || "",
      totalAmount: String(entry.totalAmount ?? ""),
      taxPercentage: String(entry.taxPercentage ?? "0"),
      categoryId: entry.categoryId || "",
      paymentMethodId: entry.paymentMethodId ?? "",
      description: entry.description ?? "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = () => {
    if (activeTab === "income") {
      if (!formData.memberId || !formData.totalAmount || !formData.paymentMethodId) {
      toast({
        title: "Error",
          description: "Please fill in all required fields: member, total amount, and payment method.",
        variant: "destructive",
      });
      return;
      }
    } else {
      if (!formData.totalAmount || !formData.categoryId || !formData.paymentMethodId) {
        toast({
          title: "Error",
          description: "Please fill in all required fields: category, total amount, and payment method.",
          variant: "destructive",
        });
        return;
      }
    }

    const totalAmount = parseFloat(formData.totalAmount);
    const taxPercentage = parseFloat(formData.taxPercentage);
    const taxAmount = (totalAmount * taxPercentage) / 100;
    const netAmount = totalAmount - taxAmount;

    if (editingEntry) {
      if (editingEntry.type === "income") {
        const incomePayload = {
      date: formData.date,
      totalAmount: totalAmount.toString(),
      taxPercentage: taxPercentage.toString(),
      taxAmount: taxAmount.toString(),
      netAmount: netAmount.toString(),
          memberId: formData.memberId,
      paymentMethodId: formData.paymentMethodId,
          categoryId: null,
    };
        updateIncome.mutate({
          id: editingEntry.id,
          data: incomePayload,
        });
      } else {
        const expensePayload = {
          date: formData.date,
          totalAmount: totalAmount.toString(),
          taxPercentage: taxPercentage.toString(),
          taxAmount: taxAmount.toString(),
          netAmount: netAmount.toString(),
          categoryId: formData.categoryId,
          paymentMethodId: formData.paymentMethodId,
          description: formData.description || null,
        };
        updateExpense.mutate({ id: editingEntry.id, data: expensePayload });
      }
    } else {
      if (activeTab === "income") {
        const incomePayload = {
          date: formData.date,
          totalAmount: totalAmount.toString(),
          taxPercentage: taxPercentage.toString(),
          taxAmount: taxAmount.toString(),
          netAmount: netAmount.toString(),
          memberId: formData.memberId,
          paymentMethodId: formData.paymentMethodId,
        };
        createIncome.mutate(incomePayload);
      } else {
        const expensePayload = {
          date: formData.date,
          totalAmount: totalAmount.toString(),
          taxPercentage: taxPercentage.toString(),
          taxAmount: taxAmount.toString(),
          netAmount: netAmount.toString(),
          categoryId: formData.categoryId,
          paymentMethodId: formData.paymentMethodId,
          description: formData.description || null,
        };
        createExpense.mutate(expensePayload);
      }
    }
  };

  const openForCreate = () => {
    setEditingEntry(null);
    resetForm();
    setIsAddDialogOpen(true);
  };


  // Filter and calculate totals for income
  const filteredIncome = useMemo(
    () =>
      incomeEntries.filter((entry: any) => {
        const member = members.find((m: any) => m.id === entry.memberId);
        const searchLower = searchTerm.toLowerCase();
        const dateStr = formatDate(entry.date ?? "");
        const firstName = (member?.firstName || "").toLowerCase();
        const lastName = (member?.lastName || "").toLowerCase();
        return (
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          dateStr.includes(searchTerm)
        );
      }),
    [incomeEntries, members, searchTerm]
  );

  const incomeTotal = filteredIncome.reduce((sum: number, entry: any) => sum + parseFloat(entry.totalAmount || "0"), 0);
  const incomeTaxTotal = filteredIncome.reduce((sum: number, entry: any) => sum + parseFloat(entry.taxAmount || "0"), 0);
  const incomeNetTotal = filteredIncome.reduce((sum: number, entry: any) => sum + parseFloat(entry.netAmount || "0"), 0);

  // Filter and calculate totals for expenses
  const filteredExpenses = useMemo(
    () =>
      expenseEntries.filter((entry: any) => {
        const category = expenseCategories.find((c: any) => c.id === entry.categoryId);
        const searchLower = searchTerm.toLowerCase();
        const dateStr = formatDate(entry.date ?? "");
        const description = (entry.description || "").toLowerCase();
        const categoryName = (category?.name || "").toLowerCase();
        return (
          categoryName.includes(searchLower) ||
          description.includes(searchLower) ||
          dateStr.includes(searchTerm)
        );
      }),
    [expenseEntries, expenseCategories, searchTerm]
  );

  const expenseTotal = filteredExpenses.reduce((sum: number, entry: any) => sum + parseFloat(entry.totalAmount || "0"), 0);
  const expenseTaxTotal = filteredExpenses.reduce((sum: number, entry: any) => sum + parseFloat(entry.taxAmount || "0"), 0);
  const expenseNetTotal = filteredExpenses.reduce((sum: number, entry: any) => sum + parseFloat(entry.netAmount || "0"), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Transactions</h1>
          <p className="text-muted-foreground">Manage all income and expense records</p>
        </div>
        <Button onClick={openForCreate} data-testid="button-add-transaction">
          <Plus className="h-4 w-4 mr-2" />
          Add {activeTab === "income" ? "Income" : "Expense"}
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#003153]">
          <Search className="h-4 w-4" />
        </div>
        <Input
          placeholder="Search by name or date..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-background/80 border-[#003153]/30 focus-visible:ring-0 focus-visible:border-[#003153]"
          data-testid="input-search-transactions"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent">
          <TabsTrigger
            value="income"
            data-testid="tab-income"
            className="text-green-700 data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            Income
          </TabsTrigger>
          <TabsTrigger
            value="expense"
            data-testid="tab-expense"
            className="text-red-700 data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-6 space-y-4">
          {/* Totals for Income */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-600 bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-green-600 dark:text-green-400">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400" data-testid="text-income-total">
                  {incomeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-green-600 dark:text-green-400">Tax Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400" data-testid="text-income-tax-total">
                  {incomeTaxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-700 bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-green-600 dark:text-green-400">Net Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400" data-testid="text-income-net-total">
                  {incomeNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border border-border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-xs uppercase tracking-wide text-center">No</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">First Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Last Name</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Total Amount</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Tax %</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Net Amount</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Tax Amount</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Paid With</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncome.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No income entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncome.map((entry: any, index: number) => {
                    const member = members.find((m: any) => m.id === entry.memberId);
                    const paymentMethod = paymentMethods.find((pm: any) => pm.id === entry.paymentMethodId);
                    return (
                      <TableRow 
                        key={entry.id} 
                        className={index % 2 === 0 ? "bg-gradient-to-r from-primary/5 to-transparent" : "bg-gradient-to-r from-chart-2/5 to-transparent"}
                      >
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {(index + 1).toString().padStart(2, "0")}
                        </TableCell>
                        <TableCell className="font-medium">{formatDate(entry.date)}</TableCell>
                        <TableCell>{member?.firstName || "-"}</TableCell>
                        <TableCell>{member?.lastName || "-"}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-green-600 dark:text-green-400">
                          {parseFloat(entry.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">{entry.taxPercentage}%</TableCell>
                        <TableCell className="text-right font-mono font-bold text-green-600 dark:text-green-400">
                          {parseFloat(entry.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                          {parseFloat(entry.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{paymentMethod?.name || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openForEdit(entry, "income")}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteIncome.mutate(entry.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
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
            <Card className="border-l-4 border-l-red-600 bg-gradient-to-br from-red-50 to-transparent dark:from-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-red-600 dark:text-red-400">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-red-600 dark:text-red-400" data-testid="text-expense-total">
                  {expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-transparent dark:from-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-red-600 dark:text-red-400">Tax Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-red-600 dark:text-red-400" data-testid="text-expense-tax-total">
                  {expenseTaxTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-700 bg-gradient-to-br from-red-50 to-transparent dark:from-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-red-600 dark:text-red-400">Net Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono text-red-600 dark:text-red-400" data-testid="text-expense-net-total">
                  {expenseNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border border-border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-xs uppercase tracking-wide text-center">No</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Category</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Description</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Total Amount</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Tax %</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Net Amount</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Tax Amount</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Paid With</TableHead>
                  <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No expense entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((entry: any, index: number) => {
                    const category = expenseCategories.find((c: any) => c.id === entry.categoryId);
                    const paymentMethod = paymentMethods.find((pm: any) => pm.id === entry.paymentMethodId);
                    return (
                      <TableRow 
                        key={entry.id} 
                        className={index % 2 === 0 ? "bg-gradient-to-r from-primary/5 to-transparent" : "bg-gradient-to-r from-chart-2/5 to-transparent"}
                      >
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {(index + 1).toString().padStart(2, "0")}
                        </TableCell>
                        <TableCell className="font-medium">{formatDate(entry.date)}</TableCell>
                        <TableCell>{category?.name || "-"}</TableCell>
                        <TableCell>{entry.description || "-"}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-600 dark:text-red-400">
                          {parseFloat(entry.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">{entry.taxPercentage}%</TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-600 dark:text-red-400">
                          {parseFloat(entry.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                          {parseFloat(entry.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{paymentMethod?.name || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openForEdit(entry, "expense")}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteExpense.mutate(entry.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
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
              {activeTab === "income" ? (
                <>
                <div>
                    <Label htmlFor="member" className="text-xs uppercase tracking-wide">Select Member</Label>
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
              <div>
                <Label htmlFor="payment-method" className="text-xs uppercase tracking-wide">Paid With</Label>
                <Select
                  value={formData.paymentMethodId}
                  onValueChange={(v) => setFormData({ ...formData, paymentMethodId: v })}
                >
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
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="category" className="text-xs uppercase tracking-wide">Category</Label>
                    <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                      <SelectTrigger id="category" className="mt-2" data-testid="select-entry-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
              <div>
                <Label htmlFor="description" className="text-xs uppercase tracking-wide">Description</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Short description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-2"
                />
              </div>
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
                  <div>
                    <Label htmlFor="payment-method" className="text-xs uppercase tracking-wide">Paid With</Label>
                    <Select
                      value={formData.paymentMethodId}
                      onValueChange={(v) => setFormData({ ...formData, paymentMethodId: v })}
                    >
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
                </>
              )}
              {formData.totalAmount && formData.taxPercentage && (
                <div className="p-4 bg-muted/30 rounded-md space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax Amount:</span>
                    <span className="font-mono font-bold">
                      {formatNumber((parseFloat(formData.totalAmount) * parseFloat(formData.taxPercentage)) / 100, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Net Amount:</span>
                    <span className="font-mono font-bold">
                      {formatNumber(parseFloat(formData.totalAmount) - (parseFloat(formData.totalAmount) * parseFloat(formData.taxPercentage)) / 100, 2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createIncome.isPending ||
                createExpense.isPending ||
                updateIncome.isPending ||
                updateExpense.isPending
              }
              data-testid="button-submit-entry"
            >
              {editingEntry
                ? updateIncome.isPending || updateExpense.isPending
                  ? "Updating..."
                  : "Update Entry"
                : createIncome.isPending || createExpense.isPending
                  ? "Adding..."
                  : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}