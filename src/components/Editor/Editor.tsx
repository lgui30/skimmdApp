import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { editorExtensions } from "./extensions";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useTabStore } from "../../stores/tabStore";
import { registerFlush, unregisterFlush } from "../../lib/saveRegistry";
import { useInsightStore } from "../../stores/insightStore";
import Toolbar from "./Toolbar";
import SearchBar from "./SearchBar";
import StatusBar from "./StatusBar";
import Outline from "./Outline";
import SlashMenu from "./SlashMenu";
import SourceView from "./SourceView";
import SentenceInsight from "./SentenceInsight";

interface SentenceResult {
  sentence: string;
  context: string;
  blockEl: Element;
  sentenceRange: Range | null;
}

function extractSentenceAtClick(
  clientX: number,
  clientY: number,
  editorEl: Element
): SentenceResult | null {
  const caretRange = document.caretRangeFromPoint(clientX, clientY);
  if (!caretRange || !caretRange.startContainer.textContent) return null;

  const textNode = caretRange.startContainer;
  const offset = caretRange.startOffset;

  // Walk up to find the block-level element
  let node: Node | null = textNode;
  let blockEl: Element | null = null;
  while (node && node !== editorEl) {
    if (node instanceof Element && node.matches("p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th")) {
      blockEl = node;
      break;
    }
    node = node.parentNode;
  }
  if (!blockEl) return null;

  const blockText = blockEl.textContent || "";
  if (blockText.length < 3) return null;

  // Find offset within the block text
  const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
  let charCount = 0;
  let blockOffset = offset;
  while (walker.nextNode()) {
    if (walker.currentNode === textNode) {
      blockOffset = charCount + offset;
      break;
    }
    charCount += (walker.currentNode.textContent || "").length;
  }

  // Extract sentence using punctuation boundaries
  const sentenceBreaks = /[.!?]\s+/g;
  let sentenceStart = 0;
  let sentenceEnd = blockText.length;
  let match;
  while ((match = sentenceBreaks.exec(blockText)) !== null) {
    const breakEnd = match.index + match[0].length;
    if (breakEnd <= blockOffset) {
      sentenceStart = breakEnd;
    }
    if (match.index >= blockOffset && sentenceEnd === blockText.length) {
      sentenceEnd = match.index + 1;
    }
  }

  const sentence = blockText.slice(sentenceStart, sentenceEnd).trim();
  if (!sentence || sentence.length < 3) return null;

  // Build a Range covering just the sentence text
  let sentenceRange: Range | null = null;
  try {
    const tw = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
    let count = 0;
    let startNode: Node | null = null;
    let startOff = 0;
    let endNode: Node | null = null;
    let endOff = 0;
    while (tw.nextNode()) {
      const nodeLen = (tw.currentNode.textContent || "").length;
      if (!startNode && count + nodeLen > sentenceStart) {
        startNode = tw.currentNode;
        startOff = sentenceStart - count;
      }
      if (!endNode && count + nodeLen >= sentenceEnd) {
        endNode = tw.currentNode;
        endOff = sentenceEnd - count;
      }
      count += nodeLen;
    }
    if (startNode && endNode) {
      sentenceRange = document.createRange();
      sentenceRange.setStart(startNode, startOff);
      sentenceRange.setEnd(endNode, endOff);
    }
  } catch {
    // Range creation is best-effort
  }

  // Build surrounding context: 2 paragraphs before/after
  const allBlocks = Array.from(editorEl.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, blockquote"));
  const blockIndex = allBlocks.indexOf(blockEl);
  const start = Math.max(0, blockIndex - 2);
  const end = Math.min(allBlocks.length, blockIndex + 3);
  const context = allBlocks
    .slice(start, end)
    .map((el) => el.textContent || "")
    .join("\n\n");

  return { sentence, context, blockEl, sentenceRange };
}

interface EditorProps {
  filePath: string;
  content: string;
}

export default function Editor({ filePath, content }: EditorProps) {
  const updateContent = useTabStore((s) => s.updateContent);
  const setDirty = useTabStore((s) => s.setDirty);
  const { save, setBaseline, flushSave } = useAutoSave(800, (savedPath) => {
    setDirty(savedPath, false);
  });
  const mountedRef = useRef(false);
  const isExternalUpdateRef = useRef(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [replaceVisible, setReplaceVisible] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const highlightRef = useRef<Element | null>(null);

  const explainMode = useInsightStore((s) => s.explainMode);
  const requestInsight = useInsightStore((s) => s.requestInsight);

  const editor = useEditor({
    extensions: editorExtensions,
    content,
    editorProps: {
      attributes: {
        class: "skimmd-editor",
      },
    },
    onUpdate: ({ editor }) => {
      if (!mountedRef.current) return;
      if (isExternalUpdateRef.current) return;
      const md = editor.storage.markdown.getMarkdown();
      updateContent(filePath, md);
      save(filePath, md);
    },
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Register flush function so tab close / app quit can flush pending writes
  useEffect(() => {
    registerFlush(filePath, flushSave);
    return () => unregisterFlush(filePath);
  }, [filePath, flushSave]);

  // Sync editor content on mount and when file changes externally
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentMd = editor.storage.markdown.getMarkdown();
      if (currentMd !== content) {
        isExternalUpdateRef.current = true;
        editor.commands.setContent(content);
        isExternalUpdateRef.current = false;
      }
      setBaseline(content);
    }
  }, [editor, filePath, content]);

  // Cmd+F to open search, Cmd+H for replace, Cmd+/ to toggle source
  const handleSearchOpen = useCallback((withReplace = false) => {
    setSearchVisible(true);
    setReplaceVisible(withReplace);
  }, []);
  const handleSearchClose = useCallback(() => {
    setSearchVisible(false);
    setReplaceVisible(false);
    editor?.commands.focus();
  }, [editor]);

  const handleToggleSource = useCallback(() => {
    setSourceMode((prev) => {
      if (prev && editor) {
        // Switching back to WYSIWYG — sync content from source
        const currentContent = useTabStore.getState().tabs.find(
          (t) => t.id === filePath
        )?.content;
        if (currentContent !== undefined) {
          isExternalUpdateRef.current = true;
          editor.commands.setContent(currentContent);
          isExternalUpdateRef.current = false;
        }
      }
      return !prev;
    });
  }, [editor, filePath]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        handleSearchOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "h") {
        e.preventDefault();
        handleSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        handleToggleSource();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSearchOpen, handleToggleSource]);

  // Handle source view content changes
  const handleSourceContentChange = useCallback(() => {
    // Content is already updated via SourceView's direct calls to updateContent + save
  }, []);

  // Sentence insight click handler — uses capture phase so it fires before ProseMirror
  const handleInsightMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const isExplainMode = useInsightStore.getState().explainMode;
      const isCmdClick = e.metaKey || e.ctrlKey;
      if (!isExplainMode && !isCmdClick) return;

      const target = e.target as HTMLElement;
      const editorEl = target.closest(".tiptap");
      if (!editorEl) return;

      const result = extractSentenceAtClick(e.clientX, e.clientY, editorEl);
      if (!result) return;

      // Clear previous highlight
      if (highlightRef.current) {
        highlightRef.current.classList.remove("insight-highlight-block");
        highlightRef.current = null;
      }

      // Highlight the clicked block (subtle background)
      result.blockEl.classList.add("insight-highlight-block");
      highlightRef.current = result.blockEl;

      // Highlight just the sentence text using native selection
      if (result.sentenceRange) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(result.sentenceRange);
        }
      }

      // Position popover near the block
      const rect = result.blockEl.getBoundingClientRect();
      const popX = Math.max(16, rect.left);
      const popY = rect.bottom;

      useInsightStore.getState().requestInsight(result.sentence, result.context, popX, popY);

      // Prevent default to stop ProseMirror from resetting our selection
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  // Clear highlight when insight is dismissed
  useEffect(() => {
    const unsub = useInsightStore.subscribe((state, prev) => {
      if (!state.result && !state.loading && (prev.result || prev.loading)) {
        if (highlightRef.current) {
          highlightRef.current.classList.remove("insight-highlight-block");
          highlightRef.current = null;
        }
        // Clear sentence selection
        window.getSelection()?.removeAllRanges();
      }
    });
    return unsub;
  }, []);

  if (!editor) return null;

  const currentContent = useTabStore.getState().tabs.find(
    (t) => t.id === filePath
  )?.content ?? content;

  return (
    <div className={`editor-container${explainMode ? " explain-mode" : ""}`}>
      <Toolbar editor={editor} sourceMode={sourceMode} onToggleSource={handleToggleSource} />
      {searchVisible && !sourceMode && (
        <SearchBar editor={editor} visible={searchVisible} showReplace={replaceVisible} onClose={handleSearchClose} />
      )}
      <div className="editor-body">
        {sourceMode ? (
          <SourceView
            filePath={filePath}
            content={currentContent}
            onContentChange={handleSourceContentChange}
          />
        ) : (
          <>
            <div className="editor-wrapper" onMouseDownCapture={handleInsightMouseDown}>
              <EditorContent editor={editor} />
              <SlashMenu editor={editor} />
            </div>
            <div className="right-panel">
              <Outline editor={editor} />
              <SentenceInsight />
            </div>
          </>
        )}
      </div>
      <StatusBar editor={editor} />
    </div>
  );
}
