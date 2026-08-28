import { StationMapPanel } from "../components/map/StationMapPanel";
import { LiveAlertsPanel } from "../components/alerts/LiveAlertsPanel";

export function NetworkOverview() {
  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-[1600px] flex-col gap-4 p-4">
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[60%_40%]">
        <div className="min-h-[420px]">
          <StationMapPanel />
        </div>
        <div className="min-h-[420px]">
          <LiveAlertsPanel />
        </div>
      </div>
    </div>
  );
}
