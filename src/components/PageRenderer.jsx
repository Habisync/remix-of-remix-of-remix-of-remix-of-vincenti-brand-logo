import { useEffect, useState } from "react";
import { LIVE_BLOCKS } from "@/components/admin/LiveBlocks";
import { loadPageBlocks, defaultBlocksForSlug } from "@/lib/cmsPages";
import { BlockErrorBoundary } from "@/components/BlockErrorBoundary";
import { supabase } from "@/integrations/supabase/client";

// Header/footer are already rendered globally in App.jsx; skip if present in blocks.
const GLOBAL_CHROME = new Set(["header", "footer"]);

export function PageRenderer({ slug }) {
  // Seed with defaults so the page never blanks on a slow / failed CMS fetch.
  const [blocks, setBlocks] = useState(() => defaultBlocksForSlug(slug));

  useEffect(() => {
    let active = true;
    setBlocks(defaultBlocksForSlug(slug));

    loadPageBlocks(slug)
      .then(({ blocks }) => {
        if (active && Array.isArray(blocks) && blocks.length) setBlocks(blocks);
      })
      .catch((e) => console.warn("[PageRenderer] load failed:", e));

    const channel = supabase
      .channel(`page:${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_content", filter: `section_key=eq.page:${slug}` },
        () => {
          loadPageBlocks(slug)
            .then(({ blocks }) => active && blocks?.length && setBlocks(blocks))
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [slug]);

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
