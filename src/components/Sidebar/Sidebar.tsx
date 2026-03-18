import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useTabStore } from "../../stores/tabStore";
import { useZoomStore } from "../../stores/zoomStore";
import { useFavoritesStore } from "../../stores/favoritesStore";
import WorkspaceSection from "./WorkspaceSection";
import FavoritesSection from "./FavoritesSection";
import FileInfo from "./FileInfo";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import { Plus, ZoomIn, ZoomOut, ArrowUpAZ, ArrowDownAZ, Clock, PanelLeftClose } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import type { SortMode } from "../../lib/fs";

interface OpenResult {
  path: string;
  is_directory: boolean;
}

const SORT_CYCLE: SortMode[] = ["name-asc", "name-desc", "modified"];
const SORT_LABELS: Record<SortMode, string> = {
  "name-asc": "A-Z",
  "name-desc": "Z-A",
  modified: "Recent",
};

export default function Sidebar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const trees = useWorkspaceStore((s) => s.trees);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const addFile = useWorkspaceStore((s) => s.addFile);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);
  const toggleCollapse = useWorkspaceStore((s) => s.toggleCollapse);
  const getFileCount = useWorkspaceStore((s) => s.getFileCount);
  const sortMode = useWorkspaceStore((s) => s.sortMode);
  const setSortMode = useWorkspaceStore((s) => s.setSortMode);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const openTab = useTabStore((s) => s.openTab);
  const { zoom, zoomIn, zoomOut, resetZoom } = useZoomStore();
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);

  useEffect(() => {
    loadFavorites();
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

  const cycleSortMode = () => {
    const idx = SORT_CYCLE.indexOf(sortMode);
    const next = SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
    setSortMode(next);
  };

  const SortIcon =
    sortMode === "modified"
      ? Clock
      : sortMode === "name-desc"
        ? ArrowDownAZ
        : ArrowUpAZ;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="sidebar-logo">skimmd</span>
          <div className="sidebar-add-btns">
            <button
              className="sidebar-add-btn"
              onClick={cycleSortMode}
              title={`Sort: ${SORT_LABELS[sortMode]}`}
            >
              <SortIcon size={14} />
            </button>
            <button
              className="sidebar-add-btn"
              onClick={handleOpen}
              title="Open file or folder"
            >
              <Plus size={16} />
            </button>
            <button
              className="sidebar-add-btn"
              onClick={toggleSidebar}
              title="Collapse sidebar (Cmd+\)"
            >
              <PanelLeftClose size={15} />
            </button>
          </div>
        </div>
        <div className="sidebar-controls">
          <ThemeToggle />
          <div className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={zoomOut}
              title="Zoom out (Cmd+-)"
            >
              <ZoomOut size={13} />
            </button>
            <button
              className="zoom-label"
              onClick={resetZoom}
              title="Reset zoom"
            >
              {zoom}%
            </button>
            <button
              className="zoom-btn"
              onClick={zoomIn}
              title="Zoom in (Cmd++)"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="sidebar-workspaces">
        <FavoritesSection />
        {workspaces.map((ws) => (
          <WorkspaceSection
            key={ws.id}
            workspace={ws}
            tree={trees.get(ws.id) || []}
            fileCount={getFileCount(ws.id)}
            activeFileId={activeTabId}
            onToggleCollapse={() => toggleCollapse(ws.id)}
            onRemove={() => removeWorkspace(ws.id)}
            onFileClick={(file) =>
              openTab({
                name: file.name,
                path: file.path,
                relativePath: file.relativePath,
                workspaceId: file.workspaceId,
                extension: file.extension,
              })
            }
          />
        ))}
      </div>

      <FileInfo />
    </aside>
  );
}
