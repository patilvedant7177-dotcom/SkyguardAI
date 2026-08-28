import { create } from "zustand";
import type { AlertStreamStatus } from "../lib/api";

interface UiState {
  streamStatus: AlertStreamStatus;
  setStreamStatus: (status: AlertStreamStatus) => void;

  /** Alert id to highlight when landing on a Station Detail page from an alert click. */
  highlightedAlertId: string | null;
  setHighlightedAlertId: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  streamStatus: "connecting",
  setStreamStatus: (status) => set({ streamStatus: status }),

  highlightedAlertId: null,
  setHighlightedAlertId: (id) => set({ highlightedAlertId: id }),
}));
