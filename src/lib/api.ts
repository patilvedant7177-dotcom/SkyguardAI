import {
  AlertListSchema,
  AlertSchema,
  ExplanationSchema,
  SensorHealthSchema,
  StationListSchema,
  TimeseriesResponseSchema,
  type Alert,
  type Explanation,
  type SensorHealth,
  type Station,
  type TimeseriesResponse,
} from "../types/api";
import {
  MOCK_ALERTS,
  MOCK_STATIONS,
  generateMockAlert,
  generateMockExplanation,
  generateMockSensorHealth,
  generateMockTimeseries,
} from "../data/mockData";

/**
 * Single switch that decides where every request in the app goes.
 * Set VITE_USE_MOCKS=false (and VITE_API_BASE_URL) in your .env file
 * once a real backend exists — no other file needs to change.
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function mockDelay<T>(value: T): Promise<T> {
  const ms = 200 + Math.random() * 200; // 200-400ms, per spec
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function fetchJson(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(API_BASE_URL + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }
  return response.json();
}

// ---------- GET /alerts ----------

export async function fetchAlerts(): Promise<Alert[]> {
  if (USE_MOCKS) {
    return AlertListSchema.parse(await mockDelay(MOCK_ALERTS));
  }
  const data = await fetchJson("/alerts", { status: "active", limit: "50" });
  return AlertListSchema.parse(data);
}

// ---------- GET /stations ----------

export async function fetchStations(): Promise<Station[]> {
  if (USE_MOCKS) {
    return StationListSchema.parse(await mockDelay(MOCK_STATIONS));
  }
  const data = await fetchJson("/stations");
  return StationListSchema.parse(data);
}

// ---------- GET /stations/{station_id}/timeseries ----------

export async function fetchTimeseries(
  stationId: string,
  hours = 72,
): Promise<TimeseriesResponse> {
  if (USE_MOCKS) {
    return TimeseriesResponseSchema.parse(
      await mockDelay(generateMockTimeseries(stationId, hours)),
    );
  }
  const data = await fetchJson(`/stations/${stationId}/timeseries`, {
    hours: String(hours),
  });
  return TimeseriesResponseSchema.parse(data);
}

// ---------- GET /sensor-health/{station_id} ----------

export async function fetchSensorHealth(stationId: string): Promise<SensorHealth> {
  if (USE_MOCKS) {
    return SensorHealthSchema.parse(await mockDelay(generateMockSensorHealth(stationId)));
  }
  const data = await fetchJson(`/sensor-health/${stationId}`);
  return SensorHealthSchema.parse(data);
}

// ---------- GET /explain/{alert_id} ----------

export async function fetchExplanation(alertId: string): Promise<Explanation> {
  if (USE_MOCKS) {
    return ExplanationSchema.parse(await mockDelay(generateMockExplanation(alertId)));
  }
  const data = await fetchJson(`/explain/${alertId}`);
  return ExplanationSchema.parse(data);
}

// ---------- GET /alerts/stream (SSE) ----------

export type AlertStreamStatus = "connecting" | "live" | "reconnecting" | "unavailable";

interface AlertStreamHandlers {
  onAlert: (alert: Alert) => void;
  onStatusChange: (status: AlertStreamStatus) => void;
}

/**
 * Opens the real-time alert stream and returns a cleanup function.
 * In mock mode, fabricates a new alert every 15-20 seconds instead of
 * opening a real connection. In real mode, uses the browser's native
 * EventSource and falls back to polling /alerts if SSE never connects.
 */
export function openAlertStream({ onAlert, onStatusChange }: AlertStreamHandlers): () => void {
  if (USE_MOCKS) {
    onStatusChange("live");
    const interval = setInterval(
      () => onAlert(generateMockAlert()),
      15_000 + Math.random() * 5_000,
    );
    return () => clearInterval(interval);
  }

  onStatusChange("connecting");
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let source: EventSource | null = null;
  let fellBackToPolling = false;

  const startPolling = () => {
    if (fellBackToPolling) return;
    fellBackToPolling = true;
    onStatusChange("reconnecting");
    pollTimer = setInterval(async () => {
      try {
        const alerts = await fetchAlerts();
        alerts.forEach((alert) => onAlert(AlertSchema.parse(alert)));
      } catch {
        // Keep polling; a transient failure shouldn't kill the loop.
      }
    }, 20_000);
  };

  try {
    source = new EventSource(API_BASE_URL + "/alerts/stream");

    source.addEventListener("open", () => onStatusChange("live"));

    source.addEventListener("alert", (event: MessageEvent) => {
      try {
        const parsed = AlertSchema.parse(JSON.parse(event.data));
        onAlert(parsed);
      } catch {
        // Malformed event from the server — ignore rather than crash the UI.
      }
    });

    source.addEventListener("error", () => {
      onStatusChange("reconnecting");
      // EventSource retries connections on its own; if it never recovers,
      // fall back to polling after a grace period.
      setTimeout(() => {
        if (source && source.readyState === EventSource.CLOSED) {
          source.close();
          startPolling();
        }
      }, 10_000);
    });
  } catch {
    onStatusChange("unavailable");
    startPolling();
  }

  return () => {
    source?.close();
    if (pollTimer) clearInterval(pollTimer);
  };
}
