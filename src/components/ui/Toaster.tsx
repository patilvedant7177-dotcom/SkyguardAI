import { AlertTriangle, X } from "lucide-react";
import { useToastStore } from "../../store/toastStore";
import { cn } from "../../lib/utils";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={cn(
            "glass-panel-raised flex items-start gap-3 rounded-xl p-4 shadow-lg",
            toast.variant === "high-severity" && "border-status-fault/40",
          )}
        >
          {toast.variant === "high-severity" && (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-fault" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 truncate text-xs text-ink-muted">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded p-0.5 text-ink-faint hover:text-ink"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
