import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Edit, Trash } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const MONTHS = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];

const YEARS = Array.from({ length: 141 }, (_, i) => 1960 + i);

export default function AddShares() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/members"],
  });

  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/share-transactions"],
  });

  // Form state for add share transaction
  const [addTransactionForm, setAddTransactionForm] = useState({
    date: new Date().toISOString().split("T")[0],
    memberId: "",
    contributions: "",
    shares: "",
  });

  // Form state for edit share transaction
  const [editTransactionForm, setEditTransactionForm] = useState({
    date: "",
    memberId: "",
    contributions: "",
    shares: "",
  });

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction: any) => {
    // Filter by date if month and year are selected
    if (selectedMonth && selectedYear) {
      const transactionDate = new Date(transaction.date);
      const transactionMonth = transactionDate.getMonth() + 1;
      const transactionYear = transactionDate.getFullYear();
      if (transactionMonth !== selectedMonth || transactionYear !== selectedYear) {
        return false;
      }
    }

    // Filter by member
    if (selectedMemberId && transaction.memberId !== selectedMemberId) {
      return false;
    }

    // Filter by search term (member name)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const memberName = transaction.memberName?.toLowerCase() || "";
      if (!memberName.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  // Calculate totals
  const totalShares = filteredTransactions.reduce((sum: number, t: any) => {
    return sum + parseFloat(t.shares || "0");
  }, 0);

  const totalContributions = filteredTransactions.reduce((sum: number, t: any) => {
    return sum + parseFloat(t.contributions || "0");
  }, 0);

  // Mutations
  const createTransaction = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/share-transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/share-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/share-price"] });
      toast({ title: "Success", description: "Share transaction added successfully" });
      setIsAddDialogOpen(false);
      setAddTransactionForm({
        date: new Date().toISOString().split("T")[0],
        memberId: "",
        contributions: "",
        shares: "",
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add share transaction", 
        variant: "destructive" 
      });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/share-transactions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/share-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/share-price"] });
      toast({ title: "Success", description: "Share transaction updated successfully" });
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update share transaction", 
        variant: "destructive" 
      });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/share-transactions/${id}`);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/share-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/share-price"] });
      toast({ title: "Success", description: "Share transaction deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete share transaction", 
        variant: "destructive" 
      });
    },
  });

  const handleAddTransaction = () => {
    if (!addTransactionForm.date || !addTransactionForm.memberId || 
        !addTransactionForm.contributions || !addTransactionForm.shares) {
      toast({ 
        title: "Error", 
        description: "Please fill all required fields", 
        variant: "destructive" 
      });
      return;
    }

    createTransaction.mutate({
      date: addTransactionForm.date,
      memberId: addTransactionForm.memberId,
      contributions: parseFloat(addTransactionForm.contributions),
      shares: parseFloat(addTransactionForm.shares),
    });
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditTransactionForm({
      date: transaction.date ? new Date(transaction.date).toISOString().split("T")[0] : "",
      memberId: transaction.memberId || "",
      contributions: transaction.contributions || "0",
      shares: transaction.shares || "0",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTransaction = () => {
    if (!editingTransaction) return;

    if (!editTransactionForm.date || !editTransactionForm.memberId || 
        !editTransactionForm.contributions || !editTransactionForm.shares) {
      toast({ 
        title: "Error", 
        description: "Please fill all required fields", 
        variant: "destructive" 
      });
      return;
    }

    updateTransaction.mutate({
      id: editingTransaction.id,
      data: {
        date: editTransactionForm.date,
        memberId: editTransactionForm.memberId,
        contributions: parseFloat(editTransactionForm.contributions),
        shares: parseFloat(editTransactionForm.shares),
      },
    });
  };

  const handleDeleteTransaction = (transaction: any) => {
    if (window.confirm(`Are you sure you want to delete this share transaction? This action cannot be undone.`)) {
      deleteTransaction.mutate(transaction.id);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Add Shares</h1>
          <p className="text-destructive">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Add Shares</h1>
          <p className="text-muted-foreground">Manage share transactions and allocations</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Share
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter share transactions by month, year, member, or search term</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="filter-month" className="text-xs uppercase tracking-wide">Month</Label>
              <Select
                value={selectedMonth?.toString() || "all"}
                onValueChange={(v) => setSelectedMonth(v === "all" ? null : parseInt(v))}
              >
                <SelectTrigger id="filter-month" className="mt-2">
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-year" className="text-xs uppercase tracking-wide">Year</Label>
              <Select
                value={selectedYear?.toString() || "all"}
                onValueChange={(v) => setSelectedYear(v === "all" ? null : parseInt(v))}
              >
                <SelectTrigger id="filter-year" className="mt-2">
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-member" className="text-xs uppercase tracking-wide">Member</Label>
              <Select
                value={selectedMemberId || "all"}
                onValueChange={(v) => setSelectedMemberId(v === "all" ? null : v)}
              >
                <SelectTrigger id="filter-member" className="mt-2">
                  <SelectValue placeholder="All members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All members</SelectItem>
                  {members.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="search-transactions" className="text-xs uppercase tracking-wide font-semibold">Search</Label>
              <div className="relative mt-2 group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary group-focus-within:text-chart-2 transition-colors duration-200">
                  <Search className="h-4 w-4" />
                </div>
                <Input
                  id="search-transactions"
                  placeholder="Search by member name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full bg-background/80 border-[#003153]/30 focus-visible:border-[#003153]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {totalShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              ${totalContributions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Member Name</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Contributions</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Shares</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No share transactions found
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction: any, index: number) => {
                const transactionDate = transaction.date ? new Date(transaction.date).toLocaleDateString() : "N/A";
                
                return (
                  <TableRow key={transaction.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell>{transactionDate}</TableCell>
                    <TableCell>{transaction.memberName || "Unknown"}</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      ${parseFloat(transaction.contributions || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {parseFloat(transaction.shares || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTransaction(transaction)}
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

      {/* Add Share Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Share Transaction</DialogTitle>
            <DialogDescription>
              Record a new share allocation and contribution
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-date">Date *</Label>
              <Input
                id="add-date"
                type="date"
                value={addTransactionForm.date}
                onChange={(e) => setAddTransactionForm({ ...addTransactionForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-member">Member Name *</Label>
              <Select
                value={addTransactionForm.memberId}
                onValueChange={(value) => setAddTransactionForm({ ...addTransactionForm, memberId: value })}
              >
                <SelectTrigger id="add-member">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-contributions">Contributions *</Label>
              <Input
                id="add-contributions"
                type="number"
                step="0.01"
                value={addTransactionForm.contributions}
                onChange={(e) => setAddTransactionForm({ ...addTransactionForm, contributions: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-shares">Shares *</Label>
              <Input
                id="add-shares"
                type="number"
                step="0.01"
                value={addTransactionForm.shares}
                onChange={(e) => setAddTransactionForm({ ...addTransactionForm, shares: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTransaction} disabled={createTransaction.isPending}>
              {createTransaction.isPending ? "Adding..." : "Add Share"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Share Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Share Transaction</DialogTitle>
            <DialogDescription>
              Update share transaction details
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date *</Label>
              <Input
                id="edit-date"
                type="date"
                value={editTransactionForm.date}
                onChange={(e) => setEditTransactionForm({ ...editTransactionForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-member">Member Name *</Label>
              <Select
                value={editTransactionForm.memberId}
                onValueChange={(value) => setEditTransactionForm({ ...editTransactionForm, memberId: value })}
              >
                <SelectTrigger id="edit-member">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contributions">Contributions *</Label>
              <Input
                id="edit-contributions"
                type="number"
                step="0.01"
                value={editTransactionForm.contributions}
                onChange={(e) => setEditTransactionForm({ ...editTransactionForm, contributions: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-shares">Shares *</Label>
              <Input
                id="edit-shares"
                type="number"
                step="0.01"
                value={editTransactionForm.shares}
                onChange={(e) => setEditTransactionForm({ ...editTransactionForm, shares: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTransaction} disabled={updateTransaction.isPending}>
              {updateTransaction.isPending ? "Updating..." : "Update Share"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

