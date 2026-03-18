import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let mermaidInitialized = false;

function ensureMermaidInit() {
  if (mermaidInitialized) return;
  mermaidInitialized = true;

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    securityLevel: "loose",
    fontFamily: "var(--font-ui)",
  });
}

interface MermaidRendererProps {
  code: string;
}

export function MermaidRenderer({ code }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!code.trim()) return;
    ensureMermaidInit();

    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    mermaid
      .render(id, code.trim())
      .then(({ svg: rendered }) => {
        setSvg(rendered);
        setError("");
      })
      .catch((err) => {
        setSvg("");
        setError(String(err?.message || err));
      });
  }, [code]);

  // Re-render on theme change
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        securityLevel: "loose",
        fontFamily: "var(--font-ui)",
      });
      mermaidInitialized = true;

      if (code.trim()) {
        const id = `mermaid-re-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        mermaid
          .render(id, code.trim())
          .then(({ svg: rendered }) => {
            setSvg(rendered);
            setError("");
          })
          .catch(() => {});
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [code]);

  if (error) {
    return (
      <div className="mermaid-error">
        <span className="mermaid-error-label">Mermaid error</span>
        <pre className="mermaid-error-text">{error}</pre>
      </div>
    );
  }

  if (!svg) return null;

  return (
    <div
      className="mermaid-render"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * Hook that observes the editor DOM for mermaid code blocks
 * and injects rendered SVG diagrams below them.
 */
export function useMermaidRenderer(editorElement: HTMLElement | null) {
  const renderRoots = useRef<Map<HTMLElement, ReturnType<typeof import("react-dom/client").createRoot>>>(new Map());

  useEffect(() => {
    if (!editorElement) return;

    const renderMermaidBlocks = () => {
      const codeBlocks = editorElement.querySelectorAll("pre > code");
      const activeBlocks = new Set<HTMLElement>();

      codeBlocks.forEach((codeEl) => {
        const pre = codeEl.parentElement;
        if (!pre) return;

        // Check if this is a mermaid code block
        const isMermaid =
          codeEl.classList.contains("language-mermaid") ||
          pre.getAttribute("data-language") === "mermaid" ||
          (codeEl.className && codeEl.className.includes("mermaid"));

        if (!isMermaid) {
          // Remove any existing render container
          const existing = pre.nextElementSibling;
          if (existing?.classList.contains("mermaid-container")) {
            const root = renderRoots.current.get(existing as HTMLElement);
            if (root) {
              root.unmount();
              renderRoots.current.delete(existing as HTMLElement);
            }
            existing.remove();
          }
          return;
        }

        const code = codeEl.textContent || "";
        activeBlocks.add(pre as HTMLElement);

        // Find or create render container
        let container = pre.nextElementSibling;
        if (!container?.classList.contains("mermaid-container")) {
          container = document.createElement("div");
          container.classList.add("mermaid-container");
          pre.after(container);
        }

        // Render using mermaid directly (no React needed in DOM)
        ensureMermaidInit();
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        mermaid
          .render(id, code.trim())
          .then(({ svg }) => {
            if (container) {
              (container as HTMLElement).innerHTML = svg;
              (container as HTMLElement).classList.remove("mermaid-error-container");
            }
          })
          .catch((err) => {
            if (container) {
              (container as HTMLElement).innerHTML = `<div class="mermaid-error"><span class="mermaid-error-label">Mermaid error</span><pre class="mermaid-error-text">${err?.message || err}</pre></div>`;
              (container as HTMLElement).classList.add("mermaid-error-container");
            }
          });
      });
    };

    // Initial render
    renderMermaidBlocks();

    // Observe changes
    const observer = new MutationObserver(() => {
      renderMermaidBlocks();
    });

    observer.observe(editorElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Also re-render on theme changes
    const themeObserver = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        securityLevel: "loose",
        fontFamily: "var(--font-ui)",
      });
      mermaidInitialized = true;
      renderMermaidBlocks();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      themeObserver.disconnect();
    };
  }, [editorElement]);
}
