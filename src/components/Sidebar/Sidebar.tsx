import { open } from "@tauri-apps/plugin-dialog";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useTabStore } from "../../stores/tabStore";
import { useZoomStore } from "../../stores/zoomStore";
import WorkspaceSection from "./WorkspaceSection";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import { Plus, ZoomIn, ZoomOut } from "lucide-react";

export default function Sidebar() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const trees = useWorkspaceStore((s) => s.trees);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);
  const toggleCollapse = useWorkspaceStore((s) => s.toggleCollapse);
  const getFileCount = useWorkspaceStore((s) => s.getFileCount);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const openTab = useTabStore((s) => s.openTab);
  const { zoom, zoomIn, zoomOut, resetZoom } = useZoomStore();

  const handleAdd = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      await addWorkspace(selected);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="sidebar-logo">skimmd</span>
          <button
            className="sidebar-add-btn"
            onClick={handleAdd}
            title="Add workspace"
          >
            <Plus size={16} />
          </button>
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

      <div className="sidebar-footer">
        <button className="sidebar-add-workspace-btn" onClick={handleAdd}>
          <Plus size={14} />
          Add workspace
        </button>
      </div>
    </aside>
  );
}
