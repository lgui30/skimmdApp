import { useState, useRef } from "react";
import { X, Copy, PanelLeft } from "lucide-react";
import { useTabStore } from "../../stores/tabStore";
import { useUIStore } from "../../stores/uiStore";
import ContextMenu, { type ContextMenuItem } from "../Sidebar/ContextMenu";
import { toast } from "../Toast/Toast";

export default function TabBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const reorderTabs = useTabStore((s) => s.reorderTabs);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const dragStartX = useRef(0);
  const hasDragged = useRef(false);

  if (tabs.length === 0) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragStartX.current = e.clientX;
    hasDragged.current = false;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Use a transparent image to avoid default drag ghost
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
          label: "Copy Path",
          icon: <Copy size={13} />,
          onClick: () => {
            navigator.clipboard.writeText(contextTab.filePath);
            toast("Path copied");
          },
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
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
        >
          <span className="tab-name">{tab.fileName}</span>
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
