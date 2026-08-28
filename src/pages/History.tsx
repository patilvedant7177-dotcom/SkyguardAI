import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { useAlerts } from "../hooks/useAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { formatConfidence, formatDateTime, formatRootCause } from "../lib/format";
import type { Alert, AlertStatus, Severity } from "../types/api";
import { useUiStore } from "../store/uiStore";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: (AlertStatus | "all")[] = ["all", "active", "acknowledged", "resolved"];
const SEVERITY_OPTIONS: (Severity | "all")[] = ["all", "low", "medium", "high"];

type DateRange = "all" | "24h" | "7d" | "30d";

function withinRange(alert: Alert, range: DateRange): boolean {
  if (range === "all") return true;
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 30;
  return Date.now() - new Date(alert.timestamp).getTime() <= hours * 60 * 60 * 1000;
}

export function History() {
  const { data: alerts, isLoading, isError, refetch } = useAlerts();
  const navigate = useNavigate();
  const setHighlightedAlertId = useUiStore((s) => s.setHighlightedAlertId);

  const [statusFilter, setStatusFilter] = useState<AlertStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!alerts) return [];
    return alerts
      .filter((a) => statusFilter === "all" || a.status === statusFilter)
      .filter((a) => severityFilter === "all" || a.severity === severityFilter)
      .filter((a) => withinRange(a, dateRange))
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [alerts, statusFilter, severityFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goToStation = (alert: Alert) => {
    setHighlightedAlertId(alert.id);
    navigate(`/stations/${alert.station_id}`);
  };

  const updateFilter = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Historical Alerts</CardTitle>
          {filtered.length > 0 && (
            <span className="text-xs text-ink-faint">{filtered.length} results</span>
          )}
        </CardHeader>

        <CardContent className="flex flex-wrap gap-4 border-b border-border-soft py-3">
          <FilterGroup label="Status">
            {STATUS_OPTIONS.map((option) => (
              <FilterChip
                key={option}
                active={statusFilter === option}
                onClick={() => updateFilter(setStatusFilter)(option)}
              >
                {option}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup label="Severity">
            {SEVERITY_OPTIONS.map((option) => (
              <FilterChip
                key={option}
                active={severityFilter === option}
                onClick={() => updateFilter(setSeverityFilter)(option)}
              >
                {option}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup label="Date range">
            {(["all", "24h", "7d", "30d"] as DateRange[]).map((option) => (
              <FilterChip
                key={option}
                active={dateRange === option}
                onClick={() => updateFilter(setDateRange)(option)}
              >
                {option === "all" ? "All time" : `Last ${option}`}
              </FilterChip>
            ))}
          </FilterGroup>
        </CardContent>

        <CardContent className="p-0">
          {isLoading && (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <WifiOff className="h-5 w-5 text-status-fault" aria-hidden="true" />
              <p className="text-sm text-ink-muted">Couldn't load alert history.</p>
              <button onClick={() => refetch()} className="text-xs font-medium text-signal hover:underline">
                Try again
              </button>
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-ink-muted">
              No alerts match the selected filters.
            </p>
          )}

          {!isLoading && !isError && pageItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-ink-faint">
                    <th className="px-5 py-3 font-medium">Timestamp</th>
                    <th className="px-5 py-3 font-medium">Station</th>
                    <th className="px-5 py-3 font-medium">Severity</th>
                    <th className="px-5 py-3 font-medium">Root cause</th>
                    <th className="px-5 py-3 font-medium">Confidence</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((alert) => (
                    <tr
                      key={alert.id}
                      onClick={() => goToStation(alert)}
                      className="cursor-pointer border-b border-border-soft/60 last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-3 font-mono-data text-xs text-ink-muted">
                        {formatDateTime(alert.timestamp)}
                      </td>
                      <td className="px-5 py-3 text-ink">{alert.station_name}</td>
                      <td className="px-5 py-3">
                        <Badge tone={alert.severity}>{alert.severity}</Badge>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{formatRootCause(alert.root_cause)}</td>
                      <td className="px-5 py-3 font-mono-data text-ink-muted">
                        {formatConfidence(alert.confidence)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone="neutral">{alert.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {!isLoading && !isError && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border-soft px-5 py-3">
            <span className="text-xs text-ink-faint">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
        active
          ? "border-signal/40 bg-signal/10 text-signal"
          : "border-border-soft text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
