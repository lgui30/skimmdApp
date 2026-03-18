import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";

interface StatusBarProps {
  editor: Editor;
}

interface Counts {
  words: number;
  characters: number;
  readingTime: string;
}

function computeCounts(text: string): Counts {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const characters = text.length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  const readingTime = `${minutes} min read`;
  return { words, characters, readingTime };
}

export default function StatusBar({ editor }: StatusBarProps) {
  const [counts, setCounts] = useState<Counts>(() =>
    computeCounts(editor.getText())
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setCounts(computeCounts(editor.getText()));
      }, 300);
    };
    editor.on("update", handler);
    return () => {
      clearTimeout(timer);
      editor.off("update", handler);
    };
  }, [editor]);

  return (
    <div className="status-bar">
      <span className="status-item">{counts.words.toLocaleString()} words</span>
      <span className="status-divider" />
      <span className="status-item">{counts.characters.toLocaleString()} characters</span>
      <span className="status-divider" />
      <span className="status-item">{counts.readingTime}</span>
    </div>
  );
}
