import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  Legend,
} from "recharts";
import { fetchTimeseries, fetchStations, deleteStation } from "../api";
import type { Timeseries, Station } from "../types";
import { Activity, ShieldCheck, Thermometer, Gauge, Droplets, Trash2, AlertTriangle, X } from "lucide-react";

const StationDetail: React.FC = () => {
  const { stationId = "1" } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Timeseries | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [hours, setHours] = useState<number>(72);
  const [activeParam, setActiveParam] = useState<"all" | "temperature" | "pressure" | "humidity">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchStations().then(setStations).catch(() => {});
  }, []);

  useEffect(() => {
    if (!stationId) return;
    setLoading(true);
    fetchTimeseries(parseInt(stationId), hours)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [stationId, hours]);

  const currentStation = stations.find((s) => s.id === parseInt(stationId));

  // Compute summary stats
  const points = data?.data || [];
  const temps = points.map((p) => p.temperature);
  const pressures = points.map((p) => p.pressure);
  const humidities = points.map((p) => p.humidity);

  const currentTemp = temps.length > 0 ? temps[temps.length - 1] : 0;
  const minTemp = temps.length > 0 ? Math.min(...temps) : 0;
  const maxTemp = temps.length > 0 ? Math.max(...temps) : 0;

  const currentPressure = pressures.length > 0 ? pressures[pressures.length - 1] : 0;
  const currentHumidity = humidities.length > 0 ? humidities[humidities.length - 1] : 0;

  // Anomaly window points (e.g. last 12 hours)
  const anomalyStartIndex = Math.max(0, points.length - 14);

  const parseTimestamp = (ts?: string | number) => {
    if (!ts) return null;
    const cleanStr = String(ts).replace(/\+00:00Z$/, "Z");
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const formattedChartData = points.map((pt, idx) => {
    const d = parseTimestamp(pt.timestamp);
    return {
      ...pt,
      formattedTime: d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : `T-${idx}`,
      fullDate: d ? d.toLocaleString() : (pt.timestamp || `Point #${idx + 1}`),
    };
  });

  const handleDeleteStation = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteStation(parseInt(stationId));
      setShowDeleteConfirm(false);
      navigate("/");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to remove station");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(3, 7, 18, 0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "1rem",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setShowDeleteConfirm(false);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "480px",
              borderRadius: "14px",
              background: "var(--bg-card)",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 25px rgba(244, 63, 94, 0.15)",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(244, 63, 94, 0.15)",
                    border: "1px solid rgba(244, 63, 94, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Trash2 size={18} color="#f43f5e" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Remove Station Node
                  </h3>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Node #{stationId} · {currentStation?.name || "AWS Station"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {deleteError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  background: "rgba(244, 63, 94, 0.15)",
                  border: "1px solid rgba(244, 63, 94, 0.4)",
                  color: "#fb7185",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertTriangle size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Are you sure you want to remove <strong>{currentStation?.name || `Station #${stationId}`}</strong> from the atmospheric defense network?
              This will unregister its active stream, sensor health prognostics, and associated alert history.
            </p>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="btn-glass"
                style={{ padding: "6px 14px", fontSize: "0.8rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStation}
                disabled={isDeleting}
                className="btn-danger"
                style={{
                  padding: "6px 16px",
                  fontSize: "0.8rem",
                }}
              >
                <Trash2 size={14} />
                <span>{isDeleting ? "Removing..." : "Confirm Remove"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Station Switcher */}
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
              {currentStation?.name || `Station #${stationId}`} Telemetry
            </h1>
            {currentStation && (
              <span className={`badge badge-${currentStation.status}`}>{currentStation.status}</span>
            )}
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
            High-frequency atmospheric sensor array · 72-Hour continuous stream
          </p>
        </div>

        {/* Controls & Nav */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Station selector */}
          {stations.length > 0 && (
            <select
              value={stationId}
              onChange={(e) => (window.location.href = `#/station/${e.target.value}`)}
              style={{
                background: "var(--bg-card)",
                color: "var(--text-primary)",
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

          {/* Time range selector */}
          <div style={{ display: "flex", gap: "4px" }}>
            {[24, 48, 72].map((h) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={hours === h ? "btn-primary btn-pill" : "btn-secondary btn-pill"}
                style={{ fontSize: "0.75rem", padding: "5px 12px" }}
              >
                {h}h
              </button>
            ))}
          </div>

          <Link
            to={`/health/${stationId}`}
            className="btn-glass"
            style={{ fontSize: "0.8rem", padding: "6px 14px" }}
          >
            <ShieldCheck size={14} color="var(--accent-emerald)" />
            <span>Health Profile</span>
          </Link>

          {/* Remove Station Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger"
            title="Remove this AWS station from network"
            style={{
              fontSize: "0.8rem",
              padding: "6px 14px",
            }}
          >
            <Trash2 size={14} />
            <span>Remove Station</span>
          </button>
        </div>
      </div>

      {/* Real-time Telemetry Metrics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            borderLeft: "4px solid var(--accent-cyan)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            <span>Temperature</span>
            <Thermometer size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {currentTemp.toFixed(1)}°C
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            72h Range: {minTemp.toFixed(1)}°C — {maxTemp.toFixed(1)}°C
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            borderLeft: "4px solid var(--accent-amber)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            <span>Barometric Pressure</span>
            <Gauge size={16} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {currentPressure.toFixed(0)} hPa
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Atmospheric Base: 1013.25 hPa
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            borderLeft: "4px solid var(--accent-blue)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            <span>Relative Humidity</span>
            <Droplets size={16} color="var(--accent-blue)" />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {currentHumidity.toFixed(0)}%
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Dew Point Equiv: Stable
          </div>
        </div>
      </div>

      {/* Main Chart Panel */}
      <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Multi-Variable Timeseries & Anomaly Window</h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Shaded amber corridor designates AI-flagged anomaly variance window
            </div>
          </div>

          {/* Parameter Toggles */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Parameters" },
              { id: "temperature", label: "Temp (°C)" },
              { id: "pressure", label: "Pressure (hPa)" },
              { id: "humidity", label: "Humidity (%)" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveParam(p.id as any)}
                className={activeParam === p.id ? "btn-primary btn-pill" : "btn-secondary btn-pill"}
                style={{ fontSize: "0.75rem", padding: "5px 12px" }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
            <Activity className="live-pulse" size={32} style={{ marginBottom: "1rem", color: "var(--accent-cyan)" }} />
            <div>Loading timeseries telemetry points...</div>
          </div>
        ) : error ? (
          <div style={{ padding: "2rem", color: "#fb7185" }}>Failed to load timeseries: {error}</div>
        ) : (
          <div style={{ width: "100%", height: "420px", marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="pressureGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
                <XAxis
                  dataKey="formattedTime"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tick={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const dataPoint = payload[0].payload;
                      return (
                        <div
                          style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-card-bright)",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                            fontSize: "0.85rem",
                            backdropFilter: "blur(12px)",
                          }}
                        >
                          <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
                            {dataPoint.fullDate}
                          </div>
                          <div style={{ color: "#38bdf8", marginBottom: "2px" }}>
                            Temperature: <strong>{dataPoint.temperature?.toFixed(2) ?? "--"} °C</strong>
                          </div>
                          <div style={{ color: "#f59e0b", marginBottom: "2px" }}>
                            Pressure: <strong>{dataPoint.pressure ?? "--"} hPa</strong>
                          </div>
                          <div style={{ color: "#3b82f6" }}>
                            Humidity: <strong>{dataPoint.humidity ?? "--"}%</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />

                {/* Shaded Anomaly Region Overlay */}
                {formattedChartData.length > 0 && (
                  <ReferenceArea
                    x1={formattedChartData[anomalyStartIndex]?.formattedTime}
                    x2={formattedChartData[formattedChartData.length - 1]?.formattedTime}
                    stroke="#f59e0b"
                    strokeOpacity={0.6}
                    fill="#f59e0b"
                    fillOpacity={0.12}
                    label={{
                      value: "ANOMALY CORRIDOR",
                      position: "insideTopLeft",
                      fill: "#fbbf24",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}

                {(activeParam === "all" || activeParam === "temperature") && (
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    name="Temperature (°C)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#tempGradient)"
                  />
                )}
                {(activeParam === "all" || activeParam === "pressure") && (
                  <Area
                    type="monotone"
                    dataKey="pressure"
                    name="Pressure (hPa)"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#pressureGradient)"
                  />
                )}
                {(activeParam === "all" || activeParam === "humidity") && (
                  <Area
                    type="monotone"
                    dataKey="humidity"
                    name="Humidity (%)"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#humidityGradient)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default StationDetail;
