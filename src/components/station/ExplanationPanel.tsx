import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Explanation } from "../../types/api";
import { cn } from "../../lib/utils";

export function ExplanationPanel({ explanation }: { explanation: Explanation }) {
  const maxContribution = Math.max(...explanation.top_features.map((f) => f.contribution));

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-ink-muted">{explanation.narrative}</p>

      <div className="flex flex-col gap-3">
        {explanation.top_features.map((feature) => {
          const widthPct = (feature.contribution / maxContribution) * 100;
          const increases = feature.direction === "increases_anomaly";
          return (
            <div key={feature.feature}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-ink">
                  {increases ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-status-fault" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-status-normal" aria-hidden="true" />
                  )}
                  {feature.feature}
                </span>
                <span className="shrink-0 font-mono-data text-ink-faint">
                  {(feature.contribution * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn(
                    "h-full rounded-full",
                    increases ? "bg-status-fault" : "bg-status-normal",
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-ink-faint">
                {increases ? "Increases anomaly likelihood" : "Decreases anomaly likelihood"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
