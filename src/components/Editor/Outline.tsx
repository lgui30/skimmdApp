import { useEffect, useState, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { List, PanelRightClose } from "lucide-react";

interface HeadingItem {
  id: string;
  text: string;
  level: number;
  pos: number;
}

interface OutlineProps {
  editor: Editor;
}

export default function Outline({ editor }: OutlineProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const extractHeadings = useCallback(() => {
    const items: HeadingItem[] = [];
    const doc = editor.getJSON();
    let idx = 0;
    let pos = 0;

    const walk = (node: any) => {
      if (node.type === "heading" && node.attrs?.level) {
        const text = (node.content || [])
          .map((c: any) => c.text || "")
          .join("");
        if (text.trim()) {
          items.push({
            id: `heading-${idx++}`,
            text: text.trim(),
            level: node.attrs.level,
            pos,
          });
        }
      }
      pos++;
      if (node.content) {
        for (const child of node.content) {
          walk(child);
        }
      }
    };

    if (doc.content) {
      for (const node of doc.content) {
        walk(node);
      }
    }

    setHeadings(items);
  }, [editor]);

  useEffect(() => {
    extractHeadings();
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(extractHeadings, 500);
    };
    editor.on("update", handler);
    return () => {
      clearTimeout(timer);
      editor.off("update", handler);
    };
  }, [editor, extractHeadings]);

  // Track active heading based on scroll position
  useEffect(() => {
    if (headings.length === 0) return;

    const editorWrapper = editor.view.dom.closest(".editor-wrapper");
    if (!editorWrapper) return;

    const handleScroll = () => {
      const headingEls = editor.view.dom.querySelectorAll("h1, h2, h3, h4, h5, h6");
      let currentId: string | null = null;

      headingEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120 && i < headings.length) {
          currentId = headings[i].id;
        }
      });

      setActiveId(currentId);
    };

    handleScroll(); // set initial active
    editorWrapper.addEventListener("scroll", handleScroll);
    return () => editorWrapper.removeEventListener("scroll", handleScroll);
  }, [headings, editor]);

  // Auto-scroll the outline list to keep the active item visible
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const activeEl = listRef.current.querySelector(".outline-item.active");
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeId]);

  const scrollToHeading = (index: number) => {
    const headingEls = editor.view.dom.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const target = headingEls[index];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (collapsed) {
    return (
      <button
        className="outline-toggle-btn"
        onClick={() => setCollapsed(false)}
        title="Show table of contents"
      >
        <List size={15} />
      </button>
    );
  }

  // Find the minimum heading level for proper indentation
  const minLevel = headings.length > 0 ? Math.min(...headings.map((h) => h.level)) : 1;

  return (
    <div className="outline-panel">
      <div className="outline-header">
        <span className="outline-title">Contents</span>
        <button
          className="outline-close"
          onClick={() => setCollapsed(true)}
          title="Hide table of contents"
        >
          <PanelRightClose size={14} />
        </button>
      </div>
      <div className="outline-list" ref={listRef}>
        {headings.length === 0 ? (
          <div className="outline-empty">No headings found</div>
        ) : (
          headings.map((h, i) => (
            <button
              key={h.id}
              className={`outline-item outline-level-${h.level}${activeId === h.id ? " active" : ""}`}
              style={{ paddingLeft: 12 + (h.level - minLevel) * 16 }}
              onClick={() => scrollToHeading(i)}
              title={h.text}
            >
              <span className="outline-item-indicator" />
              <span className="outline-item-text">{h.text}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
