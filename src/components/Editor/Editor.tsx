import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { editorExtensions } from "./extensions";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useTabStore } from "../../stores/tabStore";

interface EditorProps {
  filePath: string;
  content: string;
}

export default function Editor({ filePath, content }: EditorProps) {
  const { save, setBaseline } = useAutoSave();
  const updateContent = useTabStore((s) => s.updateContent);
  const mountedRef = useRef(false);

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

  useEffect(() => {
    if (editor && content !== undefined) {
      const currentMd = editor.storage.markdown.getMarkdown();
      if (currentMd !== content) {
        editor.commands.setContent(content);
      }
      setBaseline(content);
    }
  }, [filePath]);

  if (!editor) return null;

  return (
    <div className="editor-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
}
