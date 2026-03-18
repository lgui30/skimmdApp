import { useState, useEffect, useRef, useMemo } from "react";
import { Search, FileText } from "lucide-react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useTabStore } from "../../stores/tabStore";
import { flattenTree } from "../../lib/fs";
import type { FileEntry } from "../../types";

interface QuickOpenProps {
  visible: boolean;
  onClose: () => void;
}

interface ScoredFile {
  file: FileEntry;
  score: number;
  nameMatches: number[];
  pathMatches: number[];
}

function fuzzyMatch(query: string, text: string): { score: number; matches: number[] } {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const matches: number[] = [];
  let qi = 0;
  let score = 0;
  let prevMatch = -1;

  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) {
      matches.push(ti);
      // Consecutive match bonus
      if (prevMatch === ti - 1) score += 3;
      // Start of word bonus
      if (ti === 0 || lowerText[ti - 1] === "/" || lowerText[ti - 1] === "-" || lowerText[ti - 1] === "_" || lowerText[ti - 1] === " ") {
        score += 5;
      }
      score += 1;
      prevMatch = ti;
      qi++;
    }
  }

  if (qi < lowerQuery.length) return { score: 0, matches: [] };

  // Exact prefix bonus
  if (lowerText.startsWith(lowerQuery)) score += 10;

  return { score, matches };
}

export default function QuickOpen({ visible, onClose }: QuickOpenProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const trees = useWorkspaceStore((s) => s.trees);
  const openTab = useTabStore((s) => s.openTab);

  const allFiles = useMemo(() => {
    const files: FileEntry[] = [];
    for (const [, tree] of trees) {
      files.push(...flattenTree(tree));
    }
    return files;
  }, [trees]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Show all files (limited) when no query
      return allFiles.slice(0, 12).map((file) => ({
        file,
        score: 0,
        nameMatches: [],
        pathMatches: [],
      }));
    }

    const scored: ScoredFile[] = [];
    for (const file of allFiles) {
      const nameResult = fuzzyMatch(query, file.name);
      const pathResult = fuzzyMatch(query, file.relativePath);
      const bestScore = Math.max(nameResult.score * 2, pathResult.score);
      if (bestScore > 0) {
        scored.push({
          file,
          score: bestScore,
          nameMatches: nameResult.score > 0 ? nameResult.matches : [],
          pathMatches: pathResult.score > 0 ? pathResult.matches : [],
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 12);
  }, [query, allFiles]);

  useEffect(() => {
    if (visible && inputRef.current) {
      setQuery("");
      setSelectedIndex(0);
      inputRef.current.focus();
    }
  }, [visible]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement;
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = (file: FileEntry) => {
    openTab({
      name: file.name,
      path: file.path,
      relativePath: file.relativePath,
      workspaceId: file.workspaceId,
      extension: file.extension,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].file);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <div className="quick-open-overlay" onClick={onClose}>
      <div className="quick-open" onClick={(e) => e.stopPropagation()}>
        <div className="quick-open-input-wrapper">
          <Search size={16} className="quick-open-icon" />
          <input
            ref={inputRef}
            className="quick-open-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files..."
          />
        </div>
        <div className="quick-open-results" ref={listRef}>
          {results.length === 0 && query.trim() ? (
            <div className="quick-open-empty">No files found</div>
          ) : (
            results.map((result, index) => (
              <div
                key={result.file.path}
                className={`quick-open-item${index === selectedIndex ? " selected" : ""}`}
                onClick={() => handleSelect(result.file)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <FileText size={14} className="quick-open-item-icon" />
                <div className="quick-open-item-text">
                  <HighlightedText text={result.file.name} matches={result.nameMatches} />
                  <span className="quick-open-item-path">
                    {result.file.relativePath}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function HighlightedText({ text, matches }: { text: string; matches: number[] }) {
  if (matches.length === 0) return <span className="quick-open-item-name">{text}</span>;

  const matchSet = new Set(matches);
  const parts: React.ReactNode[] = [];
  let current = "";
  let isMatch = false;

  for (let i = 0; i < text.length; i++) {
    const charMatch = matchSet.has(i);
    if (charMatch !== isMatch) {
      if (current) {
        parts.push(
          isMatch ? (
            <mark key={i} className="quick-open-highlight">{current}</mark>
          ) : (
            <span key={i}>{current}</span>
          )
        );
      }
      current = "";
      isMatch = charMatch;
    }
    current += text[i];
  }
  if (current) {
    parts.push(
      isMatch ? (
        <mark key="last" className="quick-open-highlight">{current}</mark>
      ) : (
        <span key="last">{current}</span>
      )
    );
  }

  return <span className="quick-open-item-name">{parts}</span>;
}
