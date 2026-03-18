import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown, Folder, X, FilePlus, FileText } from "lucide-react";
import type { Workspace, TreeNode, FileNode } from "../../types";
import FolderItem from "./FolderItem";
import FileItem from "./FileItem";
import { createFile } from "../../lib/fs";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useTabStore } from "../../stores/tabStore";
import { toast } from "../Toast/Toast";

interface WorkspaceSectionProps {
  workspace: Workspace;
  tree: TreeNode[];
  fileCount: number;
  activeFileId: string | null;
  onToggleCollapse: () => void;
  onRemove: () => void;
  onFileClick: (file: FileNode) => void;
}

export default function WorkspaceSection({
  workspace,
  tree,
  fileCount,
  activeFileId,
  onToggleCollapse,
  onRemove,
  onFileClick,
}: WorkspaceSectionProps) {
  const [showRemove, setShowRemove] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const refreshFiles = useWorkspaceStore((s) => s.refreshFiles);
  const openTab = useTabStore((s) => s.openTab);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleStartCreate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewFileName("");
    setIsCreating(true);
  };

  const handleCreateConfirm = async () => {
    const name = newFileName.trim();
    if (!name) {
      setIsCreating(false);
      return;
    }
    if (/[/\\:*?"<>|]/.test(name)) {
      toast("Invalid characters in filename");
      return;
    }
    try {
      const fullPath = await createFile(workspace.path, name);
      await refreshFiles();
      const finalName = name.includes(".") ? name : name + ".md";
      const ext = finalName.substring(finalName.lastIndexOf(".")).toLowerCase();
      openTab({
        name: finalName,
        path: fullPath,
        relativePath: finalName,
        workspaceId: workspace.id,
        extension: ext,
      });
      toast("File created");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create file");
    }
    setIsCreating(false);
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateConfirm();
    } else if (e.key === "Escape") {
      setIsCreating(false);
    }
  };

  return (
    <div className="workspace-section">
      <div
        className="workspace-header"
        onClick={onToggleCollapse}
        onMouseEnter={() => setShowRemove(true)}
        onMouseLeave={() => setShowRemove(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          onRemove();
        }}
      >
        <span className="workspace-chevron">
          {workspace.collapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </span>
        <Folder size={14} className="workspace-icon" />
        <span className="workspace-name">{workspace.name}</span>
        <span className="workspace-count">{fileCount}</span>
        {showRemove && !workspace.isFile && (
          <button
            className="workspace-action-btn create-btn"
            onClick={handleStartCreate}
            title="New file"
          >
            <FilePlus size={12} />
          </button>
        )}
        {showRemove && (
          <button
            className="workspace-remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove workspace"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {!workspace.collapsed && (
        <div className="workspace-files">
          {isCreating && (
            <div className="file-item new-file" style={{ paddingLeft: 40 }}>
              <FileText size={14} className="file-icon" />
              <input
                ref={inputRef}
                className="file-rename-input"
                value={newFileName}
                placeholder="filename.md"
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={handleCreateKeyDown}
                onBlur={handleCreateConfirm}
              />
            </div>
          )}
          {tree.length === 0 && !isCreating ? (
            <div className="workspace-empty">No markdown files</div>
          ) : (
            <TreeList
              nodes={tree}
              depth={0}
              activeFileId={activeFileId}
              onFileClick={onFileClick}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TreeList({
  nodes,
  depth,
  activeFileId,
  onFileClick,
}: {
  nodes: TreeNode[];
  depth: number;
  activeFileId: string | null;
  onFileClick: (file: FileNode) => void;
}) {
  return (
    <>
      {nodes.map((node) =>
        node.type === "directory" ? (
          <FolderItem
            key={node.path}
            node={node}
            depth={depth}
            activeFileId={activeFileId}
            onFileClick={onFileClick}
          />
        ) : (
          <FileItem
            key={node.path}
            file={node}
            isActive={activeFileId === node.path}
            depth={depth}
            onClick={() => onFileClick(node)}
          />
        )
      )}
    </>
  );
}

export { TreeList };
