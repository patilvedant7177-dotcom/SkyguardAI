import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type BadgeTone = "neutral" | "normal" | "degrading" | "fault" | "offline" | "low" | "medium" | "high";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-white/5 text-ink-muted border-border-soft",
  normal: "bg-status-normal/10 text-status-normal border-status-normal/30",
  degrading: "bg-status-degrading/10 text-status-degrading border-status-degrading/30",
  fault: "bg-status-fault/10 text-status-fault border-status-fault/30",
  offline: "bg-status-offline/10 text-status-offline border-status-offline/30",
  low: "bg-severity-low/10 text-severity-low border-severity-low/30",
  medium: "bg-severity-medium/10 text-severity-medium border-severity-medium/30",
  high: "bg-severity-high/10 text-severity-high border-severity-high/30",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
