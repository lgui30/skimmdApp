import { useState, useRef, useEffect } from "react";
import { X, Copy, Pencil, PanelLeft } from "lucide-react";
import { rename } from "@tauri-apps/plugin-fs";
import { useTabStore } from "../../stores/tabStore";
import { useUIStore } from "../../stores/uiStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import ContextMenu, { type ContextMenuItem } from "../Sidebar/ContextMenu";
import { toast } from "../Toast/Toast";

export default function TabBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const reorderTabs = useTabStore((s) => s.reorderTabs);
  const renameTab = useTabStore((s) => s.renameTab);
  const refreshFiles = useWorkspaceStore((s) => s.refreshFiles);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const dragStartX = useRef(0);
  const hasDragged = useRef(false);

  if (tabs.length === 0) return null;

  const startRename = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    setRenamingTabId(tabId);
    // Pre-fill with name without extension
    const dot = tab.fileName.lastIndexOf(".");
    setRenameValue(dot >= 0 ? tab.fileName.slice(0, dot) : tab.fileName);
  };

  const cancelRename = () => {
    setRenamingTabId(null);
    setRenameValue("");
  };

  const confirmRename = async () => {
    if (!renamingTabId) return;
    const tab = tabs.find((t) => t.id === renamingTabId);
    if (!tab) {
      cancelRename();
      return;
    }

    const newName = renameValue.trim();
    if (!newName || newName === tab.fileName.replace(/\.[^.]+$/, "")) {
      cancelRename();
      return;
    }

    // Validate filename
    if (/[/\\:*?"<>|]/.test(newName)) {
      toast("Invalid characters in filename");
      return;
    }

    // Auto-append .md if no extension
    const finalName = newName.includes(".") ? newName : newName + ".md";
    const dir = tab.filePath.substring(0, tab.filePath.lastIndexOf("/"));
    const newPath = dir + "/" + finalName;

    try {
      await rename(tab.filePath, newPath);
      renameTab(tab.filePath, newPath, finalName);
      await refreshFiles();
      toast(`Renamed to ${finalName}`);
    } catch (err) {
      toast("Rename failed: " + (err instanceof Error ? err.message : "unknown error"));
    }
    cancelRename();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmRename();
    } else if (e.key === "Escape") {
      cancelRename();
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragStartX.current = e.clientX;
    hasDragged.current = false;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (Math.abs(e.clientX - dragStartX.current) > 5) {
      hasDragged.current = true;
    }
    setDropIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index && hasDragged.current) {
      reorderTabs(dragIndex, index);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const contextTab = contextMenu ? tabs.find((t) => t.id === contextMenu.tabId) : null;
  const contextMenuItems: ContextMenuItem[] = contextTab
    ? [
        {
          label: "Rename",
          icon: <Pencil size={13} />,
          onClick: () => startRename(contextTab.id),
        },
        {
          label: "Copy Path",
          icon: <Copy size={13} />,
          onClick: () => {
            navigator.clipboard.writeText(contextTab.filePath);
            toast("Path copied");
          },
          divider: true,
        },
        {
          label: "Close Tab",
          icon: <X size={13} />,
          onClick: () => closeTab(contextTab.id),
        },
      ]
    : [];

  return (
    <div className="tab-bar">
      {sidebarCollapsed && (
        <button
          className="tab-sidebar-toggle"
          onClick={toggleSidebar}
          title="Show sidebar (Cmd+\)"
        >
          <PanelLeft size={15} />
        </button>
      )}
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          className={`tab ${tab.id === activeTabId ? "active" : ""}${dragIndex === index ? " dragging" : ""}${dropIndex === index && dragIndex !== index ? " drop-target" : ""}`}
          onClick={() => setActiveTab(tab.id)}
          onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
          onAuxClick={(e) => {
            if (e.button === 1) closeTab(tab.id);
          }}
          draggable={renamingTabId !== tab.id}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
        >
          {renamingTabId === tab.id ? (
            <TabRenameInput
              inputRef={renameInputRef}
              value={renameValue}
              onChange={setRenameValue}
              onKeyDown={handleRenameKeyDown}
              onBlur={confirmRename}
            />
          ) : (
            <span
              className="tab-name"
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename(tab.id);
              }}
            >
              {tab.dirty && <span className="tab-dirty-dot">&bull;</span>}
              {tab.fileName}
            </span>
          )}
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

function TabRenameInput({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onBlur,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
}) {
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inputRef]);

  return (
    <input
      ref={inputRef}
      className="tab-rename-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
