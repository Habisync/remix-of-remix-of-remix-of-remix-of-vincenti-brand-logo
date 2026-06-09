import { useEffect, useMemo, useRef, useState } from "react";
import { useEditorStore } from "@/lib/editorStore";
import { LIVE_BLOCKS, BLOCK_CATEGORIES } from "@/components/admin/LiveBlocks";
import { BlockErrorBoundary } from "@/components/BlockErrorBoundary";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Eye, EyeOff, Copy, Trash2, Plus, Monitor, Tablet, Smartphone,
  PanelLeft, PanelRight, Save, Undo2, Redo2, Command, ExternalLink, RotateCcw,
  Loader2, Sparkles,
} from "lucide-react";

function DeviceFrame({ children }) {
  const device = useEditorStore((s) => s.device);
  const width = device === "mobile" ? 390 : device === "tablet" ? 820 : "100%";
  return (
    <div className="w-full flex justify-center bg-[#0a0a0b]">
      <div
        className="transition-all duration-300 ease-out bg-[#0F0F10] min-h-[60vh] rounded-md ring-1 ring-[#1a1a1d] overflow-hidden"
        style={{ width, maxWidth: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

function SortableBlock({ block, index }) {
  const Cmp = LIVE_BLOCKS[block.type];
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const duplicate = useEditorStore((s) => s.duplicate);
  const remove = useEditorStore((s) => s.remove);
  const toggleVisible = useEditorStore((s) => s.toggleVisible);
  const setShell = useEditorStore((s) => s.setShell);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : block.hidden ? 0.35 : 1,
  };
  const selected = selectedId === block.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={block.id}
      onClick={(e) => {
        e.stopPropagation();
        select(block.id);
        setShell({ rightOpen: true, rightTab: "props" });
      }}
      className={`relative group ${selected ? "ring-2 ring-[#D4AF37]" : "ring-1 ring-transparent hover:ring-[#D4AF37]/40"} rounded-sm transition`}
    >
      <div className="absolute top-2 left-2 z-30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          {...attributes}
          {...listeners}
          className="bg-[#0a0a0b]/90 backdrop-blur px-1.5 py-1 rounded ring-1 ring-[#1e1e22] text-[#A1A1AA] hover:text-[#D4AF37] cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] uppercase tracking-[0.18em] bg-[#0a0a0b]/90 backdrop-blur px-2 py-1 rounded ring-1 ring-[#1e1e22] text-[#D4AF37]">
          {block.type}
        </span>
      </div>
      <div className="absolute top-2 right-2 z-30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <IconBtn title={block.hidden ? "Show" : "Hide"} onClick={(e) => { e.stopPropagation(); toggleVisible(block.id); }}>
          {block.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </IconBtn>
        <IconBtn title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicate(block.id); }}>
          <Copy className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn title="Delete" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this block?")) remove(block.id); }}>
          <Trash2 className="w-3.5 h-3.5 text-red-400/80" />
        </IconBtn>
      </div>
      {Cmp ? (
        <BlockErrorBoundary blockType={block.type} blockId={block.id}>
          <div className={block.hidden ? "pointer-events-none" : ""}>
            <Cmp d={block.data || {}} />
          </div>
        </BlockErrorBoundary>
      ) : (
        <div className="p-6 m-4 border border-yellow-500/30 bg-yellow-500/5 text-yellow-200 text-xs rounded">
          Unknown block: <code>{block.type}</code>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, ...rest }) {
  return (
    <button
      {...rest}
      className="bg-[#0a0a0b]/90 backdrop-blur px-1.5 py-1 rounded ring-1 ring-[#1e1e22] text-[#A1A1AA] hover:text-[#D4AF37]"
    />
  );
}

function InsertBetween({ index }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const addBlock = useEditorStore((s) => s.addBlock);
  const all = useMemo(
    () =>
      BLOCK_CATEGORIES.flatMap((c) =>
        c.blocks.map((b) => ({ ...b, cat: c.label }))
      ),
    []
  );
  const filtered = q
    ? all.filter((b) =>
        (b.label + " " + b.type + " " + b.desc).toLowerCase().includes(q.toLowerCase())
      )
    : all.slice(0, 30);

  return (
    <div className="relative h-3 group/insert">
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#D4AF37]/0 group-hover/insert:bg-[#D4AF37]/40 transition" />
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-6 h-6 rounded-full bg-[#0a0a0b] ring-1 ring-[#1e1e22] text-[#A1A1AA] hover:text-[#D4AF37] hover:ring-[#D4AF37]/60 opacity-0 group-hover/insert:opacity-100 flex items-center justify-center"
        title="Insert block"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          className="absolute left-1/2 top-6 -translate-x-1/2 z-40 w-80 bg-[#0a0a0b] ring-1 ring-[#1e1e22] rounded-md shadow-2xl p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search blocks…"
            className="w-full bg-[#0f0f10] text-[#f0ede8] text-xs px-2 py-1.5 rounded ring-1 ring-[#1e1e22] focus:ring-[#D4AF37]/60 outline-none"
          />
          <div className="max-h-64 overflow-y-auto mt-2 space-y-0.5">
            {filtered.map((b) => (
              <button
                key={b.type}
                onClick={() => { addBlock(b.type, index); setOpen(false); setQ(""); }}
                className="w-full text-left px-2 py-1.5 rounded text-xs text-[#f0ede8] hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"
              >
                <div className="font-medium">{b.label}</div>
                <div className="text-[10px] text-[#6a6a6e]">{b.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Canvas() {
  const blocks = useEditorStore((s) => s.blocks);
  const loaded = useEditorStore((s) => s.loaded);
  const previewMode = useEditorStore((s) => s.previewMode);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const move = useEditorStore((s) => s.move);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from < 0 || to < 0) return;
    move(from, to);
  };

  // scroll selected into view
  const containerRef = useRef(null);
  useEffect(() => {
    if (!selectedId || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-block-id="${selectedId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId]);

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#A1A1AA] text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading page…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" onClick={() => select(null)} ref={containerRef}>
      <DeviceFrame>
        {previewMode ? (
          blocks.map((b) => {
            const Cmp = LIVE_BLOCKS[b.type];
            if (!Cmp || b.hidden) return null;
            return (
              <BlockErrorBoundary key={b.id} blockType={b.type} blockId={b.id}>
                <Cmp d={b.data || {}} />
              </BlockErrorBoundary>
            );
          })
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <InsertBetween index={0} />
              {blocks.map((b, i) => (
                <div key={b.id}>
                  <SortableBlock block={b} index={i} />
                  <InsertBetween index={i + 1} />
                </div>
              ))}
            </SortableContext>
            {blocks.length === 0 && (
              <div className="text-center py-32 text-[#6a6a6e] text-sm">
                <Sparkles className="w-6 h-6 mx-auto mb-3 text-[#D4AF37]/60" />
                Empty page. Use the <kbd className="px-1.5 py-0.5 mx-1 bg-[#0a0a0b] ring-1 ring-[#1e1e22] rounded text-[10px]">+</kbd> button or
                the <kbd className="px-1.5 py-0.5 mx-1 bg-[#0a0a0b] ring-1 ring-[#1e1e22] rounded text-[10px]">Library</kbd> tab to add blocks.
              </div>
            )}
          </DndContext>
        )}
      </DeviceFrame>
    </div>
  );
}

export function CanvasToolbar() {
  const device = useEditorStore((s) => s.device);
  const setShell = useEditorStore((s) => s.setShell);
  const previewMode = useEditorStore((s) => s.previewMode);
  const togglePreview = useEditorStore((s) => s.togglePreview);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const save = useEditorStore((s) => s.save);
  const dirty = useEditorStore((s) => s.dirty);
  const saving = useEditorStore((s) => s.saving);
  const leftOpen = useEditorStore((s) => s.leftOpen);
  const rightOpen = useEditorStore((s) => s.rightOpen);
  const toggleLeft = useEditorStore((s) => s.toggleLeft);
  const toggleRight = useEditorStore((s) => s.toggleRight);
  const openPalette = useEditorStore((s) => s.openPalette);
  const slug = useEditorStore((s) => s.slug);
  const reset = useEditorStore((s) => s.reset);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);

  return (
    <div className="h-12 px-3 flex items-center gap-2 border-b border-[#1a1a1d] bg-[#0a0a0b]/95 backdrop-blur sticky top-0 z-20">
      <button
        onClick={toggleLeft}
        className={`p-1.5 rounded ${leftOpen ? "bg-[#1a1a1d] text-[#D4AF37]" : "text-[#A1A1AA] hover:text-[#f0ede8]"}`}
        title="Toggle left panel (⌘[)"
      >
        <PanelLeft className="w-4 h-4" />
      </button>
      <div className="h-5 w-px bg-[#1a1a1d]" />

      <div className="flex items-center bg-[#0f0f10] rounded ring-1 ring-[#1a1a1d]">
        {[
          { id: "desktop", icon: Monitor },
          { id: "tablet", icon: Tablet },
          { id: "mobile", icon: Smartphone },
        ].map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setShell({ device: id })}
            className={`px-2 py-1 ${device === id ? "text-[#D4AF37]" : "text-[#6a6a6e] hover:text-[#f0ede8]"}`}
            title={id}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-[#1a1a1d]" />

      <button onClick={undo} disabled={!past.length} className="p-1.5 rounded text-[#A1A1AA] hover:text-[#f0ede8] disabled:opacity-30" title="Undo (⌘Z)">
        <Undo2 className="w-4 h-4" />
      </button>
      <button onClick={redo} disabled={!future.length} className="p-1.5 rounded text-[#A1A1AA] hover:text-[#f0ede8] disabled:opacity-30" title="Redo (⌘⇧Z)">
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="h-5 w-px bg-[#1a1a1d]" />

      <button
        onClick={openPalette}
        className="flex items-center gap-2 px-2.5 py-1 text-xs text-[#A1A1AA] hover:text-[#f0ede8] bg-[#0f0f10] ring-1 ring-[#1a1a1d] rounded"
        title="Command palette (⌘K)"
      >
        <Command className="w-3.5 h-3.5" />
        <span>Search & actions</span>
        <kbd className="ml-2 text-[10px] text-[#6a6a6e]">⌘K</kbd>
      </button>

      <div className="flex-1" />

      <span className="text-[11px] uppercase tracking-[0.2em] text-[#6a6a6e]">
        /{slug === "home" ? "" : slug}
      </span>

      <button
        onClick={togglePreview}
        className={`px-2.5 py-1 text-xs rounded ring-1 ${previewMode ? "bg-[#D4AF37]/10 ring-[#D4AF37]/40 text-[#D4AF37]" : "ring-[#1a1a1d] text-[#A1A1AA] hover:text-[#f0ede8]"}`}
      >
        {previewMode ? "Editing off" : "Preview"}
      </button>

      <button
        onClick={() => { if (confirm("Reset this page to default template?")) reset(); }}
        className="p-1.5 rounded text-[#A1A1AA] hover:text-[#f0ede8]"
        title="Reset to default template"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <a
        href={slug === "home" ? "/" : `/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="p-1.5 rounded text-[#A1A1AA] hover:text-[#f0ede8]"
        title="Open live page"
      >
        <ExternalLink className="w-4 h-4" />
      </a>

      <button
        onClick={save}
        disabled={!dirty || saving}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[#D4AF37] text-[#0a0a0b] hover:bg-[#E5C158] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        {dirty ? "Save" : "Saved"}
      </button>

      <div className="h-5 w-px bg-[#1a1a1d]" />
      <button
        onClick={toggleRight}
        className={`p-1.5 rounded ${rightOpen ? "bg-[#1a1a1d] text-[#D4AF37]" : "text-[#A1A1AA] hover:text-[#f0ede8]"}`}
        title="Toggle right panel (⌘])"
      >
        <PanelRight className="w-4 h-4" />
      </button>
    </div>
  );
}
