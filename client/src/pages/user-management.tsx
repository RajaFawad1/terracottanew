import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const MONTHS = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];

const YEARS = Array.from({ length: 141 }, (_, i) => 1960 + i);

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["/api/members"],
  });

  const { data: shareSnapshots = [] } = useQuery({
    queryKey: [
      "/api/member-shares",
      ...(selectedMonth ? [selectedMonth] : []),
      ...(selectedYear ? [selectedYear] : []),
    ],
    enabled: !!selectedMonth && !!selectedYear,
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

  const filteredMembers = displayData.filter((member: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member?.firstName?.toLowerCase().includes(searchLower) ||
      member?.lastName?.toLowerCase().includes(searchLower) ||
      member?.memberId?.toLowerCase().includes(searchLower) ||
      member?.email?.toLowerCase().includes(searchLower)
    );
  });

  totalShares = filteredMembers.reduce((sum: number, member: any) => {
    return sum + parseFloat(member?.shares || "0");
  }, 0);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold mb-2">User Management</h1>
          <p className="text-destructive">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage members, shares, and contributions</p>
        </div>
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
              <Label htmlFor="search-members" className="text-xs uppercase tracking-wide">Search</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-members"
                  placeholder="Search by name, member ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
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
              <TableHead className="text-xs uppercase tracking-wide">Member ID</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">First Name</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Last Name</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Email</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Contributions</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Shares</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">% Shares</TableHead>
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
                const memberShares = parseFloat(member?.shares || "0");
                const sharePercentage = totalShares > 0 ? (memberShares / totalShares) * 100 : 0;

                return (
                  <TableRow key={member.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                    <TableCell className="font-medium font-mono">{member.memberId}</TableCell>
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
                      {sharePercentage.toFixed(2)}%
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
    </div>
  );
}
