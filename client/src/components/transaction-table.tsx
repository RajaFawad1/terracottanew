import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: string;
  member?: string;
  type: "income" | "expense";
}

interface TransactionTableProps {
  transactions: Transaction[];
  isAdmin?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TransactionTable({ transactions, isAdmin = false, onEdit, onDelete }: TransactionTableProps) {
  return (
    <div className="border border-border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
            <TableHead className="text-xs uppercase tracking-wide">Description</TableHead>
            <TableHead className="text-xs uppercase tracking-wide">Category</TableHead>
            {isAdmin && <TableHead className="text-xs uppercase tracking-wide">Member</TableHead>}
            <TableHead className="text-xs uppercase tracking-wide">Payment</TableHead>
            <TableHead className="text-right text-xs uppercase tracking-wide">Amount</TableHead>
            {isAdmin && <TableHead className="w-12"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction, index) => (
            <TableRow key={transaction.id} className={index % 2 === 0 ? "bg-muted/30" : ""} data-testid={`row-transaction-${transaction.id}`}>
              <TableCell className="text-sm">{transaction.date}</TableCell>
              <TableCell className="font-medium">{transaction.description}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {transaction.category}
                </Badge>
              </TableCell>
              {isAdmin && <TableCell className="text-sm text-muted-foreground">{transaction.member}</TableCell>}
              <TableCell className="text-sm text-muted-foreground">{transaction.paymentMethod}</TableCell>
              <TableCell className={cn(
                "text-right font-mono font-bold",
                transaction.type === "income" ? "text-chart-4" : "text-destructive"
              )} data-testid={`text-amount-${transaction.id}`}>
                {transaction.type === "income" ? "+" : "-"}${transaction.amount.toLocaleString()}
              </TableCell>
              {isAdmin && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-actions-${transaction.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(transaction.id)} data-testid="button-edit">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete?.(transaction.id)}
                        data-testid="button-delete"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
