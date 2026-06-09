import { create } from "zustand";
import { loadPageBlocks, savePageBlocks, defaultBlocksForSlug, PAGE_SLUGS } from "@/lib/cmsPages";

const uid = () => {
  try { return crypto.randomUUID(); } catch { return `b_${Math.random().toString(36).slice(2, 10)}`; }
};

const HISTORY_LIMIT = 50;

export const useEditorStore = create((set, get) => ({
  // shell
  leftOpen: true,
  rightOpen: true,
  leftTab: "pages",        // pages | layers | library
  rightTab: "props",       // props | ai | seo
  device: "desktop",       // desktop | tablet | mobile
  previewMode: false,
  paletteOpen: false,
  shortcutsOpen: false,

  // content
  slug: "home",
  blocks: [],
  seo: {},
  loaded: false,
  selectedId: null,
  dirty: false,
  saving: false,

  // history
  past: [],
  future: [],

  setShell: (patch) => set(patch),
  togglePreview: () => set((s) => ({ previewMode: !s.previewMode })),
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  openPalette: (v = true) => set({ paletteOpen: v }),

  // page lifecycle
  loadPage: async (slug) => {
    set({ loaded: false, slug, selectedId: null });
    const { blocks, seo } = await loadPageBlocks(slug);
    set({ blocks, seo, loaded: true, dirty: false, past: [], future: [] });
  },
  reset: async () => {
    const { slug } = get();
    const blocks = defaultBlocksForSlug(slug).map((b) => ({ id: uid(), ...b }));
    get()._snap();
    set({ blocks, dirty: true, selectedId: null });
  },
  save: async () => {
    const { slug, blocks, seo } = get();
    set({ saving: true });
    try {
      await savePageBlocks(slug, blocks, seo);
      set({ dirty: false });
    } finally {
      set({ saving: false });
    }
  },

  // history helpers
  _snap: () => {
    const { blocks, past } = get();
    set({ past: [...past, JSON.stringify(blocks)].slice(-HISTORY_LIMIT), future: [] });
  },
  undo: () => {
    const { past, future, blocks } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [JSON.stringify(blocks), ...future].slice(0, HISTORY_LIMIT),
      blocks: JSON.parse(prev),
      dirty: true,
    });
  },
  redo: () => {
    const { past, future, blocks } = get();
    if (!future.length) return;
    const next = future[0];
    set({
      future: future.slice(1),
      past: [...past, JSON.stringify(blocks)].slice(-HISTORY_LIMIT),
      blocks: JSON.parse(next),
      dirty: true,
    });
  },

  // block ops
  select: (id) => set({ selectedId: id }),
  addBlock: (type, atIndex) => {
    get()._snap();
    const block = { id: uid(), type, data: {} };
    const { blocks } = get();
    const next = [...blocks];
    if (typeof atIndex === "number") next.splice(atIndex, 0, block);
    else next.push(block);
    set({ blocks: next, selectedId: block.id, dirty: true });
  },
  duplicate: (id) => {
    get()._snap();
    const { blocks } = get();
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const copy = { ...blocks[i], id: uid(), data: JSON.parse(JSON.stringify(blocks[i].data || {})) };
    const next = [...blocks];
    next.splice(i + 1, 0, copy);
    set({ blocks: next, selectedId: copy.id, dirty: true });
  },
  remove: (id) => {
    get()._snap();
    const { blocks, selectedId } = get();
    set({
      blocks: blocks.filter((b) => b.id !== id),
      selectedId: selectedId === id ? null : selectedId,
      dirty: true,
    });
  },
  move: (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    get()._snap();
    const { blocks } = get();
    const next = [...blocks];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    set({ blocks: next, dirty: true });
  },
  toggleVisible: (id) => {
    const { blocks } = get();
    set({
      blocks: blocks.map((b) =>
        b.id === id ? { ...b, hidden: !b.hidden } : b
      ),
      dirty: true,
    });
  },
  updateData: (id, patch) => {
    const { blocks } = get();
    set({
      blocks: blocks.map((b) =>
        b.id === id ? { ...b, data: { ...(b.data || {}), ...patch } } : b
      ),
      dirty: true,
    });
  },
  replaceData: (id, data) => {
    get()._snap();
    const { blocks } = get();
    set({
      blocks: blocks.map((b) => (b.id === id ? { ...b, data } : b)),
      dirty: true,
    });
  },
  setSeo: (patch) => set((s) => ({ seo: { ...s.seo, ...patch }, dirty: true })),
}));

export { PAGE_SLUGS };
