import { FileText } from "lucide-react";
import type { FileNode } from "../../types";

interface FileItemProps {
  file: FileNode;
  isActive: boolean;
  depth: number;
  onClick: () => void;
}

export default function FileItem({ file, isActive, depth, onClick }: FileItemProps) {
  const paddingLeft = 40 + depth * 16;

  return (
    <div
      className={`file-item ${isActive ? "active" : ""}`}
      onClick={onClick}
      title={file.relativePath}
      style={{ paddingLeft }}
    >
      <FileText size={14} className="file-icon" />
      <span className="file-name">{file.name}</span>
    </div>
  );
}
