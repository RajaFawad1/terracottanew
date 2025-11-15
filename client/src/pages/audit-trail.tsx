import { AuditTrail } from "@/components/audit-trail";
import { Button } from "@/components/ui/button";
import { Filter, Download } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const mockLogs = [
  {
    id: "1",
    timestamp: "2024-01-15 10:30",
    user: "John Doe",
    action: "Create",
    entity: "Transaction",
    entityId: "TRX-1234",
    details: "Added new rental income transaction for Property A"
  },
  {
    id: "2",
    timestamp: "2024-01-15 09:15",
    user: "Jane Smith",
    action: "Edit",
    entity: "User",
    entityId: "USR-5678",
    details: "Updated user role and permissions",
    changes: [
      { field: "Role", before: "Member", after: "Admin" },
      { field: "Status", before: "Pending", after: "Active" }
    ]
  },
  {
    id: "3",
    timestamp: "2024-01-14 16:45",
    user: "Michael Brown",
    action: "Delete",
    entity: "Category",
    entityId: "CAT-9012",
    details: "Removed unused expense category"
  },
  {
    id: "4",
    timestamp: "2024-01-14 14:20",
    user: "Sarah Johnson",
    action: "Update",
    entity: "Configuration",
    entityId: "CFG-3456",
    details: "Modified fiscal year settings",
    changes: [
      { field: "Fiscal Year Start", before: "January", after: "April" }
    ]
  },
  {
    id: "5",
    timestamp: "2024-01-13 11:05",
    user: "John Doe",
    action: "Create",
    entity: "User",
    entityId: "USR-7890",
    details: "Created new member account for David Wilson"
  },
  {
    id: "6",
    timestamp: "2024-01-12 15:30",
    user: "Jane Smith",
    action: "Edit",
    entity: "Transaction",
    entityId: "TRX-4567",
    details: "Updated transaction amount and category",
    changes: [
      { field: "Amount", before: "$5,000", after: "$5,200" },
      { field: "Category", before: "Fees", after: "Rent" }
    ]
  },
];

export default function AuditTrailPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState("all");

  const filteredLogs = mockLogs.filter((log) => {
    if (actionFilter !== "all" && !log.action.toLowerCase().includes(actionFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Audit Trail</h1>
          <p className="text-muted-foreground">Complete log of all system changes and user activities</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" data-testid="button-export-logs">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-border rounded-md bg-muted/30">
          <div>
            <Label htmlFor="date-from" className="text-xs uppercase tracking-wide mb-2 block">From Date</Label>
            <Input type="date" id="date-from" data-testid="input-date-from" />
          </div>
          <div>
            <Label htmlFor="date-to" className="text-xs uppercase tracking-wide mb-2 block">To Date</Label>
            <Input type="date" id="date-to" data-testid="input-date-to" />
          </div>
          <div>
            <Label htmlFor="action" className="text-xs uppercase tracking-wide mb-2 block">Action Type</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger id="action" data-testid="select-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="edit">Edit/Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <AuditTrail logs={filteredLogs} />
    </div>
  );
}
