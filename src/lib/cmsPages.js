/**
 * cmsPages — persistence helpers for block-driven pages.
 * Each page lives in cms_content with section_key = `page:<slug>` and
 * content = { blocks: [{type, data}, ...], seo?: {...} }.
 *
 * If no row exists yet, LIVE_PAGE_TEMPLATES provides the default block list.
 */
import { supabase } from "@/integrations/supabase/client";
import { LIVE_PAGE_TEMPLATES } from "@/components/admin/LiveBlocks";

const KEY = (slug) => `page:${slug}`;
const LABEL = (slug) => `Page: ${slug}`;

export function defaultBlocksForSlug(slug) {
  const tpl = LIVE_PAGE_TEMPLATES[slug];
  return Array.isArray(tpl) ? tpl.map((b) => ({ ...b, id: cryptoId() })) : [];
}

function cryptoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `b_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export async function loadPageBlocks(slug) {
  const { data, error } = await supabase
    .from("cms_content")
    .select("content")
    .eq("section_key", KEY(slug))
    .maybeSingle();
  if (error) {
    console.warn("[cmsPages] load failed:", error.message);
    return { blocks: defaultBlocksForSlug(slug), seo: {} };
  }
  const content = data?.content || {};
  const blocks = Array.isArray(content.blocks) && content.blocks.length
    ? content.blocks.map((b) => ({ id: b.id || cryptoId(), ...b }))
    : defaultBlocksForSlug(slug);
  return { blocks, seo: content.seo || {} };
}

export async function savePageBlocks(slug, blocks, seo) {
  const payload = {
    section_key: KEY(slug),
    section_label: LABEL(slug),
    content: { blocks, seo: seo || {} },
  };
  const { error } = await supabase
    .from("cms_content")
    .upsert(payload, { onConflict: "section_key" });
  if (error) throw error;
  return true;
}

export const PAGE_SLUGS = ["home", "owners", "properties", "about", "contact"];
