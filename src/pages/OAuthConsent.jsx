import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: detErr } = await supabase.auth.oauth.getAuthorizationDetails(
        authorizationId
      );
      if (!active) return;
      if (detErr) {
        setError(detErr.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve) {
    setBusy(true);
    const { data, error: decErr } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId)
      : await supabase.auth.oauth.denyAuthorization(authorizationId);
    if (decErr) {
      setBusy(false);
      setError(decErr.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const shell = (children) => (
    <main className="min-h-[100dvh] flex items-center justify-center bg-[#0a0a0b] px-4">
      <div className="w-full max-w-sm bg-[#111318] border border-[#1e1e22] rounded-xl p-8 text-center">
        {children}
      </div>
    </main>
  );

  if (error)
    return shell(
      <>
        <h1 className="text-lg font-semibold text-[#f0ede8]">Authorization request failed</h1>
        <p className="text-xs text-[#7a7a7e] mt-2">{error}</p>
      </>
    );

  if (!details)
    return shell(
      <div className="flex items-center justify-center gap-2 text-[#7a7a7e] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );

  const clientName = details.client?.name ?? "an app";

  return shell(
    <>
      <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#a08550] flex items-center justify-center">
        <ShieldCheck className="w-7 h-7 text-[#0a0a0b]" />
      </div>
      <h1 className="text-xl font-bold text-[#f0ede8]">Connect {clientName}</h1>
      <p className="text-xs text-[#7a7a7e] mt-2">
        {clientName} will be able to read and edit your site content as you.
      </p>
      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => decide(false)}
          className="flex-1 border-[#1e1e22] bg-transparent text-[#a1a1aa] hover:text-[#f0ede8]"
        >
          Deny
        </Button>
        <Button
          disabled={busy}
          onClick={() => decide(true)}
          className="flex-1 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0a0a0b] font-semibold"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
        </Button>
      </div>
    </>
  );
}
