import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { Toaster } from "../ui/Toaster";
import { useAlertStream } from "../../hooks/useAlertStream";

export function AppShell({ children }: { children: ReactNode }) {
  // Lives here so the stream stays connected across route changes, not
  // just while the Overview page happens to be mounted.
  useAlertStream();

  return (
    <div className="flex min-h-screen flex-col bg-void">
      <TopBar />
      <main className="flex-1">{children}</main>
      <Toaster />
    </div>
  );
}
