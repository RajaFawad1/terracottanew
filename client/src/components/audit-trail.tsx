import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
  changes?: { field: string; before: string; after: string }[];
}

interface AuditTrailProps {
  logs: AuditLog[];
}

export function AuditTrail({ logs }: AuditTrailProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getActionColor = (action: string) => {
    if (action.toLowerCase().includes("create")) return "default";
    if (action.toLowerCase().includes("edit") || action.toLowerCase().includes("update")) return "secondary";
    if (action.toLowerCase().includes("delete")) return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <Card key={log.id} data-testid={`card-audit-${log.id}`}>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-24 text-right">
                <p className="text-xs text-muted-foreground">{log.timestamp.split(" ")[0]}</p>
                <p className="text-xs font-mono text-muted-foreground">{log.timestamp.split(" ")[1]}</p>
              </div>
              
              <div className="flex-shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials(log.user)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-medium text-sm">{log.user}</p>
                  <Badge variant={getActionColor(log.action)} className="text-xs">
                    {log.action}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {log.entity} <span className="font-mono text-xs">#{log.entityId}</span>
                </p>
                {log.details && (
                  <p className="text-sm">{log.details}</p>
                )}
                {log.changes && log.changes.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {log.changes.map((change, idx) => (
                      <div key={idx} className="text-xs bg-muted/50 p-2 rounded">
                        <span className="font-medium">{change.field}:</span>{" "}
                        <span className="text-destructive line-through">{change.before}</span>
                        {" → "}
                        <span className="text-chart-4">{change.after}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
