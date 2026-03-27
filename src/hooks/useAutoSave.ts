import { useCallback, useRef } from "react";
import { writeFile } from "../lib/fs";

export function useAutoSave(delayMs = 800, onSaved?: (filePath: string) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>("");
  const savingRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const pendingRef = useRef<{ filePath: string; content: string } | null>(null);

  const doWrite = useCallback(async (filePath: string, content: string) => {
    if (content === lastSavedRef.current) return;
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await writeFile(filePath, content);
      lastSavedRef.current = content;
      onSavedRef.current?.(filePath);
    } catch (err) {
      console.error("Auto-save failed:", err);
    } finally {
      savingRef.current = false;
    }
  }, []);

  const save = useCallback(
    (filePath: string, content: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current = { filePath, content };
      timerRef.current = setTimeout(() => {
        pendingRef.current = null;
        doWrite(filePath, content);
      }, delayMs);
    },
    [delayMs, doWrite]
  );

  const flushSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    await doWrite(pending.filePath, pending.content);
  }, [doWrite]);

  const setBaseline = useCallback((content: string) => {
    lastSavedRef.current = content;
  }, []);

  return { save, setBaseline, flushSave };
}
