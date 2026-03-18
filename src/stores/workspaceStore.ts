import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import type { Workspace, TreeNode } from "../types";
import { buildFileTree, flattenTree, sortTree, populateMtimeCache } from "../lib/fs";
import type { SortMode } from "../lib/fs";

interface WorkspaceState {
  workspaces: Workspace[];
  trees: Map<string, TreeNode[]>;
  isLoaded: boolean;
  addWorkspace: (path: string) => Promise<void>;
  addFile: (filePath: string) => Promise<void>;
  removeWorkspace: (id: string) => Promise<void>;
  toggleCollapse: (id: string) => void;
  loadFromStore: () => Promise<void>;
  refreshFiles: (workspaceId?: string) => Promise<void>;
  getFileCount: (workspaceId: string) => number;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => Promise<void>;
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
    workspaces.map((w) => ({ id: w.id, path: w.path, name: w.name, isFile: w.isFile || false }))
  );
}

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function buildSingleFileTree(filePath: string, workspaceId: string): TreeNode[] {
  const name = filePath.split("/").pop() || filePath;
  return [
    {
      name,
      path: filePath,
      relativePath: name,
      workspaceId,
      extension: getExtension(name),
      type: "file",
    },
  ];
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  trees: new Map(),
  isLoaded: false,
  sortMode: "name-asc" as SortMode,

  loadFromStore: async () => {
    try {
      // Start fresh every launch — clear any persisted workspaces
      const store = await getStore();
      await store.set("workspaces", []);
      set({ workspaces: [], trees: new Map(), isLoaded: true });
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

  addFile: async (filePath: string) => {
    // Don't add if already exists
    if (get().workspaces.some((w) => w.path === filePath)) return;
    const name = filePath.split("/").pop() || filePath;
    const id = crypto.randomUUID();
    const workspace: Workspace = { id, path: filePath, name, collapsed: false, isFile: true };
    const workspaces = [...get().workspaces, workspace];
    const tree = buildSingleFileTree(filePath, id);
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
        if (w.isFile) {
          trees.set(w.id, buildSingleFileTree(w.path, w.id));
        } else {
          const tree = await buildFileTree(w.path, w.id);
          trees.set(w.id, tree);
        }
      })
    );
    set({ trees });
  },

  getFileCount: (workspaceId: string) => {
    const tree = get().trees.get(workspaceId);
    return tree ? flattenTree(tree).length : 0;
  },

  setSortMode: async (mode: SortMode) => {
    // If switching to modified sort, populate mtime cache first
    if (mode === "modified") {
      const trees = get().trees;
      for (const [, tree] of trees) {
        await populateMtimeCache(tree);
      }
    }
    // Re-sort all trees
    const sorted = new Map<string, TreeNode[]>();
    for (const [id, tree] of get().trees) {
      sorted.set(id, sortTree([...tree], mode));
    }
    set({ sortMode: mode, trees: sorted });
  },
}));
