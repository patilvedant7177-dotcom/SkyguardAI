// Types matching the contract
export type Severity = "low" | "medium" | "high";
export type RootCause = "sensor_fault" | "comms_error" | "genuine_event" | "unknown";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type Parameter = "temperature" | "pressure" | "humidity";
export type StationStatus = "normal" | "degrading" | "fault" | "offline";
export type Trend = "improving" | "stable" | "degrading";
export type FeatureDirection = "increases_anomaly" | "decreases_anomaly";

export interface Alert {
  id: number;
  station_id: number;
  station_name: string;
  timestamp: string;
  confidence: number;
  severity: Severity;
  root_cause: RootCause;
  summary: string;
  parameters_flagged: Parameter[];
  status: AlertStatus;
}

export interface Station {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  status: StationStatus;
  source: "real" | "simulated";
}

export interface SubsystemDiagnostic {
  name: string;
  metric: string;
  status: "nominal" | "warning" | "critical";
  status_label: string;
}

export interface SensorHealth {
  station_id: number;
  health_score: number; // 0-100
  trend: Trend;
  maintenance_forecast_days: number | null;
  last_maintenance_at: string;
  diagnostics?: SubsystemDiagnostic[];
}

export interface TopFeature {
  feature: Parameter;
  contribution: number;
  direction: FeatureDirection;
}

export interface ContributingFactor {
  name: string;
  category: "atmospheric_parameter" | "spatial_network" | "temporal_dynamics" | "physics_model";
  feature: string;
  contribution: number;
  direction: FeatureDirection | "increases_anomaly" | "decreases_anomaly";
  observed_value: string;
  baseline_value: string;
  deviation: string;
  description: string;
}

export interface ReasoningStep {
  step_number: number;
  title: string;
  evidence: string;
  status: "flagged" | "corroborated" | "validated" | "isolated" | "hardware_alert" | "unphysical" | "verdict";
}

export interface DetectorBreakdownItem {
  detector_name: string;
  score: number;
  threshold: number;
  flagged: boolean;
  description: string;
}

export interface NeighborCorroborationItem {
  station_id: number;
  station_name: string;
  distance_km: number;
  reading: string;
  expected: string;
  is_corroborating: boolean;
  status: string;
}

export interface Explanation {
  alert_id: number;
  confidence?: number;
  top_features: TopFeature[];
  narrative: string;
  contributing_factors?: ContributingFactor[];
  reasoning_chain?: ReasoningStep[];
  detector_breakdown?: DetectorBreakdownItem[];
  neighbor_corroboration?: NeighborCorroborationItem[];
  recommendations?: string[];
}

export interface TimeseriesPoint {
  timestamp: string;
  temperature: number;
  pressure: number;
  humidity: number;
}

export interface Timeseries {
  station_id: number;
  hours: number;
  data: TimeseriesPoint[];
}

export interface ProfilingSummary {
  csv_rows: number;
  csv_columns: string[];
  date_range: { start: string; end: string };
  missingness_pct: Record<string, number>;
  nc_variables: string[];
  nc_dims: Record<string, number>;
  matched_parameters: string[];
}

export interface AddStationResponse {
  status: "success" | "error";
  message: string;
  station: Station;
  profiling_summary: ProfilingSummary;
  health: SensorHealth;
  alerts_count: number;
}
