import { WifiOff } from "lucide-react";
import { useStations } from "../../hooks/useStations";
import { StationMap } from "./StationMap";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

export function StationMapPanel() {
  const { data: stations, isLoading, isError, refetch } = useStations();

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader>
        <CardTitle>AWS Network Map</CardTitle>
        {stations && <span className="text-xs text-ink-faint">{stations.length} stations</span>}
      </CardHeader>

      <div className="flex-1 p-3 pt-0">
        {isLoading && <Skeleton className="h-full w-full" />}

        {isError && !isLoading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <WifiOff className="h-6 w-6 text-status-fault" aria-hidden="true" />
            <p className="text-sm text-ink-muted">Couldn't load stations.</p>
            <button
              onClick={() => refetch()}
              className="text-xs font-medium text-signal hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && stations && (
          <div className="h-full w-full overflow-hidden rounded-xl border border-border-soft">
            <StationMap stations={stations} />
          </div>
        )}
      </div>
    </Card>
  );
}
