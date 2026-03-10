import { useEffect, useRef } from "react";
import { watchImmediate } from "@tauri-apps/plugin-fs";

export function useFileWatcher(
  paths: string[],
  onFileChange: (filePath: string) => void
) {
  const onChangeRef = useRef(onFileChange);
  onChangeRef.current = onFileChange;

  useEffect(() => {
    if (paths.length === 0) return;

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      for (const dirPath of paths) {
        if (cancelled) break;
        try {
          const unsub = await watchImmediate(
            dirPath,
            (event) => {
              if (cancelled) return;
              if (!event.paths?.[0]) return;
              const filePath = event.paths[0];
              const ext = filePath.split(".").pop()?.toLowerCase();
              if (ext === "md" || ext === "markdown" || ext === "txt") {
                onChangeRef.current(filePath);
              }
            },
            { recursive: true }
          );
          cleanups.push(unsub);
        } catch (err) {
          console.error("Watch failed for", dirPath, err);
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [paths.join(",")]);
}
