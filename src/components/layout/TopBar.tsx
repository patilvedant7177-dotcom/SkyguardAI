import { NavLink } from "react-router-dom";
import { Radar, Radio, Wrench, AlertCircle, Satellite } from "lucide-react";
import { useStations } from "../../hooks/useStations";
import { useAlerts } from "../../hooks/useAlerts";
import { useUiStore } from "../../store/uiStore";
import { cn } from "../../lib/utils";

const streamStatusLabel: Record<string, string> = {
  connecting: "Connecting",
  live: "Live",
  reconnecting: "Reconnecting",
  unavailable: "Offline",
};

function KpiPill({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Radar;
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-white/[0.02] px-3 py-1.5">
      <Icon
        className={cn(
          "h-3.5 w-3.5",
          tone === "warning" && "text-status-degrading",
          tone === "danger" && "text-status-fault",
          tone === "default" && "text-ink-muted",
        )}
        aria-hidden="true"
      />
      <span className="font-mono-data text-sm font-medium text-ink">{value}</span>
      <span className="hidden text-xs text-ink-muted lg:inline">{label}</span>
    </div>
  );
}

export function TopBar() {
  const { data: stations } = useStations();
  const { data: alerts } = useAlerts();
  const streamStatus = useUiStore((s) => s.streamStatus);

  const stationsOnline = stations?.filter((s) => s.status !== "offline").length ?? null;
  const activeAlerts = alerts?.filter((a) => a.status === "active").length ?? null;
  // Approximation: stations flagged as degrading or already faulty are the
  // ones a maintenance crew needs to look at next. A dedicated maintenance
  // queue endpoint would replace this once the backend exists.
  const maintenanceDue =
    stations?.filter((s) => s.status === "degrading" || s.status === "fault").length ?? null;

  return (
    <header className="relative border-b border-border-soft glass-panel">
      {/* Signature radar-sweep line — subtle, single animated moment. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className="sg-sweep-line h-full w-1/3 bg-gradient-to-r from-transparent via-signal/70 to-transparent" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-signal/30 bg-signal/10">
              <Satellite className="h-4 w-4 text-signal" aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold leading-none text-ink">SkyGuard AI</p>
              <p className="mt-0.5 text-[11px] leading-none text-ink-faint">AWS Anomaly Detection</p>
            </div>
          </div>

          <nav className="flex items-center gap-1" aria-label="Primary">
            {[
              { to: "/", label: "Overview" },
              { to: "/history", label: "History" },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive ? "bg-white/[0.06] text-ink" : "text-ink-muted hover:text-ink",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-lg border border-border-soft bg-white/[0.02] px-3 py-1.5"
            role="status"
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                streamStatus === "live" && "bg-status-normal sg-live-dot",
                streamStatus === "connecting" && "bg-status-degrading",
                streamStatus === "reconnecting" && "bg-status-degrading",
                streamStatus === "unavailable" && "bg-status-fault",
              )}
              aria-hidden="true"
            />
            <Radio className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
            <span className="text-xs font-medium text-ink-muted">
              {streamStatusLabel[streamStatus]}
            </span>
          </div>

          <KpiPill
            icon={Satellite}
            label="stations online"
            value={stationsOnline === null ? "–" : `${stationsOnline}/${stations?.length ?? 0}`}
          />
          <KpiPill
            icon={AlertCircle}
            label="active alerts"
            value={activeAlerts === null ? "–" : String(activeAlerts)}
            tone={activeAlerts ? "danger" : "default"}
          />
          <KpiPill
            icon={Wrench}
            label="maintenance due"
            value={maintenanceDue === null ? "–" : String(maintenanceDue)}
            tone={maintenanceDue ? "warning" : "default"}
          />
        </div>
      </div>
    </header>
  );
}
