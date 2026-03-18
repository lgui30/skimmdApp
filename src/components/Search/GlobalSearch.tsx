import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, CaseSensitive, FileText } from "lucide-react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useTabStore } from "../../stores/tabStore";
import { flattenTree } from "../../lib/fs";
import type { FileEntry } from "../../types";

interface SearchMatch {
  file: FileEntry;
  lines: { lineNumber: number; text: string; matchStart: number; matchEnd: number }[];
}

interface GlobalSearchProps {
  visible: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ visible, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const trees = useWorkspaceStore((s) => s.trees);
  const openTab = useTabStore((s) => s.openTab);

  const allFiles = useMemo(() => {
    const files: FileEntry[] = [];
    for (const [, tree] of trees) {
      files.push(...flattenTree(tree));
    }
    return files;
  }, [trees]);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setTotalMatches(0);
        setSearching(false);
        return;
      }

      setSearching(true);
      const matches: SearchMatch[] = [];
      let total = 0;

      const flags = caseSensitive ? "g" : "gi";
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      for (const file of allFiles) {
        try {
          const content = await readTextFile(file.path);
          const lines = content.split("\n");
          const fileLines: SearchMatch["lines"] = [];

          for (let i = 0; i < lines.length; i++) {
            const regex = new RegExp(escapedQuery, flags);
            const match = regex.exec(lines[i]);
            if (match) {
              fileLines.push({
                lineNumber: i + 1,
                text: lines[i],
                matchStart: match.index,
                matchEnd: match.index + match[0].length,
              });
              total++;
              if (total > 200) break;
            }
          }

          if (fileLines.length > 0) {
            matches.push({ file, lines: fileLines.slice(0, 5) });
          }
        } catch {
          // Skip unreadable files
        }

        if (total > 200) break;
      }

      setResults(matches);
      setTotalMatches(total);
      setSearching(false);
    },
    [allFiles, caseSensitive]
  );

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, caseSensitive, performSearch]);

  const handleResultClick = (file: FileEntry) => {
    openTab({
      name: file.name,
      path: file.path,
      relativePath: file.relativePath,
      workspaceId: file.workspaceId,
      extension: file.extension,
    });
  };

  if (!visible) return null;

  return (
    <div className="global-search">
      <div className="global-search-header">
        <div className="global-search-input-wrapper">
          <Search size={14} className="global-search-icon" />
          <input
            ref={inputRef}
            className="global-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all files..."
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          <button
            className={`global-search-toggle${caseSensitive ? " active" : ""}`}
            onClick={() => setCaseSensitive(!caseSensitive)}
            title="Match case"
          >
            <CaseSensitive size={14} />
          </button>
          <button className="global-search-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        {query.trim() && (
          <div className="global-search-summary">
            {searching
              ? "Searching..."
              : `${totalMatches} result${totalMatches !== 1 ? "s" : ""} in ${results.length} file${results.length !== 1 ? "s" : ""}`}
          </div>
        )}
      </div>
      <div className="global-search-results">
        {results.map((match) => (
          <div key={match.file.path} className="global-search-file">
            <div
              className="global-search-file-header"
              onClick={() => handleResultClick(match.file)}
            >
              <FileText size={13} />
              <span className="global-search-file-name">{match.file.name}</span>
              <span className="global-search-file-path">{match.file.relativePath}</span>
              <span className="global-search-file-count">{match.lines.length}</span>
            </div>
            <div className="global-search-lines">
              {match.lines.map((line) => (
                <div
                  key={line.lineNumber}
                  className="global-search-line"
                  onClick={() => handleResultClick(match.file)}
                >
                  <span className="global-search-line-num">{line.lineNumber}</span>
                  <span className="global-search-line-text">
                    {line.text.substring(0, line.matchStart)}
                    <mark className="global-search-match">
                      {line.text.substring(line.matchStart, line.matchEnd)}
                    </mark>
                    {line.text.substring(line.matchEnd)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!searching && query.trim() && results.length === 0 && (
          <div className="global-search-empty">
            No results found for &ldquo;{query}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
