import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const searchPluginKey = new PluginKey("search");

export interface SearchStorage {
  searchTerm: string;
  results: Array<{ from: number; to: number }>;
  currentIndex: number;
}

export const SearchExtension = Extension.create<{}, SearchStorage>({
  name: "search",

  addStorage() {
    return {
      searchTerm: "",
      results: [],
      currentIndex: -1,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, _old, _oldState, newState) {
            const term = extension.storage.searchTerm;
            if (!term) {
              extension.storage.results = [];
              extension.storage.currentIndex = -1;
              return DecorationSet.empty;
            }

            const doc = newState.doc;
            const decorations: Decoration[] = [];
            const results: Array<{ from: number; to: number }> = [];
            const lowerTerm = term.toLowerCase();
            const currentIdx = extension.storage.currentIndex;

            doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              const text = node.text.toLowerCase();
              let idx = text.indexOf(lowerTerm);
              while (idx !== -1) {
                const from = pos + idx;
                const to = from + lowerTerm.length;
                results.push({ from, to });
                idx = text.indexOf(lowerTerm, idx + 1);
              }
            });

            extension.storage.results = results;

            results.forEach((r, i) => {
              const cls =
                i === currentIdx ? "search-match-active" : "search-match";
              decorations.push(
                Decoration.inline(r.from, r.to, { class: cls })
              );
            });

            return DecorationSet.create(doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
