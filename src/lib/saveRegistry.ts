import { writeFile } from "./fs";
import { useTabStore } from "../stores/tabStore";

/**
 * Global registry of pending auto-save flush functions.
 * Allows tabStore.closeTab and the close-requested handler to flush
 * pending writes without needing access to React hooks.
 */
const registry = new Map<string, () => Promise<void>>();

export function registerFlush(filePath: string, flush: () => Promise<void>) {
  registry.set(filePath, flush);
}

export function unregisterFlush(filePath: string) {
  registry.delete(filePath);
}

/** Flush a single file's pending auto-save. */
export async function flushSave(filePath: string) {
  const flush = registry.get(filePath);
  if (flush) await flush();
}

/** Flush all pending auto-saves (used on app close). */
export async function flushAllSaves() {
  await Promise.all([...registry.values()].map((fn) => fn()));
}

/**
 * Fallback flush: writes the tab's current content directly to disk.
 * Used when the Editor component isn't mounted (no registered flush).
 */
export async function flushTabToDisk(filePath: string) {
  const tab = useTabStore.getState().tabs.find((t) => t.id === filePath);
  if (!tab || !tab.dirty) return;
  try {
    await writeFile(filePath, tab.content);
    useTabStore.getState().setDirty(filePath, false);
  } catch (err) {
    console.error("Fallback flush failed:", err);
  }
}
