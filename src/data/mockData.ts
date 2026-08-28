import type {
  Alert,
  Explanation,
  RootCause,
  SensorHealth,
  Severity,
  Station,
  StationStatus,
  TimeseriesResponse,
} from "../types/api";

/**
 * All mock data lives here. Nothing here is wired to the UI directly —
 * src/lib/api.ts is the only place that reads from this file, so the
 * rest of the app cannot tell the difference between mock mode and a
 * real backend.
 */

// ---------- Stations ----------
// 9 Automatic Weather Stations across Maharashtra, approximate real coordinates.

interface StationSeed {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  status: StationStatus;
}

const STATION_SEEDS: StationSeed[] = [
  { station_id: "aws-pune", name: "Pune AWS", lat: 18.5204, lon: 73.8567, status: "normal" },
  { station_id: "aws-nagpur", name: "Nagpur AWS", lat: 21.1458, lon: 79.0882, status: "normal" },
  { station_id: "aws-nashik", name: "Nashik AWS", lat: 19.9975, lon: 73.7898, status: "degrading" },
  { station_id: "aws-solapur", name: "Solapur AWS", lat: 17.6599, lon: 75.9064, status: "normal" },
  { station_id: "aws-kolhapur", name: "Kolhapur AWS", lat: 16.7050, lon: 74.2433, status: "fault" },
  { station_id: "aws-aurangabad", name: "Chhatrapati Sambhajinagar AWS", lat: 19.8762, lon: 75.3433, status: "normal" },
  { station_id: "aws-amravati", name: "Amravati AWS", lat: 20.9374, lon: 77.7796, status: "normal" },
  { station_id: "aws-ratnagiri", name: "Ratnagiri AWS", lat: 16.9902, lon: 73.3120, status: "offline" },
  { station_id: "aws-nanded", name: "Nanded AWS", lat: 19.1383, lon: 77.3210, status: "normal" },
];

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export const MOCK_STATIONS: Station[] = STATION_SEEDS.map((s) => ({
  ...s,
  // Offline/fault stations went quiet a while ago; healthy ones reported recently.
  last_reading_at:
    s.status === "offline"
      ? minutesAgoIso(180)
      : s.status === "fault"
        ? minutesAgoIso(42)
        : minutesAgoIso(Math.floor(Math.random() * 8) + 1),
}));

// ---------- Alerts ----------

interface AlertSeed {
  id: string;
  station_id: string;
  minutesAgo: number;
  confidence: number;
  severity: Severity;
  root_cause: RootCause;
  summary: string;
  parameters_flagged: Alert["parameters_flagged"];
  status: Alert["status"];
}

const ALERT_SEEDS: AlertSeed[] = [
  {
    id: "alert-001",
    station_id: "aws-kolhapur",
    minutesAgo: 14,
    confidence: 0.96,
    severity: "high",
    root_cause: "sensor_fault",
    summary: "Pressure sensor reading pegged at a constant value for 40+ minutes.",
    parameters_flagged: ["pressure"],
    status: "active",
  },
  {
    id: "alert-002",
    station_id: "aws-nashik",
    minutesAgo: 55,
    confidence: 0.78,
    severity: "medium",
    root_cause: "sensor_fault",
    summary: "Humidity readings drifting outside plausible range for local conditions.",
    parameters_flagged: ["humidity"],
    status: "active",
  },
  {
    id: "alert-003",
    station_id: "aws-ratnagiri",
    minutesAgo: 175,
    confidence: 0.99,
    severity: "high",
    root_cause: "comms_error",
    summary: "Station has not reported telemetry in over 2 hours.",
    parameters_flagged: ["temperature", "pressure", "humidity"],
    status: "acknowledged",
  },
  {
    id: "alert-004",
    station_id: "aws-nagpur",
    minutesAgo: 210,
    confidence: 0.61,
    severity: "low",
    root_cause: "genuine_event",
    summary: "Sharp temperature drop consistent with an approaching squall line.",
    parameters_flagged: ["temperature", "pressure"],
    status: "resolved",
  },
  {
    id: "alert-005",
    station_id: "aws-pune",
    minutesAgo: 340,
    confidence: 0.55,
    severity: "low",
    root_cause: "unknown",
    summary: "Brief pressure spike with no corresponding weather system in the area.",
    parameters_flagged: ["pressure"],
    status: "resolved",
  },
  {
    id: "alert-006",
    station_id: "aws-solapur",
    minutesAgo: 400,
    confidence: 0.83,
    severity: "medium",
    root_cause: "comms_error",
    summary: "Intermittent packet loss causing gaps in the temperature series.",
    parameters_flagged: ["temperature"],
    status: "resolved",
  },
];

function stationName(stationId: string): string {
  return MOCK_STATIONS.find((s) => s.station_id === stationId)?.name ?? stationId;
}

export const MOCK_ALERTS: Alert[] = ALERT_SEEDS.map((seed) => ({
  id: seed.id,
  station_id: seed.station_id,
  station_name: stationName(seed.station_id),
  timestamp: minutesAgoIso(seed.minutesAgo),
  confidence: seed.confidence,
  severity: seed.severity,
  root_cause: seed.root_cause,
  summary: seed.summary,
  parameters_flagged: seed.parameters_flagged,
  status: seed.status,
})).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

let liveAlertCounter = MOCK_ALERTS.length + 1;

/** Used by the mock SSE stream to fabricate a plausible new alert. */
export function generateMockAlert(): Alert {
  const pool = MOCK_STATIONS.filter((s) => s.status !== "offline");
  const station = pool[Math.floor(Math.random() * pool.length)];
  const severities: Severity[] = ["low", "medium", "high"];
  const causes: RootCause[] = ["sensor_fault", "comms_error", "genuine_event", "unknown"];
  const paramPool: Alert["parameters_flagged"] = ["temperature", "pressure", "humidity"];
  const severity = severities[Math.floor(Math.random() * severities.length)];
  const root_cause = causes[Math.floor(Math.random() * causes.length)];
  const flaggedCount = 1 + Math.floor(Math.random() * 2);
  const parameters_flagged = [...paramPool]
    .sort(() => Math.random() - 0.5)
    .slice(0, flaggedCount);

  const summaries: Record<RootCause, string> = {
    sensor_fault: "Anomalous reading pattern consistent with a failing sensor element.",
    comms_error: "Data gaps detected suggesting an unstable communications link.",
    genuine_event: "Rapid change consistent with a real, localized weather event.",
    unknown: "Anomaly detected; contributing cause could not be confidently classified.",
  };

  liveAlertCounter += 1;
  return {
    id: `alert-live-${liveAlertCounter}`,
    station_id: station.station_id,
    station_name: station.name,
    timestamp: new Date().toISOString(),
    confidence: Math.round((0.5 + Math.random() * 0.49) * 100) / 100,
    severity,
    root_cause,
    summary: summaries[root_cause],
    parameters_flagged,
    status: "active",
  };
}

// ---------- Timeseries ----------

/** Deterministic pseudo-random noise so the same station looks the same on reload. */
function seededNoise(seed: number, index: number): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function hashStationId(stationId: string): number {
  let hash = 0;
  for (let i = 0; i < stationId.length; i++) {
    hash = (hash << 5) - hash + stationId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 1000;
}

export function generateMockTimeseries(
  stationId: string,
  hours: number,
): TimeseriesResponse {
  const station = MOCK_STATIONS.find((s) => s.station_id === stationId);
  const seed = hashStationId(stationId);
  const pointCount = hours * 4; // one reading every 15 minutes
  const now = Date.now();
  const points: TimeseriesResponse["points"] = [];

  // Anomaly window: roughly a third of the way through the series, ~90 minutes long.
  const anomalyStartIndex = Math.floor(pointCount * 0.35);
  const anomalyLengthPoints = 6;
  const injectFault = station?.status === "fault" || station?.status === "degrading";

  for (let i = 0; i < pointCount; i++) {
    const minutesFromStart = i * 15;
    const timestamp = new Date(now - (pointCount - i) * 15 * 60_000).toISOString();

    // Diurnal cycle: ~24h period, warmer mid-afternoon.
    const hourOfDay = (minutesFromStart / 60) % 24;
    const diurnal = Math.sin(((hourOfDay - 9) / 24) * Math.PI * 2);

    let temperature = 27 + diurnal * 5 + (seededNoise(seed, i) - 0.5) * 1.2;
    let pressure = 1008 + Math.sin(minutesFromStart / 500) * 3 + (seededNoise(seed + 1, i) - 0.5) * 0.8;
    let humidity = 55 - diurnal * 15 + (seededNoise(seed + 2, i) - 0.5) * 4;

    const inAnomaly =
      injectFault && i >= anomalyStartIndex && i < anomalyStartIndex + anomalyLengthPoints;

    if (inAnomaly) {
      // Simulate a stuck/faulty sensor: pressure flatlines, humidity spikes unrealistically.
      pressure = 1008;
      humidity = Math.min(99, humidity + 30);
    }

    humidity = Math.max(5, Math.min(99, humidity));

    points.push({
      timestamp,
      temperature: Math.round(temperature * 10) / 10,
      pressure: Math.round(pressure * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
    });
  }

  const anomaly_windows = injectFault
    ? [
        {
          start: points[anomalyStartIndex].timestamp,
          end: points[Math.min(pointCount - 1, anomalyStartIndex + anomalyLengthPoints - 1)].timestamp,
          alert_id: station?.status === "fault" ? "alert-001" : "alert-002",
        },
      ]
    : [];

  return { station_id: stationId, points, anomaly_windows };
}

// ---------- Sensor health ----------

export function generateMockSensorHealth(stationId: string): SensorHealth {
  const station = MOCK_STATIONS.find((s) => s.station_id === stationId);

  if (station?.status === "fault") {
    return {
      station_id: stationId,
      health_score: 28,
      trend: "degrading",
      maintenance_forecast_days: 2,
      last_maintenance_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 210).toISOString(),
    };
  }
  if (station?.status === "degrading") {
    return {
      station_id: stationId,
      health_score: 61,
      trend: "degrading",
      maintenance_forecast_days: 18,
      last_maintenance_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 95).toISOString(),
    };
  }
  if (station?.status === "offline") {
    return {
      station_id: stationId,
      health_score: 0,
      trend: "degrading",
      maintenance_forecast_days: null,
      last_maintenance_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 300).toISOString(),
    };
  }
  return {
    station_id: stationId,
    health_score: 88 + Math.floor(seededNoise(hashStationId(stationId), 1) * 10),
    trend: "stable",
    maintenance_forecast_days: null,
    last_maintenance_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
  };
}

// ---------- Explanations ----------

export function generateMockExplanation(alertId: string): Explanation {
  const alert = MOCK_ALERTS.find((a) => a.id === alertId);

  const narratives: Record<RootCause, string> = {
    sensor_fault:
      "The flagged parameter shows a sudden loss of natural variance while neighboring stations continued to report normal fluctuation, a strong signature of a sensor element sticking or failing rather than a real atmospheric change.",
    comms_error:
      "Timestamps show irregular gaps and out-of-order packets rather than a smooth signal, which is more consistent with a degraded communications link than a genuine sensor reading.",
    genuine_event:
      "The change is sharp but internally consistent across correlated parameters, and matches the expected signature of a fast-moving local weather event rather than instrument error.",
    unknown:
      "The anomaly does not clearly match known sensor-fault or communications-error signatures, and there is not yet enough corroborating data to classify it as a genuine event.",
  };

  const rootCause: RootCause = alert?.root_cause ?? "unknown";

  return {
    alert_id: alertId,
    top_features: [
      {
        feature: "Rate of change (5 min window)",
        contribution: 0.42,
        direction: "increases_anomaly",
      },
      {
        feature: "Deviation from station baseline",
        contribution: 0.31,
        direction: "increases_anomaly",
      },
      {
        feature: "Cross-station correlation",
        contribution: 0.19,
        direction: rootCause === "genuine_event" ? "increases_anomaly" : "decreases_anomaly",
      },
      {
        feature: "Signal variance (stuck-sensor check)",
        contribution: 0.12,
        direction: rootCause === "sensor_fault" ? "increases_anomaly" : "decreases_anomaly",
      },
    ],
    narrative: narratives[rootCause],
  };
}
