import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAlerts } from "../api";
import type { Alert } from "../types";
import {
  History as HistoryIcon,
  Search,
  ArrowRight,
  Archive,
} from "lucide-react";

const History: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<"acknowledged" | "resolved" | "all">("acknowledged");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const statusParam = activeTab === "all" ? undefined : activeTab;
    fetchAlerts({ status: statusParam, limit: 50 })
      .then((data) => {
        const historical = activeTab === "all" ? data.filter((a) => a.status !== "active") : data;
        setAlerts(historical);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeTab]);

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
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Alert History Archive
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
            Audit trail of acknowledged and resolved telemetry anomalies across all station nodes
          </p>
        </div>

        {/* Tab Selection */}
        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { id: "acknowledged", label: "Acknowledged" },
            { id: "resolved", label: "Resolved" },
            { id: "all", label: "All Historical" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={activeTab === tab.id ? "btn-primary btn-pill" : "btn-secondary btn-pill"}
              style={{ fontSize: "0.8rem", padding: "6px 14px" }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search historical records..."
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
                width: "240px",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: "4px" }}>Severity:</span>
            {["all", "high", "medium", "low"].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={severityFilter === s ? "btn-primary btn-pill" : "btn-secondary btn-pill"}
                style={{ fontSize: "0.75rem", padding: "4px 10px", textTransform: "capitalize" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Showing {filteredAlerts.length} archived incidents
        </div>
      </div>

      {/* Table / Records View */}
      {loading ? (
        <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
          <HistoryIcon className="live-pulse" size={32} style={{ marginBottom: "1rem", color: "var(--accent-cyan)" }} />
          <div>Querying historical incident database...</div>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: "2rem", borderColor: "rgba(244, 63, 94, 0.4)", color: "#fb7185" }}>
          <div>Failed to fetch historical alerts: {error}</div>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <Archive size={36} style={{ marginBottom: "0.75rem", color: "var(--accent-blue)" }} />
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc" }}>No historical records found</div>
          <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>
            No {activeTab} alerts matching the active filters in this time range.
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflowX: "auto", padding: "0" }}>
          <table style={{ margin: 0, width: "100%", borderCollapse: "collapse", background: "transparent" }}>
            <thead>
              <tr style={{ background: "rgba(15, 23, 42, 0.6)", borderBottom: "1px solid var(--border-card)" }}>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600, border: "none" }}>
                  Incident ID
                </th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600, border: "none" }}>
                  Station
                </th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600, border: "none" }}>
                  Severity
                </th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600, border: "none" }}>
                  Summary & Root Cause
                </th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600, border: "none" }}>
                  Parameters
                </th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600, border: "none" }}>
                  Status
                </th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600, border: "none" }}>
                  Timestamp
                </th>
                <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600, border: "none", textAlign: "right" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(30, 41, 59, 0.4)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 16px", border: "none", fontWeight: 600, color: "var(--accent-cyan)" }}>
                    #{alert.id}
                  </td>
                  <td style={{ padding: "12px 16px", border: "none" }}>
                    <div style={{ fontWeight: 600, color: "#f8fafc" }}>{alert.station_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID: {alert.station_id}</div>
                  </td>
                  <td style={{ padding: "12px 16px", border: "none" }}>
                    <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                  </td>
                  <td style={{ padding: "12px 16px", border: "none", maxWidth: "300px" }}>
                    <div style={{ color: "#f8fafc", fontWeight: 500 }}>{alert.summary}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Cause: <strong style={{ color: "var(--text-secondary)" }}>{alert.root_cause.replace("_", " ")}</strong> ({(alert.confidence * 100).toFixed(0)}% conf)
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", border: "none" }}>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {alert.parameters_flagged.map((p) => (
                        <span
                          key={p}
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(255,255,255,0.06)",
                            color: "#cbd5e1",
                            textTransform: "capitalize",
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", border: "none" }}>
                    <span className={`badge ${alert.status === "resolved" ? "badge-normal" : "badge-medium"}`}>
                      {alert.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", border: "none", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <div>{new Date(alert.timestamp).toLocaleDateString()}</div>
                    <div>{new Date(alert.timestamp).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ padding: "12px 16px", border: "none", textAlign: "right" }}>
                    <Link
                      to={`/why-flagged/${alert.id}`}
                      className="btn-glass btn-pill"
                      style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                    >
                      <span>Explain</span>
                      <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default History;
