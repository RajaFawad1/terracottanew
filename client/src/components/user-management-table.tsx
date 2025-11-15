import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "inactive";
  contributions: number;
  lastLogin: string;
}

interface UserManagementTableProps {
  users: User[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onResetPassword?: (id: string) => void;
}

export function UserManagementTable({ users, onEdit, onDelete, onResetPassword }: UserManagementTableProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="border border-border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs uppercase tracking-wide">User</TableHead>
            <TableHead className="text-xs uppercase tracking-wide">Role</TableHead>
            <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
            <TableHead className="text-right text-xs uppercase tracking-wide">Contributions</TableHead>
            <TableHead className="text-xs uppercase tracking-wide">Last Login</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, index) => (
            <TableRow key={user.id} className={index % 2 === 0 ? "bg-muted/30" : ""} data-testid={`row-user-${user.id}`}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={user.role === "admin" ? "default" : "secondary"} className="capitalize">
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${user.status === "active" ? "bg-chart-4" : "bg-muted-foreground"}`} />
                  <span className="text-sm capitalize">{user.status}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono font-bold" data-testid={`text-contributions-${user.id}`}>
                ${user.contributions.toLocaleString()}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-user-actions-${user.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(user.id)} data-testid="button-edit-user">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onResetPassword?.(user.id)} data-testid="button-reset-password">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete?.(user.id)}
                      data-testid="button-delete-user"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
