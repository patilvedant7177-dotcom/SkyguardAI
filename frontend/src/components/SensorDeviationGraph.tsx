import React from "react";
import {
  Thermometer,
  Gauge,
  Droplets,
  Cpu,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface SensorDeviationGraphProps {
  feature: string;
  direction: "increases_anomaly" | "decreases_anomaly";
  contribution?: number;
  observedStr?: string;
  baselineStr?: string;
  deviationStr?: string;
  description?: string;
}

const getParamIcon = (param: string, size = 16) => {
  switch (param.toLowerCase()) {
    case "temperature":
      return <Thermometer size={size} color="#f43f5e" />;
    case "pressure":
      return <Gauge size={size} color="#38bdf8" />;
    case "humidity":
      return <Droplets size={size} color="#34d399" />;
    default:
      return <Cpu size={size} color="#a855f7" />;
  }
};

const parseMetric = (valStr?: string, defaultVal = 0, defaultUnit = "") => {
  if (!valStr) return { num: defaultVal, unit: defaultUnit };
  const match = valStr.match(/([+-]?\d+(?:\.\d+)?)\s*([a-zA-Z%°/]*)/);
  if (match) {
    return {
      num: parseFloat(match[1]),
      unit: match[2] || defaultUnit,
    };
  }
  return { num: defaultVal, unit: defaultUnit };
};

const getSensorScale = (feature: string, baseline: number, observed: number) => {
  const feat = feature.toLowerCase();
  if (feat.includes("humid")) {
    return { min: 0, max: 100, unit: "%", stepLabels: ["0%", "25%", "50%", "75%", "100%"] };
  }
  if (feat.includes("press")) {
    const minVal = Math.floor(Math.min(baseline, observed, 800) / 50) * 50;
    const maxVal = Math.ceil(Math.max(baseline, observed, 1020) / 50) * 50;
    const min = Math.min(minVal, 750);
    const max = Math.max(maxVal, 1050);
    const step = (max - min) / 4;
    return {
      min,
      max,
      unit: "hPa",
      stepLabels: [
        `${min}`,
        `${Math.round(min + step)}`,
        `${Math.round(min + step * 2)}`,
        `${Math.round(min + step * 3)}`,
        `${max}`,
      ],
    };
  }
  if (feat.includes("temp")) {
    const min = Math.floor(Math.min(baseline, observed, 5) / 5) * 5;
    const max = Math.ceil(Math.max(baseline, observed, 35) / 5) * 5;
    const step = (max - min) / 4;
    return {
      min,
      max,
      unit: "°C",
      stepLabels: [
        `${min}°`,
        `${Math.round(min + step)}°`,
        `${Math.round(min + step * 2)}°`,
        `${Math.round(min + step * 3)}°`,
        `${max}°`,
      ],
    };
  }

  // Dynamic fallback
  const minVal = Math.min(baseline, observed);
  const maxVal = Math.max(baseline, observed);
  const pad = Math.max((maxVal - minVal) * 0.2, 10);
  const min = Math.round(minVal - pad);
  const max = Math.round(maxVal + pad);
  return {
    min,
    max,
    unit: "",
    stepLabels: [`${min}`, `${Math.round((min + max) / 2)}`, `${max}`],
  };
};

export const SensorDeviationGraph: React.FC<SensorDeviationGraphProps> = ({
  feature,
  direction,
  observedStr = "98.0%",
  baselineStr = "45.0%",
  deviationStr = "+53.0%",
}) => {
  const isIncrease = direction === "increases_anomaly";

  const observed = parseMetric(observedStr, 90, "%");
  const baseline = parseMetric(baselineStr, 45, "%");
  const scale = getSensorScale(feature, baseline.num, observed.num);

  // Normalize percentages along the scale track
  const clampPct = (val: number) =>
    Math.max(2, Math.min(98, ((val - scale.min) / (scale.max - scale.min)) * 100));

  const baselinePct = clampPct(baseline.num);
  const observedPct = clampPct(observed.num);

  const leftSpan = Math.min(baselinePct, observedPct);
  const spanWidth = Math.max(Math.abs(observedPct - baselinePct), 3);
  const isSpike = observed.num > baseline.num;

  // Percentage difference relative to baseline
  const diffPercent =
    baseline.num !== 0
      ? Math.round(((observed.num - baseline.num) / baseline.num) * 100)
      : 0;

  return (
    <div
      style={{
        background: "rgba(18, 27, 46, 0.75)",
        border: "1px solid var(--border-card)",
        borderRadius: "10px",
        padding: "1rem 1.15rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        transition: "all 0.2s ease",
      }}
    >
      {/* Header: Parameter Name & Direction Pill */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {getParamIcon(feature, 16)}
          </div>
          <span
            style={{
              fontWeight: 700,
              textTransform: "capitalize",
              fontSize: "0.95rem",
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            {feature}
          </span>
          <span
            style={{
              fontSize: "0.68rem",
              padding: "2px 7px",
              borderRadius: "4px",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontWeight: 600,
              background: isIncrease ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)",
              color: isIncrease ? "#fb7185" : "#34d399",
              border: `1px solid ${isIncrease ? "rgba(244, 63, 94, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
            }}
          >
            {isIncrease ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {direction.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Main Dual Layout: Dual Stacked Comparison Bars (Left) + Difference Delta Station (Right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 155px",
          gap: "1.1rem",
          alignItems: "center",
        }}
      >
        {/* ================================================================= */}
        {/* DUAL STACKED COMPARISON BARS CONTAINER                            */}
        {/* ================================================================= */}
        <div
          style={{
            background: "rgba(10, 19, 37, 0.55)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "8px",
            padding: "0.85rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
          }}
        >
          {/* BAR 1: BASELINE (NORMAL) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    background: "#38bdf8",
                    boxShadow: "0 0 6px rgba(56, 189, 248, 0.6)",
                  }}
                />
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>HISTORICAL BASELINE (NOMINAL)</span>
              </div>
              <span style={{ color: "#38bdf8", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {baselineStr}
              </span>
            </div>

            {/* Baseline Track & Bar */}
            <div
              style={{
                width: "100%",
                height: "9px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "5px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${baselinePct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #0284c7, #38bdf8)",
                  borderRadius: "4px",
                  boxShadow: "0 0 8px rgba(56, 189, 248, 0.4)",
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>

          {/* DELTA BRACKET CONNECTOR (Visually bridges the displacement gap) */}
          <div
            style={{
              position: "relative",
              height: "14px",
              margin: "-2px 0",
            }}
          >
            {/* Horizontal dashed bracket line covering the gap */}
            <div
              style={{
                position: "absolute",
                left: `${leftSpan}%`,
                width: `${spanWidth}%`,
                top: "6px",
                height: "2px",
                background: isSpike
                  ? "repeating-linear-gradient(90deg, #f43f5e 0, #f43f5e 4px, transparent 4px, transparent 8px)"
                  : "repeating-linear-gradient(90deg, #38bdf8 0, #38bdf8 4px, transparent 4px, transparent 8px)",
                opacity: 0.85,
              }}
            />
            {/* Left Bracket Tick */}
            <div
              style={{
                position: "absolute",
                left: `${leftSpan}%`,
                top: "2px",
                bottom: "2px",
                width: "2px",
                background: isSpike ? "#f43f5e" : "#38bdf8",
              }}
            />
            {/* Right Bracket Tick */}
            <div
              style={{
                position: "absolute",
                left: `${leftSpan + spanWidth}%`,
                top: "2px",
                bottom: "2px",
                width: "2px",
                background: isSpike ? "#f43f5e" : "#38bdf8",
                transform: "translateX(-2px)",
              }}
            />
          </div>

          {/* BAR 2: OBSERVED (CURRENT ANOMALOUS TELEMETRY) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: isSpike ? "#f43f5e" : "#34d399",
                    boxShadow: `0 0 6px ${isSpike ? "rgba(244, 63, 94, 0.8)" : "rgba(16, 185, 129, 0.8)"}`,
                  }}
                />
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>OBSERVED TELEMETRY (ACTIVE FRONT)</span>
              </div>
              <span style={{ color: isSpike ? "#fb7185" : "#34d399", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                {observedStr}
              </span>
            </div>

            {/* Observed Track & Bar */}
            <div
              style={{
                width: "100%",
                height: "9px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "5px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${observedPct}%`,
                  height: "100%",
                  background: isSpike
                    ? "linear-gradient(90deg, #f43f5e, #fb7185)"
                    : "linear-gradient(90deg, #059669, #34d399)",
                  borderRadius: "4px",
                  boxShadow: `0 0 10px ${isSpike ? "rgba(244, 63, 94, 0.5)" : "rgba(16, 185, 129, 0.5)"}`,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>

          {/* Scale Axis Labels */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.66rem",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              marginTop: "2px",
            }}
          >
            {scale.stepLabels.map((lbl, idx) => (
              <span key={idx}>{lbl}</span>
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* DIFFERENCE DELTA STATION (RIGHT BY ITS SIDE)                      */}
        {/* ================================================================= */}
        <div
          style={{
            background: isSpike ? "rgba(244, 63, 94, 0.08)" : "rgba(56, 189, 248, 0.08)",
            border: `1px solid ${isSpike ? "rgba(244, 63, 94, 0.3)" : "rgba(56, 189, 248, 0.3)"}`,
            borderRadius: "8px",
            padding: "0.85rem 0.9rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            gap: "4px",
            height: "100%",
            boxShadow: `0 4px 16px ${isSpike ? "rgba(244, 63, 94, 0.08)" : "rgba(56, 189, 248, 0.08)"}`,
          }}
        >
          <div
            style={{
              fontSize: "0.64rem",
              textTransform: "uppercase",
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
            }}
          >
            NET VARIANCE DELTA
          </div>

          {/* Big Bold Deviation Value */}
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: isSpike ? "#fb7185" : "#34d399",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              lineHeight: 1.1,
            }}
          >
            {isSpike ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{deviationStr}</span>
          </div>

          {/* Percent variance badge */}
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: "4px",
              background: isSpike ? "rgba(244, 63, 94, 0.18)" : "rgba(56, 189, 248, 0.18)",
              color: isSpike ? "#fb7185" : "#38bdf8",
              marginTop: "2px",
            }}
          >
            {diffPercent > 0 ? `+${diffPercent}%` : `${diffPercent}%`} vs Baseline
          </div>
        </div>
      </div>
    </div>
  );
};
