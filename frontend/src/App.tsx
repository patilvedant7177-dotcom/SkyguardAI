import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import NetworkOverview from "./pages/NetworkOverview";
import LiveAlerts from "./pages/LiveAlerts";
import StationDetail from "./pages/StationDetail";
import WhyFlagged from "./pages/WhyFlagged";
import SensorHealth from "./pages/SensorHealth";
import History from "./pages/History";

const App: React.FC = () => {
  return (
    <Router>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <main
          style={{
            flex: 1,
            maxWidth: "1400px",
            width: "100%",
            margin: "0 auto",
            padding: "1.5rem",
            boxSizing: "border-box",
          }}
        >
          <Routes>
            <Route path="/" element={<NetworkOverview />} />
            <Route path="/alerts" element={<LiveAlerts />} />
            <Route path="/station/:stationId" element={<StationDetail />} />
            <Route path="/why-flagged/:alertId" element={<WhyFlagged />} />
            <Route path="/health/:stationId" element={<SensorHealth />} />
            <Route path="/history" element={<History />} />
            {/* Fallback to NetworkOverview */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
