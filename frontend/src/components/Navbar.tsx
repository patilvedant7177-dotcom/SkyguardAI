import React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  Activity,
  Radio,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  History as HistoryIcon,
  Compass,
  Layers,
  Cpu,
  Home,
} from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BrandLogo } from "./BrandLogo";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const isCommandCenter = location.pathname === "/";

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const appNavItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/overview", label: "Network Overview", icon: MapPin },
    { to: "/alerts", label: "Live Alerts", icon: Radio },
    { to: "/station/11", label: "Station Detail", icon: Activity },
    { to: "/why-flagged/101", label: "Why Flagged", icon: AlertTriangle },
    { to: "/health/11", label: "Sensor Health", icon: ShieldCheck },
    { to: "/history", label: "Audit & History", icon: HistoryIcon },
  ];

  const commandCenterNavItems = [
    { id: "hero-section", label: "Overview", icon: Compass },
    { id: "how-it-works", label: "How It Works", icon: Activity },
    { id: "observation", label: "Observation", icon: Layers },
    { id: "techniques", label: "Techniques", icon: Cpu },
  ];

  return (
    <header className="app-navbar-header">
      <div className="app-navbar-container">
        {/* Brand */}
        <div className="navbar-brand-section">
          <Link to="/" style={{ textDecoration: "none" }}>
            <BrandLogo size="sm" showSubtitle={false} />
          </Link>
        </div>

        {/* Centered Navigation Tabs */}
        <nav className="navbar-nav-center">
          {isCommandCenter ? (
            /* Command Center Navigation: Overview, How It Works, Observation, Techniques */
            <ul className="navbar-nav-list">
              {commandCenterNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} style={{ listStyle: "none" }}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      className="navbar-nav-item"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      <Icon size={15} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            /* Standard Application Navigation across subpages */
            <ul className="navbar-nav-list">
              {appNavItems.map((item) => {
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
                      <Icon size={15} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* Right Actions: Theme Switcher */}
        <div className="navbar-actions-section">
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
};
