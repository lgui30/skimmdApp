import { readDir, readTextFile, writeTextFile, stat, exists } from "@tauri-apps/plugin-fs";
import type { FileEntry, TreeNode, FileNode, DirNode } from "../types";

const MD_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".vscode",
  "__pycache__",
  "dist",
  "build",
  ".cache",
]);

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export async function buildFileTree(
  dirPath: string,
  workspaceId: string,
  prefix = ""
): Promise<TreeNode[]> {
  const nodes: TreeNode[] = [];

  try {
    const entries = await readDir(dirPath);

    const dirs: Array<{ name: string; fullPath: string }> = [];
    const files: FileNode[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = dirPath + "/" + entry.name;

      if (entry.isDirectory) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        dirs.push({ name: entry.name, fullPath });
      } else if (entry.isFile) {
        const ext = getExtension(entry.name);
        if (MD_EXTENSIONS.has(ext)) {
          files.push({
            name: entry.name,
            path: fullPath,
            relativePath: prefix ? prefix + "/" + entry.name : entry.name,
            workspaceId,
            extension: ext,
            type: "file",
          });
        }
      }
    }

    // Sort directories alphabetically
    dirs.sort((a, b) => a.name.localeCompare(b.name));
    // Sort files alphabetically
    files.sort((a, b) => a.name.localeCompare(b.name));

    // Recurse into subdirectories
    for (const dir of dirs) {
      const children = await buildFileTree(
        dir.fullPath,
        workspaceId,
        prefix ? prefix + "/" + dir.name : dir.name
      );
      // Only include directories that have markdown files somewhere inside
      if (children.length > 0) {
        nodes.push({
          name: dir.name,
          path: dir.fullPath,
          type: "directory",
          children,
        });
      }
    }

    // Add files after directories
    nodes.push(...files);
  } catch {
    // skip unreadable directories
  }

  return nodes;
}

// Flatten a tree into a flat FileEntry[] (for compatibility with tab store etc.)
export function flattenTree(nodes: TreeNode[]): FileEntry[] {
  const result: FileEntry[] = [];
  for (const node of nodes) {
    if (node.type === "file") {
      result.push({
        name: node.name,
        path: node.path,
        relativePath: node.relativePath,
        workspaceId: node.workspaceId,
        extension: node.extension,
      });
    } else {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

export type SortMode = "name-asc" | "name-desc" | "modified";

export function sortTree(nodes: TreeNode[], mode: SortMode): TreeNode[] {
  const dirs = nodes
    .filter((n): n is DirNode => n.type === "directory")
    .map((d) => ({ ...d, children: sortTree(d.children, mode) }));
  const files = [...nodes.filter((n): n is FileNode => n.type === "file")];

  // Directories always sort alphabetically
  dirs.sort((a, b) => a.name.localeCompare(b.name));

  // Sort files based on mode
  switch (mode) {
    case "name-asc":
      files.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      files.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "modified":
      // Modified-time sort uses a separate cache populated asynchronously.
      // Fallback to name if no cache available.
      files.sort((a, b) => {
        const ma = mtimeCache.get(a.path) ?? 0;
        const mb = mtimeCache.get(b.path) ?? 0;
        return mb - ma; // newest first
      });
      break;
  }

  return [...dirs, ...files];
}

// Cache for modification times (populated per-workspace)
const mtimeCache = new Map<string, number>();

export async function populateMtimeCache(nodes: TreeNode[]): Promise<void> {
  const files = flattenTree(nodes);
  await Promise.all(
    files.map(async (f) => {
      try {
        const info = await stat(f.path);
        mtimeCache.set(f.path, info.mtime ? new Date(info.mtime).getTime() : 0);
      } catch {
        mtimeCache.set(f.path, 0);
      }
    })
  );
}

export async function readFile(path: string): Promise<string> {
  return readTextFile(path);
}

export async function writeFile(
  path: string,
  content: string
): Promise<void> {
  return writeTextFile(path, content);
}

export async function createFile(dirPath: string, fileName: string): Promise<string> {
  const finalName = fileName.includes(".") ? fileName : fileName + ".md";
  const fullPath = dirPath + "/" + finalName;
  const fileExists = await exists(fullPath);
  if (fileExists) {
    throw new Error(`File "${finalName}" already exists`);
  }
  await writeTextFile(fullPath, "");
  return fullPath;
}
