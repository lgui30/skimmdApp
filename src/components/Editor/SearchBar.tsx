import { useState, useEffect, useRef, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { Search, X, ChevronUp, ChevronDown, Replace, ReplaceAll } from "lucide-react";
import { toast } from "../Toast/Toast";

interface SearchBarProps {
  editor: Editor;
  visible: boolean;
  showReplace?: boolean;
  onClose: () => void;
}

export default function SearchBar({ editor, visible, showReplace = false, onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceOpen, setReplaceOpen] = useState(showReplace);
  const [replaceTerm, setReplaceTerm] = useState("");
  const storage = editor.storage.search;

  useEffect(() => {
    setReplaceOpen(showReplace);
  }, [showReplace]);

  const updateSearch = useCallback(
    (term: string) => {
      storage.searchTerm = term;
      storage.currentIndex = term ? 0 : -1;
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

  const replaceCurrent = useCallback(() => {
    const results = storage.results;
    const idx = storage.currentIndex;
    if (idx < 0 || idx >= results.length) return;
    const match = results[idx];
    editor
      .chain()
      .focus()
      .setTextSelection({ from: match.from, to: match.to })
      .insertContent(replaceTerm)
      .run();
    // Re-trigger search to update decorations
    editor.view.dispatch(editor.state.tr);
    // Advance to next match (results will have shifted)
    const newResults = storage.results;
    if (newResults.length > 0) {
      const newIdx = Math.min(idx, newResults.length - 1);
      storage.currentIndex = newIdx;
      editor.view.dispatch(editor.state.tr);
    }
  }, [editor, storage, replaceTerm]);

  const replaceAll = useCallback(() => {
    const results = [...storage.results];
    if (results.length === 0) return;
    const count = results.length;
    // Replace from end to start so positions don't shift
    const chain = editor.chain().focus();
    for (let i = results.length - 1; i >= 0; i--) {
      const match = results[i];
      chain.setTextSelection({ from: match.from, to: match.to }).insertContent(replaceTerm);
    }
    chain.run();
    editor.view.dispatch(editor.state.tr);
    toast(`Replaced ${count} occurrence${count !== 1 ? "s" : ""}`);
  }, [editor, storage, replaceTerm]);

  const close = useCallback(() => {
    updateSearch("");
    setReplaceTerm("");
    onClose();
  }, [updateSearch, onClose]);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [visible]);

  useEffect(() => {
    if (replaceOpen && replaceInputRef.current) {
      replaceInputRef.current.focus();
    }
  }, [replaceOpen]);

  useEffect(() => {
    if (!visible) {
      updateSearch("");
      setReplaceTerm("");
    }
  }, [visible, updateSearch]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
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

  const handleReplaceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "Enter") {
      replaceCurrent();
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
          onKeyDown={handleSearchKeyDown}
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
        <button className="search-bar-btn" onClick={() => setReplaceOpen(!replaceOpen)} title="Toggle Replace (Cmd+H)">
          <Replace size={14} />
        </button>
        <button className="search-bar-btn" onClick={close} title="Close (Esc)">
          <X size={14} />
        </button>
      </div>
      {replaceOpen && (
        <div className="search-bar-replace">
          <input
            ref={replaceInputRef}
            className="search-bar-input"
            type="text"
            placeholder="Replace with..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
          />
          <button className="search-bar-btn" onClick={replaceCurrent} title="Replace" disabled={count === 0}>
            <Replace size={14} />
          </button>
          <button className="search-bar-btn" onClick={replaceAll} title="Replace All" disabled={count === 0}>
            <ReplaceAll size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
