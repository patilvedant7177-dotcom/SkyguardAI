// API client for backend endpoints
import { API_BASE_URL } from "./config";
import type {
  Alert,
  Station,
  SensorHealth,
  Explanation,
  Timeseries,
  AddStationResponse,
} from "./types";

export async function fetchHealth(): Promise<{ status: string }> {
  const resp = await fetch(`${API_BASE_URL}/health`);
  if (!resp.ok) throw new Error("Health request failed");
  return resp.json();
}

export async function fetchStations(): Promise<Station[]> {
  const resp = await fetch(`${API_BASE_URL}/stations`);
  if (!resp.ok) throw new Error("Stations request failed");
  return resp.json();
}

export async function fetchAlerts(params?: {
  status?: string;
  station_id?: number;
  min_severity?: string;
  since?: string;
  limit?: number;
}): Promise<Alert[]> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
  }
  const query = searchParams.toString();
  const resp = await fetch(`${API_BASE_URL}/alerts${query ? `?${query}` : ""}`);
  if (!resp.ok) throw new Error("Alerts request failed");
  return resp.json();
}

export async function fetchTimeseries(
  stationId: number,
  hours = 72
): Promise<Timeseries> {
  const resp = await fetch(
    `${API_BASE_URL}/stations/${stationId}/timeseries?hours=${hours}`
  );
  if (!resp.ok) throw new Error("Timeseries request failed");
  return resp.json();
}

export async function fetchSensorHealth(
  stationId: number
): Promise<SensorHealth> {
  const resp = await fetch(`${API_BASE_URL}/sensor-health/${stationId}`);
  if (!resp.ok) throw new Error("Sensor health request failed");
  return resp.json();
}

export async function fetchExplanation(
  alertId: number
): Promise<Explanation> {
  const resp = await fetch(`${API_BASE_URL}/explain/${alertId}`);
  if (!resp.ok) throw new Error("Explanation request failed");
  return resp.json();
}

export async function acknowledgeAlert(
  alertId: number
): Promise<{ status: string }> {
  const resp = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
    method: "POST",
  });
  if (!resp.ok) throw new Error("Acknowledge alert failed");
  return resp.json();
}

export function createAlertEventSource(
  onMessage: (alert: Alert) => void
): EventSource {
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
    console.error("SSE error");
  };
  return es;
}

export async function uploadStation(
  formData: FormData
): Promise<AddStationResponse> {
  const resp = await fetch(`${API_BASE_URL}/stations/upload`, {
    method: "POST",
    body: formData,
  });
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to upload and register AWS station");
  }
  return resp.json();
}

export async function deleteStation(
  stationId: number
): Promise<{ status: string; station_id: number }> {
  const resp = await fetch(`${API_BASE_URL}/stations/${stationId}`, {
    method: "DELETE",
  });
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to remove station #${stationId}`);
  }
  return resp.json();
}
