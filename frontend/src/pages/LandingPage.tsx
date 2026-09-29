import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Layout,
  HelpCircle,
  Activity,
  Layers,
  Mountain,
  Sparkles,
  BarChart3,
  Cpu,
} from "lucide-react";
import { fetchStations } from "../api";
import type { Station } from "../types";

export const LandingPage: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);

  useEffect(() => {
    fetchStations()
      .then((data) => setStations(data))
      .catch(() => { });
  }, []);

  const stationsCount = stations.length > 0 ? stations.length : 11;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "4.5rem" }}>
      {/* =========================================================================
          EXTENDED HERO SECTION (Exact match to Photo 3 with extended height & presence)
          ========================================================================= */}
      <section
        id="hero-section"
        style={{
          position: "relative",
          width: "100%",
          minHeight: "640px",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid var(--border-card)",
          backgroundColor: "var(--surface-container, #0a1325)",
          display: "flex",
          alignItems: "center",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(34, 211, 238, 0.08)",
        }}
      >
        {/* Extended Panoramic Background Image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/images/alpine_hero.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            filter: "brightness(0.85) contrast(1.08)",
            transform: "scale(1.02)",
          }}
        />
        {/* Subtle Directional Overlay for Text Contrast */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(6, 11, 22, 0.88) 0%, rgba(6, 11, 22, 0.6) 42%, rgba(6, 11, 22, 0.18) 100%), linear-gradient(180deg, rgba(6, 11, 22, 0.3) 0%, transparent 50%, rgba(6, 11, 22, 0.75) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Hero Content */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            padding: "4.5rem 3.5rem",
            maxWidth: "840px",
            display: "flex",
            flexDirection: "column",
            gap: "1.75rem",
          }}
        >
          {/* Pill Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.4rem 0.95rem",
              borderRadius: "9999px",
              background: "rgba(10, 19, 37, 0.85)",
              border: "1px solid rgba(34, 211, 238, 0.35)",
              width: "fit-content",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "var(--accent-cyan)",
                boxShadow: "0 0 8px var(--accent-cyan)",
              }}
            />
            <span
              style={{
                color: "var(--accent-cyan)",
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              AI SENSOR MONITORING
            </span>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: "clamp(2.6rem, 5.5vw, 4.2rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              margin: 0,
              fontFamily: "var(--font-heading)",
            }}
          >
            Weather or fault?<br />
            <span style={{ color: "var(--accent-cyan)" }}>Know instantly.</span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "1.15rem",
              lineHeight: 1.65,
              color: "#cbd5e1",
              maxWidth: "680px",
              margin: 0,
              fontFamily: "var(--font-sans)",
            }}
          >
            SkyGuard.AI separates genuine weather events from sensor failures across your station network,
            and explains every alert.
          </p>

          {/* Primary Action Button */}
          <div style={{ marginTop: "0.5rem" }}>
            <Link
              to="/overview"
              className="btn-glow btn-shimmer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "1rem",
                padding: "0.85rem 2.2rem",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              <span>Open Dashboard</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Stat Line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              fontSize: "0.88rem",
              color: "#94a3b8",
              fontFamily: "var(--font-mono)",
              marginTop: "0.5rem",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            <span>{stationsCount} stations online · 94% average alert confidence</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
            HOW IT WORKS SECTION (Exact match to Photo 1 with Extended Vertical Image)
            ========================================================================= */}
      <section id="how-it-works" style={{ display: "flex", flexDirection: "column", gap: "2rem", scrollMarginTop: "5rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "2.5rem",
            alignItems: "center",
          }}
        >
          {/* Left Column: Copy & Action Button */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div
              style={{
                color: "var(--accent-cyan)",
                fontSize: "0.8rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              HOW IT WORKS
            </div>

            <h2
              style={{
                fontSize: "clamp(2.2rem, 4vw, 3.4rem)",
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                margin: 0,
                fontFamily: "var(--font-heading)",
              }}
            >
              From raw telemetry<br />
              to a clear decision.
            </h2>

            <p
              style={{
                fontSize: "1.08rem",
                lineHeight: 1.65,
                color: "var(--text-secondary)",
                margin: 0,
                fontFamily: "var(--font-sans)",
              }}
            >
              Automatic weather stations transmit high-frequency sensor streams that are continuously
              cross-examined against neighbouring stations, hypsometric lapse equations, and physical
              limits to render definitive diagnoses.
            </p>
          </div>

          {/* Center Column: Extended Weather Station Sensor Photo */}
          <div
            style={{
              borderRadius: "18px",
              overflow: "hidden",
              border: "1px solid var(--border-card-bright, rgba(34, 211, 238, 0.3))",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.45), 0 0 25px rgba(34, 211, 238, 0.12)",
              height: "560px",
              position: "relative",
            }}
          >
            <img
              src="/images/weather_station_sensors.jpg"
              alt="Automatic Weather Station Sensors and Multi-Plate Shield in Alpine Mountain Environment"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transition: "transform 0.4s ease",
              }}
            />
          </div>

          {/* Right Column: Two Stacked Feature Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Card 1: Operator dashboard */}
            <div
              style={{
                flex: 1,
                backgroundColor: "var(--surface-container, #121b2e)",
                border: "1px solid var(--border-card)",
                borderRadius: "14px",
                padding: "2.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "1rem",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(34, 211, 238, 0.12)",
                  border: "1px solid rgba(34, 211, 238, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-cyan)",
                }}
              >
                <Layout size={20} />
              </div>

              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
                Operator dashboard
              </h3>

              <p style={{ fontSize: "0.94rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, fontFamily: "var(--font-sans)" }}>
                Monitor every station, review live alerts and acknowledge them with one-click audit logging.
              </p>
            </div>

            {/* Card 2: Explain an alert */}
            <div
              style={{
                flex: 1,
                backgroundColor: "var(--surface-container, #121b2e)",
                border: "1px solid var(--border-card)",
                borderRadius: "14px",
                padding: "2.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "1rem",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(34, 211, 238, 0.12)",
                  border: "1px solid rgba(34, 211, 238, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-cyan)",
                }}
              >
                <HelpCircle size={20} />
              </div>

              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
                Explain an alert
              </h3>

              <p style={{ fontSize: "0.94rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, fontFamily: "var(--font-sans)" }}>
                See root cause, detector votes and the recommended action for any alert in clear physical context.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
            RELIABLE OBSERVATION SECTION (Exact match to Photo 2)
            ========================================================================= */}
      <section id="observation" style={{ display: "flex", flexDirection: "column", gap: "2rem", scrollMarginTop: "5rem" }}>
        <div>
          <div
            style={{
              color: "var(--accent-cyan)",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            RELIABLE OBSERVATION
          </div>

          <h2
            style={{
              fontSize: "clamp(2rem, 3.8vw, 3rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: "0 0 1rem 0",
              fontFamily: "var(--font-heading)",
            }}
          >
            Three principles for uncompromised<br />
            telemetry
          </h2>

          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              maxWidth: "760px",
              margin: 0,
              fontFamily: "var(--font-sans)",
            }}
          >
            Designed specifically to prevent unneeded mountain ascents while catching subtle sensor drift
            before data models are poisoned.
          </p>
        </div>

        {/* 3 Principle Cards Side by Side */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {/* Card 01 */}
          <div
            style={{
              backgroundColor: "var(--surface-container, #121b2e)",
              border: "1px solid var(--border-card)",
              borderRadius: "14px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div
              style={{
                width: "fit-content",
                padding: "0.2rem 0.6rem",
                borderRadius: "6px",
                backgroundColor: "rgba(34, 211, 238, 0.1)",
                border: "1px solid rgba(34, 211, 238, 0.3)",
                color: "var(--accent-cyan)",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "0.8rem",
              }}
            >
              01
            </div>

            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
              Four detectors one verdict
            </h3>

            <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, flex: 1, fontFamily: "var(--font-sans)" }}>
              Physical bounds, temporal rate-of-change, spatial neighbor kriging, and sensor cross-correlation
              run in parallel to eliminate single-point false positives.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "1rem",
                borderTop: "1px solid var(--border-card)",
                fontSize: "0.78rem",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Ensemble Pipeline</span>
              <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Active
              </span>
            </div>
          </div>

          {/* Card 02 */}
          <div
            style={{
              backgroundColor: "var(--surface-container, #121b2e)",
              border: "1px solid var(--border-card)",
              borderRadius: "14px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div
              style={{
                width: "fit-content",
                padding: "0.2rem 0.6rem",
                borderRadius: "6px",
                backgroundColor: "rgba(34, 211, 238, 0.1)",
                border: "1px solid rgba(34, 211, 238, 0.3)",
                color: "var(--accent-cyan)",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "0.8rem",
              }}
            >
              02
            </div>

            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
              Neighbours checked and altitude corrected
            </h3>

            <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, flex: 1, fontFamily: "var(--font-sans)" }}>
              Barometric and thermal readings are dynamically adjusted for hypsometric lapse rates and terrain
              elevation before cross-station validation.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "1rem",
                borderTop: "1px solid var(--border-card)",
                fontSize: "0.78rem",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Lapse Rate Model</span>
              <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Dynamic
              </span>
            </div>
          </div>

          {/* Card 03 */}
          <div
            style={{
              backgroundColor: "var(--surface-container, #121b2e)",
              border: "1px solid var(--border-card)",
              borderRadius: "14px",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div
              style={{
                width: "fit-content",
                padding: "0.2rem 0.6rem",
                borderRadius: "6px",
                backgroundColor: "rgba(34, 211, 238, 0.1)",
                border: "1px solid rgba(34, 211, 238, 0.3)",
                color: "var(--accent-cyan)",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "0.8rem",
              }}
            >
              03
            </div>

            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
              Every alert explained
            </h3>

            <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, flex: 1, fontFamily: "var(--font-sans)" }}>
              Rather than raw opaque error codes, field technicians receive clear physical root-cause
              diagnostics and recommended maintenance actions.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "1rem",
                borderTop: "1px solid var(--border-card)",
                fontSize: "0.78rem",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Plain Language</span>
              <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                Zero Jargon
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
            WHAT TECHNIQUES IT WORKS ON SECTION
            ========================================================================= */}
      <section id="techniques" style={{ display: "flex", flexDirection: "column", gap: "2rem", scrollMarginTop: "5rem" }}>
        <div>
          <div
            style={{
              color: "var(--accent-cyan)",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            DETECTION ARCHITECTURE
          </div>

          <h2
            style={{
              fontSize: "clamp(2rem, 3.8vw, 3rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: "0 0 1rem 0",
              fontFamily: "var(--font-heading)",
            }}
          >
            What techniques it works on
          </h2>

          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              maxWidth: "760px",
              margin: 0,
              fontFamily: "var(--font-sans)",
            }}
          >
            Skyguard.AI combines classical atmospheric thermodynamics with state-of-the-art sequence learning
            and unsupervised spatial clustering to guarantee zero false mountain dispatches.
          </p>
        </div>

        {/* 6 Technique Cards in a 3x2 Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {/* Technique 1 */}
          <div
            style={{
              backgroundColor: "var(--surface-container, #121b2e)",
              border: "1px solid var(--border-card)",
              borderRadius: "14px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(34, 211, 238, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-cyan)",
                }}
              >
                <Activity size={18} />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
                Statistical Z-Score &amp; Frozen Filter
              </h3>
            </div>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, flex: 1, fontFamily: "var(--font-sans)" }}>
              Applies WMO physical climatological thresholds and evaluates rolling variance (Var=0) to isolate
              frozen sensor flatlines and sudden physical range clipping.
            </p>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                borderTop: "1px solid var(--border-card)",
                paddingTop: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Method: |Z| &gt; 3.0 &amp; Zero-Var</span>
              <span style={{ color: "var(--accent-cyan)" }}>Deterministic</span>
            </div>
          </div>

          {/* Technique 2 */}
          <div
            style={{
              backgroundColor: "var(--surface-container, #121b2e)",
              border: "1px solid var(--border-card)",
              borderRadius: "14px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10b981",
                }}
              >
                <Cpu size={18} />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
                PyTorch LSTM Autoencoder
              </h3>
            </div>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, flex: 1, fontFamily: "var(--font-sans)" }}>
              Two-layer bidirectional recurrent sequence autoencoder that learns complex multivariate atmospheric
              dynamics and detects temporal disruptions via reconstruction MSE residuals.
            </p>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                borderTop: "1px solid var(--border-card)",
                paddingTop: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Model: 2-Layer LSTM (MSE Loss)</span>
              <span style={{ color: "#10b981" }}>Deep Sequence</span>
            </div>
          </div>

          {/* Technique 3 */}
          <div
            style={{
              backgroundColor: "var(--surface-container, #121b2e)",
              border: "1px solid var(--border-card)",
              borderRadius: "14px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(168, 85, 247, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#a855f7",
                }}
              >
                <Layers size={18} />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
                Multivariate Isolation Forest
              </h3>
            </div>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, flex: 1, fontFamily: "var(--font-sans)" }}>
              Unsupervised multi-dimensional tree isolation across temperature, pressure, and humidity gradients
              (ΔT, ΔP, ΔH) to catch non-linear multi-sensor drift.
            </p>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                borderTop: "1px solid var(--border-card)",
                paddingTop: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Algorithm: Isolation Trees (iForest)</span>
              <span style={{ color: "#a855f7" }}>Unsupervised ML</span>
            </div>
          </div>

          {/* Technique 4 */}
          <div
            style={{
              backgroundColor: "var(--surface-container, #121b2e)",
              border: "1px solid var(--border-card)",
              borderRadius: "14px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(56, 189, 248, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-cyan)",
                }}
              >
                <Mountain size={18} />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
                Hypsometric Lapse Rates &amp; Kriging
              </h3>
            </div>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, flex: 1, fontFamily: "var(--font-sans)" }}>
              Adjusts spatial neighbor telemetry across elevations using dry adiabatic lapse rates (-6.5°C/km)
              and barometric equations (-11 hPa / 100m) before checking spatial consensus.
            </p>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                borderTop: "1px solid var(--border-card)",
                paddingTop: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Physics: Dry Adiabatic + Hypsometric</span>
              <span style={{ color: "var(--accent-cyan)" }}>Atmospheric Physics</span>
            </div>
          </div>

          {/* Technique 5 */}
          <div
            style={{
              backgroundColor: "var(--surface-container, #121b2e)",
              border: "1px solid var(--border-card)",
              borderRadius: "14px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(244, 63, 94, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f43f5e",
                }}
              >
                <Sparkles size={18} />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
                Explainable AI &amp; SHAP Attribution
              </h3>
            </div>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, flex: 1, fontFamily: "var(--font-sans)" }}>
              Computes Shapley feature attributions (SHAP values) for flagged parameters and automatically synthesizes
              zero-jargon meteorological domain narratives explaining why an alert was triggered.
            </p>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                borderTop: "1px solid var(--border-card)",
                paddingTop: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Attribution: Tree &amp; Kernel SHAP</span>
              <span style={{ color: "#f43f5e" }}>Explainable AI</span>
            </div>
          </div>

          {/* Technique 6 */}
          <div
            style={{
              backgroundColor: "var(--surface-container, #121b2e)",
              border: "1px solid var(--border-card)",
              borderRadius: "14px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(245, 158, 11, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f59e0b",
                }}
              >
                <BarChart3 size={18} />
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)" }}>
                Sensor Health Index &amp; RUL Forecasting
              </h3>
            </div>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0, flex: 1, fontFamily: "var(--font-sans)" }}>
              Calculates continuous 0-100 sensor health scores, degradation velocity, and Remaining Useful Life
              (RUL) schedules so field teams can service stations before in-situ sensor failures happen.
            </p>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                borderTop: "1px solid var(--border-card)",
                paddingTop: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Metric: 0-100 Health Score &amp; RUL</span>
              <span style={{ color: "#f59e0b" }}>Predictive Prognostics</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
