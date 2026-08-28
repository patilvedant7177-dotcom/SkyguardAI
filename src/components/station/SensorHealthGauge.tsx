import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { SensorHealth } from "../../types/api";
import { formatDateTime } from "../../lib/format";
import { cn } from "../../lib/utils";

const trendConfig = {
  improving: { icon: TrendingUp, color: "text-status-normal", label: "Improving" },
  stable: { icon: Minus, color: "text-ink-muted", label: "Stable" },
  degrading: { icon: TrendingDown, color: "text-status-fault", label: "Degrading" },
} as const;

function gaugeColor(score: number) {
  if (score >= 75) return "#34d399";
  if (score >= 45) return "#f5a524";
  return "#f87171";
}

export function SensorHealthGauge({ health }: { health: SensorHealth }) {
  const trend = trendConfig[health.trend];
  const TrendIcon = trend.icon;
  const color = gaugeColor(health.health_score);

  const data = [{ name: "health", value: health.health_score, fill: color }];

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[110px] w-[110px] shrink-0">
        <RadialBarChart
          width={110}
          height={110}
          cx={55}
          cy={55}
          innerRadius={40}
          outerRadius={52}
          barSize={10}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: "rgba(255,255,255,0.06)" }} dataKey="value" cornerRadius={8} />
        </RadialBarChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono-data text-xl font-semibold text-ink">{health.health_score}</span>
          <span className="text-[10px] text-ink-faint">/ 100</span>
        </div>
      </div>

      <div className="min-w-0">
        <div className={cn("flex items-center gap-1.5 text-sm font-medium", trend.color)}>
          <TrendIcon className="h-4 w-4" aria-hidden="true" />
          {trend.label} trend
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          {health.maintenance_forecast_days === null
            ? "No maintenance predicted"
            : `Service likely needed in ${health.maintenance_forecast_days} day${health.maintenance_forecast_days === 1 ? "" : "s"}`}
        </p>
        {health.last_maintenance_at && (
          <p className="mt-1 text-xs text-ink-faint">
            Last serviced {formatDateTime(health.last_maintenance_at)}
          </p>
        )}
      </div>
    </div>
  );
}
