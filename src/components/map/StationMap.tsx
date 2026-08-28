import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import type { Station, StationStatus } from "../../types/api";
import { StatusDot } from "../ui/StatusDot";
import { formatRelativeTime } from "../../lib/format";

const STATUS_HEX: Record<StationStatus, string> = {
  normal: "#34d399",
  degrading: "#f5a524",
  fault: "#f87171",
  offline: "#64748b",
};

function buildIcon(status: StationStatus, pulse: boolean) {
  const color = STATUS_HEX[status];
  const html = renderToStaticMarkup(
    <span style={{ position: "relative", display: "block", width: 16, height: 16 }}>
      {pulse && (
        <span
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "999px",
            background: color,
            opacity: 0.35,
          }}
          className="sg-live-dot"
        />
      )}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "999px",
          background: color,
          border: "2px solid rgba(10,13,18,0.9)",
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </span>,
  );

  return L.divIcon({
    html,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

const LEGEND_ITEMS: { status: StationStatus; label: string }[] = [
  { status: "normal", label: "Normal" },
  { status: "degrading", label: "Degrading" },
  { status: "fault", label: "Fault" },
  { status: "offline", label: "Offline" },
];

interface StationMapProps {
  stations: Station[];
}

export function StationMap({ stations }: StationMapProps) {
  const navigate = useNavigate();

  // Maharashtra-ish center so the initial view frames the network.
  const center: [number, number] = [19.4, 75.8];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: "var(--color-void-raised)" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stations.map((station) => (
          <Marker
            key={station.station_id}
            position={[station.lat, station.lon]}
            icon={buildIcon(station.status, station.status === "normal")}
            eventHandlers={{
              click: () => navigate(`/stations/${station.station_id}`),
            }}
          >
            <Popup>
              <div className="min-w-[160px]">
                <div className="flex items-center gap-2">
                  <StatusDot status={station.status} />
                  <span className="text-sm font-medium">{station.name}</span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  Last reading {formatRelativeTime(station.last_reading_at)}
                </p>
                <button
                  onClick={() => navigate(`/stations/${station.station_id}`)}
                  className="mt-2 text-xs font-medium text-signal hover:underline"
                >
                  View station detail →
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="glass-panel-raised pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-xl px-3 py-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
          Station status
        </p>
        <div className="flex flex-col gap-1">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.status} className="flex items-center gap-1.5">
              <StatusDot status={item.status} />
              <span className="text-xs text-ink-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
