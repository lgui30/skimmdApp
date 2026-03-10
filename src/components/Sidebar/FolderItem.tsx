import { useState } from "react";
import { ChevronRight, ChevronDown, Folder } from "lucide-react";
import type { DirNode, FileNode } from "../../types";
import { TreeList } from "./WorkspaceSection";

interface FolderItemProps {
  node: DirNode;
  depth: number;
  activeFileId: string | null;
  onFileClick: (file: FileNode) => void;
}

export default function FolderItem({
  node,
  depth,
  activeFileId,
  onFileClick,
}: FolderItemProps) {
  const [expanded, setExpanded] = useState(false);
  const paddingLeft = 40 + depth * 16;

  return (
    <div className="folder-node">
      <div
        className="folder-header"
        style={{ paddingLeft }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="folder-chevron">
          {expanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
        </span>
        <Folder size={13} className="folder-icon" />
        <span className="folder-name">{node.name}</span>
      </div>
      {expanded && (
        <div className="folder-children">
          <TreeList
            nodes={node.children}
            depth={depth + 1}
            activeFileId={activeFileId}
            onFileClick={onFileClick}
          />
        </div>
      )}
    </div>
  );
}
