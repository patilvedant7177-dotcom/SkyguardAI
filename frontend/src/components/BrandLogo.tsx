import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  showSubtitle = false,
  className = "",
}) => {
  const iconSize = size === "sm" ? 32 : size === "lg" ? 52 : 40;
  const titleSize = size === "sm" ? "1.2rem" : size === "lg" ? "2.1rem" : "1.55rem";

  return (
    <div
      className={`brand-logo-container ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? "0.75rem" : "1rem",
        textDecoration: "none",
        userSelect: "none",
      }}
    >
      {/* Precision Crosshair Target Radar Icon with Cyan/Emerald Emblem & White Diamond */}
      <div
        style={{
          width: iconSize,
          height: iconSize,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Target Background Disc */}
          <circle cx="22" cy="22" r="20" fill="#060c18" stroke="rgba(34, 211, 238, 0.2)" strokeWidth="1" />
          
          {/* Dashed outer radar ring */}
          <circle cx="22" cy="22" r="16" stroke="rgba(34, 211, 238, 0.35)" strokeWidth="1.2" strokeDasharray="3 3" />

          {/* Crosshair target ticks at 12, 3, 6, 9 o'clock */}
          <line x1="22" y1="2" x2="22" y2="8" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="22" y1="36" x2="22" y2="42" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="2" y1="22" x2="8" y2="22" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="36" y1="22" x2="42" y2="22" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />

          {/* Top Chevron Segment (Electric Cyan) */}
          <path
            d="M 22 9 L 29 16 L 25 20 L 22 17 L 19 20 L 15 16 Z"
            fill="#22d3ee"
            filter="drop-shadow(0px 0px 6px rgba(34, 211, 238, 0.8))"
          />

          {/* Bottom Chevron Segment (Pulse Emerald) */}
          <path
            d="M 22 35 L 15 28 L 19 24 L 22 27 L 25 24 L 29 28 Z"
            fill="#10b981"
            filter="drop-shadow(0px 0px 6px rgba(16, 185, 129, 0.8))"
          />

          {/* Center Glowing White Diamond */}
          <polygon
            points="22,18 25.5,22 22,26 18.5,22"
            fill="#ffffff"
            filter="drop-shadow(0px 0px 5px #ffffff)"
          />
        </svg>
      </div>

      {/* Typography: Futuristic Glowing SKYGUARD AI */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          className="brand-audiowide"
          style={{
            fontSize: titleSize,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "0.08em",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            textShadow:
              "0 0 10px rgba(34, 211, 238, 0.6), 0 0 20px rgba(34, 211, 238, 0.35)",
          }}
        >
          <span>SKYGUARD</span>
          <span
            style={{
              color: "var(--accent-cyan)",
              textShadow:
                "0 0 10px rgba(56, 189, 248, 0.7), 0 0 22px rgba(56, 189, 248, 0.4)",
            }}
          >
            AI
          </span>
        </div>
        {showSubtitle && (
          <span
            style={{
              fontSize: "0.68rem",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              marginTop: "4px",
            }}
          >
            Atmospheric Intelligence &amp; Sensor Telemetry
          </span>
        )}
      </div>
    </div>
  );
};
