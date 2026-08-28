import { cn } from "../../lib/utils";
import type { StationStatus } from "../../types/api";

const statusColor: Record<StationStatus, string> = {
  normal: "bg-status-normal",
  degrading: "bg-status-degrading",
  fault: "bg-status-fault",
  offline: "bg-status-offline",
};

interface StatusDotProps {
  status: StationStatus;
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ status, pulse, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        statusColor[status],
        pulse && status === "normal" && "sg-live-dot",
        className,
      )}
      aria-hidden="true"
    />
  );
}
