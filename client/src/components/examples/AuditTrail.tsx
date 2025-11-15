import { AuditTrail } from "../audit-trail";

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
];

export default function AuditTrailExample() {
  return (
    <div className="p-6">
      <AuditTrail logs={mockLogs} />
    </div>
  );
}
