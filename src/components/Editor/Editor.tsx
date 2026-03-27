import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { editorExtensions } from "./extensions";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useTabStore } from "../../stores/tabStore";
import { useInsightStore } from "../../stores/insightStore";
import Toolbar from "./Toolbar";
import SearchBar from "./SearchBar";
import StatusBar from "./StatusBar";
import Outline from "./Outline";
import SlashMenu from "./SlashMenu";
import SourceView from "./SourceView";
import SentenceInsight from "./SentenceInsight";

interface EditorProps {
  filePath: string;
  content: string;
}

export default function Editor({ filePath, content }: EditorProps) {
  const updateContent = useTabStore((s) => s.updateContent);
  const setDirty = useTabStore((s) => s.setDirty);
  const { save, setBaseline } = useAutoSave(800, (savedPath) => {
    setDirty(savedPath, false);
  });
  const mountedRef = useRef(false);
  const isExternalUpdateRef = useRef(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [replaceVisible, setReplaceVisible] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [highlightedSentence, setHighlightedSentence] = useState<Range | null>(null);

  const explainMode = useInsightStore((s) => s.explainMode);
  const requestInsight = useInsightStore((s) => s.requestInsight);
  const clearInsight = useInsightStore((s) => s.clearInsight);

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

  // Sentence insight: extract sentence at click position and get surrounding context
  const handleInsightClick = useCallback(
    (e: React.MouseEvent) => {
      const isTrigger = explainMode || e.metaKey || e.ctrlKey;
      if (!isTrigger || !editor || sourceMode) return;

      // Don't intercept clicks on non-text elements
      const target = e.target as HTMLElement;
      const editorEl = target.closest(".tiptap");
      if (!editorEl) return;

      // Get the text node and offset at click position
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (!range || !range.startContainer.textContent) return;

      // Find the sentence boundary around the click
      const textNode = range.startContainer;
      const fullText = textNode.textContent || "";
      const offset = range.startOffset;

      // Walk up to get block-level element text for better sentence detection
      const blockEl = target.closest("p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th");
      if (!blockEl) return;

      const blockText = blockEl.textContent || "";
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
          sentenceEnd = match.index + 1; // include the punctuation
        }
      }

      const sentence = blockText.slice(sentenceStart, sentenceEnd).trim();
      if (!sentence || sentence.length < 3) return;

      // Prevent the click from moving the editor cursor in explain mode
      if (explainMode) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Build surrounding context: get paragraphs around the clicked block
      const allBlocks = Array.from(editorEl.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, blockquote"));
      const blockIndex = allBlocks.indexOf(blockEl as Element);
      const start = Math.max(0, blockIndex - 2);
      const end = Math.min(allBlocks.length, blockIndex + 3);
      const context = allBlocks
        .slice(start, end)
        .map((el) => el.textContent || "")
        .join("\n\n");

      // Highlight the sentence
      setHighlightedSentence(null); // Clear previous
      try {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          // Create a range for the sentence within the block
          const highlightRange = document.createRange();
          // Walk text nodes to find sentence boundaries
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
            highlightRange.setStart(startNode, startOff);
            highlightRange.setEnd(endNode, endOff);
            setHighlightedSentence(highlightRange);
          }
        }
      } catch {
        // Highlight is best-effort
      }

      // Position popover near the click
      const rect = blockEl.getBoundingClientRect();
      const popX = Math.max(16, rect.left);
      const popY = rect.bottom;

      requestInsight(sentence, context, popX, popY);
    },
    [editor, explainMode, sourceMode, requestInsight]
  );

  // Apply/remove sentence highlight via CSS class on a mark wrapper
  useEffect(() => {
    // Clean up previous highlights
    document.querySelectorAll(".insight-highlight").forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    });

    if (highlightedSentence) {
      try {
        const mark = document.createElement("mark");
        mark.className = "insight-highlight";
        highlightedSentence.surroundContents(mark);
      } catch {
        // surroundContents can fail if range crosses element boundaries
      }
    }
  }, [highlightedSentence]);

  // Clear highlight when insight is cleared
  const insightResult = useInsightStore((s) => s.result);
  const insightLoading = useInsightStore((s) => s.loading);
  useEffect(() => {
    if (!insightResult && !insightLoading) {
      setHighlightedSentence(null);
    }
  }, [insightResult, insightLoading]);

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
            <div className="editor-wrapper" onClick={handleInsightClick}>
              <EditorContent editor={editor} />
              <SlashMenu editor={editor} />
            </div>
            <Outline editor={editor} />
          </>
        )}
      </div>
      <StatusBar editor={editor} />
      <SentenceInsight />
    </div>
  );
}
