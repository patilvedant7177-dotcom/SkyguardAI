import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchExplanation, fetchAlerts, acknowledgeAlert } from "../api";
import type { Explanation, Alert } from "../types";
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Cpu,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
} from "lucide-react";

const WhyFlagged: React.FC = () => {
  const { alertId = "101" } = useParams<{ alertId: string }>();
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAcked, setIsAcked] = useState(false);

  useEffect(() => {
    fetchAlerts().then(setAlerts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!alertId) return;
    setLoading(true);
    fetchExplanation(parseInt(alertId))
      .then((data) => {
        setExplanation(data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [alertId]);

  const currentAlert = alerts.find((a) => a.id === parseInt(alertId));

  const handleAcknowledge = async () => {
    if (!alertId) return;
    try {
      await acknowledgeAlert(parseInt(alertId));
      setIsAcked(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header with Alert Switcher */}
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
              Anomaly Diagnostics & Explainability
            </h1>
            <span className="badge badge-medium">Alert #{alertId}</span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
            Feature attribution, directional influence, and synthetic root-cause analysis
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {alerts.length > 0 && (
            <select
              value={alertId}
              onChange={(e) => (window.location.href = `#/why-flagged/${e.target.value}`)}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                color: "#f8fafc",
                border: "1px solid var(--border-card)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.85rem",
              }}
            >
              {alerts.map((a) => (
                <option key={a.id} value={a.id}>
                  Alert #{a.id} — {a.summary.slice(0, 30)}...
                </option>
              ))}
            </select>
          )}

          {!isAcked ? (
            <button
              onClick={handleAcknowledge}
              className="btn-secondary"
              style={{ fontSize: "0.8rem", padding: "6px 12px" }}
            >
              <CheckCircle2 size={14} color="var(--accent-emerald)" />
              <span>Acknowledge</span>
            </button>
          ) : (
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--accent-emerald)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={14} />
              Acknowledged
            </span>
          )}

          {currentAlert && (
            <Link
              to={`/station/${currentAlert.station_id}`}
              className="btn-primary"
              style={{ fontSize: "0.8rem", padding: "6px 12px" }}
            >
              <Activity size={14} />
              <span>View Telemetry</span>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
          <Sparkles className="live-pulse" size={32} style={{ marginBottom: "1rem", color: "var(--accent-amber)" }} />
          <div>Computing SHAP attribution and narrative synthesis...</div>
        </div>
      ) : error || !explanation ? (
        <div className="glass-panel" style={{ padding: "2.5rem", borderColor: "rgba(244, 63, 94, 0.4)", color: "#fb7185" }}>
          <AlertTriangle size={24} style={{ marginBottom: "0.5rem" }} />
          <div>{error || `Explanation for Alert #${alertId} not available in registry.`}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
          {/* Left Column: Feature Contribution Bars */}
          <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                <Cpu size={18} color="var(--accent-cyan)" />
                Top Feature Attributions
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                Relative contribution weight and directional impact on the anomaly score
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {explanation.top_features.map((feat, idx) => {
                const isIncrease = feat.direction === "increases_anomaly";
                const percentage = Math.round(feat.contribution * 100);
                return (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "8px",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 600, textTransform: "capitalize", fontSize: "0.95rem" }}>
                          {feat.feature}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            background: isIncrease ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)",
                            color: isIncrease ? "#fb7185" : "#34d399",
                            border: `1px solid ${isIncrease ? "rgba(244, 63, 94, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                          }}
                        >
                          {isIncrease ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {feat.direction.replace("_", " ")}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: "1rem", color: isIncrease ? "#fb7185" : "#38bdf8" }}>
                        {percentage}%
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        background: "rgba(255, 255, 255, 0.08)",
                        borderRadius: "9999px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: "100%",
                          background: isIncrease
                            ? "linear-gradient(90deg, #f43f5e, #e11d48)"
                            : "linear-gradient(90deg, #38bdf8, #0284c7)",
                          borderRadius: "9999px",
                          transition: "width 0.8s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: AI Diagnostic Narrative & Context */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Narrative Box */}
            <div
              className="glass-panel"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                borderTop: "3px solid var(--accent-amber)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} color="var(--accent-amber)" />
                <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Automated Diagnostic Narrative</h2>
              </div>

              <div
                style={{
                  background: "rgba(245, 158, 11, 0.06)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                  color: "#fde68a",
                }}
              >
                "{explanation.narrative}"
              </div>

              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileText size={13} />
                <span>Generated by Skyguard Root-Cause Classifier v2.4</span>
              </div>
            </div>

            {/* Quick Context Card */}
            {currentAlert && (
              <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Associated Alert Snapshot
                </h3>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#f8fafc" }}>
                  {currentAlert.summary}
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <span className={`badge badge-${currentAlert.severity}`}>{currentAlert.severity}</span>
                  <span className="badge badge-low">Station: {currentAlert.station_name}</span>
                  <span className="badge badge-low">Status: {currentAlert.status}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WhyFlagged;
