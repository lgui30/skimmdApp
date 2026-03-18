import { useEffect, useRef, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";

interface SearchBarProps {
  editor: Editor;
  visible: boolean;
  onClose: () => void;
}

export default function SearchBar({ editor, visible, onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const storage = editor.storage.search;

  const updateSearch = useCallback(
    (term: string) => {
      storage.searchTerm = term;
      storage.currentIndex = term ? 0 : -1;
      // Force ProseMirror to recalculate decorations
      editor.view.dispatch(editor.state.tr);
    },
    [editor, storage]
  );

  const goTo = useCallback(
    (index: number) => {
      const results = storage.results;
      if (!results.length) return;
      const wrapped = ((index % results.length) + results.length) % results.length;
      storage.currentIndex = wrapped;
      editor.view.dispatch(editor.state.tr);
      // Scroll to match
      const match = results[wrapped];
      if (match) {
        editor.commands.setTextSelection(match.from);
        const dom = editor.view.domAtPos(match.from);
        if (dom.node instanceof HTMLElement) {
          dom.node.scrollIntoView({ block: "center", behavior: "smooth" });
        } else if (dom.node.parentElement) {
          dom.node.parentElement.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }
    },
    [editor, storage]
  );

  const next = useCallback(() => goTo(storage.currentIndex + 1), [goTo, storage]);
  const prev = useCallback(() => goTo(storage.currentIndex - 1), [goTo, storage]);

  const close = useCallback(() => {
    updateSearch("");
    onClose();
  }, [updateSearch, onClose]);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      updateSearch("");
    }
  }, [visible, updateSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "Enter") {
      if (e.shiftKey) {
        prev();
      } else {
        next();
      }
    }
  };

  if (!visible) return null;

  const count = storage.results.length;
  const current = storage.currentIndex;

  return (
    <div className="search-bar">
      <div className="search-bar-inner">
        <Search size={14} className="search-bar-icon" />
        <input
          ref={inputRef}
          className="search-bar-input"
          type="text"
          placeholder="Find in document..."
          value={storage.searchTerm}
          onChange={(e) => updateSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {storage.searchTerm && (
          <span className="search-bar-count">
            {count > 0 ? `${current + 1}/${count}` : "0 results"}
          </span>
        )}
        <button className="search-bar-btn" onClick={prev} title="Previous (Shift+Enter)" disabled={count === 0}>
          <ChevronUp size={14} />
        </button>
        <button className="search-bar-btn" onClick={next} title="Next (Enter)" disabled={count === 0}>
          <ChevronDown size={14} />
        </button>
        <button className="search-bar-btn" onClick={close} title="Close (Esc)">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
