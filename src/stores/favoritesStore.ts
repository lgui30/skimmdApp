import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { exists } from "@tauri-apps/plugin-fs";

interface FavoritesState {
  favorites: string[]; // array of file paths
  loaded: boolean;
  loadFavorites: () => Promise<void>;
  addFavorite: (path: string) => Promise<void>;
  removeFavorite: (path: string) => Promise<void>;
  isFavorite: (path: string) => boolean;
  reorderFavorites: (from: number, to: number) => Promise<void>;
  clearFavorites: () => Promise<void>;
}

async function getStore() {
  return await load("favorites.json", {
    defaults: { favorites: [] },
    autoSave: true,
  });
}

async function persistFavorites(favorites: string[]) {
  const store = await getStore();
  await store.set("favorites", favorites);
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  loaded: false,

  loadFavorites: async () => {
    try {
      const store = await getStore();
      const saved = (await store.get<string[]>("favorites")) || [];
      // Validate that files still exist
      const valid: string[] = [];
      for (const path of saved) {
        try {
          if (await exists(path)) {
            valid.push(path);
          }
        } catch {
          // skip
        }
      }
      set({ favorites: valid, loaded: true });
      if (valid.length !== saved.length) {
        await persistFavorites(valid);
      }
    } catch {
      set({ loaded: true });
    }
  },

  addFavorite: async (path: string) => {
    const { favorites } = get();
    if (favorites.includes(path)) return;
    const updated = [...favorites, path];
    set({ favorites: updated });
    await persistFavorites(updated);
  },

  removeFavorite: async (path: string) => {
    const updated = get().favorites.filter((f) => f !== path);
    set({ favorites: updated });
    await persistFavorites(updated);
  },

  isFavorite: (path: string) => {
    return get().favorites.includes(path);
  },

  reorderFavorites: async (from: number, to: number) => {
    const favorites = [...get().favorites];
    const [moved] = favorites.splice(from, 1);
    favorites.splice(to, 0, moved);
    set({ favorites });
    await persistFavorites(favorites);
  },

  clearFavorites: async () => {
    set({ favorites: [] });
    await persistFavorites([]);
  },
}));
