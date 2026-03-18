import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { useState, useEffect, useRef } from "react";
import mermaid from "mermaid";
import { ChevronDown, ChevronRight, Code } from "lucide-react";

function initMermaid() {
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark";
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    securityLevel: "loose",
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  });
}

// Initialize once on load
initMermaid();

export default function CodeBlockView({
  node,
  editor,
  getPos,
}: {
  node: any;
  editor: any;
  getPos: () => number;
}) {
  const language = node.attrs.language || "";
  const isMermaid = language === "mermaid";

  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [codeVisible, setCodeVisible] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const code = node.textContent;

  // Render mermaid with debounce
  useEffect(() => {
    if (!isMermaid) return;
    if (!code.trim()) {
      setSvg("");
      setError("");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      initMermaid();
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      mermaid
        .render(id, code.trim())
        .then(({ svg: rendered }) => {
          setSvg(rendered);
          setError("");
          // Auto-collapse code once diagram renders successfully
          setCodeVisible(false);
        })
        .catch((err) => {
          setSvg("");
          setError(String(err?.message || err));
        });
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code, isMermaid]);

  // Re-render on theme change
  useEffect(() => {
    if (!isMermaid) return;
    const observer = new MutationObserver(() => {
      initMermaid();
      if (code.trim()) {
        const id = `mermaid-theme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        mermaid
          .render(id, code.trim())
          .then(({ svg: rendered }) => setSvg(rendered))
          .catch(() => {});
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [code, isMermaid]);

  // Auto-expand code when cursor enters this node
  useEffect(() => {
    if (!isMermaid || !editor) return;

    const handleSelectionUpdate = () => {
      try {
        const pos = getPos();
        if (typeof pos !== "number") return;
        const { from } = editor.state.selection;
        const end = pos + node.nodeSize;
        if (from > pos && from < end) {
          setCodeVisible(true);
        }
      } catch {
        // getPos() can throw if node is being removed
      }
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, isMermaid, node.nodeSize, getPos]);

  // Non-mermaid: standard code block
  if (!isMermaid) {
    return (
      <NodeViewWrapper as="pre" data-language={language}>
        <NodeViewContent
          as="code"
          className={language ? `language-${language}` : ""}
        />
      </NodeViewWrapper>
    );
  }

  const hasDiagram = !!svg && !error;

  return (
    <NodeViewWrapper className="mermaid-block">
      {/* Header bar */}
      <div className="mermaid-header" contentEditable={false}>
        <button
          className="mermaid-toggle"
          onClick={() => setCodeVisible(!codeVisible)}
        >
          {codeVisible ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
          <Code size={13} />
          <span>mermaid</span>
        </button>
      </div>

      {/* Collapsible code section */}
      <div
        className={`mermaid-code-section ${codeVisible ? "open" : "collapsed"}`}
      >
        <pre data-language="mermaid">
          <NodeViewContent as="code" className="language-mermaid" />
        </pre>
      </div>

      {/* Rendered diagram */}
      {hasDiagram && (
        <div
          className="mermaid-diagram"
          contentEditable={false}
          onClick={() => setCodeVisible(true)}
          title="Click to edit"
        >
          <div
            className="mermaid-svg"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mermaid-error-box" contentEditable={false}>
          <span className="mermaid-error-label">Diagram error</span>
          <pre className="mermaid-error-text">{error}</pre>
        </div>
      )}
    </NodeViewWrapper>
  );
}
