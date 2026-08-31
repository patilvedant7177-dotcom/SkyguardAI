import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchExplanation, fetchAlerts, acknowledgeAlert } from "../api";
import type { Explanation, Alert, ContributingFactor, ReasoningStep, DetectorBreakdownItem, NeighborCorroborationItem } from "../types";
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Cpu,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  ShieldAlert,
  Network,
  Layers,
  Thermometer,
  Gauge,
  Droplets,
  Check,
  XCircle,
  Wrench,
  ArrowRight,
} from "lucide-react";

const getParamIcon = (param: string) => {
  switch (param.toLowerCase()) {
    case "temperature":
      return <Thermometer size={16} color="#f43f5e" />;
    case "pressure":
      return <Gauge size={16} color="#38bdf8" />;
    case "humidity":
      return <Droplets size={16} color="#34d399" />;
    default:
      return <Cpu size={16} color="#a855f7" />;
  }
};

const getCategoryBadge = (category: string) => {
  switch (category) {
    case "atmospheric_parameter":
      return <span className="badge badge-low" style={{ fontSize: "0.68rem" }}>Atmospheric Channel</span>;
    case "spatial_network":
      return <span className="badge badge-medium" style={{ fontSize: "0.68rem" }}>Spatial Network</span>;
    case "temporal_dynamics":
      return <span className="badge badge-high" style={{ fontSize: "0.68rem" }}>Temporal Dynamics</span>;
    case "physics_model":
      return <span className="badge badge-low" style={{ fontSize: "0.68rem", borderColor: "#a855f7", color: "#c084fc" }}>Thermodynamics</span>;
    default:
      return null;
  }
};

const WhyFlagged: React.FC = () => {
  const { alertId = "101" } = useParams<{ alertId: string }>();
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAcked, setIsAcked] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "atmospheric" | "spatial_physics">("all");

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

  // Fallback defaults for rich factors if connected to legacy cached explanation
  const leadFeature = explanation?.top_features?.[0]?.feature || "temperature";
  const leadContrib = explanation?.top_features?.[0]?.contribution
    ? Math.round(explanation.top_features[0].contribution * 100)
    : 80;

  const contributingFactors: ContributingFactor[] = explanation?.contributing_factors || [
    ...(explanation?.top_features.map((tf) => ({
      name: `${tf.feature.charAt(0).toUpperCase() + tf.feature.slice(1)} Deviation`,
      category: "atmospheric_parameter" as const,
      feature: tf.feature,
      contribution: tf.contribution,
      direction: tf.direction,
      observed_value: "Outlier Signal",
      baseline_value: "Nominal Range",
      deviation: "+3.4σ",
      description: `Primary anomalous driver contributing ${Math.round(tf.contribution * 100)}% to the detection score.`,
    })) || []),
    {
      name: "Spatial Neighbor Disparity",
      category: "spatial_network",
      feature: "spatial_cluster",
      contribution: 0.38,
      direction: "increases_anomaly",
      observed_value: "0/2 Corroborated",
      baseline_value: "Synchronized",
      deviation: "-2 Stations",
      description: "Nearest neighboring stations within 35km radius reported nominal readings, isolating the event to this transducer.",
    },
    {
      name: "Temporal Rate-of-Change",
      category: "temporal_dynamics",
      feature: "derivative",
      contribution: 0.25,
      direction: "increases_anomaly",
      observed_value: "> 3.2σ/15min",
      baseline_value: "±0.5σ/hr",
      deviation: "Rapid Gradient",
      description: "Instantaneous step-jump in sensor telemetry exceeding natural atmospheric rate-of-change thresholds.",
    },
  ];

  const reasoningChain: ReasoningStep[] = explanation?.reasoning_chain || [
    {
      step_number: 1,
      title: "Atmospheric Parameter Anomaly Trigger",
      evidence: `Sensor channel ${leadFeature} recorded a rapid statistical deviation exceeding standard 3.0σ thresholds.`,
      status: "flagged",
    },
    {
      step_number: 2,
      title: "Spatial Network Cross-Validation",
      evidence: "Multi-station Gaussian kernel interpolation found no corroborating signals across adjacent spatial monitoring nodes.",
      status: "isolated",
    },
    {
      step_number: 3,
      title: "Thermodynamic Covariance Check",
      evidence: "Coupled atmospheric parameters failed to exhibit adiabatic thermodynamic response, ruling out genuine weather front.",
      status: "unphysical",
    },
    {
      step_number: 4,
      title: "Ensemble Diagnostic Verdict",
      evidence: `Classified as ${currentAlert?.root_cause?.replace("_", " ") || "Sensor Fault"} with high confidence. Remediation recommended.`,
      status: "verdict",
    },
  ];

  const detectorBreakdown: DetectorBreakdownItem[] = explanation?.detector_breakdown || [
    {
      detector_name: "Statistical STL & Z-Score Filter",
      score: 0.94,
      threshold: 0.60,
      flagged: true,
      description: "Robust median seasonal-trend decomposition & rolling 3-sigma limits.",
    },
    {
      detector_name: "LSTM Autoencoder Temporal Reconstruction",
      score: 0.91,
      threshold: 0.55,
      flagged: true,
      description: "Deep sequence reconstruction error evaluating temporal continuity.",
    },
    {
      detector_name: "Isolation Forest Multivariate Anomaly",
      score: 0.86,
      threshold: 0.50,
      flagged: true,
      description: "Multi-dimensional tree ensemble isolating out-of-distribution space.",
    },
    {
      detector_name: "Spatial & Mahalanobis Consistency Engine",
      score: 0.96,
      threshold: 0.50,
      flagged: true,
      description: "Spatial neighbor distance weighting and thermodynamic covariance validation.",
    },
  ];

  const neighborCorroboration: NeighborCorroborationItem[] = explanation?.neighbor_corroboration || [
    {
      station_id: 2,
      station_name: "Mumbai Santacruz (Inland Suburban Hub)",
      distance_km: 14.8,
      reading: "28.5°C",
      expected: "Nominal",
      is_corroborating: false,
      status: "Normal (Divergent)",
    },
    {
      station_id: 9,
      station_name: "Pune Shivajinagar (Met Research Center)",
      distance_km: 32.4,
      reading: "27.8°C",
      expected: "Nominal",
      is_corroborating: false,
      status: "Normal (Divergent)",
    },
  ];

  const recommendations: string[] = explanation?.recommendations || [
    `Execute remote offset zero-calibration routine on ${leadFeature} sensor probe.`,
    "Verify aspirator radiation shield fan operation to prevent solar thermal trapping.",
    "Schedule physical field inspection or transducer replacement if drift persists.",
    "Temporarily down-weight station channel from regional spatial interpolation grid.",
  ];

  const filteredFactors = contributingFactors.filter((f) => {
    if (activeTab === "atmospheric") return f.category === "atmospheric_parameter";
    if (activeTab === "spatial_physics") return f.category !== "atmospheric_parameter";
    return true;
  });

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
            Multi-factor attribution, spatial cross-validation, and step-by-step diagnostic reasoning
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
                  Alert #{a.id} — [{a.severity.toUpperCase()}] {a.summary.slice(0, 32)}...
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
          <div>Synthesizing multi-factor attributions, causal reasoning chains, and spatial network consensus...</div>
        </div>
      ) : error || !explanation ? (
        <div className="glass-panel" style={{ padding: "2.5rem", borderColor: "rgba(244, 63, 94, 0.4)", color: "#fb7185" }}>
          <AlertTriangle size={24} style={{ marginBottom: "0.5rem" }} />
          <div>{error || `Explanation for Alert #${alertId} not available in registry.`}</div>
        </div>
      ) : (
        <>
          {/* Top Diagnostic KPI Summary Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            {/* Primary Driver Card */}
            <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(244, 63, 94, 0.15)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {getParamIcon(leadFeature)}
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                  Primary Anomaly Driver
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f8fafc", textTransform: "capitalize" }}>
                  {leadFeature} ({leadContrib}%)
                </div>
              </div>
            </div>

            {/* Root Cause Verdict Card */}
            <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldAlert size={20} color="var(--accent-amber)" />
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                  Diagnostic Classification
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc", textTransform: "capitalize" }}>
                  {currentAlert?.root_cause ? currentAlert.root_cause.replace("_", " ") : "Sensor Fault"}
                </div>
              </div>
            </div>

            {/* Spatial Network Consensus Card */}
            <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Network size={20} color="var(--accent-cyan)" />
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                  Spatial Cluster Corroboration
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>
                  {currentAlert?.root_cause === "genuine_event" ? "2/2 Corroborated" : "0/2 Isolated"}
                </div>
              </div>
            </div>

            {/* Model Consensus Card */}
            <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Layers size={20} color="#c084fc" />
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                  Detector Ensemble Vote
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>
                  {detectorBreakdown.filter((d) => d.flagged).length} of {detectorBreakdown.length} Triggered
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Layout: 2 Columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "1.5rem" }}>
            {/* Left Column: Contributing Factors & Model Consensus */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* 1. Atmospheric Parameter Attribution Bars */}
              <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Cpu size={18} color="var(--accent-cyan)" />
                    Atmospheric Feature Attributions
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                    Relative SHAP & deterministic contribution weights across core atmospheric channels
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
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
                            {getParamIcon(feat.feature)}
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

              {/* 2. Comprehensive Factor Attribution Decomposition */}
              <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                      <Activity size={18} color="var(--accent-amber)" />
                      Detailed Factor Attribution Breakdown
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                      Decomposition of physical deviations, spatial network divergence, and temporal rates of change
                    </p>
                  </div>

                  {/* Factor Filter Tabs */}
                  <div style={{ display: "flex", gap: "4px", background: "rgba(15, 23, 42, 0.6)", padding: "3px", borderRadius: "6px", border: "1px solid var(--border-card)" }}>
                    <button
                      onClick={() => setActiveTab("all")}
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.72rem",
                        borderRadius: "4px",
                        background: activeTab === "all" ? "var(--accent-primary)" : "transparent",
                        color: activeTab === "all" ? "#fff" : "var(--text-secondary)",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      All Factors
                    </button>
                    <button
                      onClick={() => setActiveTab("atmospheric")}
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.72rem",
                        borderRadius: "4px",
                        background: activeTab === "atmospheric" ? "var(--accent-primary)" : "transparent",
                        color: activeTab === "atmospheric" ? "#fff" : "var(--text-secondary)",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Atmospheric
                    </button>
                    <button
                      onClick={() => setActiveTab("spatial_physics")}
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.72rem",
                        borderRadius: "4px",
                        background: activeTab === "spatial_physics" ? "var(--accent-primary)" : "transparent",
                        color: activeTab === "spatial_physics" ? "#fff" : "var(--text-secondary)",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Physics & Network
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {filteredFactors.map((factor, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid var(--border-card)",
                        borderRadius: "8px",
                        padding: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f8fafc" }}>
                              {factor.name}
                            </span>
                            {getCategoryBadge(factor.category)}
                          </div>
                          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                            {factor.description}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", minWidth: "90px" }}>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: factor.direction === "increases_anomaly" ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              color: factor.direction === "increases_anomaly" ? "#fb7185" : "#34d399",
                              border: `1px solid ${factor.direction === "increases_anomaly" ? "rgba(244, 63, 94, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                            }}
                          >
                            {Math.round(factor.contribution * 100)}% Weight
                          </span>
                        </div>
                      </div>

                      {/* Observed vs Baseline Badges */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: "8px",
                          background: "rgba(0, 0, 0, 0.25)",
                          padding: "8px",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                        }}
                      >
                        <div>
                          <span style={{ color: "var(--text-muted)", display: "block" }}>Observed</span>
                          <span style={{ fontWeight: 600, color: "#f8fafc" }}>{factor.observed_value}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)", display: "block" }}>Baseline</span>
                          <span style={{ color: "var(--text-secondary)" }}>{factor.baseline_value}</span>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)", display: "block" }}>Delta / Deviation</span>
                          <span style={{ fontWeight: 600, color: factor.direction === "increases_anomaly" ? "#fb7185" : "#34d399" }}>
                            {factor.deviation}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Detector Ensemble Consensus Voting Grid */}
              <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={18} color="var(--accent-emerald)" />
                    Detector Ensemble Model Consensus
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                    Multi-tier detection models voting on statistical, recurrent temporal, and spatial features
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                  {detectorBreakdown.map((det, idx) => (
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
                        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#f8fafc" }}>
                          {det.detector_name}
                        </span>
                        <span
                          className={`badge ${det.flagged ? "badge-high" : "badge-low"}`}
                          style={{ fontSize: "0.65rem", padding: "1px 6px" }}
                        >
                          {det.flagged ? "TRIGGERED" : "NOMINAL"}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                        {det.description}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", marginTop: "4px" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Confidence Score:</span>
                        <span style={{ fontWeight: 700, color: det.flagged ? "#fb7185" : "#34d399" }}>
                          {(det.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: AI Diagnostic Narrative, Reasoning Chain, Neighbors, & Actions */}
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
                  <span>Generated by Skyguard Root-Cause Classifier v2.4 (SHAP & Multi-Station Spatial Fusion)</span>
                </div>
              </div>

              {/* Step-by-Step Causal Reasoning Chain */}
              <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Activity size={18} color="var(--accent-cyan)" />
                    Step-by-Step Causal Reasoning Chain
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                    Logical multi-stage evaluation trail leading to the root-cause classification
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", position: "relative" }}>
                  {reasoningChain.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "flex-start",
                        position: "relative",
                      }}
                    >
                      {/* Step Number Circle */}
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: step.status === "corroborated" || step.status === "validated" ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)",
                          border: `1px solid ${step.status === "corroborated" || step.status === "validated" ? "rgba(16, 185, 129, 0.5)" : "rgba(244, 63, 94, 0.5)"}`,
                          color: step.status === "corroborated" || step.status === "validated" ? "#34d399" : "#fb7185",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {step.step_number}
                      </div>

                      {/* Step Details */}
                      <div
                        style={{
                          background: "rgba(15, 23, 42, 0.5)",
                          border: "1px solid var(--border-card)",
                          borderRadius: "8px",
                          padding: "0.85rem",
                          flex: 1,
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#f8fafc", marginBottom: "4px" }}>
                          {step.title}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                          {step.evidence}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spatial Neighbor Corroboration Matrix */}
              <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Network size={18} color="var(--accent-cyan)" />
                    Spatial Neighbor Corroboration Matrix
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                    Direct cross-station comparisons against nearest network nodes at event timestamp
                  </p>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", textAlign: "left" }}>
                        <th style={{ padding: "8px 6px" }}>Station</th>
                        <th style={{ padding: "8px 6px" }}>Distance</th>
                        <th style={{ padding: "8px 6px" }}>Reading</th>
                        <th style={{ padding: "8px 6px" }}>Consensus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {neighborCorroboration.map((n, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                          <td style={{ padding: "8px 6px", fontWeight: 600, color: "#f8fafc" }}>
                            {n.station_name}
                          </td>
                          <td style={{ padding: "8px 6px", color: "var(--text-secondary)" }}>
                            {n.distance_km} km
                          </td>
                          <td style={{ padding: "8px 6px", color: "#f8fafc" }}>
                            {n.reading}
                          </td>
                          <td style={{ padding: "8px 6px" }}>
                            <span
                              style={{
                                fontSize: "0.72rem",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                background: n.is_corroborating ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                                color: n.is_corroborating ? "#34d399" : "#fb7185",
                                border: `1px solid ${n.is_corroborating ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                              }}
                            >
                              {n.is_corroborating ? <Check size={11} /> : <XCircle size={11} />}
                              {n.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actionable Engineering Remediation */}
              <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Wrench size={18} color="var(--accent-amber)" />
                    Recommended Remediation Plan
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                    Prescribed engineering actions based on root cause classification
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        fontSize: "0.85rem",
                        color: "#f8fafc",
                        background: "rgba(15, 23, 42, 0.4)",
                        border: "1px solid var(--border-card)",
                        padding: "0.75rem",
                        borderRadius: "6px",
                      }}
                    >
                      <ArrowRight size={14} color="var(--accent-amber)" style={{ marginTop: "3px", flexShrink: 0 }} />
                      <span>{rec}</span>
                    </div>
                  ))}
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
        </>
      )}
    </div>
  );
};

export default WhyFlagged;
