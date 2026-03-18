import { useState } from "react";
import { ChevronDown, ChevronRight, Star, FileText, X } from "lucide-react";
import { useFavoritesStore } from "../../stores/favoritesStore";
import { useTabStore } from "../../stores/tabStore";
import type { FileEntry } from "../../types";

export default function FavoritesSection() {
  const favorites = useFavoritesStore((s) => s.favorites);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const openTab = useTabStore((s) => s.openTab);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const [collapsed, setCollapsed] = useState(false);

  if (favorites.length === 0) return null;

  const handleClick = (path: string) => {
    const name = path.split("/").pop() || path;
    const dot = name.lastIndexOf(".");
    const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ".md";
    openTab({
      name,
      path,
      relativePath: name,
      workspaceId: "",
      extension: ext,
    } as FileEntry);
  };

  return (
    <div className="favorites-section">
      <div
        className="favorites-header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="workspace-chevron">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>
        <Star size={13} className="favorites-icon" />
        <span className="favorites-title">Favorites</span>
        <span className="workspace-count">{favorites.length}</span>
      </div>
      {!collapsed && (
        <div className="favorites-list">
          {favorites.map((path) => {
            const name = path.split("/").pop() || path;
            return (
              <div
                key={path}
                className={`file-item${activeTabId === path ? " active" : ""}`}
                onClick={() => handleClick(path)}
                title={path}
                style={{ paddingLeft: 40 }}
              >
                <FileText size={14} className="file-icon" />
                <span className="file-name">{name}</span>
                <button
                  className="favorite-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(path);
                  }}
                  title="Remove from favorites"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
