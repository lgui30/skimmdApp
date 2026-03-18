import { useState, useEffect, useRef, useCallback } from "react";
import { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  CodeSquare,
  Quote,
  Minus,
  Table,
} from "lucide-react";

interface SlashMenuItem {
  label: string;
  icon: React.ReactNode;
  keywords: string[];
  action: (editor: Editor) => void;
}

const ITEMS: SlashMenuItem[] = [
  {
    label: "Heading 1",
    icon: <Heading1 size={16} />,
    keywords: ["heading", "h1", "title"],
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "Heading 2",
    icon: <Heading2 size={16} />,
    keywords: ["heading", "h2", "subtitle"],
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Heading 3",
    icon: <Heading3 size={16} />,
    keywords: ["heading", "h3"],
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "Bullet List",
    icon: <List size={16} />,
    keywords: ["bullet", "list", "unordered", "ul"],
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Numbered List",
    icon: <ListOrdered size={16} />,
    keywords: ["numbered", "ordered", "list", "ol"],
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Task List",
    icon: <ListChecks size={16} />,
    keywords: ["task", "todo", "checklist", "checkbox"],
    action: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    label: "Code Block",
    icon: <CodeSquare size={16} />,
    keywords: ["code", "block", "snippet"],
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: "Blockquote",
    icon: <Quote size={16} />,
    keywords: ["quote", "blockquote"],
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    label: "Table",
    icon: <Table size={16} />,
    keywords: ["table", "grid"],
    action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    label: "Horizontal Rule",
    icon: <Minus size={16} />,
    keywords: ["divider", "rule", "separator", "hr"],
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
];

interface SlashMenuProps {
  editor: Editor;
}

export default function SlashMenu({ editor }: SlashMenuProps) {
  const [visible, setVisible] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<number | null>(null);

  const filteredItems = ITEMS.filter((item) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q))
    );
  });

  const close = useCallback(() => {
    setVisible(false);
    setFilter("");
    startPosRef.current = null;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          // Delete the slash and filter text
          if (startPosRef.current !== null) {
            const from = startPosRef.current;
            const to = editor.state.selection.from;
            editor.chain().focus().deleteRange({ from, to }).run();
          }
          filteredItems[selectedIndex].action(editor);
          close();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [visible, filteredItems, selectedIndex, editor, close]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Listen for slash trigger
  useEffect(() => {
    const handleUpdate = () => {
      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(
        Math.max(0, from - 30),
        from,
        "\n"
      );

      // Find / at line start or after whitespace
      const slashMatch = textBefore.match(/(?:^|\n)\/([\w]*)$/);

      if (slashMatch) {
        setFilter(slashMatch[1]);
        const coords = editor.view.coordsAtPos(from);
        setPosition({
          top: coords.bottom + 4,
          left: coords.left,
        });
        if (!visible) {
          startPosRef.current = from - slashMatch[0].length + (slashMatch[0].startsWith("\n") ? 1 : 0);
          setVisible(true);
        }
      } else if (visible) {
        close();
      }
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor, visible, close]);

  // Close when clicking outside
  useEffect(() => {
    if (!visible) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [visible, close]);

  if (!visible || filteredItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="slash-menu"
      style={{ top: position.top, left: position.left }}
    >
      {filteredItems.map((item, index) => (
        <button
          key={item.label}
          className={`slash-menu-item${index === selectedIndex ? " selected" : ""}`}
          onClick={() => {
            if (startPosRef.current !== null) {
              const from = startPosRef.current;
              const to = editor.state.selection.from;
              editor.chain().focus().deleteRange({ from, to }).run();
            }
            item.action(editor);
            close();
          }}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className="slash-menu-icon">{item.icon}</span>
          <span className="slash-menu-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
