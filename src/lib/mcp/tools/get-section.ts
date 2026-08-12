import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_cms_section",
  title: "Get CMS section",
  description: "Read the full JSON content of one CMS section or page by its section key.",
  inputSchema: {
    section_key: z.string().trim().min(1).describe("Section key, e.g. 'hero' or 'page:home'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ section_key }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("cms_content")
      .select("section_key, section_label, content, is_visible, sort_order, updated_at")
      .eq("section_key", section_key)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: `No section found for key "${section_key}".` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { section: data },
    };
  },
});
