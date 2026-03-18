import { useEffect, useState } from "react";
import { stat } from "@tauri-apps/plugin-fs";
import { useTabStore } from "../../stores/tabStore";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "../Toast/Toast";

interface FileMeta {
  name: string;
  path: string;
  extension: string;
  size: string;
  created: string;
  modified: string;
  words: number;
  characters: number;
  lines: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: Date | null): string {
  if (!timestamp) return "—";
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + `, ${time}`;
}

export default function FileInfo() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!activeTab) {
      setMeta(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const info = await stat(activeTab.filePath);
        if (cancelled) return;

        const content = activeTab.content || "";
        const words = content.trim()
          ? content.trim().split(/\s+/).length
          : 0;
        const characters = content.length;
        const lines = content.split("\n").length;
        const name = activeTab.fileName;
        const dot = name.lastIndexOf(".");
        const extension = dot >= 0 ? name.slice(dot).toUpperCase() : "";

        setMeta({
          name,
          path: activeTab.filePath,
          extension,
          size: formatBytes(info.size),
          created: formatDate(info.birthtime),
          modified: formatDate(info.mtime),
          words,
          characters,
          lines,
        });
      } catch {
        setMeta(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab?.filePath, activeTab?.content]);

  if (!meta) return null;

  return (
    <div className="file-info">
      <button
        className="file-info-header"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span className="file-info-title">Information</span>
      </button>

      {expanded && (
        <div className="file-info-body">
          <div className="file-info-name">
            <span className="file-info-filename">{meta.name}</span>
            <span className="file-info-type">
              Markdown document – {meta.size}
            </span>
          </div>
          <div className="file-info-rows">
            <div className="file-info-row">
              <span className="file-info-label">Modified</span>
              <span className="file-info-value">{meta.modified}</span>
            </div>
            <div className="file-info-row">
              <span className="file-info-label">Created</span>
              <span className="file-info-value">{meta.created}</span>
            </div>
            <div className="file-info-row">
              <span className="file-info-label">Words</span>
              <span className="file-info-value">
                {meta.words.toLocaleString()}
              </span>
            </div>
            <div className="file-info-row">
              <span className="file-info-label">Characters</span>
              <span className="file-info-value">
                {meta.characters.toLocaleString()}
              </span>
            </div>
            <div className="file-info-row">
              <span className="file-info-label">Lines</span>
              <span className="file-info-value">
                {meta.lines.toLocaleString()}
              </span>
            </div>
            <div className="file-info-row">
              <span className="file-info-label">Location</span>
              <span
                className="file-info-value file-info-path clickable"
                title={`Click to copy: ${meta.path}`}
                onClick={() => {
                  navigator.clipboard.writeText(meta.path);
                  toast("Path copied");
                }}
              >
                {meta.path}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
