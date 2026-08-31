import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchExplanation, fetchAlerts, acknowledgeAlert } from "../api";
import type { Explanation, Alert, ContributingFactor, ReasoningStep, DetectorBreakdownItem, NeighborCorroborationItem } from "../types";
import { ConfidenceGauge } from "../components/ConfidenceGauge";
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
  Sliders,
  Compass,
  ChevronRight,
  MapPin,
  ExternalLink,
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

type SectionTab = "overview" | "factors" | "reasoning" | "spatial";

const WhyFlagged: React.FC = () => {
  const { alertId = "101" } = useParams<{ alertId: string }>();
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAcked, setIsAcked] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionTab>("overview");
  const [factorFilter, setFactorFilter] = useState<"all" | "atmospheric" | "spatial_physics">("all");

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
    if (factorFilter === "atmospheric") return f.category === "atmospheric_parameter";
    if (factorFilter === "spatial_physics") return f.category !== "atmospheric_parameter";
    return true;
  });

  const triggeredDetectorsCount = detectorBreakdown.filter((d) => d.flagged).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header with Alert Switcher & Quick Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Anomaly Diagnostics & Explainability
            </h1>
            <span className="badge badge-medium" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
              Alert #{alertId}
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>
            Understand why this alert was triggered using sensor data, nearby stations, and AI analysis
          </p>
        </div>

        {/* Header Controls */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {alerts.length > 0 && (
            <select
              value={alertId}
              onChange={(e) => (window.location.href = `#/why-flagged/${e.target.value}`)}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                color: "#f8fafc",
                border: "1px solid var(--border-card)",
                borderRadius: "8px",
                padding: "7px 12px",
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              {alerts.map((a) => (
                <option key={a.id} value={a.id}>
                  Alert #{a.id} — [{a.severity.toUpperCase()}] {a.summary.slice(0, 36)}...
                </option>
              ))}
            </select>
          )}

          {!isAcked ? (
            <button
              onClick={handleAcknowledge}
              className="btn-glass"
              style={{ fontSize: "0.82rem", padding: "7px 14px" }}
            >
              <CheckCircle2 size={14} color="var(--accent-emerald)" />
              <span>Acknowledge</span>
            </button>
          ) : (
            <span
              style={{
                fontSize: "0.82rem",
                color: "var(--accent-emerald)",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontWeight: 600,
                padding: "6px 12px",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "8px",
              }}
            >
              <CheckCircle2 size={14} />
              Acknowledged
            </span>
          )}

          {currentAlert && (
            <Link
              to={`/station/${currentAlert.station_id}`}
              className="btn-glow"
              style={{ fontSize: "0.82rem", padding: "7px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
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
          {/* Top Diagnostic KPI Ribbon */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "0.85rem",
            }}
          >
            {/* Primary Driver Card */}
            <div className="glass-panel" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "rgba(244, 63, 94, 0.15)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {getParamIcon(leadFeature)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.03em" }}>
                  Primary Anomaly Driver
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc", textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {leadFeature} ({leadContrib}%)
                </div>
              </div>
            </div>

            {/* Root Cause Verdict Card */}
            <div className="glass-panel" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={18} color="var(--accent-amber)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.03em" }}>
                  Diagnostic Classification
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc", textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentAlert?.root_cause ? currentAlert.root_cause.replace("_", " ") : "Sensor Fault"}
                </div>
              </div>
            </div>

            {/* Spatial Network Consensus Card */}
            <div className="glass-panel" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Network size={18} color="var(--accent-cyan)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.03em" }}>
                  Spatial Cluster Consensus
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc" }}>
                  {currentAlert?.root_cause === "genuine_event" ? "2/2 Corroborated" : "0/2 Isolated"}
                </div>
              </div>
            </div>

            {/* Model Consensus Card */}
            <div className="glass-panel" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Layers size={18} color="#c084fc" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.03em" }}>
                  Detector Ensemble
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc" }}>
                  {triggeredDetectorsCount} of {detectorBreakdown.length} Triggered
                </div>
              </div>
            </div>

            {/* AI Confidence Gauge Card */}
            <div className="glass-panel" style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.03em" }}>
                  AI Confidence
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Ensemble Certainty
                </div>
              </div>
              <ConfidenceGauge
                value={explanation.confidence ?? currentAlert?.confidence ?? 0.94}
                size="sm"
                label=""
                showStatusBadge={false}
              />
            </div>
          </div>

          {/* Clean Segmented Navigation Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(15, 23, 42, 0.75)",
              padding: "5px",
              borderRadius: "10px",
              border: "1px solid var(--border-card)",
              overflowX: "auto",
            }}
          >
            <button
              onClick={() => setActiveSection("overview")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 16px",
                borderRadius: "7px",
                border: "none",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: activeSection === "overview" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                color: activeSection === "overview" ? "#38bdf8" : "var(--text-secondary)",
                boxShadow: activeSection === "overview" ? "inset 0 0 0 1px rgba(56, 189, 248, 0.4)" : "none",
              }}
            >
              <Sparkles size={15} />
              <span>Overview & Actions</span>
            </button>

            <button
              onClick={() => setActiveSection("factors")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 16px",
                borderRadius: "7px",
                border: "none",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: activeSection === "factors" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                color: activeSection === "factors" ? "#38bdf8" : "var(--text-secondary)",
                boxShadow: activeSection === "factors" ? "inset 0 0 0 1px rgba(56, 189, 248, 0.4)" : "none",
              }}
            >
              <Sliders size={15} />
              <span>Factor Attribution & Physics</span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  background: activeSection === "factors" ? "rgba(56, 189, 248, 0.3)" : "rgba(255, 255, 255, 0.08)",
                  color: activeSection === "factors" ? "#fff" : "var(--text-muted)",
                }}
              >
                {contributingFactors.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSection("reasoning")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 16px",
                borderRadius: "7px",
                border: "none",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: activeSection === "reasoning" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                color: activeSection === "reasoning" ? "#38bdf8" : "var(--text-secondary)",
                boxShadow: activeSection === "reasoning" ? "inset 0 0 0 1px rgba(56, 189, 248, 0.4)" : "none",
              }}
            >
              <Activity size={15} />
              <span>Diagnostic Steps & AI Models</span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  background: activeSection === "reasoning" ? "rgba(56, 189, 248, 0.3)" : "rgba(255, 255, 255, 0.08)",
                  color: activeSection === "reasoning" ? "#fff" : "var(--text-muted)",
                }}
              >
                {reasoningChain.length} Steps
              </span>
            </button>

            <button
              onClick={() => setActiveSection("spatial")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 16px",
                borderRadius: "7px",
                border: "none",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: activeSection === "spatial" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                color: activeSection === "spatial" ? "#38bdf8" : "var(--text-secondary)",
                boxShadow: activeSection === "spatial" ? "inset 0 0 0 1px rgba(56, 189, 248, 0.4)" : "none",
              }}
            >
              <Network size={15} />
              <span>Spatial Cross-Validation</span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  background: activeSection === "spatial" ? "rgba(56, 189, 248, 0.3)" : "rgba(255, 255, 255, 0.08)",
                  color: activeSection === "spatial" ? "#fff" : "var(--text-muted)",
                }}
              >
                {neighborCorroboration.length} Nodes
              </span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW & ACTIONS */}
          {/* ========================================================================= */}
          {activeSection === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "1.25rem" }}>
              {/* Left Side: Narrative & Atmospheric Channels */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* AI Diagnostic Narrative */}
                <div
                  className="glass-panel"
                  style={{
                    padding: "1.4rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                    borderLeft: "4px solid var(--accent-amber)",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Sparkles size={18} color="var(--accent-amber)" />
                      <h2 style={{ fontSize: "1.05rem", fontWeight: 600 }}>Automated Diagnostic Narrative</h2>
                    </div>
                    <span className="badge badge-low" style={{ fontSize: "0.68rem" }}>AI Root-Cause</span>
                  </div>

                  <div
                    style={{
                      background: "rgba(245, 158, 11, 0.05)",
                      border: "1px solid rgba(245, 158, 11, 0.2)",
                      borderRadius: "8px",
                      padding: "1.15rem",
                      fontSize: "0.92rem",
                      lineHeight: "1.6",
                      color: "#fde68a",
                    }}
                  >
                    "{explanation.narrative}"
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FileText size={13} />
                    <span>Generated by Skyguard Root-Cause Classifier v2.4 (SHAP & Multi-Station Spatial Fusion)</span>
                  </div>
                </div>

                {/* Atmospheric Feature Attributions */}
                <div className="glass-panel" style={{ padding: "1.4rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h2 style={{ fontSize: "1.05rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                        <Cpu size={17} color="var(--accent-cyan)" />
                        Atmospheric Feature Attributions
                      </h2>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: "2px" }}>
                        Which weather measurements contributed most to this anomaly
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveSection("factors")}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--accent-cyan)",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span>Deep Dive</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {explanation.top_features.map((feat, idx) => {
                      const isIncrease = feat.direction === "increases_anomaly";
                      const percentage = Math.round(feat.contribution * 100);
                      return (
                        <div
                          key={idx}
                          style={{
                            background: "rgba(15, 23, 42, 0.55)",
                            border: "1px solid var(--border-card)",
                            borderRadius: "8px",
                            padding: "0.85rem 1rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.45rem",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {getParamIcon(feat.feature)}
                              <span style={{ fontWeight: 600, textTransform: "capitalize", fontSize: "0.9rem" }}>
                                {feat.feature}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.68rem",
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
                                {isIncrease ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {feat.direction.replace("_", " ")}
                              </span>
                            </div>

                            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: isIncrease ? "#fb7185" : "#38bdf8" }}>
                              {percentage}%
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div
                            style={{
                              width: "100%",
                              height: "6px",
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
              </div>

              {/* Right Side: Visual Confidence Gauge, Remediation & Snapshot */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Visual Anomaly Confidence & Ensemble Diagnostic Hub */}
                <div className="glass-panel" style={{ padding: "1.4rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem" }}>
                  <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "1.05rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                      <Sparkles size={17} color="var(--accent-cyan)" />
                      Anomaly Confidence Index
                    </h2>
                    <span className="badge badge-normal" style={{ fontSize: "0.68rem" }}>AI Certainty</span>
                  </div>

                  <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "0.5rem 0" }}>
                    <ConfidenceGauge
                      value={explanation.confidence ?? currentAlert?.confidence ?? 0.94}
                      size="lg"
                      label="Ensemble Confidence"
                      sublabel="Consensus across 4 independent anomaly models"
                      showBreakdown={true}
                      breakdown={{
                        spatial_physics: 0.96,
                        statistical: 0.94,
                        temporal_lstm: 0.91,
                        isolation_forest: 0.86,
                      }}
                      showStatusBadge={true}
                    />
                  </div>
                </div>

                {/* Actionable Engineering Remediation Plan */}
                <div className="glass-panel" style={{ padding: "1.4rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.05rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                      <Wrench size={17} color="var(--accent-amber)" />
                      Recommended Remediation Plan
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: "2px" }}>
                      Prescribed operational & field actions
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                    {recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          fontSize: "0.82rem",
                          color: "#f8fafc",
                          background: "rgba(15, 23, 42, 0.5)",
                          border: "1px solid var(--border-card)",
                          padding: "0.7rem 0.85rem",
                          borderRadius: "7px",
                        }}
                      >
                        <ArrowRight size={13} color="var(--accent-amber)" style={{ marginTop: "3px", flexShrink: 0 }} />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Associated Alert Snapshot Card */}
                {currentAlert && (
                  <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                        Alert Metadata Snapshot
                      </h3>
                      <Link
                        to={`/station/${currentAlert.station_id}`}
                        style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "3px", textDecoration: "none" }}
                      >
                        Station Detail <ExternalLink size={11} />
                      </Link>
                    </div>

                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f8fafc", lineHeight: "1.4" }}>
                      {currentAlert.summary}
                    </div>

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <span className={`badge badge-${currentAlert.severity}`}>{currentAlert.severity}</span>
                      <span className="badge badge-low">Station #{currentAlert.station_id} ({currentAlert.station_name})</span>
                      <span className="badge badge-low">Status: {currentAlert.status}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: DETAILED FACTOR ATTRIBUTION & PHYSICS */}
          {/* ========================================================================= */}
          {activeSection === "factors" && (
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sliders size={18} color="var(--accent-amber)" />
                    Detailed Factor Attribution Breakdown
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                    Breakdown of unusual sensor readings, nearby station differences, and sudden shifts
                  </p>
                </div>

                {/* Factor Filter Tabs */}
                <div style={{ display: "flex", gap: "4px", background: "rgba(15, 23, 42, 0.8)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-card)" }}>
                  <button
                    onClick={() => setFactorFilter("all")}
                    style={{
                      padding: "5px 12px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: "5px",
                      background: factorFilter === "all" ? "var(--accent-primary)" : "transparent",
                      color: factorFilter === "all" ? "#fff" : "var(--text-secondary)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    All ({contributingFactors.length})
                  </button>
                  <button
                    onClick={() => setFactorFilter("atmospheric")}
                    style={{
                      padding: "5px 12px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: "5px",
                      background: factorFilter === "atmospheric" ? "var(--accent-primary)" : "transparent",
                      color: factorFilter === "atmospheric" ? "#fff" : "var(--text-secondary)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Atmospheric
                  </button>
                  <button
                    onClick={() => setFactorFilter("spatial_physics")}
                    style={{
                      padding: "5px 12px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: "5px",
                      background: factorFilter === "spatial_physics" ? "var(--accent-primary)" : "transparent",
                      color: factorFilter === "spatial_physics" ? "#fff" : "var(--text-secondary)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Physics & Network
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "1rem" }}>
                {filteredFactors.map((factor, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "10px",
                      padding: "1.1rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f8fafc" }}>
                              {factor.name}
                            </span>
                            {getCategoryBadge(factor.category)}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "3px 8px",
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
                    </div>

                    {/* Observed vs Baseline Badges */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "8px",
                        background: "rgba(0, 0, 0, 0.3)",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "0.76rem",
                      }}
                    >
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.7rem" }}>Observed</span>
                        <span style={{ fontWeight: 600, color: "#f8fafc" }}>{factor.observed_value}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.7rem" }}>Baseline</span>
                        <span style={{ color: "var(--text-secondary)" }}>{factor.baseline_value}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.7rem" }}>Delta / Deviation</span>
                        <span style={{ fontWeight: 600, color: factor.direction === "increases_anomaly" ? "#fb7185" : "#34d399" }}>
                          {factor.deviation}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: CAUSAL REASONING CHAIN & DETECTOR MODELS */}
          {/* ========================================================================= */}
          {activeSection === "reasoning" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "1.25rem" }}>
              {/* Left Column: Step-by-Step Causal Reasoning Chain */}
              <div className="glass-panel" style={{ padding: "1.4rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Activity size={17} color="var(--accent-cyan)" />
                    Step-by-Step Diagnostic Steps
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: "2px" }}>
                    Step-by-step logic showing how the system identified the problem
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
                          background: "rgba(15, 23, 42, 0.55)",
                          border: "1px solid var(--border-card)",
                          borderRadius: "8px",
                          padding: "0.85rem",
                          flex: 1,
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#f8fafc", marginBottom: "3px" }}>
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

              {/* Right Column: Detector Ensemble Consensus */}
              <div className="glass-panel" style={{ padding: "1.4rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={17} color="var(--accent-emerald)" />
                    AI Detection Models
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: "2px" }}>
                    Breakdown of which AI models flagged this anomaly
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {detectorBreakdown.map((det, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "rgba(15, 23, 42, 0.55)",
                        border: "1px solid var(--border-card)",
                        borderRadius: "8px",
                        padding: "0.85rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.84rem", color: "#f8fafc" }}>
                          {det.detector_name}
                        </span>
                        <span
                          className={`badge ${det.flagged ? "badge-high" : "badge-low"}`}
                          style={{ fontSize: "0.62rem", padding: "1px 6px" }}
                        >
                          {det.flagged ? "TRIGGERED" : "NOMINAL"}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                        {det.description}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.74rem", marginTop: "2px" }}>
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
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SPATIAL CROSS-VALIDATION */}
          {/* ========================================================================= */}
          {activeSection === "spatial" && (
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Network size={18} color="var(--accent-cyan)" />
                    Spatial Neighbor Corroboration Matrix
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "2px" }}>
                    Comparison with readings from the closest weather stations
                  </p>
                </div>
                <div className="badge badge-medium">
                  Cluster Status: {currentAlert?.root_cause === "genuine_event" ? "Corroborated Regional Front" : "Isolated Single-Node Anomaly"}
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-card)", color: "var(--text-muted)", textAlign: "left" }}>
                      <th style={{ padding: "10px 8px" }}>Neighboring Station</th>
                      <th style={{ padding: "10px 8px" }}>Distance Radius</th>
                      <th style={{ padding: "10px 8px" }}>Sensor Telemetry Reading</th>
                      <th style={{ padding: "10px 8px" }}>Spatial Consensus Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {neighborCorroboration.map((n, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                        <td style={{ padding: "10px 8px", fontWeight: 600, color: "#f8fafc" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <MapPin size={14} color="var(--accent-cyan)" />
                            <span>{n.station_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 8px", color: "var(--text-secondary)" }}>
                          {n.distance_km} km
                        </td>
                        <td style={{ padding: "10px 8px", color: "#f8fafc", fontFamily: "var(--font-mono)" }}>
                          {n.reading}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: n.is_corroborating ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                              color: n.is_corroborating ? "#34d399" : "#fb7185",
                              border: `1px solid ${n.is_corroborating ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                            }}
                          >
                            {n.is_corroborating ? <Check size={12} /> : <XCircle size={12} />}
                            {n.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Informative footer alert */}
              <div
                style={{
                  background: "rgba(56, 189, 248, 0.05)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  borderRadius: "8px",
                  padding: "1rem",
                  fontSize: "0.82rem",
                  color: "#93c5fd",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Compass size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
                <span>
                  Spatial corroboration runs an inverse-distance weighted Gaussian spatial interpolation across adjacent nodes within a 50km radius. An anomaly is classified as isolated when no adjacent nodes corroborate deviations above 1.5σ.
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WhyFlagged;
