export interface Workspace {
  id: string;
  path: string;
  name: string;
  collapsed: boolean;
  isFile?: boolean; // true when workspace is a single file, not a folder
}

export interface FileEntry {
  name: string;
  path: string;
  relativePath: string;
  workspaceId: string;
  extension: string;
}

export interface DirNode {
  name: string;
  path: string;
  type: "directory";
  children: TreeNode[];
}

export interface FileNode {
  name: string;
  path: string;
  relativePath: string;
  workspaceId: string;
  extension: string;
  type: "file";
}

export type TreeNode = DirNode | FileNode;

export interface Tab {
  id: string;
  filePath: string;
  fileName: string;
  workspaceId: string;
  content: string;
  lastSaved: number;
}

export type ThemeMode = "light" | "dark" | "system";
