import React, { useId } from "react";
import { ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";

export interface ConfidenceGaugeProps {
  value: number; // 0 to 1 or 0 to 100
  size?: "sm" | "md" | "lg";
  label?: string;
  sublabel?: string;
  showBreakdown?: boolean;
  breakdown?: {
    statistical?: number;
    temporal_lstm?: number;
    isolation_forest?: number;
    spatial_physics?: number;
  };
  showStatusBadge?: boolean;
  className?: string;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({
  value,
  size = "md",
  label = "Anomaly Confidence",
  sublabel,
  showBreakdown = false,
  breakdown,
  showStatusBadge = true,
  className = "",
}) => {
  // Normalize value between 0 and 100
  const normalizedValue = Math.min(
    100,
    Math.max(0, value <= 1 ? Math.round(value * 100) : Math.round(value))
  );

  // Exact geometric config for perfect center alignment
  const config = {
    sm: {
      width: 104,
      height: 52,
      cx: 52,
      cy: 46,
      radius: 38,
      strokeWidth: 6,
      textY: 27, // Exactly halfway between arch top (8) and baseline (46)
      fontSize: "1.12rem",
      labelSize: "0.64rem",
    },
    md: {
      width: 152,
      height: 76,
      cx: 76,
      cy: 68,
      radius: 56,
      strokeWidth: 9,
      textY: 40, // Halfway between arch top (12) and baseline (68)
      fontSize: "1.65rem",
      labelSize: "0.74rem",
    },
    lg: {
      width: 212,
      height: 104,
      cx: 106,
      cy: 94,
      radius: 80,
      strokeWidth: 12,
      textY: 54, // Halfway between arch top (14) and baseline (94)
      fontSize: "2.3rem",
      labelSize: "0.82rem",
    },
  }[size];

  // Colors & Tiers based on confidence score
  const getTier = (score: number) => {
    if (score >= 90) {
      return {
        label: "VERY HIGH",
        color: "var(--accent-emerald, #10b981)",
        gradientStart: "#10b981",
        gradientEnd: "#06b6d4",
        glow: "rgba(16, 185, 129, 0.45)",
        icon: ShieldCheck,
      };
    }
    if (score >= 75) {
      return {
        label: "HIGH CONFIDENCE",
        color: "var(--accent-cyan, #38bdf8)",
        gradientStart: "#38bdf8",
        gradientEnd: "#3b82f6",
        glow: "rgba(56, 189, 248, 0.45)",
        icon: Sparkles,
      };
    }
    if (score >= 50) {
      return {
        label: "MODERATE",
        color: "var(--accent-amber, #f59e0b)",
        gradientStart: "#fbbf24",
        gradientEnd: "#f59e0b",
        glow: "rgba(245, 158, 11, 0.45)",
        icon: AlertTriangle,
      };
    }
    return {
      label: "LOW / UNCERTAIN",
      color: "var(--accent-rose, #f43f5e)",
      gradientStart: "#f43f5e",
      gradientEnd: "#e11d48",
      glow: "rgba(244, 63, 94, 0.45)",
      icon: AlertTriangle,
    };
  };

  const tier = getTier(normalizedValue);
  const TierIcon = tier.icon;

  const cx = config.cx;
  const cy = config.cy;
  const r = config.radius;

  // Semi-circle perimeter: PI * r
  const arcLength = Math.PI * r;
  const strokeDashoffset = arcLength - (normalizedValue / 100) * arcLength;

  const rawId = useId();
  const gradId = `gauge-grad-${size}-${rawId.replace(/:/g, "")}`;

  // Background arc path (180 deg semi circle from left to right)
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div
      className={`confidence-gauge-container ${className}`}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* SVG Arc Container with Mathematically Centered Number */}
      <div
        style={{
          position: "relative",
          width: config.width,
          height: config.height,
        }}
      >
        <svg
          width={config.width}
          height={config.height}
          viewBox={`0 0 ${config.width} ${config.height}`}
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={tier.gradientStart} />
              <stop offset="100%" stopColor={tier.gradientEnd} />
            </linearGradient>
            <filter id={`glow-${gradId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d={arcPath}
            fill="none"
            stroke="var(--border-card, rgba(255, 255, 255, 0.12))"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />

          {/* Gauge Tick Markers (25%, 50%, 75%) */}
          {size !== "sm" && (
            <>
              {[0.25, 0.5, 0.75].map((pct, i) => {
                const angle = Math.PI * (1 - pct);
                const x1 = cx + (r - config.strokeWidth / 2 - 2) * Math.cos(angle);
                const y1 = cy - (r - config.strokeWidth / 2 - 2) * Math.sin(angle);
                const x2 = cx + (r + config.strokeWidth / 2 + 2) * Math.cos(angle);
                const y2 = cy - (r + config.strokeWidth / 2 + 2) * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--border-card, rgba(255, 255, 255, 0.25))"
                    strokeWidth="1.5"
                  />
                );
              })}
            </>
          )}

          {/* Active Colored Progress Arc */}
          <path
            d={arcPath}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#glow-${gradId})`}
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />

          {/* Perfectly Centered Percentage Value in SVG */}
          <text
            x={cx}
            y={config.textY}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontSize: config.fontSize,
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              fill: "var(--text-primary, #f8fafc)",
              letterSpacing: "-0.03em",
              filter: `drop-shadow(0 0 10px ${tier.glow})`,
            }}
          >
            {normalizedValue}%
          </text>
        </svg>
      </div>

      {/* Label Subtext - Placed cleanly below the arc */}
      {label && (
        <div
          style={{
            fontSize: config.labelSize,
            color: "var(--text-muted, #94a3b8)",
            fontWeight: 700,
            marginTop: "3px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
      )}

      {/* Tier Status Badge */}
      {showStatusBadge && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: size === "sm" ? "2px 6px" : "3px 9px",
            borderRadius: "999px",
            background: `${tier.color}18`,
            border: `1px solid ${tier.color}40`,
            color: tier.color,
            fontSize: size === "sm" ? "0.65rem" : "0.72rem",
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
            marginTop: "6px",
            boxShadow: `0 0 10px ${tier.color}20`,
          }}
        >
          <TierIcon size={size === "sm" ? 10 : 12} />
          <span>{tier.label}</span>
        </div>
      )}

      {sublabel && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--text-secondary)",
            marginTop: "4px",
            textAlign: "center",
          }}
        >
          {sublabel}
        </div>
      )}

      {/* Multi-detector breakdown bars (if provided & enabled) */}
      {showBreakdown && breakdown && (
        <div
          style={{
            width: "100%",
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--border-card)",
          }}
        >
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            Ensemble Consensus Weights
          </div>
          {Object.entries({
            "Spatial Mahalanobis": breakdown.spatial_physics ?? 0.96,
            "Statistical STL": breakdown.statistical ?? 0.94,
            "LSTM Autoencoder": breakdown.temporal_lstm ?? 0.91,
            "Isolation Forest": breakdown.isolation_forest ?? 0.86,
          }).map(([name, weight]) => {
            const pct = Math.round(weight <= 1 ? weight * 100 : weight);
            return (
              <div key={name} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontWeight: 600 }}>
                    {pct}%
                  </span>
                </div>
                <div
                  style={{
                    height: "4px",
                    width: "100%",
                    background: "var(--border-card)",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, var(--accent-cyan), ${tier.color})`,
                      borderRadius: "2px",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
