import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export type ThemeMode = "midnight" | "daylight";

export const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("skyguard-theme");
    return saved === "daylight" ? "daylight" : "midnight";
  });

  const isLight = theme === "daylight";

  // Synchronize data-theme on html & body tags and persist in localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("skyguard-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "daylight" ? "midnight" : "daylight"));
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn-glass"
      title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
      aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "8px",
        fontSize: "0.82rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        border: "1px solid var(--border-card)",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
      }}
    >
      {isLight ? (
        <>
          <Moon size={15} style={{ color: "var(--accent-cyan)" }} />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun size={15} style={{ color: "#fbbf24" }} />
          <span>Light Mode</span>
        </>
      )}
    </button>
  );
};

export default ThemeSwitcher;
