import { useQuery } from "@tanstack/react-query";
import { fetchStations } from "../lib/api";

export function useStations() {
  return useQuery({
    queryKey: ["stations"],
    queryFn: fetchStations,
    refetchInterval: 30_000, // station status can change; keep it fresh
  });
}
