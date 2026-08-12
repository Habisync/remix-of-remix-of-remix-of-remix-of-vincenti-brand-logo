import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "set_cms_section_visibility",
  title: "Show or hide CMS section",
  description: "Show or hide a CMS section on the live site without changing its content.",
  inputSchema: {
    section_key: z.string().trim().min(1).describe("Section key to update."),
    is_visible: z.boolean().describe("True to show the section, false to hide it."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ section_key, is_visible }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("cms_content")
      .update({ is_visible })
      .eq("section_key", section_key)
      .select("section_key, is_visible");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data?.length) {
      return { content: [{ type: "text", text: `No section found for key "${section_key}".` }], isError: true };
    }
    return {
      content: [{ type: "text", text: `"${section_key}" is now ${is_visible ? "visible" : "hidden"}.` }],
      structuredContent: { section: data[0] },
    };
  },
});
