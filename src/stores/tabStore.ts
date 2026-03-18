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
  renameTab: (oldPath: string, newPath: string, newName: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: async (file: FileEntry) => {
    // Only allow markdown files to prevent crashes
    const ext = file.extension?.toLowerCase() || "";
    if (ext !== ".md" && ext !== ".markdown" && ext !== ".txt") return;

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

  renameTab: (oldPath: string, newPath: string, newName: string) => {
    const { tabs, activeTabId } = get();
    const newTabs = tabs.map((t) =>
      t.filePath === oldPath
        ? { ...t, id: newPath, filePath: newPath, fileName: newName }
        : t
    );
    const newActive = activeTabId === oldPath ? newPath : activeTabId;
    set({ tabs: newTabs, activeTabId: newActive });
  },

  reorderTabs: (fromIndex: number, toIndex: number) => {
    const tabs = [...get().tabs];
    const [moved] = tabs.splice(fromIndex, 1);
    tabs.splice(toIndex, 0, moved);
    set({ tabs });
  },
}));
