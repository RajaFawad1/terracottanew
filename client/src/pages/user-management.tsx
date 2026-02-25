import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Edit, Trash, Ban, MoreHorizontal } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils";

const MONTHS = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];

const YEARS = Array.from({ length: 141 }, (_, i) => 1960 + i);

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/members"],
  });

  const { data: shareSnapshots = [] } = useQuery<any[]>({
    queryKey: [
      "/api/member-shares",
      ...(selectedMonth ? [selectedMonth] : []),
      ...(selectedYear ? [selectedYear] : []),
    ],
    enabled: !!selectedMonth && !!selectedYear,
  });

  // Form state for add member
  const [addMemberForm, setAddMemberForm] = useState({
    username: "",
    password: "",
    role: "member" as "admin" | "member" | "non member",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    contributions: "",
    shares: "",
  });

  // Form state for edit member
  const [editMemberForm, setEditMemberForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    contributions: "",
    shares: "",
  });

  let displayData = members;
  let totalShares = 0;

  if (selectedMonth && selectedYear && shareSnapshots.length > 0) {
    displayData = shareSnapshots.map((snapshot: any) => {
      const member = members.find((m: any) => m.id === snapshot.memberId);
      return {
        ...member,
        shares: snapshot.shares,
        contributions: snapshot.contributions,
      };
    });
  }

  // Filter by date (joinDate within selected month and year) and search term
  const filteredMembers = displayData.filter((member: any) => {
    // Filter by date if month and year are selected
    if (selectedMonth && selectedYear && !shareSnapshots.length) {
      if (member.joinDate) {
        const joinDate = new Date(member.joinDate);
        const joinMonth = joinDate.getMonth() + 1; // getMonth() returns 0-11
        const joinYear = joinDate.getFullYear();
        if (joinMonth !== selectedMonth || joinYear !== selectedYear) {
          return false;
        }
      }
    }

    // Filter by search term
    const searchLower = searchTerm.toLowerCase();
    return (
      member?.firstName?.toLowerCase().includes(searchLower) ||
      member?.lastName?.toLowerCase().includes(searchLower) ||
      member?.memberId?.toLowerCase().includes(searchLower) ||
      member?.email?.toLowerCase().includes(searchLower)
    );
  });

  totalShares = filteredMembers.reduce((sum: number, member: any) => {
    if (member.role === "non member") return sum;
    return sum + parseFloat(member?.shares || "0");
  }, 0);

  // Mutations
  const createMember = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "Member added successfully" });
      setIsAddDialogOpen(false);
      setAddMemberForm({
        username: "",
        password: "",
        role: "member" as "member",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        contributions: "",
        shares: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add member",
        variant: "destructive"
      });
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/members/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Success", description: "Member updated successfully" });
      setIsEditDialogOpen(false);
      setEditingMember(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member",
        variant: "destructive"
      });
    },
  });

  const deactivateMember = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PUT", `/api/users/${userId}/status`, { status: "inactive" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "Member deactivated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate member",
        variant: "destructive"
      });
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/members/${id}`);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "Member deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete member",
        variant: "destructive"
      });
    },
  });

  const handleAddMember = () => {
    if (!addMemberForm.username || !addMemberForm.password || !addMemberForm.firstName ||
      !addMemberForm.lastName || !addMemberForm.email) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    createMember.mutate({
      username: addMemberForm.username,
      password: addMemberForm.password,
      role: addMemberForm.role,
      firstName: addMemberForm.firstName,
      lastName: addMemberForm.lastName,
      email: addMemberForm.email,
      phone: addMemberForm.phone || undefined,
      contributions: addMemberForm.contributions ? parseFloat(addMemberForm.contributions) : 0,
      shares: addMemberForm.shares ? parseFloat(addMemberForm.shares) : 0,
    });
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setEditMemberForm({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      phone: member.phone || "",
      contributions: member.contributions || "0",
      shares: member.shares || "0",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateMember = () => {
    if (!editingMember) return;

    if (!editMemberForm.firstName || !editMemberForm.lastName || !editMemberForm.email) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    updateMember.mutate({
      id: editingMember.id,
      data: {
        firstName: editMemberForm.firstName,
        lastName: editMemberForm.lastName,
        email: editMemberForm.email,
        phone: editMemberForm.phone || undefined,
        contributions: parseFloat(editMemberForm.contributions || "0"),
        shares: parseFloat(editMemberForm.shares || "0"),
      },
    });
  };

  const handleDeactivateMember = async (member: any) => {
    // userId might be named user_id in the database response
    const userId = member.userId || member.user_id;
    if (!userId) {
      toast({
        title: "Error",
        description: "Cannot deactivate member: user ID not found. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }
    deactivateMember.mutate(userId);
  };

  const handleDeleteMember = (member: any) => {
    if (window.confirm(`Are you sure you want to delete ${member.firstName} ${member.lastName}? This action cannot be undone.`)) {
      deleteMember.mutate(member.id);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">User Management</h1>
          <p className="text-destructive">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">User Management</h1>
          <p className="text-muted-foreground">Manage members, shares, and contributions</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter members by month, year, or search term</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="filter-month" className="text-xs uppercase tracking-wide">Month</Label>
              <Select
                value={selectedMonth?.toString() || "all"}
                onValueChange={(v) => setSelectedMonth(v === "all" ? null : parseInt(v))}
              >
                <SelectTrigger id="filter-month" className="mt-2" data-testid="select-filter-month">
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
                <SelectTrigger id="filter-year" className="mt-2" data-testid="select-filter-year">
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
            <div className="md:col-span-2">
              <Label htmlFor="search-members" className="text-xs uppercase tracking-wide font-semibold">Search</Label>
              <div className="relative mt-2 group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#003153] transition-colors duration-200">
                  <Search className="h-4 w-4" />
                </div>
                <Input
                  id="search-members"
                  placeholder="Search by name, member ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/80 border-[#003153]/30 focus-visible:border-[#003153]"
                  data-testid="input-search-members"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-members">
              {filteredMembers.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono" data-testid="text-total-shares">
              {totalShares.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono" data-testid="text-total-contributions">
              ${filteredMembers.reduce((sum: number, m: any) => sum + parseFloat(m?.contributions || "0"), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wide w-16">No</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">First Name</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Last Name</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Email</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Contributions</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Shares</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">% Shares</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member: any, index: number) => {
                const memberShares = parseFloat(member?.shares || "0");
                const sharePercentage = totalShares > 0 ? (memberShares / totalShares) * 100 : 0;

                return (
                  <TableRow key={member.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>{member.firstName}</TableCell>
                    <TableCell>{member.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      ${parseFloat(member.contributions || "0").toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {memberShares.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(sharePercentage, 2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditMember(member)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeactivateMember(member)}>
                            <Ban className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteMember(member)}
                            className="text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedMonth && selectedYear && shareSnapshots.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <p>No share snapshots found for {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
          <p className="text-sm mt-2">Displaying current member data instead</p>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Create a new member account with login credentials
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-username">Username *</Label>
              <Input
                id="add-username"
                value={addMemberForm.username}
                onChange={(e) => setAddMemberForm({ ...addMemberForm, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password *</Label>
              <Input
                id="add-password"
                type="password"
                value={addMemberForm.password}
                onChange={(e) => setAddMemberForm({ ...addMemberForm, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Role *</Label>
              <Select
                value={addMemberForm.role}
                onValueChange={(value: "admin" | "member" | "non member") =>
                  setAddMemberForm({ ...addMemberForm, role: value })
                }
              >
                <SelectTrigger id="add-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="non member">Non Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-firstName">First Name *</Label>
              <Input
                id="add-firstName"
                value={addMemberForm.firstName}
                onChange={(e) => setAddMemberForm({ ...addMemberForm, firstName: e.target.value })}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-lastName">Last Name *</Label>
              <Input
                id="add-lastName"
                value={addMemberForm.lastName}
                onChange={(e) => setAddMemberForm({ ...addMemberForm, lastName: e.target.value })}
                placeholder="Enter last name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                value={addMemberForm.email}
                onChange={(e) => setAddMemberForm({ ...addMemberForm, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                value={addMemberForm.phone}
                onChange={(e) => setAddMemberForm({ ...addMemberForm, phone: e.target.value })}
                placeholder="Enter phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-contributions">Contributions</Label>
              <Input
                id="add-contributions"
                type="number"
                value={addMemberForm.contributions}
                onChange={(e) => setAddMemberForm({ ...addMemberForm, contributions: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-shares">Shares</Label>
              <Input
                id="add-shares"
                type="number"
                value={addMemberForm.shares}
                onChange={(e) => setAddMemberForm({ ...addMemberForm, shares: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={createMember.isPending}>
              {createMember.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update member information
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name *</Label>
              <Input
                id="edit-firstName"
                value={editMemberForm.firstName}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, firstName: e.target.value })}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name *</Label>
              <Input
                id="edit-lastName"
                value={editMemberForm.lastName}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, lastName: e.target.value })}
                placeholder="Enter last name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editMemberForm.email}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editMemberForm.phone}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                placeholder="Enter phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contributions">Contributions</Label>
              <Input
                id="edit-contributions"
                type="number"
                value={editMemberForm.contributions}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, contributions: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-shares">Shares</Label>
              <Input
                id="edit-shares"
                type="number"
                value={editMemberForm.shares}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, shares: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMember} disabled={updateMember.isPending}>
              {updateMember.isPending ? "Updating..." : "Update Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
