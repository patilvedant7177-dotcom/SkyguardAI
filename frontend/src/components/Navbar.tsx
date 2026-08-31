import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Activity, Radio, MapPin, AlertTriangle, ShieldCheck, History as HistoryIcon } from "lucide-react";
import { fetchHealth } from "../api";

export const Navbar: React.FC = () => {
  const [healthOk, setHealthOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetchHealth()
      .then((res) => setHealthOk(res.status === "ok"))
      .catch(() => setHealthOk(false));
    const interval = setInterval(() => {
      fetchHealth()
        .then((res) => setHealthOk(res.status === "ok"))
        .catch(() => setHealthOk(false));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: "/", label: "Network Overview", icon: MapPin },
    { to: "/alerts", label: "Live Alerts", icon: Radio },
    { to: "/station/1", label: "Station Detail", icon: Activity },
    { to: "/why-flagged/101", label: "Why Flagged", icon: AlertTriangle },
    { to: "/health/1", label: "Sensor Health", icon: ShieldCheck },
    { to: "/history", label: "History", icon: HistoryIcon },
  ];

  return (
    <header
      style={{
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        background: "rgba(11, 15, 25, 0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        padding: "0.75rem 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Brand & System Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #0284c7, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 12px rgba(56, 189, 248, 0.4)",
              }}
            >
              <Radio size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#f8fafc" }}>
                SKYGUARD<span style={{ color: "#38bdf8" }}>.AI</span>
              </div>
              <div style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Atmospheric Defense Core
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 500,
              background: healthOk
                ? "rgba(16, 185, 129, 0.1)"
                : healthOk === false
                ? "rgba(244, 63, 94, 0.1)"
                : "rgba(100, 116, 139, 0.1)",
              border: `1px solid ${
                healthOk
                  ? "rgba(16, 185, 129, 0.3)"
                  : healthOk === false
                  ? "rgba(244, 63, 94, 0.3)"
                  : "rgba(100, 116, 139, 0.3)"
              }`,
              color: healthOk ? "#34d399" : healthOk === false ? "#fb7185" : "#94a3b8",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: healthOk ? "#10b981" : healthOk === false ? "#f43f5e" : "#94a3b8",
                display: "inline-block",
                boxShadow: healthOk ? "0 0 6px #10b981" : "none",
              }}
            />
            {healthOk ? "API ONLINE" : healthOk === false ? "API UNREACHABLE" : "CONNECTING..."}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  backgroundColor: isActive ? "rgba(56, 189, 248, 0.12)" : "transparent",
                  border: `1px solid ${isActive ? "rgba(56, 189, 248, 0.35)" : "transparent"}`,
                  boxShadow: isActive ? "0 0 12px rgba(56, 189, 248, 0.15)" : "none",
                })}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
