import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { fetchStations } from "../api";
import type { Station, StationStatus, AddStationResponse } from "../types";
import {
  Activity,
  ShieldCheck,
  Layers,
  Radio,
  Compass,
  Mountain,
  AlertTriangle,
  Plus,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { AddStationModal } from "../components/AddStationModal";

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

const createCustomIcon = (status: StationStatus, isFocused: boolean = false) => {
  const color = getStatusColor(status);
  const size = isFocused ? 28 : 22;
  const pulseClass = isFocused ? "animation: pulse 1.5s infinite;" : "";
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: ${isFocused ? "3px solid #38bdf8" : "2px solid #ffffff"};
        border-radius: 50%;
        box-shadow: 0 0 ${isFocused ? "20px #38bdf8" : "10px " + color}, inset 0 0 4px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        ${pulseClass}
      ">
        <div style="width: ${isFocused ? "8px" : "6px"}; height: ${isFocused ? "8px" : "6px"}; background: #ffffff; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Map controller to smoothly fly to focused station or fit all stations
const MapViewController: React.FC<{
  targetStation: Station | null;
  allStations: Station[];
  fitAllTrigger: number;
}> = ({ targetStation, allStations, fitAllTrigger }) => {
  const map = useMap();

  useEffect(() => {
    if (targetStation) {
      map.flyTo([targetStation.latitude, targetStation.longitude], 6, {
        duration: 1.5,
      });
    }
  }, [targetStation, map]);

  useEffect(() => {
    if (fitAllTrigger > 0 && allStations.length > 0) {
      if (allStations.length === 1) {
        map.flyTo([allStations[0].latitude, allStations[0].longitude], 5, { duration: 1.2 });
      } else {
        const bounds = L.latLngBounds(allStations.map((s) => [s.latitude, s.longitude]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
      }
    }
  }, [fitAllTrigger, allStations, map]);

  return null;
};

const NetworkOverview: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [focusedStation, setFocusedStation] = useState<Station | null>(null);
  const [fitAllTrigger, setFitAllTrigger] = useState(0);
  const [newlyAddedStationId, setNewlyAddedStationId] = useState<number | null>(null);

  const loadStations = async (selectStationId?: number) => {
    try {
      const data = await fetchStations();
      setStations(data);
      if (selectStationId) {
        const found = data.find((s) => s.id === selectStationId);
        if (found) {
          setFocusedStation(found);
          setNewlyAddedStationId(found.id);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const handleStationAdded = (resp: AddStationResponse) => {
    setSelectedStatus("all");
    loadStations(resp.station.id);
  };

  const filteredStations = stations.filter((s) =>
    selectedStatus === "all" ? true : s.status === selectedStatus
  );

  const defaultCenter: [number, number] =
    stations.length > 0 ? [stations[0].latitude, stations[0].longitude] : [20.0, 77.0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Add AWS Station Modal */}
      <AddStationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleStationAdded}
      />

      {/* Top Header & Metrics Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
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

          {/* Add AWS Station Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              fontSize: "0.85rem",
              background: "linear-gradient(135deg, #0284c7, #6366f1)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              boxShadow: "0 0 15px rgba(56, 189, 248, 0.25)",
            }}
          >
            <Plus size={16} />
            <span>Add AWS Station</span>
          </button>
        </div>
      </div>

      {newlyAddedStationId && (
        <div
          style={{
            padding: "0.75rem 1.25rem",
            background: "rgba(56, 189, 248, 0.1)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8" }}>
            <Sparkles size={16} />
            <span>
              New station registered! Centered map on{" "}
              <strong>{stations.find((s) => s.id === newlyAddedStationId)?.name || `#${newlyAddedStationId}`}</strong>.
            </span>
          </div>
          <button
            onClick={() => setFitAllTrigger((prev) => prev + 1)}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid var(--border-card)",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "0.75rem",
              color: "#f8fafc",
              cursor: "pointer",
            }}
          >
            Fit Global View
          </button>
        </div>
      )}

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
            {/* Map Header Overlay & Action Buttons */}
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

            <div
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                zIndex: 400,
                display: "flex",
                gap: "6px",
              }}
            >
              <button
                onClick={() => setFitAllTrigger((prev) => prev + 1)}
                style={{
                  background: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(8px)",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-card)",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#cbd5e1",
                  cursor: "pointer",
                }}
              >
                <Maximize2 size={13} color="var(--accent-cyan)" />
                <span>Fit All Stations</span>
              </button>
            </div>

            <MapContainer
              center={defaultCenter}
              zoom={4}
              scrollWheelZoom={true}
              style={{ width: "100%", height: "100%", borderRadius: "8px" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewController
                targetStation={focusedStation}
                allStations={filteredStations}
                fitAllTrigger={fitAllTrigger}
              />
              {filteredStations.map((station) => {
                const isFocused = focusedStation?.id === station.id;
                return (
                  <Marker
                    key={station.id}
                    position={[station.latitude, station.longitude]}
                    icon={createCustomIcon(station.status, isFocused)}
                    eventHandlers={{
                      click: () => setFocusedStation(station),
                    }}
                  >
                    <Popup>
                      <div style={{ padding: "4px", minWidth: "190px", color: "#f8fafc" }}>
                        <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "4px" }}>
                          {station.name}
                        </div>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                          <span className={`badge badge-${station.status}`}>{station.status}</span>
                          <span className="badge badge-low">{station.source}</span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: "1.4" }}>
                          <div>
                            <strong>Coords:</strong> {station.latitude.toFixed(4)}°, {station.longitude.toFixed(4)}°
                          </div>
                          <div>
                            <strong>Elevation:</strong> {station.elevation}m
                          </div>
                        </div>
                        <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                          <Link
                            to={`/station/${station.id}`}
                            style={{
                              flex: 1,
                              padding: "5px 8px",
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
                              padding: "5px 8px",
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
                );
              })}
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

            {filteredStations.map((station) => {
              const isSelected = focusedStation?.id === station.id;
              return (
                <div
                  key={station.id}
                  onClick={() => setFocusedStation(station)}
                  className="glass-panel"
                  style={{
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    cursor: "pointer",
                    border: isSelected
                      ? "1px solid var(--accent-cyan)"
                      : "1px solid var(--border-card)",
                    background: isSelected
                      ? "rgba(56, 189, 248, 0.08)"
                      : "rgba(15, 23, 42, 0.4)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f8fafc" }}>
                        {station.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        Node ID: #{station.id}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span className={`badge badge-${station.status}`}>{station.status}</span>
                      <span className="badge badge-low">{station.source}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      background: "rgba(0,0,0,0.2)",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-secondary)" }}>
                      <Compass size={13} color="var(--accent-cyan)" />
                      <span>{station.latitude.toFixed(2)}°, {station.longitude.toFixed(2)}°</span>
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Activity size={13} />
                      <span>72h Telemetry</span>
                    </Link>
                    <Link
                      to={`/health/${station.id}`}
                      className="btn-secondary"
                      style={{ flex: 1, justifyContent: "center", fontSize: "0.75rem", padding: "5px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ShieldCheck size={13} />
                      <span>Sensor Health</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkOverview;
