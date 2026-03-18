import { useState, useRef, useEffect } from "react";
import { FileText, Pencil, Trash2, Copy, FolderOpen, Star } from "lucide-react";
import { rename, remove } from "@tauri-apps/plugin-fs";
import type { FileNode } from "../../types";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { toast } from "../Toast/Toast";
import { useTabStore } from "../../stores/tabStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useFavoritesStore } from "../../stores/favoritesStore";

interface FileItemProps {
  file: FileNode;
  isActive: boolean;
  depth: number;
  onClick: () => void;
}

export default function FileItem({ file, isActive, depth, onClick }: FileItemProps) {
  const paddingLeft = 40 + depth * 16;
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const closeTab = useTabStore((s) => s.closeTab);
  const renameTab = useTabStore((s) => s.renameTab);
  const refreshFiles = useWorkspaceStore((s) => s.refreshFiles);
  const isFav = useFavoritesStore((s) => s.isFavorite(file.path));
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      const dot = file.name.lastIndexOf(".");
      inputRef.current.setSelectionRange(0, dot >= 0 ? dot : file.name.length);
    }
  }, [isRenaming, file.name]);

  // Auto-scroll sidebar to reveal newly active file
  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isActive]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCopyAbsolutePath = () => {
    navigator.clipboard.writeText(file.path);
    toast("Absolute path copied");
  };

  const handleCopyRelativePath = () => {
    navigator.clipboard.writeText(file.relativePath);
    toast("Relative path copied");
  };

  const handleRevealInFinder = () => {
    const dir = file.path.substring(0, file.path.lastIndexOf("/"));
    navigator.clipboard.writeText(dir);
    toast("Folder path copied");
  };

  const handleStartRename = () => {
    setRenameValue(file.name);
    setIsRenaming(true);
  };

  const handleRenameConfirm = async () => {
    const newName = renameValue.trim();
    if (!newName || newName === file.name) {
      setIsRenaming(false);
      return;
    }

    // Validate filename
    if (/[/\\:*?"<>|]/.test(newName)) {
      toast("Invalid characters in filename");
      return;
    }

    // Auto-append .md if no extension
    const finalName = newName.includes(".") ? newName : newName + ".md";
    const dir = file.path.substring(0, file.path.lastIndexOf("/"));
    const newPath = dir + "/" + finalName;

    try {
      await rename(file.path, newPath);
      renameTab(file.path, newPath, finalName);
      await refreshFiles();
      toast("File renamed");
    } catch (err) {
      toast("Rename failed: " + (err instanceof Error ? err.message : "unknown error"));
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameConfirm();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete "${file.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await remove(file.path);
      closeTab(file.path);
      await refreshFiles();
      toast("File deleted");
    } catch (err) {
      toast("Delete failed: " + (err instanceof Error ? err.message : "unknown error"));
    }
  };

  const contextMenuItems: ContextMenuItem[] = [
    {
      label: isFav ? "Remove from Favorites" : "Add to Favorites",
      icon: <Star size={13} />,
      onClick: () => (isFav ? removeFavorite(file.path) : addFavorite(file.path)),
    },
    { label: "Rename", icon: <Pencil size={13} />, onClick: handleStartRename, divider: true },
    { label: "Copy Absolute Path", icon: <Copy size={13} />, onClick: handleCopyAbsolutePath },
    { label: "Copy Relative Path", icon: <FolderOpen size={13} />, onClick: handleCopyRelativePath },
    { label: "Copy Folder Path", icon: <Copy size={13} />, onClick: handleRevealInFinder },
    { label: "Delete", icon: <Trash2 size={13} />, onClick: handleDelete, danger: true, divider: true },
  ];

  if (isRenaming) {
    return (
      <div
        ref={itemRef}
        className={`file-item ${isActive ? "active" : ""}`}
        style={{ paddingLeft }}
      >
        <FileText size={14} className="file-icon" />
        <input
          ref={inputRef}
          className="file-rename-input"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={handleRenameConfirm}
        />
      </div>
    );
  }

  return (
    <>
      <div
        ref={itemRef}
        className={`file-item ${isActive ? "active" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        title={file.relativePath}
        style={{ paddingLeft }}
      >
        <FileText size={14} className="file-icon" />
        <span className="file-name">{file.name}</span>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
