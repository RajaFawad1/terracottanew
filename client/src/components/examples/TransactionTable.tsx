import { TransactionTable } from "../transaction-table";

const mockTransactions = [
  {
    id: "1",
    date: "2024-01-15",
    description: "Rental Income - Property A",
    category: "Rent",
    amount: 5200,
    paymentMethod: "Bank Transfer",
    member: "John Doe",
    type: "income" as const
  },
  {
    id: "2",
    date: "2024-01-14",
    description: "Property Maintenance",
    category: "Maintenance",
    amount: 850,
    paymentMethod: "Credit Card",
    member: "Jane Smith",
    type: "expense" as const
  },
  {
    id: "3",
    date: "2024-01-12",
    description: "Investment Returns",
    category: "Dividends",
    amount: 12500,
    paymentMethod: "Bank Transfer",
    member: "Michael Brown",
    type: "income" as const
  },
  {
    id: "4",
    date: "2024-01-10",
    description: "Legal Fees",
    category: "Professional Services",
    amount: 2100,
    paymentMethod: "Check",
    member: "Sarah Johnson",
    type: "expense" as const
  },
];

export default function TransactionTableExample() {
  return (
    <div className="p-6">
      <TransactionTable
        transactions={mockTransactions}
        isAdmin={true}
        onEdit={(id) => console.log("Edit transaction:", id)}
        onDelete={(id) => console.log("Delete transaction:", id)}
      />
    </div>
  );
}
