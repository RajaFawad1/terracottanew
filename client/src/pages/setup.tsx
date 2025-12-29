import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash, Save, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
];

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

// Generate years from 1960 to 2100
const YEARS = Array.from({ length: 141 }, (_, i) => 1960 + i);

// Types
interface PaymentMethod {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface ProfitGoal {
  id: string;
  month: number;
  year: number;
  goalAmount: number;
  currency: string;
}

interface Settings {
  currency: string;
  fiscalStartMonth: number;
  fiscalYear: number;
}

interface AnnualProfitGoal {
  id: string;
  year: number;
  goalAmount: number;
  currency: string;
}

export default function SetupUpdated() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch data
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: paymentMethods } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const { data: incomeCategories } = useQuery<Category[]>({
    queryKey: ["/api/income-categories"],
  });

  const { data: expenseCategories } = useQuery<Category[]>({
    queryKey: ["/api/expense-categories"],
  });

  const { data: profitGoals } = useQuery<ProfitGoal[]>({
    queryKey: ["/api/profit-goals"],
  });

  const { data: annualProfitGoal } = useQuery<AnnualProfitGoal>({
    queryKey: ["/api/annual-profit-goal"],
  });

  // State for forms
  const [currency, setCurrency] = useState("USD");
  const [fiscalStartMonth, setFiscalStartMonth] = useState(1);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [goalMonth, setGoalMonth] = useState(1);
  const [goalYear, setGoalYear] = useState(new Date().getFullYear());
  const [goalAmount, setGoalAmount] = useState("");
  const [annualGoalAmount, setAnnualGoalAmount] = useState("");

  // State for CRUD operations
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [newIncomeCategory, setNewIncomeCategory] = useState("");
  const [newExpenseCategory, setNewExpenseCategory] = useState("");
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<string | null>(null);
  const [editingIncomeCategory, setEditingIncomeCategory] = useState<string | null>(null);
  const [editingExpenseCategory, setEditingExpenseCategory] = useState<string | null>(null);
  const [editPaymentMethodName, setEditPaymentMethodName] = useState("");
  const [editIncomeCategoryName, setEditIncomeCategoryName] = useState("");
  const [editExpenseCategoryName, setEditExpenseCategoryName] = useState("");

  // Initialize state with fetched data
  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency || "USD");
      setFiscalStartMonth(settings.fiscalStartMonth || 1);
      setFiscalYear(settings.fiscalYear || new Date().getFullYear());
    }
  }, [settings]);

  useEffect(() => {
    if (annualProfitGoal) {
      setAnnualGoalAmount(annualProfitGoal.goalAmount.toString());
    }
  }, [annualProfitGoal]);

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Success", description: "Settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Profit goal mutations with optimistic updates
  const createProfitGoal = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/profit-goals", data);
      return res.json();
    },
    onMutate: async (newGoal) => {
      await queryClient.cancelQueries({ queryKey: ["/api/profit-goals"] });
      const previousGoals = queryClient.getQueryData(["/api/profit-goals"]);
      
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(["/api/profit-goals"], (old: ProfitGoal[] = []) => [
        ...old,
        { id: tempId, ...newGoal }
      ]);
      
      return { previousGoals, tempId };
    },
    onError: (err, newGoal, context) => {
      queryClient.setQueryData(["/api/profit-goals"], context?.previousGoals);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(["/api/profit-goals"], (old: ProfitGoal[] = []) => 
        old.map(item => item.id === context?.tempId ? data : item)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/profit-goals"] });
      toast({ title: "Success", description: "Profit goal created successfully" });
      setGoalAmount("");
    },
  });

  const updateProfitGoal = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/profit-goals/${id}`, data);
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/profit-goals"] });
      const previousGoals = queryClient.getQueryData(["/api/profit-goals"]);
      
      queryClient.setQueryData(["/api/profit-goals"], (old: ProfitGoal[] = []) => 
        old.map(item => item.id === id ? { ...item, ...data } : item)
      );
      
      return { previousGoals };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["/api/profit-goals"], context?.previousGoals);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/profit-goals"], (old: ProfitGoal[] = []) => 
        old.map(item => item.id === data.id ? data : item)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/profit-goals"] });
      toast({ title: "Success", description: "Profit goal updated successfully" });
    },
  });

  const deleteProfitGoal = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/profit-goals/${id}`);
      return { id };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/profit-goals"] });
      const previousGoals = queryClient.getQueryData(["/api/profit-goals"]);
      
      queryClient.setQueryData(["/api/profit-goals"], (old: ProfitGoal[] = []) => 
        old.filter(item => item.id !== id)
      );
      
      return { previousGoals };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["/api/profit-goals"], context?.previousGoals);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profit-goals"] });
      toast({ title: "Success", description: "Profit goal deleted successfully" });
    },
  });

  // Payment method mutations with optimistic updates
  const createPaymentMethod = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/payment-methods", { name });
      return res.json();
    },
    onMutate: async (newPaymentMethodName) => {
      await queryClient.cancelQueries({ queryKey: ["/api/payment-methods"] });
      const previousPaymentMethods = queryClient.getQueryData(["/api/payment-methods"]);
      
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(["/api/payment-methods"], (old: PaymentMethod[] = []) => [
        ...old,
        { id: tempId, name: newPaymentMethodName }
      ]);
      
      return { previousPaymentMethods, tempId };
    },
    onError: (err, newPaymentMethodName, context) => {
      queryClient.setQueryData(["/api/payment-methods"], context?.previousPaymentMethods);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(["/api/payment-methods"], (old: PaymentMethod[] = []) => 
        old.map(item => item.id === context?.tempId ? data : item)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Success", description: "Payment method created successfully" });
      setNewPaymentMethod("");
    },
  });

  const updatePaymentMethod = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest("PUT", `/api/payment-methods/${id}`, { name });
      return res.json();
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/payment-methods"] });
      const previousPaymentMethods = queryClient.getQueryData(["/api/payment-methods"]);
      
      queryClient.setQueryData(["/api/payment-methods"], (old: PaymentMethod[] = []) => 
        old.map(item => item.id === id ? { ...item, name } : item)
      );
      
      return { previousPaymentMethods };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["/api/payment-methods"], context?.previousPaymentMethods);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/payment-methods"], (old: PaymentMethod[] = []) => 
        old.map(item => item.id === data.id ? data : item)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Success", description: "Payment method updated successfully" });
      setEditingPaymentMethod(null);
      setEditPaymentMethodName("");
    },
  });

  const deletePaymentMethod = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payment-methods/${id}`);
      return { id };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/payment-methods"] });
      const previousPaymentMethods = queryClient.getQueryData(["/api/payment-methods"]);
      
      queryClient.setQueryData(["/api/payment-methods"], (old: PaymentMethod[] = []) => 
        old.filter(item => item.id !== id)
      );
      
      return { previousPaymentMethods };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["/api/payment-methods"], context?.previousPaymentMethods);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Success", description: "Payment method deleted successfully" });
    },
  });

  // Income category mutations with optimistic updates
  const createIncomeCategory = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/income-categories", { name });
      return res.json();
    },
    onMutate: async (newCategoryName) => {
      await queryClient.cancelQueries({ queryKey: ["/api/income-categories"] });
      const previousCategories = queryClient.getQueryData(["/api/income-categories"]);
      
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(["/api/income-categories"], (old: Category[] = []) => [
        ...old,
        { id: tempId, name: newCategoryName }
      ]);
      
      return { previousCategories, tempId };
    },
    onError: (err, newCategoryName, context) => {
      queryClient.setQueryData(["/api/income-categories"], context?.previousCategories);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(["/api/income-categories"], (old: Category[] = []) => 
        old.map(item => item.id === context?.tempId ? data : item)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/income-categories"] });
      toast({ title: "Success", description: "Income category created successfully" });
      setNewIncomeCategory("");
    },
  });

  const updateIncomeCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest("PUT", `/api/income-categories/${id}`, { name });
      return res.json();
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/income-categories"] });
      const previousCategories = queryClient.getQueryData(["/api/income-categories"]);
      
      queryClient.setQueryData(["/api/income-categories"], (old: Category[] = []) => 
        old.map(item => item.id === id ? { ...item, name } : item)
      );
      
      return { previousCategories };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["/api/income-categories"], context?.previousCategories);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/income-categories"], (old: Category[] = []) => 
        old.map(item => item.id === data.id ? data : item)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/income-categories"] });
      toast({ title: "Success", description: "Income category updated successfully" });
      setEditingIncomeCategory(null);
      setEditIncomeCategoryName("");
    },
  });

  const deleteIncomeCategory = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/income-categories/${id}`);
      return { id };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/income-categories"] });
      const previousCategories = queryClient.getQueryData(["/api/income-categories"]);
      
      queryClient.setQueryData(["/api/income-categories"], (old: Category[] = []) => 
        old.filter(item => item.id !== id)
      );
      
      return { previousCategories };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["/api/income-categories"], context?.previousCategories);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/income-categories"] });
      toast({ title: "Success", description: "Income category deleted successfully" });
    },
  });

  // Expense category mutations with optimistic updates
  const createExpenseCategory = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/expense-categories", { name });
      return res.json();
    },
    onMutate: async (newCategoryName) => {
      await queryClient.cancelQueries({ queryKey: ["/api/expense-categories"] });
      const previousCategories = queryClient.getQueryData(["/api/expense-categories"]);
      
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(["/api/expense-categories"], (old: Category[] = []) => [
        ...old,
        { id: tempId, name: newCategoryName }
      ]);
      
      return { previousCategories, tempId };
    },
    onError: (err, newCategoryName, context) => {
      queryClient.setQueryData(["/api/expense-categories"], context?.previousCategories);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(["/api/expense-categories"], (old: Category[] = []) => 
        old.map(item => item.id === context?.tempId ? data : item)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      toast({ title: "Success", description: "Expense category created successfully" });
      setNewExpenseCategory("");
    },
  });

  const updateExpenseCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest("PUT", `/api/expense-categories/${id}`, { name });
      return res.json();
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/expense-categories"] });
      const previousCategories = queryClient.getQueryData(["/api/expense-categories"]);
      
      queryClient.setQueryData(["/api/expense-categories"], (old: Category[] = []) => 
        old.map(item => item.id === id ? { ...item, name } : item)
      );
      
      return { previousCategories };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["/api/expense-categories"], context?.previousCategories);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/expense-categories"], (old: Category[] = []) => 
        old.map(item => item.id === data.id ? data : item)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      toast({ title: "Success", description: "Expense category updated successfully" });
      setEditingExpenseCategory(null);
      setEditExpenseCategoryName("");
    },
  });

  const deleteExpenseCategory = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/expense-categories/${id}`);
      return { id };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/expense-categories"] });
      const previousCategories = queryClient.getQueryData(["/api/expense-categories"]);
      
      queryClient.setQueryData(["/api/expense-categories"], (old: Category[] = []) => 
        old.filter(item => item.id !== id)
      );
      
      return { previousCategories };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["/api/expense-categories"], context?.previousCategories);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      toast({ title: "Success", description: "Expense category deleted successfully" });
    },
  });

  // Annual goal mutation with optimistic updates
  const createOrUpdateAnnualGoal = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/annual-profit-goal", {
        goalAmount: amount,
        currency,
        year: fiscalYear,
      });
      return res.json();
    },
    onMutate: async (amount) => {
      await queryClient.cancelQueries({ queryKey: ["/api/annual-profit-goal"] });
      const previousGoal = queryClient.getQueryData(["/api/annual-profit-goal"]);
      
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(["/api/annual-profit-goal"], { 
        id: tempId, 
        goalAmount: amount, 
        currency, 
        year: fiscalYear 
      });
      
      return { previousGoal, tempId };
    },
    onError: (err, amount, context) => {
      queryClient.setQueryData(["/api/annual-profit-goal"], context?.previousGoal);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/annual-profit-goal"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/annual-profit-goal"] });
      toast({ title: "Success", description: "Annual profit goal set successfully" });
      setAnnualGoalAmount("");
    },
  });

  // Handler functions
  const handleSaveSettings = () => {
    updateSettings.mutate({
      currency,
      fiscalStartMonth,
      fiscalYear,
    });
  };

  const handleAddProfitGoal = () => {
    if (!goalAmount) {
      toast({ title: "Error", description: "Please enter a goal amount", variant: "destructive" });
      return;
    }

    createProfitGoal.mutate({
      month: goalMonth,
      year: goalYear,
      goalAmount: parseFloat(goalAmount),
      currency,
    });
  };

  const handleEditProfitGoal = (goal: ProfitGoal) => {
    // Store the goal being edited
    const goalToEdit = goal;
    // Delete the old goal first
    deleteProfitGoal.mutate(goal.id, {
      onSuccess: () => {
        // After successful deletion, populate the form with the goal's data
        setGoalMonth(goalToEdit.month);
        setGoalYear(goalToEdit.year);
        setGoalAmount(goalToEdit.goalAmount.toString());
        toast({ 
          title: "Goal loaded for editing", 
          description: "The goal has been loaded into the form. Update the values and click 'Add Goal' to save changes." 
        });
      },
      onError: (error) => {
        toast({ 
          title: "Error", 
          description: "Failed to load goal for editing", 
          variant: "destructive" 
        });
      }
    });
  };

  const handleAddPaymentMethod = () => {
    if (!newPaymentMethod.trim()) {
      toast({ title: "Error", description: "Please enter a payment method name", variant: "destructive" });
      return;
    }
    createPaymentMethod.mutate(newPaymentMethod);
  };

  const handleAddIncomeCategory = () => {
    if (!newIncomeCategory.trim()) {
      toast({ title: "Error", description: "Please enter an income category name", variant: "destructive" });
      return;
    }
    createIncomeCategory.mutate(newIncomeCategory);
  };

  const handleAddExpenseCategory = () => {
    if (!newExpenseCategory.trim()) {
      toast({ title: "Error", description: "Please enter an expense category name", variant: "destructive" });
      return;
    }
    createExpenseCategory.mutate(newExpenseCategory);
  };

  const handleSetAnnualGoal = () => {
    if (!annualGoalAmount) {
      toast({ title: "Error", description: "Please enter an annual goal amount", variant: "destructive" });
      return;
    }
    createOrUpdateAnnualGoal.mutate(parseFloat(annualGoalAmount));
  };

  const startEditPaymentMethod = (method: PaymentMethod) => {
    setEditingPaymentMethod(method.id);
    setEditPaymentMethodName(method.name);
  };

  const startEditIncomeCategory = (category: Category) => {
    setEditingIncomeCategory(category.id);
    setEditIncomeCategoryName(category.name);
  };

  const startEditExpenseCategory = (category: Category) => {
    setEditingExpenseCategory(category.id);
    setEditExpenseCategoryName(category.name);
  };

  const cancelEditPaymentMethod = () => {
    setEditingPaymentMethod(null);
    setEditPaymentMethodName("");
  };

  const cancelEditIncomeCategory = () => {
    setEditingIncomeCategory(null);
    setEditIncomeCategoryName("");
  };

  const cancelEditExpenseCategory = () => {
    setEditingExpenseCategory(null);
    setEditExpenseCategoryName("");
  };

  // Calculate total annual goal from monthly goals
  const totalAnnualGoal = (profitGoals || []).reduce((total: number, goal: ProfitGoal) => {
    if (goal.year === fiscalYear) {
      return total + goal.goalAmount;
    }
    return total;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Setup</h1>
        <p className="text-muted-foreground">Configure financial categories, payment methods, and system settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Settings Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Configure currency, fiscal year, and other global settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currency" className="text-xs uppercase tracking-wide">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency" className="mt-2" data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fiscal-start-month" className="text-xs uppercase tracking-wide">Fiscal Start Month</Label>
                <Select value={fiscalStartMonth.toString()} onValueChange={(v) => setFiscalStartMonth(parseInt(v))}>
                  <SelectTrigger id="fiscal-start-month" className="mt-2" data-testid="select-fiscal-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fiscal-year" className="text-xs uppercase tracking-wide">Fiscal Year</Label>
                <Select value={fiscalYear.toString()} onValueChange={(v) => setFiscalYear(parseInt(v))}>
                  <SelectTrigger id="fiscal-year" className="mt-2" data-testid="select-fiscal-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSaveSettings} disabled={updateSettings.isPending} data-testid="button-save-settings">
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Annual Profit Goal */}
        <Card>
          <CardHeader>
            <CardTitle>Annual Profit Goal</CardTitle>
            <CardDescription>Set your overall profit target for the fiscal year</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="annual-goal-amount" className="text-xs uppercase tracking-wide">Goal Amount</Label>
                <Input
                  id="annual-goal-amount"
                  type="number"
                  placeholder="Enter annual goal amount"
                  value={annualGoalAmount}
                  onChange={(e) => setAnnualGoalAmount(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSetAnnualGoal} disabled={createOrUpdateAnnualGoal.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Set Annual Goal
                </Button>
              </div>
            </div>
            {totalAnnualGoal > 0 && (
              <div className="bg-muted/30 p-4 rounded-md">
                <p className="text-sm font-medium">Total from Monthly Goals: {currency} ${totalAnnualGoal.toLocaleString()}</p>
              </div>
            )}
            {annualProfitGoal && (
              <div className="bg-primary/10 p-4 rounded-md">
                <p className="text-sm font-medium text-primary">
                  Current Annual Goal: {annualProfitGoal.currency} ${annualProfitGoal.goalAmount.toLocaleString()} for {annualProfitGoal.year}
                </p>
              </div>
            ) || null}
          </CardContent>
        </Card>

        {/* Monthly Profit Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Profit Goals</CardTitle>
            <CardDescription>Set profit targets for each month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="goal-month" className="text-xs uppercase tracking-wide">Month</Label>
                <Select value={goalMonth.toString()} onValueChange={(v) => setGoalMonth(parseInt(v))}>
                  <SelectTrigger id="goal-month" className="mt-2" data-testid="select-goal-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="goal-year" className="text-xs uppercase tracking-wide">Year</Label>
                <Select value={goalYear.toString()} onValueChange={(v) => setGoalYear(parseInt(v))}>
                  <SelectTrigger id="goal-year" className="mt-2" data-testid="select-goal-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label
                    htmlFor="goal-amount"
                    className="text-xs uppercase tracking-wide whitespace-nowrap"
                  >
                    Goal Amount
                  </Label>
                  <Input
                    id="goal-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    className="mt-2"
                    data-testid="input-goal-amount"
                  />
                </div>
                <Button
                  onClick={handleAddProfitGoal}
                  disabled={createProfitGoal.isPending}
                  className="mt-6"
                  data-testid="button-add-goal"
                  aria-label="Add Goal"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {profitGoals && profitGoals.length > 0 ? (
              <div className="border border-border rounded-md mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wide">Month</TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">Year</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide">Goal Amount</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitGoals.map((goal: ProfitGoal, index: number) => (
                      <TableRow key={goal.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell>{MONTHS.find(m => m.value === goal.month)?.label}</TableCell>
                        <TableCell>{goal.year}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {goal.currency} ${goal.goalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditProfitGoal(goal)}
                              disabled={deleteProfitGoal.isPending}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteProfitGoal.mutate(goal.id)}
                              disabled={deleteProfitGoal.isPending}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Configure available payment methods</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="New payment method"
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddPaymentMethod} disabled={createPaymentMethod.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {paymentMethods && paymentMethods.length > 0 ? (
              <div className="border border-border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wide">Name</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods.map((method: PaymentMethod, index: number) => (
                      <TableRow key={method.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">
                          {editingPaymentMethod === method.id ? (
                            <Input
                              value={editPaymentMethodName}
                              onChange={(e) => setEditPaymentMethodName(e.target.value)}
                              className="w-full"
                            />
                          ) : (
                            method.name
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {editingPaymentMethod === method.id ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updatePaymentMethod.mutate({ id: method.id, name: editPaymentMethodName })}
                                  disabled={updatePaymentMethod.isPending}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelEditPaymentMethod}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditPaymentMethod(method)}
                                  disabled={editingPaymentMethod !== null}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deletePaymentMethod.mutate(method.id)}
                                  disabled={deletePaymentMethod.isPending}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Income Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Income Categories</CardTitle>
            <CardDescription>Manage income categorization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="New income category"
                value={newIncomeCategory}
                onChange={(e) => setNewIncomeCategory(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddIncomeCategory} disabled={createIncomeCategory.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {incomeCategories && incomeCategories.length > 0 ? (
              <div className="border border-border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wide">Name</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeCategories.map((category: Category, index: number) => (
                      <TableRow key={category.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">
                          {editingIncomeCategory === category.id ? (
                            <Input
                              value={editIncomeCategoryName}
                              onChange={(e) => setEditIncomeCategoryName(e.target.value)}
                              className="w-full"
                            />
                          ) : (
                            category.name
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {editingIncomeCategory === category.id ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateIncomeCategory.mutate({ id: category.id, name: editIncomeCategoryName })}
                                  disabled={updateIncomeCategory.isPending}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelEditIncomeCategory}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditIncomeCategory(category)}
                                  disabled={editingIncomeCategory !== null}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteIncomeCategory.mutate(category.id)}
                                  disabled={deleteIncomeCategory.isPending}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>Manage expense categorization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="New expense category"
                value={newExpenseCategory}
                onChange={(e) => setNewExpenseCategory(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddExpenseCategory} disabled={createExpenseCategory.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {expenseCategories && expenseCategories.length > 0 ? (
              <div className="border border-border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs uppercase tracking-wide">Name</TableHead>
                      <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseCategories.map((category: Category, index: number) => (
                      <TableRow key={category.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">
                          {editingExpenseCategory === category.id ? (
                            <Input
                              value={editExpenseCategoryName}
                              onChange={(e) => setEditExpenseCategoryName(e.target.value)}
                              className="w-full"
                            />
                          ) : (
                            category.name
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {editingExpenseCategory === category.id ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateExpenseCategory.mutate({ id: category.id, name: editExpenseCategoryName })}
                                  disabled={updateExpenseCategory.isPending}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelEditExpenseCategory}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditExpenseCategory(category)}
                                  disabled={editingExpenseCategory !== null}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteExpenseCategory.mutate(category.id)}
                                  disabled={deleteExpenseCategory.isPending}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}