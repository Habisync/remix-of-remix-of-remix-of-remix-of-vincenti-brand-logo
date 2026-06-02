import { useEffect, useState } from "react";
import { LIVE_BLOCKS } from "@/components/admin/LiveBlocks";
import { loadPageBlocks } from "@/lib/cmsPages";
import { BlockErrorBoundary } from "@/components/BlockErrorBoundary";
import { supabase } from "@/integrations/supabase/client";

// Header/footer are already rendered globally in App.jsx; skip if present in blocks.
const GLOBAL_CHROME = new Set(["header", "footer"]);

export function PageRenderer({ slug, fallback = null }) {
  const [blocks, setBlocks] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    loadPageBlocks(slug)
      .then(({ blocks }) => active && setBlocks(blocks))
      .catch((e) => active && setError(e.message || "Failed to load page"));

    // Live-reload when an editor saves this page from the admin canvas.
    const channel = supabase
      .channel(`page:${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_content", filter: `section_key=eq.page:${slug}` },
        () => {
          loadPageBlocks(slug).then(({ blocks }) => active && setBlocks(blocks)).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F0F10] text-[#A1A1AA] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm">Failed to load page: {error}</p>
        </div>
      </div>
    );
  }

  if (!blocks) {
    return fallback || (
      <div className="min-h-screen bg-[#0F0F10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F10] pt-20" data-page={slug}>
      {blocks.map((b, i) => {
        if (!b || !b.type || GLOBAL_CHROME.has(b.type)) return null;
        const Cmp = LIVE_BLOCKS[b.type];
        if (!Cmp) {
          if (import.meta.env.DEV) {
            return (
              <div key={b.id || i} className="p-4 m-4 border border-yellow-500/40 bg-yellow-500/5 text-yellow-200 text-xs">
                Unknown block type: <code>{b.type}</code>
              </div>
            );
          }
          return null;
        }
        return (
          <BlockErrorBoundary key={b.id || i} blockType={b.type} blockId={b.id}>
            <Cmp d={b.data || {}} />
          </BlockErrorBoundary>
        );
      })}
    </div>
  );
}

export default PageRenderer;
