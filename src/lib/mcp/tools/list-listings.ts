import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { guestyEndpoint, publishableKey } from "../supabase";

export default defineTool({
  name: "list_rental_listings",
  title: "List rental listings",
  description:
    "List the Malta rental properties currently published in the Guesty booking engine, with title, city and nightly price.",
  inputSchema: {
    limit: z.number().int().optional().describe("How many listings to return (default 12, max 50)."),
    city: z.string().trim().optional().describe("Optional city filter, e.g. 'Sliema'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ limit, city }) => {
    const take = Math.min(Math.max(limit ?? 12, 1), 50);
    const qs = new URLSearchParams({ action: "listings", limit: String(take) });
    if (city) qs.set("city", city);
    const key = publishableKey();
    const res = await fetch(`${guestyEndpoint()}?${qs.toString()}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) {
      return {
        content: [{ type: "text", text: `Booking engine error ${res.status}` }],
        isError: true,
      };
    }
    const data = await res.json();
    const results = (data?.results ?? data?.data ?? []) as Array<Record<string, any>>;
    const listings = results.slice(0, take).map((l) => ({
      id: l._id ?? l.id,
      title: l.title ?? l.nickname ?? "Untitled",
      city: l.address?.city ?? null,
      bedrooms: l.bedrooms ?? null,
      accommodates: l.accommodates ?? null,
      nightly_price: l.prices?.basePrice ?? null,
      currency: l.prices?.currency ?? null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(listings, null, 2) }],
      structuredContent: { listings, count: listings.length },
    };
  },
});
