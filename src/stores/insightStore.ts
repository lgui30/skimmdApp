import { create } from "zustand";
import { fetchSentenceInsight, InsightResult } from "../lib/openai";

interface InsightState {
  explainMode: boolean;
  loading: boolean;
  error: string | null;
  result: InsightResult | null;
  selectedSentence: string | null;
  popoverPos: { x: number; y: number } | null;

  toggleExplainMode: () => void;
  setExplainMode: (on: boolean) => void;
  requestInsight: (sentence: string, context: string, x: number, y: number) => Promise<void>;
  clearInsight: () => void;
}

export const useInsightStore = create<InsightState>((set, get) => ({
  explainMode: false,
  loading: false,
  error: null,
  result: null,
  selectedSentence: null,
  popoverPos: null,

  toggleExplainMode: () =>
    set((s) => {
      const next = !s.explainMode;
      // Clear any existing insight when toggling off
      if (!next) {
        return { explainMode: false, result: null, selectedSentence: null, popoverPos: null, error: null };
      }
      return { explainMode: true };
    }),

  setExplainMode: (on) =>
    set(() => {
      if (!on) {
        return { explainMode: false, result: null, selectedSentence: null, popoverPos: null, error: null };
      }
      return { explainMode: true };
    }),

  requestInsight: async (sentence, context, x, y) => {
    set({ loading: true, error: null, result: null, selectedSentence: sentence, popoverPos: { x, y } });
    try {
      const result = await fetchSentenceInsight(sentence, context);
      // Only update if this sentence is still the selected one (prevents stale responses)
      if (get().selectedSentence === sentence) {
        set({ result, loading: false });
      }
    } catch (err: any) {
      if (get().selectedSentence === sentence) {
        set({ error: err.message || "Failed to get insight", loading: false });
      }
    }
  },

  clearInsight: () =>
    set({ result: null, selectedSentence: null, popoverPos: null, error: null, loading: false }),
}));
