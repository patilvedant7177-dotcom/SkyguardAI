import { Link } from "react-router-dom";
import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import type { Alert } from "../../types/api";
import { Badge } from "../ui/Badge";
import { formatConfidence, formatParameter, formatRelativeTime, formatRootCause } from "../../lib/format";
import { useUiStore } from "../../store/uiStore";
import { cn } from "../../lib/utils";

const severityIcon = {
  low: Info,
  medium: AlertTriangle,
  high: AlertOctagon,
} as const;

const statusLabel: Record<Alert["status"], string> = {
  active: "Active",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

export function AlertCard({ alert }: { alert: Alert }) {
  const setHighlightedAlertId = useUiStore((s) => s.setHighlightedAlertId);
  const SeverityIcon = severityIcon[alert.severity];

  return (
    <Link
      to={`/stations/${alert.station_id}`}
      onClick={() => setHighlightedAlertId(alert.id)}
      className={cn(
        "block rounded-xl border border-border-soft bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.045]",
        alert.status === "active" && alert.severity === "high" && "border-status-fault/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <SeverityIcon
            className={cn(
              "h-4 w-4 shrink-0",
              alert.severity === "high" && "text-severity-high",
              alert.severity === "medium" && "text-severity-medium",
              alert.severity === "low" && "text-severity-low",
            )}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-ink">{alert.station_name}</span>
        </div>
        <span className="shrink-0 text-[11px] text-ink-faint">{formatRelativeTime(alert.timestamp)}</span>
      </div>

      <p className="mt-2 text-sm leading-snug text-ink-muted">{alert.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone={alert.severity}>{alert.severity} severity</Badge>
        <Badge tone="neutral">{formatRootCause(alert.root_cause)}</Badge>
        <Badge tone="neutral">{formatConfidence(alert.confidence)} confidence</Badge>
        <Badge tone="neutral">{statusLabel[alert.status]}</Badge>
      </div>

      <p className="mt-2 text-[11px] text-ink-faint">
        Flagged: {alert.parameters_flagged.map(formatParameter).join(", ")}
      </p>
    </Link>
  );
}
