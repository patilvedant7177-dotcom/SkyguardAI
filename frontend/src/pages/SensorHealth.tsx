import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchSensorHealth, fetchStations } from "../api";
import type { SensorHealth as SensorHealthData, Station, Trend } from "../types";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Wrench,
  AlertCircle,
  Activity,
  CheckCircle2,
} from "lucide-react";

const getTrendIcon = (trend: Trend) => {
  switch (trend) {
    case "improving":
      return { icon: TrendingUp, color: "#10b981", label: "Improving" };
    case "degrading":
      return { icon: TrendingDown, color: "#f43f5e", label: "Degrading" };
    case "stable":
    default:
      return { icon: Minus, color: "#38bdf8", label: "Stable" };
  }
};

const getHealthScoreColor = (score: number) => {
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#f43f5e";
};

const SensorHealth: React.FC = () => {
  const { stationId = "1" } = useParams<{ stationId: string }>();
  const [health, setHealth] = useState<SensorHealthData | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStations().then(setStations).catch(() => {});
  }, []);

  useEffect(() => {
    if (!stationId) return;
    setLoading(true);
    fetchSensorHealth(parseInt(stationId))
      .then((data) => {
        setHealth(data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [stationId]);

  // Circular gauge calculations
  const score = health?.health_score || 0;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const scoreColor = getHealthScoreColor(score);
  const trendInfo = health ? getTrendIcon(health.trend) : null;
  const TrendIcon = trendInfo ? trendInfo.icon : Minus;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Sensor Health & Reliability
            </h1>
            <span className="badge badge-normal">Station #{stationId}</span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
            Predictive calibration metrics, hardware degradation indices, and maintenance scheduling
          </p>
        </div>

        {/* Station switcher */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {stations.length > 0 && (
            <select
              value={stationId}
              onChange={(e) => (window.location.href = `#/health/${e.target.value}`)}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                color: "#f8fafc",
                border: "1px solid var(--border-card)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.85rem",
              }}
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (#{s.id})
                </option>
              ))}
            </select>
          )}

          <Link
            to={`/station/${stationId}`}
            className="btn-primary"
            style={{ fontSize: "0.8rem", padding: "6px 14px" }}
          >
            <Activity size={14} />
            <span>Station Telemetry</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
          <ShieldCheck className="live-pulse" size={32} style={{ marginBottom: "1rem", color: "var(--accent-emerald)" }} />
          <div>Evaluating hardware telemetry & calibration drifts...</div>
        </div>
      ) : error || !health ? (
        <div className="glass-panel" style={{ padding: "2.5rem", borderColor: "rgba(244, 63, 94, 0.4)", color: "#fb7185" }}>
          <AlertCircle size={24} style={{ marginBottom: "0.5rem" }} />
          <div>{error || `Sensor health record for station #${stationId} not found.`}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "1.5rem" }}>
          {/* Health Score Gauge Panel */}
          <div
            className="glass-panel"
            style={{
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5rem",
              textAlign: "center",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Overall Health Index
            </h2>

            {/* Circular Gauge */}
            <div style={{ position: "relative", width: "200px", height: "200px" }}>
              <svg width="200" height="200" style={{ transform: "rotate(-90deg)" }}>
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="14"
                  fill="transparent"
                />
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  stroke={scoreColor}
                  strokeWidth="14"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{
                    transition: "stroke-dashoffset 1s ease, stroke 0.5s ease",
                    filter: `drop-shadow(0 0 8px ${scoreColor})`,
                  }}
                />
              </svg>

              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "2.8rem", fontWeight: 800, color: "#f8fafc", lineHeight: 1 }}>
                  {score}
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "4px" }}>
                  OUT OF 100
                </span>
              </div>
            </div>

            {/* Health Classification Pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "9999px",
                fontSize: "0.85rem",
                fontWeight: 600,
                background: `rgba(${score >= 80 ? "16, 185, 129" : score >= 50 ? "245, 158, 11" : "244, 63, 94"}, 0.15)`,
                color: scoreColor,
                border: `1px solid ${scoreColor}`,
              }}
            >
              <CheckCircle2 size={14} />
              <span>{score >= 80 ? "OPTIMAL INTEGRITY" : score >= 50 ? "DEGRADATION DETECTED" : "CRITICAL FAULT"}</span>
            </div>
          </div>

          {/* Details & Predictive Maintenance Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* 3 Metric Summary Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              {/* Trend Card */}
              <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  <span>Health Trend</span>
                  <TrendIcon size={16} color={trendInfo?.color} />
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: trendInfo?.color, textTransform: "capitalize" }}>
                  {health.trend}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Sensor drift rate vs baseline
                </div>
              </div>

              {/* Maintenance Forecast Card */}
              <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  <span>Maintenance Forecast</span>
                  <Wrench size={16} color="var(--accent-amber)" />
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f8fafc" }}>
                  {health.maintenance_forecast_days !== null ? `${health.maintenance_forecast_days} Days` : "No Action Needed"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Estimated time to service
                </div>
              </div>

              {/* Last Maintenance Card */}
              <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  <span>Last Maintenance</span>
                  <Calendar size={16} color="var(--accent-blue)" />
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc" }}>
                  {new Date(health.last_maintenance_at).toLocaleDateString()}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {new Date(health.last_maintenance_at).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Hardware Diagnostics Log */}
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Diagnostic Breakdown</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(15, 23, 42, 0.5)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Thermistor Calibration Drift</span>
                  <span style={{ color: "#10b981", fontWeight: 600 }}>+0.04% (Nominal)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(15, 23, 42, 0.5)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Barometric Membrane Tension</span>
                  <span style={{ color: "#10b981", fontWeight: 600 }}>99.2% (Nominal)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(15, 23, 42, 0.5)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Hygrometer Capacitance Drift</span>
                  <span style={{ color: "#38bdf8", fontWeight: 600 }}>Acceptable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorHealth;
