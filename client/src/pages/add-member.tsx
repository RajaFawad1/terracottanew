import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Edit, Trash, Ban } from "lucide-react";
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

export default function AddMember() {
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

  // Form state for add member
  const [addMemberForm, setAddMemberForm] = useState({
    username: "",
    password: "",
    role: "member" as "admin" | "member",
    firstName: "",
    lastName: "",
    joinDate: "",
    email: "",
    phone: "",
  });

  // Form state for edit member
  const [editMemberForm, setEditMemberForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Filter members
  const filteredMembers = members.filter((member: any) => {
    // Filter by date if month and year are selected
    if (selectedMonth && selectedYear) {
      if (member.joinDate) {
        try {
          const joinDate = new Date(member.joinDate);
          const joinMonth = joinDate.getMonth() + 1;
          const joinYear = joinDate.getFullYear();
          if (joinMonth !== selectedMonth || joinYear !== selectedYear) {
            return false;
          }
        } catch (error) {
          // Handle invalid dates gracefully
          console.warn(`Invalid date for member ${member.id}:`, member.joinDate);
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
        role: "member",
        firstName: "",
        lastName: "",
        joinDate: "",
        email: "",
        phone: "",
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
      joinDate: addMemberForm.joinDate ? new Date(addMemberForm.joinDate) : new Date(),
    });
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setEditMemberForm({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      phone: member.phone || "",
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
      },
    });
  };

  const handleDeactivateMember = async (member: any) => {
    const userId = member.userId || member.user_id;
    if (!userId) {
      toast({ 
        title: "Error", 
        description: "Cannot deactivate member: user ID not found", 
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

  // Handle month selection change
  const handleMonthChange = (value: string) => {
    setSelectedMonth(value === "all" ? null : parseInt(value, 10));
  };

  // Handle year selection change
  const handleYearChange = (value: string) => {
    setSelectedYear(value === "all" ? null : parseInt(value, 10));
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Add Member</h1>
          <p className="text-destructive">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Add Member</h1>
          <p className="text-muted-foreground">Manage members and their information</p>
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
                onValueChange={handleMonthChange}
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
                onValueChange={handleYearChange}
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
            <div className="md:col-span-2">
              <Label htmlFor="search-members" className="text-xs uppercase tracking-wide font-semibold">Search</Label>
              <div className="relative mt-2 group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary group-focus-within:text-chart-2 transition-colors duration-200">
                  <Search className="h-4 w-4" />
                </div>
                <Input
                  id="search-members"
                  placeholder="Search by name, member ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full bg-background/80 border-[#003153]/30 focus-visible:border-[#003153]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{filteredMembers.length}</p>
        </CardContent>
      </Card>

      <div className="border border-border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wide w-16">No</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">First Name</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Last Name</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Email</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Phone</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Join Date</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member: any, index: number) => {
                const joinDate = member.joinDate 
                  ? new Date(member.joinDate).toLocaleDateString() 
                  : "N/A";
                
                return (
                  <TableRow key={member.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>{member.firstName}</TableCell>
                    <TableCell>{member.lastName}</TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                    <TableCell>{member.phone || "N/A"}</TableCell>
                    <TableCell>{joinDate}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditMember(member)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivateMember(member)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMember(member)}
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
                onValueChange={(value: "admin" | "member") => 
                  setAddMemberForm({ ...addMemberForm, role: value })
                }
              >
                <SelectTrigger id="add-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
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
              <Label htmlFor="add-joinDate">Join Date *</Label>
              <Input
                id="add-joinDate"
                type="date"
                value={addMemberForm.joinDate}
                onChange={(e) => setAddMemberForm({ ...addMemberForm, joinDate: e.target.value })}
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