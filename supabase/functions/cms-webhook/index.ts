import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Restrict to known origins (preview + published). Adjust as more domains are added.
const ALLOWED_ORIGINS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/christianopropertymanagement\.com$/,
];

function corsFor(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.some((r) => r.test(origin)) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const REDACT_KEYS = /^(password|token|secret|api[_-]?key|authorization|cookie)$/i;
function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACT_KEYS.test(k) ? "[REDACTED]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsFor(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Require shared secret. Set CMS_WEBHOOK_SECRET via Lovable Cloud secrets.
  const expected = Deno.env.get("CMS_WEBHOOK_SECRET");
  if (!expected) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const provided = req.headers.get("x-webhook-secret") || "";
  // Constant-time-ish compare
  if (provided.length !== expected.length || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase env vars");
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, section_key, content, setting_key, setting_value, source = "webhook" } = body || {};

    let result;

    if (action === "update_content" && section_key && content) {
      const { data, error } = await supabase
        .from("cms_content")
        .update({ content })
        .eq("section_key", section_key)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else if (action === "update_setting" && setting_key && setting_value !== undefined) {
      const { data, error } = await supabase
        .from("cms_settings")
        .update({ setting_value })
        .eq("setting_key", setting_key)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else if (action === "get_content") {
      const query = supabase.from("cms_content").select("*").order("sort_order");
      if (section_key) query.eq("section_key", section_key);
      const { data, error } = await query;
      if (error) throw error;
      result = data;
    } else if (action === "get_settings") {
      const { data, error } = await supabase.from("cms_settings").select("*");
      if (error) throw error;
      result = data;
    } else {
      return new Response(JSON.stringify({
        error: "Invalid action. Use: update_content, update_setting, get_content, get_settings",
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Log sync — redact secrets from payload
    await supabase.from("cms_sync_log").insert({
      source,
      action,
      payload: redact(body),
      status: "success",
    });

    if (typeof action === "string" && action.startsWith("update")) {
      const { data: zapierSetting } = await supabase
        .from("cms_settings")
        .select("setting_value")
        .eq("setting_key", "zapier_webhook_url")
        .single();
      const zapierUrl = typeof zapierSetting?.setting_value === "string" ? zapierSetting.setting_value : "";
      if (zapierUrl && /^https:\/\//.test(zapierUrl)) {
        try {
          await fetch(zapierUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "content_updated", action, section_key, setting_key, timestamp: new Date().toISOString() }),
          });
        } catch { /* non-critical */ }
      }
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
