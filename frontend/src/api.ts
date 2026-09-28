// API client for backend endpoints with seamless fallback for standalone/Vercel deployments
import { API_BASE_URL } from "./config";
import type {
  Alert,
  Station,
  SensorHealth,
  Explanation,
  Timeseries,
  AddStationResponse,
} from "./types";
import {
  MOCK_STATIONS,
  MOCK_ALERTS,
  MOCK_SENSOR_HEALTH,
  MOCK_EXPLANATIONS,
  generateMockTimeseries,
} from "./mockData";

// In-memory clones for interactive actions when offline
let localStations: Station[] = [...MOCK_STATIONS];
let localAlerts: Alert[] = [...MOCK_ALERTS];

export async function fetchHealth(): Promise<{ status: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error("Health request failed");
    return resp.json();
  } catch {
    throw new Error("Backend offline");
  }
}

export async function fetchStations(): Promise<Station[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`${API_BASE_URL}/stations`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error("Stations request failed");
    return resp.json();
  } catch {
    console.warn("Backend unavailable; using demo station network dataset");
    return [...localStations];
  }
}

export async function fetchAlerts(params?: {
  status?: string;
  station_id?: number;
  min_severity?: string;
  since?: string;
  limit?: number;
}): Promise<Alert[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
    }
    const query = searchParams.toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`${API_BASE_URL}/alerts${query ? `?${query}` : ""}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error("Alerts request failed");
    return resp.json();
  } catch {
    console.warn("Backend unavailable; using demo alert dataset");
    let results = [...localAlerts];
    if (params?.status) {
      results = results.filter((a) => a.status === params.status);
    }
    if (params?.station_id !== undefined) {
      results = results.filter((a) => a.station_id === Number(params.station_id));
    }
    if (params?.min_severity) {
      const order = { low: 1, medium: 2, high: 3 };
      const minVal = order[params.min_severity as keyof typeof order] || 1;
      results = results.filter((a) => (order[a.severity] || 0) >= minVal);
    }
    if (params?.limit) {
      results = results.slice(0, params.limit);
    }
    return results;
  }
}

export async function fetchTimeseries(
  stationId: number,
  hours = 72
): Promise<Timeseries> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(
      `${API_BASE_URL}/stations/${stationId}/timeseries?hours=${hours}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!resp.ok) throw new Error("Timeseries request failed");
    return resp.json();
  } catch {
    console.warn(`Backend unavailable; generating synthetic telemetry for station #${stationId}`);
    return generateMockTimeseries(stationId, hours);
  }
}

export async function fetchSensorHealth(
  stationId: number
): Promise<SensorHealth> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`${API_BASE_URL}/sensor-health/${stationId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error("Sensor health request failed");
    return resp.json();
  } catch {
    const health = MOCK_SENSOR_HEALTH[stationId];
    if (health) return health;
    return {
      station_id: stationId,
      health_score: 92,
      trend: "stable",
      maintenance_forecast_days: 45,
      last_maintenance_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      diagnostics: [
        { name: "Temperature Drift", metric: "ΔT/dt", status: "nominal", status_label: "Within baseline (0.02°C/hr)" },
        { name: "Barometric Offset", metric: "ΔP vs Neighbors", status: "nominal", status_label: "Concurrence with regional field" },
        { name: "Hygrometer Baseline", metric: "RH floor", status: "nominal", status_label: "Calibration verified" },
      ],
    };
  }
}

export async function fetchExplanation(
  alertId: number
): Promise<Explanation> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`${API_BASE_URL}/explain/${alertId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error("Explanation request failed");
    return resp.json();
  } catch {
    const expl = MOCK_EXPLANATIONS[alertId];
    if (expl) return expl;
    // Default fallback explanation
    return (
      MOCK_EXPLANATIONS[101] || {
        alert_id: alertId,
        confidence: 0.92,
        narrative: "Diagnostic attribution indicates sensor drift with spatial disagreement across local network.",
        top_features: [{ feature: "temperature", contribution: 0.65, direction: "increases_anomaly" }],
        recommendations: ["Inspect station sensor array", "Verify barometric calibration"],
      }
    );
  }
}

export async function acknowledgeAlert(
  alertId: number
): Promise<{ status: string }> {
  try {
    const resp = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
      method: "POST",
    });
    if (!resp.ok) throw new Error("Acknowledge alert failed");
    return resp.json();
  } catch {
    // Update local mock alerts
    localAlerts = localAlerts.map((a) =>
      a.id === alertId ? { ...a, status: "acknowledged" as const } : a
    );
    return { status: "acknowledged" };
  }
}

export function createAlertEventSource(
  onMessage: (alert: Alert) => void
): EventSource {
  try {
    const es = new EventSource(`${API_BASE_URL}/alerts/stream`);
    es.addEventListener("alert", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        onMessage(data as Alert);
      } catch (err) {
        console.error("Failed to parse alert event data", err);
      }
    });
    es.onerror = () => {
      // Backend not running SSE; fallback safely
    };
    return es;
  } catch {
    // Return dummy EventSource-like object
    return {
      close: () => {},
    } as unknown as EventSource;
  }
}

export async function uploadStation(
  formData: FormData
): Promise<AddStationResponse> {
  try {
    const resp = await fetch(`${API_BASE_URL}/stations/upload`, {
      method: "POST",
      body: formData,
    });
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to upload and register AWS station");
    }
    return resp.json();
  } catch (err: any) {
    // If backend is genuinely offline, provide realistic local registration
    if (err.message && !err.message.includes("fetch") && !err.message.includes("Network")) {
      throw err;
    }
    const name = (formData.get("name") as string) || "New Field Station";
    const lat = parseFloat((formData.get("latitude") as string) || "19.0");
    const lon = parseFloat((formData.get("longitude") as string) || "73.0");
    const elev = parseFloat((formData.get("elevation") as string) || "100");
    const newId = localStations.length > 0 ? Math.max(...localStations.map((s) => s.id)) + 1 : 100;
    const newStation: Station = {
      id: newId,
      name,
      latitude: lat,
      longitude: lon,
      elevation: elev,
      status: "normal",
      source: "real",
      dataset_type: "csv_only",
    };
    localStations = [newStation, ...localStations];
    return {
      status: "success",
      message: `Station '${name}' registered successfully (demo session mode)`,
      station: newStation,
      profiling_summary: {
        csv_rows: 1440,
        csv_columns: ["timestamp", "temperature", "pressure", "humidity", "wind_speed"],
        date_range: { start: "2026-09-01T00:00:00Z", end: "2026-09-28T23:45:00Z" },
        missingness_pct: { temperature: 0.1, pressure: 0.0, humidity: 0.2 },
        nc_variables: [],
        nc_dims: {},
        matched_parameters: ["temperature", "pressure", "humidity"],
        upload_type: "csv_only",
      },
      health: {
        station_id: newId,
        health_score: 96,
        trend: "stable",
        maintenance_forecast_days: 90,
        last_maintenance_at: new Date().toISOString(),
      },
      alerts_count: 0,
    };
  }
}

export async function deleteStation(
  stationId: number
): Promise<{ status: string; station_id: number }> {
  try {
    const resp = await fetch(`${API_BASE_URL}/stations/${stationId}`, {
      method: "DELETE",
    });
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to remove station #${stationId}`);
    }
    return resp.json();
  } catch (err: any) {
    if (err.message && !err.message.includes("fetch") && !err.message.includes("Network")) {
      throw err;
    }
    localStations = localStations.filter((s) => s.id !== stationId);
    return { status: "success", station_id: stationId };
  }
}
