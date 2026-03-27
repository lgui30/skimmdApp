import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useTabStore } from "../../stores/tabStore";
import { useRecentsStore } from "../../stores/recentsStore";
import { Plus, FileText } from "lucide-react";

interface OpenResult {
  path: string;
  is_directory: boolean;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function parentFolder(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length >= 2) return parts[parts.length - 2];
  return "";
}

export default function WelcomeScreen() {
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const addFile = useWorkspaceStore((s) => s.addFile);
  const openTab = useTabStore((s) => s.openTab);
  const recents = useRecentsStore((s) => s.recents);
  const loadRecents = useRecentsStore((s) => s.loadRecents);

  useEffect(() => {
    loadRecents();
  }, []);

  const handleOpen = async () => {
    try {
      const result = await invoke<OpenResult | null>("open_file_or_folder");
      if (!result) return;
      if (result.is_directory) {
        await addWorkspace(result.path);
      } else {
        await addFile(result.path);
      }
    } catch (err) {
      console.error("open_file_or_folder failed:", err);
    }
  };

  const handleOpenRecent = async (r: typeof recents[0]) => {
    // Add as a single-file workspace first, then open in tab
    await addFile(r.filePath);
    const ext = r.fileName.substring(r.fileName.lastIndexOf(".")).toLowerCase();
    const ws = useWorkspaceStore.getState().workspaces.find((w) => w.path === r.filePath);
    openTab({
      name: r.fileName,
      path: r.filePath,
      relativePath: r.fileName,
      workspaceId: ws?.id || "",
      extension: ext || ".md",
    });
  };

  // Show up to 10 recents on welcome screen
  const visibleRecents = recents.slice(0, 10);

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-logo">skimmd</div>
        <p className="welcome-subtitle">
          A beautiful way to read and edit your markdown files.
        </p>
        <button className="welcome-btn" onClick={handleOpen}>
          <Plus size={20} />
          Open
        </button>
        <p className="welcome-hint">
          Choose a .md file or a folder containing markdown files
        </p>

        {visibleRecents.length > 0 && (
          <div className="welcome-recents">
            <div className="welcome-recents-title">Recent Files</div>
            <div className="welcome-recents-list">
              {visibleRecents.map((r) => (
                <button
                  key={r.filePath}
                  className="welcome-recent-item"
                  onClick={() => handleOpenRecent(r)}
                  title={r.filePath}
                >
                  <FileText size={14} className="welcome-recent-icon" />
                  <span className="welcome-recent-name">{r.fileName}</span>
                  <span className="welcome-recent-folder">{parentFolder(r.filePath)}</span>
                  <span className="welcome-recent-time">{timeAgo(r.lastOpened)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
