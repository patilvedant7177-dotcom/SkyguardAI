import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, WifiOff } from "lucide-react";
import { useStations } from "../hooks/useStations";
import { useAlerts } from "../hooks/useAlerts";
import { useExplanation, useSensorHealth, useTimeseries } from "../hooks/useStationDetail";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { StatusDot } from "../components/ui/StatusDot";
import { Skeleton } from "../components/ui/Skeleton";
import { TelemetryChart } from "../components/station/TelemetryChart";
import { SensorHealthGauge } from "../components/station/SensorHealthGauge";
import { ExplanationPanel } from "../components/station/ExplanationPanel";
import { formatDateTime } from "../lib/format";
import { useUiStore } from "../store/uiStore";

function SectionError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <WifiOff className="h-5 w-5 text-status-fault" aria-hidden="true" />
      <p className="text-sm text-ink-muted">Couldn't load {label}.</p>
      <button onClick={onRetry} className="text-xs font-medium text-signal hover:underline">
        Try again
      </button>
    </div>
  );
}

export function StationDetail() {
  const { stationId } = useParams<{ stationId: string }>();
  const { data: stations } = useStations();
  const { data: alerts } = useAlerts();
  const highlightedAlertId = useUiStore((s) => s.highlightedAlertId);
  const setHighlightedAlertId = useUiStore((s) => s.setHighlightedAlertId);

  const station = stations?.find((s) => s.station_id === stationId);

  const timeseries = useTimeseries(stationId);
  const sensorHealth = useSensorHealth(stationId);

  // Prefer the alert the user clicked in from; otherwise fall back to the
  // most recent alert for this station so "Why flagged?" still has content.
  const relevantAlertId = useMemo(() => {
    const highlighted = alerts?.find((a) => a.id === highlightedAlertId && a.station_id === stationId);
    if (highlighted) return highlighted.id;
    const stationAlerts = alerts
      ?.filter((a) => a.station_id === stationId)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return stationAlerts?.[0]?.id;
  }, [alerts, highlightedAlertId, stationId]);

  const explanation = useExplanation(relevantAlertId);

  // Clear the highlight once we've used it, so a later visit to a
  // different station doesn't inherit a stale highlighted alert.
  useEffect(() => {
    return () => setHighlightedAlertId(null);
  }, [setHighlightedAlertId]);

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4 p-4">
      <Link
        to="/"
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to network overview
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            {station ? (
              <>
                <div className="flex items-center gap-2">
                  <StatusDot status={station.status} />
                  <h1 className="font-display text-lg font-semibold text-ink">{station.name}</h1>
                  <Badge tone={station.status}>{station.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-faint">
                  Last reading {formatDateTime(station.last_reading_at)} · {station.station_id}
                </p>
              </>
            ) : (
              <Skeleton className="h-7 w-56" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>72-Hour Telemetry</CardTitle>
        </CardHeader>
        <CardContent>
          {timeseries.isLoading && <Skeleton className="h-[320px] w-full" />}
          {timeseries.isError && (
            <SectionError label="telemetry" onRetry={() => timeseries.refetch()} />
          )}
          {timeseries.data && <TelemetryChart data={timeseries.data} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Why Flagged?</CardTitle>
          </CardHeader>
          <CardContent>
            {!relevantAlertId && (
              <p className="py-6 text-center text-sm text-ink-muted">
                No recent alerts for this station.
              </p>
            )}
            {relevantAlertId && explanation.isLoading && (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
            {relevantAlertId && explanation.isError && (
              <SectionError label="explanation" onRetry={() => explanation.refetch()} />
            )}
            {explanation.data && <ExplanationPanel explanation={explanation.data} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sensor Health</CardTitle>
          </CardHeader>
          <CardContent>
            {sensorHealth.isLoading && <Skeleton className="h-[110px] w-full" />}
            {sensorHealth.isError && (
              <SectionError label="sensor health" onRetry={() => sensorHealth.refetch()} />
            )}
            {sensorHealth.data && <SensorHealthGauge health={sensorHealth.data} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
