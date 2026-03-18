import { useState, useEffect, useRef, useCallback } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useTabStore } from "../../stores/tabStore";

interface SourceViewProps {
  filePath: string;
  content: string;
  onContentChange: (content: string) => void;
}

export default function SourceView({ filePath, content, onContentChange }: SourceViewProps) {
  const [value, setValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { save } = useAutoSave();
  const updateContent = useTabStore((s) => s.updateContent);

  useEffect(() => {
    setValue(content);
  }, [content]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      updateContent(filePath, newValue);
      save(filePath, newValue);
      onContentChange(newValue);
    },
    [filePath, save, updateContent, onContentChange]
  );

  // Handle tab key for indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      setValue(newValue);
      updateContent(filePath, newValue);
      save(filePath, newValue);
      onContentChange(newValue);
      // Restore cursor position
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }, [value, filePath, save, updateContent, onContentChange]);

  return (
    <div className="source-view">
      <textarea
        ref={textareaRef}
        className="source-textarea"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
      />
    </div>
  );
}
