import { useEffect } from "react";
import { useEditorStore } from "@/lib/editorStore";
import { LeftSidebar } from "@/components/editor/LeftSidebar";
import { RightSidebar } from "@/components/editor/RightSidebar";
import { Canvas, CanvasToolbar } from "@/components/editor/Canvas";
import { CommandPalette, ShortcutsModal } from "@/components/editor/CommandPalette";
import { Link } from "react-router-dom";
import { Layout, Keyboard } from "lucide-react";

export default function EditorShell() {
  const loadPage = useEditorStore((s) => s.loadPage);
  const slug = useEditorStore((s) => s.slug);
  const dirty = useEditorStore((s) => s.dirty);
  const setShell = useEditorStore((s) => s.setShell);

  useEffect(() => {
    loadPage(slug);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return (
    <div className="fixed inset-0 bg-[#050506] text-[#f0ede8] flex flex-col">
      {/* Top bar */}
      <header className="h-12 px-3 flex items-center gap-3 border-b border-[#1a1a1d] bg-[#0a0a0b]">
        <Link to="/" className="flex items-center gap-2 text-[#D4AF37]">
          <Layout className="w-4 h-4" />
          <span className="text-xs uppercase tracking-[0.22em] font-semibold">CPM · Editor</span>
        </Link>
        <span className="text-[10px] text-[#3a3a3e]">v2</span>
        <div className="flex-1" />
        <button
          onClick={() => setShell({ shortcutsOpen: true })}
          className="p-1.5 text-[#A1A1AA] hover:text-[#f0ede8]"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>
        <Link
          to="/admin/legacy"
          className="text-[10px] uppercase tracking-[0.18em] text-[#6a6a6e] hover:text-[#f0ede8]"
        >
          Legacy admin
        </Link>
      </header>

      <div className="flex-1 flex min-h-0">
        <LeftSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <CanvasToolbar />
          <Canvas />
        </main>
        <RightSidebar />
      </div>

      <CommandPalette />
      <ShortcutsModal />
    </div>
  );
}
