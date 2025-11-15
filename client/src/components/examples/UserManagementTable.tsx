import { UserManagementTable } from "../user-management-table";

const mockUsers = [
  {
    id: "1",
    name: "John Doe",
    email: "john@terracotta.com",
    role: "admin" as const,
    status: "active" as const,
    contributions: 250000,
    lastLogin: "2024-01-15 10:30 AM"
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@terracotta.com",
    role: "member" as const,
    status: "active" as const,
    contributions: 150000,
    lastLogin: "2024-01-14 2:15 PM"
  },
  {
    id: "3",
    name: "Michael Brown",
    email: "michael@terracotta.com",
    role: "member" as const,
    status: "active" as const,
    contributions: 180000,
    lastLogin: "2024-01-10 9:45 AM"
  },
  {
    id: "4",
    name: "Sarah Johnson",
    email: "sarah@terracotta.com",
    role: "member" as const,
    status: "inactive" as const,
    contributions: 100000,
    lastLogin: "2023-12-20 4:00 PM"
  },
];

export default function UserManagementTableExample() {
  return (
    <div className="p-6">
      <UserManagementTable
        users={mockUsers}
        onEdit={(id) => console.log("Edit user:", id)}
        onDelete={(id) => console.log("Delete user:", id)}
        onResetPassword={(id) => console.log("Reset password:", id)}
      />
    </div>
  );
}
