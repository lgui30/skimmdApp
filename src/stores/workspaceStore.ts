import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import type { Workspace, TreeNode } from "../types";
import { buildFileTree, flattenTree } from "../lib/fs";

interface WorkspaceState {
  workspaces: Workspace[];
  trees: Map<string, TreeNode[]>;
  isLoaded: boolean;
  addWorkspace: (path: string) => Promise<void>;
  removeWorkspace: (id: string) => Promise<void>;
  toggleCollapse: (id: string) => void;
  loadFromStore: () => Promise<void>;
  refreshFiles: (workspaceId?: string) => Promise<void>;
  getFileCount: (workspaceId: string) => number;
}

async function getStore() {
  return await load("workspaces.json", {
    defaults: { workspaces: [] },
    autoSave: true,
  });
}

async function persistWorkspaces(workspaces: Workspace[]) {
  const store = await getStore();
  await store.set(
    "workspaces",
    workspaces.map((w) => ({ id: w.id, path: w.path, name: w.name }))
  );
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  trees: new Map(),
  isLoaded: false,

  loadFromStore: async () => {
    try {
      const store = await getStore();
      const saved = await store.get<
        Array<{ id: string; path: string; name: string }>
      >("workspaces");
      if (saved && Array.isArray(saved)) {
        const workspaces: Workspace[] = saved.map((w) => ({
          ...w,
          collapsed: true,
        }));
        set({ workspaces, isLoaded: true });
        const trees = new Map<string, TreeNode[]>();
        await Promise.all(
          workspaces.map(async (w) => {
            const tree = await buildFileTree(w.path, w.id);
            trees.set(w.id, tree);
          })
        );
        set({ trees });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  addWorkspace: async (path: string) => {
    const name = path.split("/").pop() || path;
    const id = crypto.randomUUID();
    const workspace: Workspace = { id, path, name, collapsed: false };
    const workspaces = [...get().workspaces, workspace];
    const tree = await buildFileTree(path, id);
    const trees = new Map(get().trees);
    trees.set(id, tree);
    set({ workspaces, trees });
    await persistWorkspaces(workspaces);
  },

  removeWorkspace: async (id: string) => {
    const workspaces = get().workspaces.filter((w) => w.id !== id);
    const trees = new Map(get().trees);
    trees.delete(id);
    set({ workspaces, trees });
    await persistWorkspaces(workspaces);
  },

  toggleCollapse: (id: string) => {
    set({
      workspaces: get().workspaces.map((w) =>
        w.id === id ? { ...w, collapsed: !w.collapsed } : w
      ),
    });
  },

  refreshFiles: async (workspaceId?: string) => {
    const trees = new Map(get().trees);
    const targets = workspaceId
      ? get().workspaces.filter((w) => w.id === workspaceId)
      : get().workspaces;
    await Promise.all(
      targets.map(async (w) => {
        const tree = await buildFileTree(w.path, w.id);
        trees.set(w.id, tree);
      })
    );
    set({ trees });
  },

  getFileCount: (workspaceId: string) => {
    const tree = get().trees.get(workspaceId);
    return tree ? flattenTree(tree).length : 0;
  },
}));
