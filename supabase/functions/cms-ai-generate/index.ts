// CMS AI Generator — uses Lovable AI Gateway to draft/refine block JSON, or free-form copy.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  sectionKey?: string;
  sectionLabel?: string;
  currentContent?: unknown;
  prompt: string;
  mode?: "rewrite" | "generate" | "translate" | "refine" | "freeform";
  context?: Record<string, unknown>;
  model?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFreeform = !body.sectionKey || body.mode === "freeform";

    const system = isFreeform
      ? `You are a senior content strategist and copywriter for Christiano Property Management, a luxury short-term rental company in Malta. Premium, aspirational, sophisticated tone. Be concise, specific, no clichés. Lists → clean numbered lists. Copy → ready-to-paste prose. No markdown fences. Brand context: ${JSON.stringify(body.context ?? {})}`
      : `You are a senior content designer for a luxury Malta property management website.
Output STRICT JSON only — no prose, no markdown fences. Preserve the EXACT shape of the provided current content (keys, nesting). You may change string values and add/remove array items when the field is clearly a list. Never invent fields not present.`;

    const user = isFreeform
      ? body.prompt
      : `Section: ${body.sectionLabel ?? body.sectionKey} (key: ${body.sectionKey})
Mode: ${body.mode ?? "refine"}
User instruction: ${body.prompt}

CURRENT_CONTENT:
${JSON.stringify(body.currentContent ?? {}, null, 2)}

Respond with ONLY the new JSON object for "content".`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: body.model || "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(isFreeform ? {} : { response_format: { type: "json_object" } }),
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI gateway error: ${text}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";

    if (isFreeform) {
      return new Response(JSON.stringify({ content: String(raw) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = String(raw).match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }
    return new Response(JSON.stringify({ content: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
