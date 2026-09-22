import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  Upload,
  X,
  FileText,
  Database,
  CheckCircle2,
  AlertCircle,
  Radio,
  MapPin,
  Mountain,
  Compass,
  ArrowRight,
  Sparkles,
  Map as MapIcon,
} from "lucide-react";
import { uploadStation } from "../api";
import type { AddStationResponse } from "../types";

interface AddStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (stationResponse: AddStationResponse) => void;
}

const PRESETS = [
  {
    name: "Bharati Research Station",
    lat: -69.4075,
    lon: 76.1906,
    elev: 35,
    region: "Antarctica (Larsemann Hills)",
  },
  {
    name: "Himansh High-Altitude AWS",
    lat: 32.4042,
    lon: 77.6167,
    elev: 4080,
    region: "Himalayas (Spiti Valley)",
  },
  {
    name: "IMD Pune Central Observatory",
    lat: 18.5204,
    lon: 73.8567,
    elev: 560,
    region: "Maharashtra, India",
  },
  {
    name: "Maitri Station AWS-2",
    lat: -70.7600,
    lon: 11.7400,
    elev: 120,
    region: "Antarctica (Schirmacher Oasis)",
  },
];

const REGION_JUMPS = [
  { label: "India", center: [20.5937, 78.9629] as [number, number], zoom: 4 },
  { label: "Antarctica", center: [-75.0, 45.0] as [number, number], zoom: 3 },
  { label: "Himalayas", center: [31.5, 78.5] as [number, number], zoom: 6 },
  { label: "Global View", center: [20.0, 0.0] as [number, number], zoom: 2 },
];

const pickerIcon = L.divIcon({
  className: "custom-picker-marker",
  html: `
    <div style="
      width: 26px;
      height: 26px;
      background: #0284c7;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// Map event listener for clicking & dragging on the mini picker map
const LocationPickerEvents: React.FC<{
  onLocationSelect: (lat: number, lng: number) => void;
  selectedPos: [number, number] | null;
}> = ({ onLocationSelect, selectedPos }) => {
  const map = useMap();

  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (selectedPos) {
      map.panTo(selectedPos, { animate: true });
    }
  }, [selectedPos, map]);

  return selectedPos ? (
    <Marker
      position={selectedPos}
      icon={pickerIcon}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          onLocationSelect(pos.lat, pos.lng);
        },
      }}
    />
  ) : null;
};

// Map controller for jumping between world regions in mini map
const MapRegionController: React.FC<{ target: { center: [number, number]; zoom: number } | null }> = ({
  target,
}) => {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target.center, target.zoom, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
};

export const AddStationModal: React.FC<AddStationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();

  // Form State
  const [stationName, setStationName] = useState("");
  const [stationId, setStationId] = useState<string>("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [elevation, setElevation] = useState<string>("");

  // Map Picker State
  const [mapRegionTarget, setMapRegionTarget] = useState<{
    center: [number, number];
    zoom: number;
  } | null>(null);

  // Files
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [ncFile, setNcFile] = useState<File | null>(null);

  // Status & Progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AddStationResponse | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const ncInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);
  const hasValidCoords =
    !isNaN(latNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    !isNaN(lonNum) &&
    lonNum >= -180 &&
    lonNum <= 180;

  const selectedPos: [number, number] | null = hasValidCoords ? [latNum, lonNum] : null;

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat.toFixed(4));
    setLongitude(lng.toFixed(4));
    if (!elevation) {
      setElevation("100");
    }
  };

  const handlePresetSelect = (preset: (typeof PRESETS)[0]) => {
    setStationName(preset.name);
    setLatitude(preset.lat.toString());
    setLongitude(preset.lon.toString());
    setElevation(preset.elev.toString());
    setMapRegionTarget({ center: [preset.lat, preset.lon], zoom: 6 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!stationName.trim()) {
      setErrorMsg("Station Name is required.");
      return;
    }
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const elev = parseFloat(elevation);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setErrorMsg("Please enter a valid Latitude between -90 and 90.");
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setErrorMsg("Please enter a valid Longitude between -180 and 180.");
      return;
    }
    if (isNaN(elev)) {
      setErrorMsg("Please enter a valid Elevation in meters.");
      return;
    }
    if (!csvFile) {
      setErrorMsg("Please select a valid CSV telemetry dataset file (.csv).");
      return;
    }
    if (!ncFile) {
      setErrorMsg("Please select a valid NetCDF dataset file (.nc).");
      return;
    }

    try {
      setIsSubmitting(true);
      setCurrentStep("Uploading telemetry datasets (.csv & .nc)...");

      const formData = new FormData();
      formData.append("name", stationName.trim());
      formData.append("latitude", lat.toString());
      formData.append("longitude", lon.toString());
      formData.append("elevation", elev.toString());
      if (stationId.trim()) {
        formData.append("station_id", stationId.trim());
      }
      formData.append("csv_file", csvFile);
      formData.append("nc_file", ncFile);

      setTimeout(() => {
        if (isSubmitting) setCurrentStep("Cross-profiling CSV schema & NetCDF coordinates...");
      }, 700);
      setTimeout(() => {
        if (isSubmitting) setCurrentStep("Cleaning records & validating physical atmospheric bounds...");
      }, 1400);
      setTimeout(() => {
        if (isSubmitting) setCurrentStep("Engineering causal lag/rolling features & evaluating anomalies...");
      }, 2100);

      const resp = await uploadStation(formData);
      setResult(resp);
      onSuccess(resp);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process and ingest station datasets.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStationName("");
    setStationId("");
    setLatitude("");
    setLongitude("");
    setElevation("");
    setCsvFile(null);
    setNcFile(null);
    setErrorMsg(null);
    setResult(null);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "840px",
          maxHeight: "94vh",
          overflowY: "auto",
          borderRadius: "16px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-card-bright)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 35px rgba(56, 189, 248, 0.15)",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 15px rgba(56, 189, 248, 0.4)",
              }}
            >
              <Radio size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Register New AWS Ground Station
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Add telemetry sensor node with NetCDF grid dataset and timeseries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-icon"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              padding: "0.85rem 1.2rem",
              borderRadius: "10px",
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              color: "#fb7185",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Card Result */}
        {result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div
              style={{
                padding: "1.25rem",
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle2 size={24} color="#10b981" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#34d399" }}>
                    AWS Station Successfully Ingested!
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    {result.station.name} (ID: #{result.station.id}) is now active on the global atmospheric defense map.
                  </div>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "0.75rem",
                  background: "rgba(100, 116, 139, 0.08)",
                  border: "1px solid var(--border-card)",
                  padding: "0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Ingested Rows:</span>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                    {result.profiling_summary.csv_rows.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Date Range:</span>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", marginTop: "2px", fontSize: "0.75rem" }}>
                    {result.profiling_summary.date_range.start.slice(0, 10)} to {result.profiling_summary.date_range.end.slice(0, 10)}
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>NetCDF Vars:</span>
                  <div style={{ fontWeight: 600, color: "var(--accent-cyan)", marginTop: "2px" }}>
                    {result.profiling_summary.nc_variables.join(", ") || "Standard"}
                  </div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Health Score:</span>
                  <div style={{ fontWeight: 700, color: "var(--accent-emerald)", marginTop: "2px" }}>
                    {result.health.health_score}/100 ({result.health.trend})
                  </div>
                </div>
              </div>
            </div>

            {/* Next Step Action Buttons */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleReset}
                className="btn-glass"
                style={{ padding: "8px 16px" }}
              >
                Upload Another Station
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/station/${result.station.id}`);
                }}
                className="btn-glow btn-shimmer"
                style={{ padding: "8px 20px" }}
              >
                <span>View Telemetry Details</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Quick Presets & Quick Jump Toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#94a3b8" }}>
                <Sparkles size={13} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Quick Presets:</span>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className="btn-glass btn-pill"
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.72rem",
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Leaflet Map Location Picker */}
            <div
              style={{
                borderRadius: "10px",
                border: "1px solid var(--border-card)",
                overflow: "hidden",
                position: "relative",
                background: "#0f172a",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  zIndex: 400,
                  background: "var(--bg-card)",
                  backdropFilter: "blur(6px)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-card)",
                  fontSize: "0.72rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "var(--text-primary)",
                }}
              >
                <MapIcon size={13} color="var(--accent-cyan)" />
                <span>Click or drag marker on map to set coordinates</span>
              </div>

              {/* Region Jump Buttons Overlay */}
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  zIndex: 400,
                  display: "flex",
                  gap: "4px",
                }}
              >
                {REGION_JUMPS.map((reg) => (
                  <button
                    key={reg.label}
                    type="button"
                    onClick={() => setMapRegionTarget({ center: reg.center, zoom: reg.zoom })}
                    style={{
                      background: "var(--bg-card)",
                      backdropFilter: "blur(6px)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "4px",
                      padding: "3px 8px",
                      fontSize: "0.7rem",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                    }}
                  >
                    {reg.label}
                  </button>
                ))}
              </div>

              {/* Mini Map */}
              <div style={{ height: "200px", width: "100%" }}>
                <MapContainer
                  center={selectedPos || [20.5937, 78.9629]}
                  zoom={selectedPos ? 5 : 3}
                  scrollWheelZoom={true}
                  style={{ width: "100%", height: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationPickerEvents
                    onLocationSelect={handleMapLocationSelect}
                    selectedPos={selectedPos}
                  />
                  <MapRegionController target={mapRegionTarget} />
                </MapContainer>
              </div>

              {/* Selected Coordinates Status Pill */}
              <div
                style={{
                  position: "absolute",
                  bottom: "8px",
                  left: "8px",
                  right: "8px",
                  zIndex: 400,
                  background: "rgba(11, 15, 25, 0.9)",
                  backdropFilter: "blur(8px)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  fontSize: "0.75rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8" }}>
                  <MapPin size={13} />
                  <span>
                    Selected: {hasValidCoords ? `${latNum.toFixed(4)}° N, ${lonNum.toFixed(4)}° E` : "Click anywhere on map to pin station"}
                  </span>
                </div>
                {hasValidCoords && (
                  <span style={{ color: "#34d399", fontWeight: 600, fontSize: "0.7rem" }}>
                    PIN ACTIVE
                  </span>
                )}
              </div>
            </div>

            {/* Metadata Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Station Name *
                </label>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  placeholder="e.g. Bharati Polar AWS"
                  required
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Station ID (Optional)
                </label>
                <input
                  type="number"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  placeholder="Auto-assigned"
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            </div>

            {/* Coordinates Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  <MapPin size={13} color="#38bdf8" />
                  <span>Latitude (°N) *</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-70.7503"
                  required
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  <Compass size={13} color="#38bdf8" />
                  <span>Longitude (°E) *</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="11.7355"
                  required
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  <Mountain size={13} color="#38bdf8" />
                  <span>Elevation (m) *</span>
                </label>
                <input
                  type="number"
                  step="1"
                  value={elevation}
                  onChange={(e) => setElevation(e.target.value)}
                  placeholder="117"
                  required
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            </div>

            {/* Dual File Upload Dropzones */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* CSV Upload Dropzone */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Telemetry CSV File (.csv) *
                </label>
                <div
                  onClick={() => !isSubmitting && csvInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${csvFile ? "#38bdf8" : "var(--border-card)"}`,
                    borderRadius: "10px",
                    padding: "1rem",
                    textAlign: "center",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    background: csvFile ? "rgba(56, 189, 248, 0.08)" : "var(--bg-card)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCsvFile(e.target.files[0]);
                      }
                    }}
                  />
                  <FileText
                    size={24}
                    color={csvFile ? "#38bdf8" : "var(--text-muted)"}
                    style={{ margin: "0 auto 6px" }}
                  />
                  {csvFile ? (
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {csvFile.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {(csvFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                        Click to select CSV
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Contains obstime, temp, pressure, wind, rh
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* NetCDF Upload Dropzone */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  NetCDF File (.nc) *
                </label>
                <div
                  onClick={() => !isSubmitting && ncInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${ncFile ? "#a855f7" : "var(--border-card)"}`,
                    borderRadius: "10px",
                    padding: "1rem",
                    textAlign: "center",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    background: ncFile ? "rgba(168, 85, 247, 0.08)" : "var(--bg-card)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <input
                    ref={ncInputRef}
                    type="file"
                    accept=".nc,application/x-netcdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNcFile(e.target.files[0]);
                      }
                    }}
                  />
                  <Database
                    size={24}
                    color={ncFile ? "#a855f7" : "var(--text-muted)"}
                    style={{ margin: "0 auto 6px" }}
                  />
                  {ncFile ? (
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {ncFile.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {(ncFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                        Click to select NetCDF
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Spatial weather grid tensor
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* Submitting Progress Indicator */}
            {isSubmitting && (
              <div
                style={{
                  padding: "0.85rem",
                  borderRadius: "10px",
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    border: "2px solid rgba(56, 189, 248, 0.3)",
                    borderTopColor: "#38bdf8",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <div style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>
                  <div style={{ fontWeight: 600, color: "#38bdf8" }}>Ingesting Datasets...</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{currentStep}</div>
                </div>
              </div>
            )}

            {/* Form Action Buttons */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn-glass"
                style={{ padding: "8px 16px" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-glow btn-shimmer"
                style={{
                  padding: "8px 20px",
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                <Upload size={16} />
                <span>{isSubmitting ? "Processing..." : "Ingest & Register Station"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
