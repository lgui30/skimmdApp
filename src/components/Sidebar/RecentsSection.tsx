import { useState } from "react";
import { Clock, ChevronDown, ChevronRight, FileText, X, Copy, Trash2 } from "lucide-react";
import { useRecentsStore } from "../../stores/recentsStore";
import { useTabStore } from "../../stores/tabStore";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { toast } from "../Toast/Toast";

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
  return parts.length >= 2 ? parts[parts.length - 2] : "";
}

export default function RecentsSection() {
  const recents = useRecentsStore((s) => s.recents);
  const removeRecent = useRecentsStore((s) => s.removeRecent);
  const clearRecents = useRecentsStore((s) => s.clearRecents);
  const openTab = useTabStore((s) => s.openTab);
  const [collapsed, setCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; filePath: string } | null>(null);

  // Show max 5 in sidebar
  const visible = recents.slice(0, 5);

  if (recents.length === 0) return null;

  const handleOpen = (r: typeof recents[0]) => {
    const ext = r.fileName.substring(r.fileName.lastIndexOf(".")).toLowerCase();
    openTab({
      name: r.fileName,
      path: r.filePath,
      relativePath: r.fileName,
      workspaceId: r.workspaceId,
      extension: ext || ".md",
    });
  };

  const handleContextMenu = (e: React.MouseEvent, filePath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, filePath });
  };

  const contextRecent = contextMenu ? recents.find((r) => r.filePath === contextMenu.filePath) : null;
  const contextMenuItems: ContextMenuItem[] = contextRecent
    ? [
        {
          label: "Open",
          icon: <FileText size={13} />,
          onClick: () => handleOpen(contextRecent),
        },
        {
          label: "Copy Path",
          icon: <Copy size={13} />,
          onClick: () => {
            navigator.clipboard.writeText(contextRecent.filePath);
            toast("Path copied");
          },
        },
        {
          label: "Remove from Recents",
          icon: <Trash2 size={13} />,
          onClick: () => removeRecent(contextRecent.filePath),
          divider: true,
        },
      ]
    : [];

  return (
    <div className="recents-section">
      <div className="recents-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="recents-header-left">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <Clock size={13} />
          <span className="recents-title">Recents</span>
        </div>
        {!collapsed && (
          <button
            className="recents-clear-btn"
            title="Clear all recents"
            onClick={(e) => {
              e.stopPropagation();
              clearRecents();
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="recents-list">
          {visible.map((r) => (
            <div
              key={r.filePath}
              className="recents-item"
              onClick={() => handleOpen(r)}
              onContextMenu={(e) => handleContextMenu(e, r.filePath)}
              title={r.filePath}
            >
              <FileText size={13} className="recents-item-icon" />
              <span className="recents-item-name">{r.fileName}</span>
              <span className="recents-item-meta">{parentFolder(r.filePath)}</span>
              <span className="recents-item-time">{timeAgo(r.lastOpened)}</span>
            </div>
          ))}
        </div>
      )}
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
