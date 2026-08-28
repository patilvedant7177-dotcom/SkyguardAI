import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeseriesResponse } from "../../types/api";
import { formatClockTime } from "../../lib/format";
import { cn } from "../../lib/utils";

type ParamKey = "temperature" | "pressure" | "humidity";

const PARAM_CONFIG: Record<ParamKey, { label: string; unit: string; color: string }> = {
  temperature: { label: "Temperature", unit: "°C", color: "#f5a524" },
  pressure: { label: "Pressure", unit: "hPa", color: "#4f8dfd" },
  humidity: { label: "Humidity", unit: "%", color: "#34d399" },
};

interface TelemetryChartProps {
  data: TimeseriesResponse;
}

export function TelemetryChart({ data }: TelemetryChartProps) {
  const [visible, setVisible] = useState<Record<ParamKey, boolean>>({
    temperature: true,
    pressure: true,
    humidity: true,
  });

  const chartData = useMemo(
    () =>
      data.points.map((p) => ({
        ...p,
        label: formatClockTime(p.timestamp),
      })),
    [data.points],
  );

  const toggle = (key: ParamKey) =>
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(PARAM_CONFIG) as ParamKey[]).map((key) => {
          const config = PARAM_CONFIG[key];
          const active = visible[key];
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-border-strong bg-white/[0.06] text-ink"
                  : "border-border-soft text-ink-faint hover:text-ink-muted",
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: active ? config.color : "var(--color-ink-faint)" }}
                aria-hidden="true"
              />
              {config.label} ({config.unit})
            </button>
          );
        })}
      </div>

      {data.anomaly_windows.length > 0 && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-status-fault">
          <span className="inline-block h-2 w-3 rounded-sm bg-status-fault/25" aria-hidden="true" />
          Shaded region marks a detected anomaly window
        </p>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border-soft)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--color-ink-faint)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border-soft)" }}
            minTickGap={40}
          />
          <YAxis
            stroke="var(--color-ink-faint)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-panel)",
              border: "1px solid var(--color-border-soft)",
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-ink-muted)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-ink-muted)" }} />

          {data.anomaly_windows.map((window) => {
            const startLabel = formatClockTime(window.start);
            const endLabel = formatClockTime(window.end);
            return (
              <ReferenceArea
                key={window.alert_id + window.start}
                x1={startLabel}
                x2={endLabel}
                fill="var(--color-status-fault)"
                fillOpacity={0.12}
                stroke="var(--color-status-fault)"
                strokeOpacity={0.3}
              />
            );
          })}

          {visible.temperature && (
            <Line
              type="monotone"
              dataKey="temperature"
              name="Temperature (°C)"
              stroke={PARAM_CONFIG.temperature.color}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          )}
          {visible.pressure && (
            <Line
              type="monotone"
              dataKey="pressure"
              name="Pressure (hPa)"
              stroke={PARAM_CONFIG.pressure.color}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          )}
          {visible.humidity && (
            <Line
              type="monotone"
              dataKey="humidity"
              name="Humidity (%)"
              stroke={PARAM_CONFIG.humidity.color}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
