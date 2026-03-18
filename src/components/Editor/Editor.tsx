import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { editorExtensions } from "./extensions";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useTabStore } from "../../stores/tabStore";
import { useUIStore } from "../../stores/uiStore";
import Toolbar from "./Toolbar";
import SearchBar from "./SearchBar";
import StatusBar from "./StatusBar";
import Outline from "./Outline";
import SlashMenu from "./SlashMenu";
import SourceView from "./SourceView";

interface EditorProps {
  filePath: string;
  content: string;
}

export default function Editor({ filePath, content }: EditorProps) {
  const { save, setBaseline } = useAutoSave();
  const updateContent = useTabStore((s) => s.updateContent);
  const mountedRef = useRef(false);
  const isExternalUpdateRef = useRef(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const zenMode = useUIStore((s) => s.zenMode);
  const focusMode = useUIStore((s) => s.focusMode);

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

  // Sync editor content when file changes externally (via file watcher + reloadTab)
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
  }, [filePath, content]);

  // Cmd+F to open search, Cmd+/ to toggle source
  const handleSearchOpen = useCallback(() => setSearchVisible(true), []);
  const handleSearchClose = useCallback(() => {
    setSearchVisible(false);
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
        handleSearchOpen();
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

  if (!editor) return null;

  const currentContent = useTabStore.getState().tabs.find(
    (t) => t.id === filePath
  )?.content ?? content;

  return (
    <div className={`editor-container${zenMode ? " zen-mode" : ""}${focusMode ? " focus-mode" : ""}`}>
      {!zenMode && !focusMode && (
        <Toolbar editor={editor} sourceMode={sourceMode} onToggleSource={handleToggleSource} />
      )}
      {searchVisible && !sourceMode && (
        <SearchBar editor={editor} visible={searchVisible} onClose={handleSearchClose} />
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
            <div className="editor-wrapper">
              <EditorContent editor={editor} />
              <SlashMenu editor={editor} />
            </div>
            {!zenMode && !focusMode && <Outline editor={editor} />}
          </>
        )}
      </div>
      {!focusMode && <StatusBar editor={editor} />}
    </div>
  );
}
