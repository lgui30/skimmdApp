import { create } from "zustand";

interface UIState {
  zenMode: boolean;
  focusMode: boolean;
  sidebarCollapsed: boolean;
  toggleZenMode: () => void;
  setZenMode: (on: boolean) => void;
  toggleFocusMode: () => void;
  setFocusMode: (on: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (on: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  zenMode: false,
  focusMode: false,
  sidebarCollapsed: false,
  toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode })),
  setZenMode: (on: boolean) => set({ zenMode: on }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setFocusMode: (on: boolean) => set({ focusMode: on }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (on: boolean) => set({ sidebarCollapsed: on }),
}));
