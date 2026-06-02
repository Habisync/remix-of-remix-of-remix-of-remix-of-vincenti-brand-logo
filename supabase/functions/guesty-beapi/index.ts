// Guesty Booking Engine API BFF
// OAuth2 client_credentials with cached token + proxied endpoints.
// Docs: base = https://booking.guesty.com/api  | token = https://booking.guesty.com/oauth2/token
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN_URLS = [
  "https://booking.guesty.com/oauth2/token",
  "https://open-api.guesty.com/oauth2/token",
];
const BEAPI_BASE = "https://booking.guesty.com/api";

let cachedToken: { value: string; expiresAt: number; source: "manual" | "oauth" } | null = null;
let inflight: Promise<string> | null = null;

async function getToken(options: { bypassManual?: boolean } = {}): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.value;
  if (inflight) return inflight;

  // Manual override: paste a known-good Guesty BE access token as GUESTY_ACCESS_TOKEN
  // to bypass the rate-limited OAuth exchange. Expiry is read from the JWT `exp` claim.
  const manual = Deno.env.get("GUESTY_ACCESS_TOKEN");
  if (manual && !options.bypassManual) {
    let exp = now + 60 * 60 * 1000; // fallback 1h
    try {
      const payload = JSON.parse(atob(manual.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload?.exp) exp = payload.exp * 1000;
    } catch { /* ignore */ }
    cachedToken = { value: manual, expiresAt: exp, source: "manual" };
    return manual;
  }

  const clientId = Deno.env.get("GUESTY_CLIENT_ID");
  const clientSecret = Deno.env.get("GUESTY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Guesty credentials not configured");


  inflight = (async () => {
    const basic = btoa(`${clientId}:${clientSecret}`);
    type Attempt = { url: string; scope?: string; useBasic?: boolean };
    const attempts: Attempt[] = [
      { url: TOKEN_URLS[0], scope: "booking_engine:api" },
      { url: TOKEN_URLS[0], scope: "booking_engine:api", useBasic: true },
      { url: TOKEN_URLS[0] },
      { url: TOKEN_URLS[0], useBasic: true },
      { url: TOKEN_URLS[1], scope: "open-api" },
      { url: TOKEN_URLS[1], scope: "open-api", useBasic: true },
      { url: TOKEN_URLS[1] },
    ];
    const errors: string[] = [];
    for (const a of attempts) {
      const params: Record<string, string> = { grant_type: "client_credentials" };
      if (a.scope) params.scope = a.scope;
      if (!a.useBasic) {
        params.client_id = clientId;
        params.client_secret = clientSecret;
      }
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      };
      if (a.useBasic) headers.Authorization = `Basic ${basic}`;
      const res = await fetch(a.url, { method: "POST", headers, body: new URLSearchParams(params) });
      const text = await res.text();
      if (res.ok) {
        const json = JSON.parse(text);
        const expiresIn = (json.expires_in ?? 86400) * 1000;
        cachedToken = { value: json.access_token, expiresAt: Date.now() + expiresIn, source: "oauth" };
        console.log(`[guesty] token via ${a.url} scope=${a.scope ?? "(none)"} basic=${!!a.useBasic}`);
        return cachedToken.value;
      }
      errors.push(`${a.url}${a.useBasic ? "[basic]" : ""}${a.scope ? `[${a.scope}]` : ""} → ${res.status}: ${text.slice(0, 200)}`);
    }
    throw new Error(`Guesty token request failed for all auth strategies. Verify GUESTY_CLIENT_ID/SECRET are Booking Engine credentials. Last errors: ${errors.join(" | ")}`);
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

async function beapi(path: string, init: RequestInit = {}, attempt = 0, bypassManualToken = false): Promise<Response> {
  const token = await getToken({ bypassManual: bypassManualToken });
  const url = path.startsWith("http") ? path : `${BEAPI_BASE}${path.startsWith("/") ? path : "/" + path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if ((res.status === 401 || res.status === 403) && attempt === 0) {
    console.warn(`[guesty] ${res.status} from Booking Engine API; refreshing token and retrying with OAuth credentials`);
    cachedToken = null;
    return beapi(path, init, 1, true);
  }
  if (res.status === 429 && attempt < 2) {
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1) + Math.random() * 200));
    return beapi(path, init, attempt + 1);
  }
  return res;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "listings";
    const body = req.method !== "GET" && req.method !== "HEAD" ? await req.json().catch(() => ({})) : {};

    switch (action) {
      case "listings": {
        // Pass-through allow-listed query params
        const qs = new URLSearchParams();
        ["city", "minOccupancy", "checkIn", "checkOut", "limit", "skip", "minBedrooms", "amenities"].forEach((k) => {
          const v = url.searchParams.get(k);
          if (v) qs.set(k, v);
        });
        const r = await beapi(`/listings${qs.toString() ? `?${qs}` : ""}`);
        const data = await r.json();
        return json(data, r.status);
      }
      case "listing": {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "Missing id" }, 400);
        const r = await beapi(`/listings/${encodeURIComponent(id)}`);
        return json(await r.json(), r.status);
      }
      case "calendar": {
        const id = url.searchParams.get("id");
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        if (!id || !from || !to) return json({ error: "Missing id/from/to" }, 400);
        const r = await beapi(`/listings/${encodeURIComponent(id)}/calendar?from=${from}&to=${to}`);
        return json(await r.json(), r.status);
      }
      case "payment-provider": {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "Missing id" }, 400);
        const r = await beapi(`/listings/${encodeURIComponent(id)}/payment-provider`);
        return json(await r.json(), r.status);
      }
      case "create-quote": {
        const r = await beapi(`/reservations/quotes`, { method: "POST", body: JSON.stringify(body) });
        return json(await r.json(), r.status);
      }
      case "get-quote": {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "Missing id" }, 400);
        const r = await beapi(`/reservations/quotes/${encodeURIComponent(id)}`);
        return json(await r.json(), r.status);
      }
      case "apply-coupon": {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "Missing id" }, 400);
        const r = await beapi(`/reservations/quotes/${encodeURIComponent(id)}/coupons`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return json(await r.json(), r.status);
      }
      case "instant-charge": {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "Missing quote id" }, 400);
        const r = await beapi(`/reservations/quotes/${encodeURIComponent(id)}/instant`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return json(await r.json(), r.status);
      }
      case "verify-payment": {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "Missing reservation id" }, 400);
        const r = await beapi(`/reservations/${encodeURIComponent(id)}/verify-payment`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return json(await r.json(), r.status);
      }
      case "reservation": {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "Missing id" }, 400);
        const r = await beapi(`/reservations/${encodeURIComponent(id)}`);
        return json(await r.json(), r.status);
      }
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[guesty-beapi]", msg);
    return json({ error: msg }, 500);
  }
});
