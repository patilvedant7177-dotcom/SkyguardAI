import React, { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  Activity,
  Radio,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  History as HistoryIcon,
  Wifi,
  WifiOff,
} from "lucide-react";
import { fetchHealth } from "../api";
import { ThemeSwitcher } from "./ThemeSwitcher";

export const Navbar: React.FC = () => {
  const [healthOk, setHealthOk] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      fetchHealth()
        .then((res) => setHealthOk(res.status === "ok"))
        .catch(() => setHealthOk(false));
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
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
    <header className="app-navbar-header">
      <div className="app-navbar-container">
        {/* Brand & System Status */}
        <div className="navbar-brand-section">
          <Link to="/" className="navbar-logo-wrapper">
            <div className="navbar-logo-icon">
              <Radio size={20} color="#ffffff" />
            </div>
            <div>
              <div className="navbar-title">
                SKYGUARD<span>.AI</span>
              </div>
            </div>
          </Link>

          <div
            className={`navbar-status-badge ${
              healthOk ? "online" : healthOk === false ? "unreachable" : "connecting"
            }`}
          >
            {healthOk ? (
              <Wifi size={12} style={{ animation: "pulse-glow 2s infinite" }} />
            ) : healthOk === false ? (
              <WifiOff size={12} />
            ) : (
              <span className="navbar-status-dot" />
            )}
            <span>
              {healthOk
                ? "CORE ONLINE"
                : healthOk === false
                ? "DISCONNECTED"
                : "INITIALIZING"}
            </span>
          </div>
        </div>

        {/* Navigation Tabs & Theme Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <nav>
            <ul className="navbar-nav-list">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to} style={{ listStyle: "none" }}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        `navbar-nav-item ${isActive ? "active" : ""}`
                      }
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
};

