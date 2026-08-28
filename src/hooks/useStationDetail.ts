import { useQuery } from "@tanstack/react-query";
import { fetchExplanation, fetchSensorHealth, fetchTimeseries } from "../lib/api";

export function useTimeseries(stationId: string | undefined, hours = 72) {
  return useQuery({
    queryKey: ["timeseries", stationId, hours],
    queryFn: () => fetchTimeseries(stationId as string, hours),
    enabled: Boolean(stationId),
  });
}

export function useSensorHealth(stationId: string | undefined) {
  return useQuery({
    queryKey: ["sensor-health", stationId],
    queryFn: () => fetchSensorHealth(stationId as string),
    enabled: Boolean(stationId),
  });
}

export function useExplanation(alertId: string | undefined) {
  return useQuery({
    queryKey: ["explanation", alertId],
    queryFn: () => fetchExplanation(alertId as string),
    enabled: Boolean(alertId),
  });
}
