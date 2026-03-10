import { create } from "zustand";
import type { ThemeMode } from "../types";

interface ThemeState {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  init: () => void;
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", resolved);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: (localStorage.getItem("skimmd-theme") as ThemeMode) || "system",
  resolved: "light",

  setMode: (mode: ThemeMode) => {
    localStorage.setItem("skimmd-theme", mode);
    const resolved = resolveTheme(mode);
    applyTheme(resolved);
    set({ mode, resolved });
  },

  init: () => {
    const mode = get().mode;
    const resolved = resolveTheme(mode);
    applyTheme(resolved);
    set({ resolved });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", () => {
      if (get().mode === "system") {
        const r = resolveTheme("system");
        applyTheme(r);
        set({ resolved: r });
      }
    });
  },
}));
