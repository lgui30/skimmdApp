import { create } from "zustand";
import { readFile } from "../lib/fs";
import type { FileEntry, Tab } from "../types";

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (file: FileEntry) => Promise<void>;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  reloadTab: (id: string) => Promise<void>;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: async (file: FileEntry) => {
    const existing = get().tabs.find((t) => t.filePath === file.path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    const content = await readFile(file.path);
    const tab: Tab = {
      id: file.path,
      filePath: file.path,
      fileName: file.name,
      workspaceId: file.workspaceId,
      content,
      lastSaved: Date.now(),
    };
    set({ tabs: [...get().tabs, tab], activeTabId: tab.id });
  },

  closeTab: (id: string) => {
    const { tabs, activeTabId } = get();
    const index = tabs.findIndex((t) => t.id === id);
    const newTabs = tabs.filter((t) => t.id !== id);
    let newActive = activeTabId;
    if (activeTabId === id) {
      if (newTabs.length === 0) {
        newActive = null;
      } else if (index >= newTabs.length) {
        newActive = newTabs[newTabs.length - 1].id;
      } else {
        newActive = newTabs[index].id;
      }
    }
    set({ tabs: newTabs, activeTabId: newActive });
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id });
  },

  updateContent: (id: string, content: string) => {
    set({
      tabs: get().tabs.map((t) => (t.id === id ? { ...t, content } : t)),
    });
  },

  reloadTab: async (id: string) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    try {
      const content = await readFile(tab.filePath);
      set({
        tabs: get().tabs.map((t) =>
          t.id === id ? { ...t, content, lastSaved: Date.now() } : t
        ),
      });
    } catch {
      // file may have been deleted
    }
  },
}));
