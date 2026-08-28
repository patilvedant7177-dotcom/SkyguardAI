import { ShieldCheck, WifiOff } from "lucide-react";
import { useAlerts } from "../../hooks/useAlerts";
import { AlertCard } from "./AlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

export function LiveAlertsPanel() {
  const { data: alerts, isLoading, isError, refetch } = useAlerts();

  const sorted = alerts
    ? [...alerts].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    : undefined;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Live Alerts</CardTitle>
        {sorted && sorted.length > 0 && (
          <span className="text-xs text-ink-faint">{sorted.length} total</span>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3">
        {isLoading && (
          <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Loading alerts">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] w-full rounded-xl" />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <WifiOff className="h-6 w-6 text-status-fault" aria-hidden="true" />
            <p className="text-sm text-ink-muted">Couldn't load alerts.</p>
            <button
              onClick={() => refetch()}
              className="text-xs font-medium text-signal hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && sorted && sorted.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ShieldCheck className="h-6 w-6 text-status-normal" aria-hidden="true" />
            <p className="text-sm text-ink-muted">No alerts. Network is quiet.</p>
          </div>
        )}

        {!isLoading && !isError && sorted && sorted.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {sorted.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
