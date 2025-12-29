import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuditTrail } from "@/components/audit-trail";
import { Button } from "@/components/ui/button";
import { Filter, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ApiAuditEvent {
  id: string;
  userId: string;
  username?: string | null;
  action: string;
  entity: string;
  entityId: string;
  details?: string | null;
  timestamp: string;
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export default function AuditTrailPage() {
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: auditEvents = [], isLoading, error } = useQuery<ApiAuditEvent[]>({
    queryKey: ["/api/audit-events", actionFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (dateFrom) params.append("startDate", dateFrom);
      if (dateTo) params.append("endDate", dateTo);

      const res = await apiRequest("GET", `/api/audit-events${params.size ? `?${params.toString()}` : ""}`);
      return (await res.json()) as ApiAuditEvent[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Failed to load audit logs",
        description: (error as Error).message || "Please try again later",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const filteredEvents = useMemo(() => {
    const start = dateFrom ? new Date(dateFrom) : null;
    const end = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return auditEvents.filter((event) => {
      if (actionFilter !== "all" && !event.action.toLowerCase().includes(actionFilter.toLowerCase())) {
        return false;
      }

      const eventDate = new Date(event.timestamp);
      if (start && eventDate < start) return false;
      if (end && eventDate > end) return false;

      return true;
    });
  }, [auditEvents, actionFilter, dateFrom, dateTo]);

  const logs = useMemo(
    () =>
      filteredEvents.map((event) => ({
        id: event.id,
        timestamp: formatTimestamp(event.timestamp),
        user: event.username || event.userId,
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        details: event.details ?? undefined,
      })),
    [filteredEvents]
  );

  const handleExport = () => {
    if (!filteredEvents.length) {
      toast({ title: "No logs to export", description: "Adjust filters and try again." });
      return;
    }

    const csvRows = [
      ["Timestamp", "User", "Action", "Entity", "Entity ID", "Details"].join(","),
      ...filteredEvents.map((event) =>
        [
          formatTimestamp(event.timestamp),
          event.username || event.userId,
          event.action,
          event.entity,
          event.entityId,
          (event.details || "").replace(/\n/g, " "),
        ]
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2 bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">Audit Trail</h1>
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
          <Button variant="outline" onClick={handleExport} data-testid="button-export-logs">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-md bg-muted/30">
          <div>
            <Label htmlFor="date-from" className="text-xs uppercase tracking-wide mb-2 block font-semibold">From Date</Label>
            <Input
              type="date"
              id="date-from"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              data-testid="input-date-from"
              className="bg-background/80 border-[#003153]/30 focus-visible:border-[#003153]"
            />
          </div>
          <div>
            <Label htmlFor="date-to" className="text-xs uppercase tracking-wide mb-2 block font-semibold">To Date</Label>
            <Input
              type="date"
              id="date-to"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              data-testid="input-date-to"
              className="bg-background/80 border-[#003153]/30 focus-visible:border-[#003153]"
            />
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
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="ghost"
              onClick={() => {
                setActionFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading audit logs...</p>
      ) : (
        <AuditTrail logs={logs} />
      )}
    </div>
  );
}
