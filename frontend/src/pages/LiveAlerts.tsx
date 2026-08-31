import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createAlertEventSource, acknowledgeAlert, fetchAlerts } from "../api";
import type { Alert } from "../types";
import { Radio, CheckCircle2, Search, ArrowRight, ShieldAlert, Cpu, Sparkles } from "lucide-react";

const LiveAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<number>>(new Set());
  const [isConnected, setIsConnected] = useState(true);

  // Initial load of alerts from REST + subscribe to SSE
  useEffect(() => {
    fetchAlerts({ limit: 20 })
      .then((initialAlerts) => {
        setAlerts(initialAlerts);
      })
      .catch((err) => console.error("Failed to load initial alerts", err));

    const es = createAlertEventSource((newAlert) => {
      setAlerts((prev) => {
        const filtered = prev.filter((a) => a.id !== newAlert.id);
        return [newAlert, ...filtered].slice(0, 50);
      });
      setIsConnected(true);
    });

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
    };
  }, []);

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlert(id);
      setAcknowledgedIds((prev) => new Set(prev).add(id));
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "acknowledged" as const } : a))
      );
    } catch (err) {
      console.error("Failed to acknowledge alert", err);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesSearch =
      searchTerm === "" ||
      alert.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.station_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.root_cause.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header & Controls */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Live Telemetry Alerts
            </h1>
            <div
              className={`badge ${isConnected ? "badge-normal live-pulse" : "badge-fault"}`}
              style={{ fontSize: "0.7rem" }}
            >
              <Radio size={12} />
              {isConnected ? "SSE STREAM ACTIVE (5s)" : "STREAM DISCONNECTED"}
            </div>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
            Real-time anomaly ingestion engine with automated root-cause classification
          </p>
        </div>

        {/* Search and Filters */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search size={15} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search station or summary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid var(--border-card)",
                borderRadius: "6px",
                padding: "6px 12px 6px 32px",
                color: "#f8fafc",
                fontSize: "0.85rem",
                outline: "none",
                width: "220px",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "4px" }}>
            {["all", "high", "medium", "low"].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={severityFilter === sev ? "btn-primary" : "btn-secondary"}
                style={{ textTransform: "capitalize", fontSize: "0.75rem", padding: "5px 10px" }}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Stream List */}
      {filteredAlerts.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <ShieldAlert size={36} style={{ marginBottom: "0.75rem", color: "var(--accent-cyan)" }} />
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc" }}>No active alerts matching criteria</div>
          <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Listening for real-time telemetry events...</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredAlerts.map((alert, index) => {
            const isAcked = alert.status === "acknowledged" || acknowledgedIds.has(alert.id);
            return (
              <div
                key={`${alert.id}-${index}`}
                className={`glass-panel ${index === 0 ? "flash-item" : ""}`}
                style={{
                  padding: "1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  borderLeft: `4px solid ${
                    alert.severity === "high"
                      ? "var(--accent-rose)"
                      : alert.severity === "medium"
                      ? "var(--accent-amber)"
                      : "var(--accent-blue)"
                  }`,
                }}
              >
                {/* Alert Info */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "280px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                    <span className="badge badge-low" style={{ textTransform: "none" }}>
                      {alert.station_name} (ID: #{alert.station_id})
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        marginLeft: "auto",
                      }}
                    >
                      {new Date(alert.timestamp).toLocaleTimeString()} · {new Date(alert.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "#f8fafc", marginTop: "2px" }}>
                    {alert.summary}
                  </div>

                  {/* Flagged Parameters & Root Cause Tags */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      <Cpu size={13} color="var(--accent-cyan)" />
                      <span>Root Cause:</span>
                      <strong style={{ color: "#e2e8f0" }}>{alert.root_cause.replace("_", " ")}</strong>
                    </div>

                    <div style={{ width: "1px", height: "12px", background: "var(--border-card)" }}></div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      <Sparkles size={13} color="var(--accent-amber)" />
                      <span>Confidence:</span>
                      <strong style={{ color: "#e2e8f0" }}>{(alert.confidence * 100).toFixed(0)}%</strong>
                    </div>

                    <div style={{ width: "1px", height: "12px", background: "var(--border-card)" }}></div>

                    <div style={{ display: "flex", gap: "4px" }}>
                      {alert.parameters_flagged.map((p) => (
                        <span
                          key={p}
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(255,255,255,0.08)",
                            color: "#cbd5e1",
                            textTransform: "capitalize",
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {!isAcked ? (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="btn-secondary"
                      style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                    >
                      <CheckCircle2 size={14} color="var(--accent-emerald)" />
                      <span>Acknowledge</span>
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--accent-emerald)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 600,
                        padding: "6px 10px",
                        background: "rgba(16, 185, 129, 0.1)",
                        borderRadius: "6px",
                      }}
                    >
                      <CheckCircle2 size={13} />
                      Acknowledged
                    </span>
                  )}

                  <Link
                    to={`/why-flagged/${alert.id}`}
                    className="btn-primary"
                    style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                  >
                    <span>Why Flagged?</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveAlerts;
