import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { openAlertStream } from "../lib/api";
import type { Alert } from "../types/api";
import { useUiStore } from "../store/uiStore";
import { useToastStore } from "../store/toastStore";

/**
 * Connects to the real-time alert stream for the lifetime of the
 * component that calls this hook. New alerts are prepended into the
 * "alerts" query cache; alerts that already exist (matched by id) are
 * updated in place instead of duplicated.
 */
export function useAlertStream() {
  const queryClient = useQueryClient();
  const setStreamStatus = useUiStore((s) => s.setStreamStatus);
  const pushToast = useToastStore((s) => s.pushToast);

  useEffect(() => {
    const handleAlert = (alert: Alert) => {
      queryClient.setQueryData<Alert[]>(["alerts"], (existing = []) => {
        const withoutDuplicate = existing.filter((a) => a.id !== alert.id);
        return [alert, ...withoutDuplicate];
      });

      if (alert.severity === "high") {
        pushToast({
          title: `High-severity alert: ${alert.station_name}`,
          description: alert.summary,
          variant: "high-severity",
        });
      }
    };

    const cleanup = openAlertStream({
      onAlert: handleAlert,
      onStatusChange: setStreamStatus,
    });

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
