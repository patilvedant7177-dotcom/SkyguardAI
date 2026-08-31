import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { fetchStations } from "../api";
import type { Station, StationStatus } from "../types";
import { Activity, ShieldCheck, Layers, Radio, Compass, Mountain, AlertTriangle } from "lucide-react";

const getStatusColor = (status: StationStatus) => {
  switch (status) {
    case "normal":
      return "#10b981";
    case "degrading":
      return "#f59e0b";
    case "fault":
      return "#f43f5e";
    case "offline":
    default:
      return "#64748b";
  }
};

const createCustomIcon = (status: StationStatus) => {
  const color = getStatusColor(status);
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 22px;
        height: 22px;
        background: ${color};
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 10px ${color}, inset 0 0 4px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 6px; height: 6px; background: #ffffff; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

const NetworkOverview: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    fetchStations()
      .then((data) => setStations(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredStations = stations.filter((s) =>
    selectedStatus === "all" ? true : s.status === selectedStatus
  );

  const defaultCenter: [number, number] =
    stations.length > 0 ? [stations[0].latitude, stations[0].longitude] : [40.0, -105.0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header & Metrics Banner */}
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
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Network Overview
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
            Global geospatial telemetry and atmospheric monitoring array
          </p>
        </div>

        {/* Status Filters */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {["all", "normal", "degrading", "fault", "offline"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={selectedStatus === status ? "btn-primary" : "btn-secondary"}
              style={{ textTransform: "capitalize", fontSize: "0.8rem", padding: "5px 12px" }}
            >
              {status === "all" ? "All Stations" : status}
              <span
                style={{
                  fontSize: "0.75rem",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "9999px",
                  padding: "1px 6px",
                  marginLeft: "4px",
                }}
              >
                {status === "all"
                  ? stations.length
                  : stations.filter((s) => s.status === status).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <Radio size={32} className="live-pulse" style={{ marginBottom: "1rem", color: "var(--accent-cyan)" }} />
          <div>Scanning telemetry nodes...</div>
        </div>
      )}

      {error && (
        <div className="glass-panel" style={{ padding: "2rem", borderColor: "rgba(244, 63, 94, 0.4)", color: "#fb7185" }}>
          <AlertTriangle size={24} style={{ marginBottom: "0.5rem" }} />
          <div>Failed to connect to station registry: {error}</div>
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem" }}>
          {/* Map Area */}
          <div
            className="glass-panel"
            style={{
              height: "580px",
              padding: "8px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                zIndex: 400,
                background: "rgba(15, 23, 42, 0.85)",
                backdropFilter: "blur(8px)",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-card)",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Layers size={14} color="var(--accent-cyan)" />
              <span>SATELLITE TELEMETRY OVERLAY</span>
            </div>

            <MapContainer
              center={defaultCenter}
              zoom={5}
              scrollWheelZoom={true}
              style={{ width: "100%", height: "100%", borderRadius: "8px" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredStations.map((station) => (
                <Marker
                  key={station.id}
                  position={[station.latitude, station.longitude]}
                  icon={createCustomIcon(station.status)}
                >
                  <Popup>
                    <div style={{ padding: "4px", minWidth: "180px", color: "#f8fafc" }}>
                      <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "4px" }}>
                        {station.name}
                      </div>
                      <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                        <span className={`badge badge-${station.status}`}>{station.status}</span>
                        <span className="badge badge-low">{station.source}</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                        <div><strong>Coords:</strong> {station.latitude.toFixed(2)}, {station.longitude.toFixed(2)}</div>
                        <div><strong>Elevation:</strong> {station.elevation}m</div>
                      </div>
                      <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                        <Link
                          to={`/station/${station.id}`}
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            background: "var(--accent-cyan)",
                            color: "#0f172a",
                            textAlign: "center",
                            borderRadius: "4px",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          Telemetry
                        </Link>
                        <Link
                          to={`/health/${station.id}`}
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            background: "rgba(255,255,255,0.1)",
                            color: "#f8fafc",
                            textAlign: "center",
                            borderRadius: "4px",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          Health
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Station Cards Sidebar List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "580px", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Registered Stations</h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Showing {filteredStations.length} nodes
              </span>
            </div>

            {filteredStations.map((station) => (
              <div
                key={station.id}
                className="glass-panel"
                style={{
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  borderLeft: `4px solid ${getStatusColor(station.status)}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>{station.name}</h3>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Node ID #{station.id}</div>
                  </div>
                  <span className={`badge badge-${station.status}`}>{station.status}</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                    background: "rgba(15, 23, 42, 0.5)",
                    padding: "8px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-secondary)" }}>
                    <Compass size={13} color="var(--accent-cyan)" />
                    <span>{station.latitude}° N, {station.longitude}° W</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-secondary)" }}>
                    <Mountain size={13} color="var(--accent-amber)" />
                    <span>{station.elevation}m ASL</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "2px" }}>
                  <Link
                    to={`/station/${station.id}`}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: "center", fontSize: "0.75rem", padding: "5px" }}
                  >
                    <Activity size={13} />
                    <span>72h Telemetry</span>
                  </Link>
                  <Link
                    to={`/health/${station.id}`}
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: "center", fontSize: "0.75rem", padding: "5px" }}
                  >
                    <ShieldCheck size={13} />
                    <span>Sensor Health</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkOverview;
