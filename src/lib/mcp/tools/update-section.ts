import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_cms_section",
  title: "Update CMS section",
  description:
    "Create or replace the JSON content of a CMS section or page. Overwrites the stored content for that key.",
  inputSchema: {
    section_key: z.string().trim().min(1).describe("Section key to write, e.g. 'hero' or 'page:home'."),
    content: z.unknown().describe("The full JSON content object to store for this section."),
    section_label: z.string().trim().optional().describe("Human-readable label shown in the editor."),
    is_visible: z.boolean().optional().describe("Whether the section renders on the live site."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ section_key, content, section_label, is_visible }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const row: Record<string, unknown> = {
      section_key,
      section_label: section_label ?? section_key,
      content: content ?? {},
    };
    if (typeof is_visible === "boolean") row.is_visible = is_visible;

    const { data, error } = await supabase
      .from("cms_content")
      .upsert(row, { onConflict: "section_key" })
      .select("section_key, section_label, is_visible, updated_at");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved "${section_key}".` }],
      structuredContent: { section: data?.[0] ?? null },
    };
  },
});
