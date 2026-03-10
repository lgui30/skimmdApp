import { create } from "zustand";

const ZOOM_MIN = 60;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

interface ZoomState {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

export const useZoomStore = create<ZoomState>((set, get) => ({
  zoom: parseInt(localStorage.getItem("skimmd-zoom") || "100", 10),

  zoomIn: () => {
    const next = Math.min(get().zoom + ZOOM_STEP, ZOOM_MAX);
    localStorage.setItem("skimmd-zoom", String(next));
    set({ zoom: next });
  },

  zoomOut: () => {
    const next = Math.max(get().zoom - ZOOM_STEP, ZOOM_MIN);
    localStorage.setItem("skimmd-zoom", String(next));
    set({ zoom: next });
  },

  resetZoom: () => {
    localStorage.setItem("skimmd-zoom", "100");
    set({ zoom: 100 });
  },
}));
