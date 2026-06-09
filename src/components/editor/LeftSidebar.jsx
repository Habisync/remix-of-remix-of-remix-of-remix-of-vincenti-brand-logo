import { useMemo, useState } from "react";
import { useEditorStore, PAGE_SLUGS } from "@/lib/editorStore";
import { BLOCK_CATEGORIES, LIVE_BLOCKS } from "@/components/admin/LiveBlocks";
import {
  FileText, Layers, LayoutTemplate, Search, ChevronRight, ChevronDown,
  Eye, EyeOff, Trash2, GripVertical, Plus,
} from "lucide-react";

const TABS = [
  { id: "pages", label: "Pages", icon: FileText },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "library", label: "Library", icon: LayoutTemplate },
];

function PagesTab() {
  const slug = useEditorStore((s) => s.slug);
  const dirty = useEditorStore((s) => s.dirty);
  const loadPage = useEditorStore((s) => s.loadPage);
  return (
    <div className="p-2">
      <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[#6a6a6e]">Pages</div>
      <ul className="space-y-0.5">
        {PAGE_SLUGS.map((p) => (
          <li key={p}>
            <button
              onClick={async () => {
                if (dirty && !confirm("Unsaved changes will be lost. Continue?")) return;
                await loadPage(p);
              }}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs ${slug === p ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "text-[#f0ede8] hover:bg-[#1a1a1d]"}`}
            >
              <span className="capitalize">{p}</span>
              <span className="text-[10px] text-[#6a6a6e]">/{p === "home" ? "" : p}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LayersTab() {
  const blocks = useEditorStore((s) => s.blocks);
  const selectedId = useEditorStore((s) => s.selectedId);
  const select = useEditorStore((s) => s.select);
  const toggleVisible = useEditorStore((s) => s.toggleVisible);
  const remove = useEditorStore((s) => s.remove);

  return (
    <div className="p-2">
      <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[#6a6a6e]">
        Layers · {blocks.length}
      </div>
      <ul className="space-y-0.5">
        {blocks.map((b, i) => (
          <li key={b.id}>
            <div
              onClick={() => select(b.id)}
              className={`group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer text-xs ${selectedId === b.id ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "text-[#f0ede8] hover:bg-[#1a1a1d]"}`}
            >
              <span className="text-[10px] text-[#6a6a6e] w-5">{i + 1}</span>
              <span className="flex-1 truncate">{b.type}</span>
              <button
                className="opacity-0 group-hover:opacity-100 text-[#A1A1AA] hover:text-[#f0ede8]"
                onClick={(e) => { e.stopPropagation(); toggleVisible(b.id); }}
                title={b.hidden ? "Show" : "Hide"}
              >
                {b.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400"
                onClick={(e) => { e.stopPropagation(); if (confirm("Delete block?")) remove(b.id); }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </li>
        ))}
        {blocks.length === 0 && (
          <li className="px-2 py-4 text-[11px] text-[#6a6a6e] text-center">No blocks yet.</li>
        )}
      </ul>
    </div>
  );
}

function LibraryTab() {
  const [q, setQ] = useState("");
  const [openCats, setOpenCats] = useState(() => new Set(BLOCK_CATEGORIES.map((c) => c.id)));
  const addBlock = useEditorStore((s) => s.addBlock);

  const cats = useMemo(() => {
    if (!q) return BLOCK_CATEGORIES;
    const ql = q.toLowerCase();
    return BLOCK_CATEGORIES.map((c) => ({
      ...c,
      blocks: c.blocks.filter((b) =>
        (b.label + " " + b.type + " " + b.desc).toLowerCase().includes(ql)
      ),
    })).filter((c) => c.blocks.length);
  }, [q]);

  return (
    <div className="p-2 space-y-2">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#6a6a6e]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search blocks…"
          className="w-full bg-[#0f0f10] text-[#f0ede8] text-xs pl-7 pr-2 py-1.5 rounded ring-1 ring-[#1a1a1d] focus:ring-[#D4AF37]/60 outline-none"
        />
      </div>
      <div className="space-y-1">
        {cats.map((c) => {
          const open = openCats.has(c.id);
          return (
            <div key={c.id}>
              <button
                onClick={() => {
                  setOpenCats((s) => {
                    const n = new Set(s);
                    n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                    return n;
                  });
                }}
                className="w-full flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-[#6a6a6e] hover:text-[#f0ede8]"
              >
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {c.label}
                <span className="ml-auto text-[#3a3a3e]">{c.blocks.length}</span>
              </button>
              {open && (
                <ul className="space-y-0.5">
                  {c.blocks.map((b) => {
                    const exists = !!LIVE_BLOCKS[b.type];
                    return (
                      <li key={b.type}>
                        <button
                          disabled={!exists}
                          onClick={() => addBlock(b.type)}
                          className="w-full text-left flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[#1a1a1d] group disabled:opacity-30"
                        >
                          <Plus className="w-3 h-3 mt-0.5 text-[#D4AF37] opacity-0 group-hover:opacity-100" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-[#f0ede8] truncate">{b.label}</div>
                            <div className="text-[10px] text-[#6a6a6e] truncate">{b.desc}</div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LeftSidebar() {
  const leftTab = useEditorStore((s) => s.leftTab);
  const setShell = useEditorStore((s) => s.setShell);
  const leftOpen = useEditorStore((s) => s.leftOpen);
  if (!leftOpen) return null;

  return (
    <aside className="w-72 shrink-0 bg-[#0a0a0b] border-r border-[#1a1a1d] flex flex-col">
      <div className="flex items-center border-b border-[#1a1a1d]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setShell({ leftTab: id })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] uppercase tracking-[0.18em] border-b-2 ${leftTab === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-[#6a6a6e] hover:text-[#f0ede8]"}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {leftTab === "pages" && <PagesTab />}
        {leftTab === "layers" && <LayersTab />}
        {leftTab === "library" && <LibraryTab />}
      </div>
    </aside>
  );
}
