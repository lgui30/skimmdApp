import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, X } from "lucide-react";
import type { Workspace, TreeNode, FileNode } from "../../types";
import FolderItem from "./FolderItem";
import FileItem from "./FileItem";

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
          {tree.length === 0 ? (
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
