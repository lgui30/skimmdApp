import { useEffect, useRef, useCallback } from "react";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useTabStore } from "../../stores/tabStore";

interface SourceViewProps {
  filePath: string;
  content: string;
  onContentChange: (content: string) => void;
}

const lightTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    fontFamily: "var(--font-mono)",
  },
  ".cm-content": {
    padding: "16px 0",
    caretColor: "var(--ink)",
  },
  ".cm-gutters": {
    background: "var(--bg)",
    color: "var(--muted)",
    border: "none",
    paddingRight: "8px",
  },
  ".cm-activeLineGutter": {
    background: "var(--hover-bg)",
    color: "var(--ink)",
  },
  ".cm-activeLine": {
    background: "var(--hover-bg)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--ink)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    background: "rgba(47, 111, 237, 0.15) !important",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "var(--font-mono)",
    lineHeight: "1.6",
  },
});

const darkThemeOverrides = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    fontFamily: "var(--font-mono)",
  },
  ".cm-content": {
    padding: "16px 0",
  },
  ".cm-gutters": {
    background: "var(--bg)",
    color: "var(--muted)",
    border: "none",
    paddingRight: "8px",
  },
  ".cm-activeLineGutter": {
    background: "var(--hover-bg)",
    color: "var(--ink)",
  },
  ".cm-activeLine": {
    background: "var(--hover-bg)",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "var(--font-mono)",
    lineHeight: "1.6",
  },
});

export default function SourceView({ filePath, content, onContentChange }: SourceViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { save } = useAutoSave(800, (savedPath) => {
    useTabStore.getState().setDirty(savedPath, false);
  });
  const updateContent = useTabStore((s) => s.updateContent);

  const onChangeRef = useRef(onContentChange);
  onChangeRef.current = onContentChange;
  const saveRef = useRef(save);
  saveRef.current = save;
  const updateContentRef = useRef(updateContent);
  updateContentRef.current = updateContent;
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;

  const isDark = useCallback(() => {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const dark = isDark();

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        ...(dark
          ? [oneDark, darkThemeOverrides]
          : [syntaxHighlighting(defaultHighlightStyle), lightTheme]),
        keymap.of([...defaultKeymap, indentWithTab]),
        EditorState.tabSize.of(2),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            updateContentRef.current(filePathRef.current, newContent);
            saveRef.current(filePathRef.current, newContent);
            onChangeRef.current(newContent);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    view.focus();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [isDark]);

  // Sync external content changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== content) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: content },
      });
    }
  }, [content]);

  return (
    <div className="source-view" ref={containerRef} />
  );
}
