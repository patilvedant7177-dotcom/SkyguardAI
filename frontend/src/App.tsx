import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import NetworkOverview from "./pages/NetworkOverview";
import LiveAlerts from "./pages/LiveAlerts";
import StationDetail from "./pages/StationDetail";
import WhyFlagged from "./pages/WhyFlagged";
import SensorHealth from "./pages/SensorHealth";
import History from "./pages/History";

const AppContent: React.FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Unified Persistent Navbar across all pages */}
      <Navbar />

      <main
        style={{
          flex: 1,
          maxWidth: "1440px",
          width: "100%",
          margin: "0 auto",
          padding: "1.5rem",
          boxSizing: "border-box",
        }}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/overview" element={<NetworkOverview />} />
          <Route path="/dashboard" element={<NetworkOverview />} />
          <Route path="/alerts" element={<LiveAlerts />} />
          <Route path="/station/:stationId" element={<StationDetail />} />
          <Route path="/why-flagged/:alertId" element={<WhyFlagged />} />
          <Route path="/health/:stationId" element={<SensorHealth />} />
          <Route path="/history" element={<History />} />
          {/* Fallback to LandingPage */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
