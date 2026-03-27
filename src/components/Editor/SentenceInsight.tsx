import { useEffect, useRef } from "react";
import { useInsightStore } from "../../stores/insightStore";
import { X, Sparkles, Loader2 } from "lucide-react";

export default function SentenceInsight() {
  const loading = useInsightStore((s) => s.loading);
  const error = useInsightStore((s) => s.error);
  const result = useInsightStore((s) => s.result);
  const selectedSentence = useInsightStore((s) => s.selectedSentence);
  const popoverPos = useInsightStore((s) => s.popoverPos);
  const clearInsight = useInsightStore((s) => s.clearInsight);
  const cardRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        clearInsight();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [clearInsight]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearInsight();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearInsight]);

  if (!popoverPos || (!loading && !result && !error)) return null;

  // Clamp position so card stays on screen
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(popoverPos.x, window.innerWidth - 380),
    top: Math.min(popoverPos.y + 8, window.innerHeight - 300),
    zIndex: 9999,
  };

  return (
    <div className="insight-popover" style={style} ref={cardRef}>
      <div className="insight-header">
        <div className="insight-title">
          <Sparkles size={14} />
          <span>Sentence Insight</span>
        </div>
        <button className="insight-close" onClick={clearInsight} type="button">
          <X size={14} />
        </button>
      </div>

      <div className="insight-body">
        {loading && (
          <div className="insight-loading">
            <Loader2 size={16} className="insight-spinner" />
            <span>Analyzing sentence...</span>
          </div>
        )}

        {error && (
          <div className="insight-error">{error}</div>
        )}

        {result && (
          <>
            <div className="insight-sentence">"{selectedSentence}"</div>
            <div className="insight-explanation">{result.explanation}</div>

            {result.keyTerms.length > 0 && (
              <div className="insight-terms">
                <div className="insight-terms-label">Key Terms</div>
                <ul className="insight-terms-list">
                  {result.keyTerms.map((kt, i) => (
                    <li key={i}>
                      <strong>{kt.term}</strong>
                      <span> — {kt.definition}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
