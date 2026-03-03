import { AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Conflict } from "@/hooks/useConflictDetection";

interface ConflictAlertsProps {
  conflicts: Conflict[];
  isLoading: boolean;
}

export const ConflictAlerts = ({ conflicts, isLoading }: ConflictAlertsProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Verificando conflitos...
      </div>
    );
  }

  if (conflicts.length === 0) return null;

  return (
    <div className="space-y-2">
      {conflicts.map((conflict, idx) => (
        <Alert
          key={idx}
          variant={conflict.severity === "error" ? "destructive" : "default"}
          className={
            conflict.severity === "error"
              ? "border-destructive/50 bg-destructive/10"
              : "border-yellow-500/50 bg-yellow-500/10"
          }
        >
          {conflict.severity === "error" ? (
            <ShieldAlert className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          )}
          <AlertDescription className="text-xs ml-2">
            {conflict.severity === "error" ? "🔴 " : "🟡 "}
            {conflict.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
