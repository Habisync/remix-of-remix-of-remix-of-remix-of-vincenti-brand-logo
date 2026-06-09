import { useEffect } from "react";
import { Command } from "cmdk";
import { useEditorStore, PAGE_SLUGS } from "@/lib/editorStore";
import { BLOCK_CATEGORIES } from "@/components/admin/LiveBlocks";
import {
  FileText, LayoutTemplate, Save, Eye, RotateCcw, Undo2, Redo2,
  Monitor, Tablet, Smartphone, Keyboard,
} from "lucide-react";

export function CommandPalette() {
  const open = useEditorStore((s) => s.paletteOpen);
  const openPalette = useEditorStore((s) => s.openPalette);
  const loadPage = useEditorStore((s) => s.loadPage);
  const addBlock = useEditorStore((s) => s.addBlock);
  const save = useEditorStore((s) => s.save);
  const togglePreview = useEditorStore((s) => s.togglePreview);
  const reset = useEditorStore((s) => s.reset);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setShell = useEditorStore((s) => s.setShell);

  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette(!useEditorStore.getState().paletteOpen);
      } else if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if (meta && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        redo();
      } else if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (meta && e.key === "[") {
        e.preventDefault();
        setShell({ leftOpen: !useEditorStore.getState().leftOpen });
      } else if (meta && e.key === "]") {
        e.preventDefault();
        setShell({ rightOpen: !useEditorStore.getState().rightOpen });
      } else if (e.key === "?" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        setShell({ shortcutsOpen: true });
      } else if (e.key === "Escape") {
        openPalette(false);
        setShell({ shortcutsOpen: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const run = (fn) => { openPalette(false); fn(); };

  const allBlocks = BLOCK_CATEGORIES.flatMap((c) =>
    c.blocks.map((b) => ({ ...b, cat: c.label }))
  );

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-32"
      onClick={() => openPalette(false)}
    >
      <Command
        label="Command palette"
        className="w-full max-w-xl bg-[#0a0a0b] ring-1 ring-[#1e1e22] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input
          autoFocus
          placeholder="Type a command or search…"
          className="w-full bg-transparent px-4 py-3 text-sm text-[#f0ede8] outline-none border-b border-[#1a1a1d]"
        />
        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-xs text-[#6a6a6e] text-center">
            No results.
          </Command.Empty>

          <Command.Group heading="Actions" className="text-[10px] uppercase tracking-[0.22em] text-[#6a6a6e] px-2 py-1">
            <Item icon={Save} label="Save page" shortcut="⌘S" onSelect={() => run(save)} />
            <Item icon={Eye} label="Toggle preview mode" onSelect={() => run(togglePreview)} />
            <Item icon={Undo2} label="Undo" shortcut="⌘Z" onSelect={() => run(undo)} />
            <Item icon={Redo2} label="Redo" shortcut="⌘⇧Z" onSelect={() => run(redo)} />
            <Item icon={RotateCcw} label="Reset to default template" onSelect={() => run(() => confirm("Reset?") && reset())} />
            <Item icon={Keyboard} label="Show keyboard shortcuts" shortcut="?" onSelect={() => run(() => setShell({ shortcutsOpen: true }))} />
          </Command.Group>

          <Command.Group heading="Device" className="text-[10px] uppercase tracking-[0.22em] text-[#6a6a6e] px-2 py-1">
            <Item icon={Monitor} label="Desktop view" onSelect={() => run(() => setShell({ device: "desktop" }))} />
            <Item icon={Tablet} label="Tablet view" onSelect={() => run(() => setShell({ device: "tablet" }))} />
            <Item icon={Smartphone} label="Mobile view" onSelect={() => run(() => setShell({ device: "mobile" }))} />
          </Command.Group>

          <Command.Group heading="Go to page" className="text-[10px] uppercase tracking-[0.22em] text-[#6a6a6e] px-2 py-1">
            {PAGE_SLUGS.map((p) => (
              <Item key={p} icon={FileText} label={`Open page: ${p}`} onSelect={() => run(() => loadPage(p))} />
            ))}
          </Command.Group>

          <Command.Group heading="Add block" className="text-[10px] uppercase tracking-[0.22em] text-[#6a6a6e] px-2 py-1">
            {allBlocks.map((b) => (
              <Item
                key={b.type}
                icon={LayoutTemplate}
                label={`Add: ${b.label}`}
                hint={b.cat}
                onSelect={() => run(() => addBlock(b.type))}
              />
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

function Item({ icon: Icon, label, hint, shortcut, onSelect }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[#f0ede8] aria-selected:bg-[#D4AF37]/10 aria-selected:text-[#D4AF37] cursor-pointer"
    >
      <Icon className="w-4 h-4 opacity-70" />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[10px] text-[#6a6a6e]">{hint}</span>}
      {shortcut && <kbd className="text-[10px] text-[#6a6a6e] ml-2">{shortcut}</kbd>}
    </Command.Item>
  );
}

export function ShortcutsModal() {
  const open = useEditorStore((s) => s.shortcutsOpen);
  const setShell = useEditorStore((s) => s.setShell);
  if (!open) return null;
  const rows = [
    ["⌘K", "Command palette"],
    ["⌘S", "Save page"],
    ["⌘Z / ⌘⇧Z", "Undo / Redo"],
    ["⌘[ / ⌘]", "Toggle left / right panel"],
    ["?", "Show this dialog"],
    ["Esc", "Close dialogs"],
  ];
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={() => setShell({ shortcutsOpen: false })}
    >
      <div
        className="bg-[#0a0a0b] ring-1 ring-[#1e1e22] rounded-lg p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[10px] uppercase tracking-[0.22em] text-[#6a6a6e] mb-3">Keyboard shortcuts</div>
        <div className="space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-sm">
              <span className="text-[#f0ede8]">{v}</span>
              <kbd className="text-xs text-[#D4AF37] bg-[#0f0f10] ring-1 ring-[#1a1a1d] rounded px-2 py-0.5">{k}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
