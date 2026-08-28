import { z } from "zod";

/**
 * These schemas are the single source of truth for API shapes.
 * Every response — real or mocked — is validated against these
 * before it reaches the rest of the app. If the backend ever sends
 * something unexpected, we find out immediately instead of silently
 * rendering broken data.
 */

// ---------- Shared enums ----------

export const SeveritySchema = z.enum(["low", "medium", "high"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const RootCauseSchema = z.enum([
  "sensor_fault",
  "comms_error",
  "genuine_event",
  "unknown",
]);
export type RootCause = z.infer<typeof RootCauseSchema>;

export const AlertStatusSchema = z.enum(["active", "acknowledged", "resolved"]);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

export const ParameterSchema = z.enum(["temperature", "pressure", "humidity"]);
export type Parameter = z.infer<typeof ParameterSchema>;

export const StationStatusSchema = z.enum([
  "normal",
  "degrading",
  "fault",
  "offline",
]);
export type StationStatus = z.infer<typeof StationStatusSchema>;

export const TrendSchema = z.enum(["improving", "stable", "degrading"]);
export type Trend = z.infer<typeof TrendSchema>;

export const FeatureDirectionSchema = z.enum([
  "increases_anomaly",
  "decreases_anomaly",
]);
export type FeatureDirection = z.infer<typeof FeatureDirectionSchema>;

// ---------- GET /alerts ----------

export const AlertSchema = z.object({
  id: z.string(),
  station_id: z.string(),
  station_name: z.string(),
  timestamp: z.string(),
  confidence: z.number().min(0).max(1),
  severity: SeveritySchema,
  root_cause: RootCauseSchema,
  summary: z.string(),
  parameters_flagged: z.array(ParameterSchema),
  status: AlertStatusSchema,
});
export type Alert = z.infer<typeof AlertSchema>;

export const AlertListSchema = z.array(AlertSchema);

// ---------- GET /stations ----------

export const StationSchema = z.object({
  station_id: z.string(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  status: StationStatusSchema,
  last_reading_at: z.string(),
});
export type Station = z.infer<typeof StationSchema>;

export const StationListSchema = z.array(StationSchema);

// ---------- GET /stations/{station_id}/timeseries ----------

export const TimeseriesPointSchema = z.object({
  timestamp: z.string(),
  temperature: z.number(),
  pressure: z.number(),
  humidity: z.number(),
});
export type TimeseriesPoint = z.infer<typeof TimeseriesPointSchema>;

export const AnomalyWindowSchema = z.object({
  start: z.string(),
  end: z.string(),
  alert_id: z.string(),
});
export type AnomalyWindow = z.infer<typeof AnomalyWindowSchema>;

export const TimeseriesResponseSchema = z.object({
  station_id: z.string(),
  points: z.array(TimeseriesPointSchema),
  anomaly_windows: z.array(AnomalyWindowSchema),
});
export type TimeseriesResponse = z.infer<typeof TimeseriesResponseSchema>;

// ---------- GET /sensor-health/{station_id} ----------

export const SensorHealthSchema = z.object({
  station_id: z.string(),
  health_score: z.number(),
  trend: TrendSchema,
  maintenance_forecast_days: z.number().nullable(),
  last_maintenance_at: z.string().nullable(),
});
export type SensorHealth = z.infer<typeof SensorHealthSchema>;

// ---------- GET /explain/{alert_id} ----------

export const FeatureContributionSchema = z.object({
  feature: z.string(),
  contribution: z.number(),
  direction: FeatureDirectionSchema,
});
export type FeatureContribution = z.infer<typeof FeatureContributionSchema>;

export const ExplanationSchema = z.object({
  alert_id: z.string(),
  top_features: z.array(FeatureContributionSchema),
  narrative: z.string(),
});
export type Explanation = z.infer<typeof ExplanationSchema>;
