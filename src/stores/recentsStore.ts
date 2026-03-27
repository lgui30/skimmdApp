import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { exists } from "@tauri-apps/plugin-fs";
import type { RecentFile } from "../types";

const MAX_RECENTS = 20;

interface RecentsState {
  recents: RecentFile[];
  loaded: boolean;
  loadRecents: () => Promise<void>;
  addRecent: (filePath: string, fileName: string, workspaceId: string) => Promise<void>;
  removeRecent: (filePath: string) => Promise<void>;
  clearRecents: () => Promise<void>;
}

async function getStore() {
  return await load("recents.json", {
    defaults: { recents: [] },
    autoSave: true,
  });
}

async function persistRecents(recents: RecentFile[]) {
  const store = await getStore();
  await store.set("recents", recents);
}

export const useRecentsStore = create<RecentsState>((set, get) => ({
  recents: [],
  loaded: false,

  loadRecents: async () => {
    try {
      const store = await getStore();
      const saved = (await store.get<RecentFile[]>("recents")) || [];
      // Filter out files that no longer exist
      const valid: RecentFile[] = [];
      for (const entry of saved) {
        try {
          if (await exists(entry.filePath)) {
            valid.push(entry);
          }
        } catch {
          // skip
        }
      }
      set({ recents: valid, loaded: true });
      if (valid.length !== saved.length) {
        await persistRecents(valid);
      }
    } catch {
      set({ loaded: true });
    }
  },

  addRecent: async (filePath: string, fileName: string, workspaceId: string) => {
    const { recents } = get();
    // Remove existing entry with same path (dedup)
    const filtered = recents.filter((r) => r.filePath !== filePath);
    const entry: RecentFile = {
      filePath,
      fileName,
      lastOpened: Date.now(),
      workspaceId,
    };
    // Add to front, cap at MAX
    const updated = [entry, ...filtered].slice(0, MAX_RECENTS);
    set({ recents: updated });
    await persistRecents(updated);
  },

  removeRecent: async (filePath: string) => {
    const updated = get().recents.filter((r) => r.filePath !== filePath);
    set({ recents: updated });
    await persistRecents(updated);
  },

  clearRecents: async () => {
    set({ recents: [] });
    await persistRecents([]);
  },
}));
