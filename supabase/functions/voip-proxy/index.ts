import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GOLDEN_VOIP_API_KEY = Deno.env.get("GOLDEN_VOIP_API_KEY") ?? "";

type Body = {
  action:
    | "test"
    | "dial"
    | "hangup"
    | "ext_state"
    | "count_calls"
    | "cdrs"
    | "recording"
    | "dnd_set"
    | "dnd_get";
  // shared
  number?: string;      // dest number
  source_ext?: string;  // override caller extension
  ext?: string;
  call_id?: string;
  client_id?: string;   // for logging
  start?: string;
  end?: string;
  value?: string;       // on/off for DND
};

function svc() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

async function getCaller(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data } = await anon.auth.getUser();
  return data.user ?? null;
}

async function loadConfig() {
  const s = svc();
  const { data } = await s
    .from("platform_settings")
    .select("value")
    .eq("key", "voip")
    .maybeSingle();
  const v = (data?.value ?? {}) as Record<string, string | boolean>;
  return {
    enabled: v.enabled !== false,
    pbx_url: (v.pbx_url as string) || "https://pbx.golden-voip.io/pbx/proxyapi.php",
    tenant: (v.tenant as string) || "",
    account_suffix: (v.account_suffix as string) || "",
    log_calls: v.log_calls !== false,
  };
}

function buildUrl(base: string, params: Record<string, string>) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v);
  }
  return u.toString();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getCaller(req);
    if (!user) return json({ error: "unauthenticated" }, 401);

    const s = svc();
    // Must be staff (has any role)
    const { data: roleRows } = await s
      .from("user_roles")
      .select("role_id")
      .eq("user_id", user.id)
      .limit(1);
    if (!roleRows || roleRows.length === 0) {
      return json({ error: "forbidden" }, 403);
    }

    if (!GOLDEN_VOIP_API_KEY) {
      return json(
        { error: "GOLDEN_VOIP_API_KEY is not set. Configure it in Backoffice Secrets." },
        400,
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const cfg = await loadConfig();
    if (!cfg.enabled && body.action !== "test") {
      return json({ error: "VoIP integration is disabled" }, 400);
    }
    if (!cfg.tenant && body.action !== "test" && body.action !== "count_calls") {
      return json({ error: "Tenant is not configured" }, 400);
    }

    // Resolve caller extension (agent's profile.pbx_extension, override allowed)
    let sourceExt = body.source_ext ?? "";
    if (!sourceExt) {
      const { data: prof } = await s
        .from("profiles")
        .select("pbx_extension")
        .eq("id", user.id)
        .maybeSingle();
      sourceExt = (prof?.pbx_extension as string) ?? "";
    }

    const base = cfg.pbx_url;
    const key = GOLDEN_VOIP_API_KEY;
    const tenant = cfg.tenant;

    const callProxy = async (params: Record<string, string>, expectBinary = false) => {
      const url = buildUrl(base, { key, ...params });
      const r = await fetch(url);
      const status = r.status;
      if (expectBinary) {
        const buf = await r.arrayBuffer();
        return new Response(buf, {
          status,
          headers: { ...corsHeaders, "Content-Type": r.headers.get("Content-Type") ?? "audio/wav" },
        });
      }
      const text = await r.text();
      let parsed: unknown = text;
      try { parsed = JSON.parse(text); } catch { /* keep text */ }
      return json({ status, raw: text, data: parsed }, status < 400 ? 200 : status);
    };

    switch (body.action) {
      case "test":
      case "count_calls":
        return await callProxy({ reqtype: "COUNTCALLS" });

      case "ext_state": {
        const ext = body.ext || sourceExt;
        if (!ext) return json({ error: "extension required" }, 400);
        return await callProxy({ reqtype: "INFO", info: "EXTSTATE", ext, tenant, format: "json" });
      }

      case "dnd_get": {
        const ext = body.ext || sourceExt;
        return await callProxy({ reqtype: "DND", action: "get", number: ext, tenant });
      }
      case "dnd_set": {
        const ext = body.ext || sourceExt;
        const value = body.value === "on" ? "on" : "off";
        return await callProxy({ reqtype: "DND", action: "set", number: ext, value, tenant });
      }

      case "hangup": {
        const ext = body.ext || sourceExt;
        if (!ext) return json({ error: "extension required" }, 400);
        return await callProxy({ reqtype: "HANGUP", extension: `${ext}-${tenant}`, tenant });
      }

      case "cdrs": {
        const ext = body.ext || sourceExt;
        return await callProxy({
          reqtype: "INFO",
          info: "CDRS",
          tenant,
          phone: ext,
          start: body.start ?? "",
          end: body.end ?? "",
          format: "json",
        });
      }

      case "recording": {
        if (!body.call_id) return json({ error: "call_id required" }, 400);
        return await callProxy(
          { reqtype: "INFO", info: "recording", id: body.call_id, tenant },
          true,
        );
      }

      case "dial": {
        if (!sourceExt) return json({ error: "No PBX extension is set for your agent" }, 400);
        if (!body.number) return json({ error: "number required" }, 400);
        const dest = body.number.replace(/[^\d+]/g, "");
        const account = cfg.account_suffix
          ? `${sourceExt}-${cfg.account_suffix}`
          : `${sourceExt}-${tenant}`;
        const url = buildUrl(base, {
          key,
          reqtype: "DIAL",
          source: sourceExt,
          dest,
          tenant,
          account,
        });
        const r = await fetch(url);
        const text = await r.text();
        // Response: Success|Originate successfully queued|<callid>|
        let callId: string | null = null;
        if (text.startsWith("Success")) {
          const parts = text.split("|");
          callId = (parts[2] ?? "").trim() || null;
        }
        // Log
        if (cfg.log_calls) {
          try {
            await s.from("phone_call_log").insert({
              client_id: body.client_id ?? null,
              agent_id: user.id,
              phone_number: body.number,
              prefix: null,
              pbx_call_id: callId,
              disposition: text.startsWith("Success") ? "queued" : "failed",
            });
          } catch { /* ignore */ }
        }
        if (!text.startsWith("Success")) {
          return json({ error: "PBX dial failed", raw: text }, 502);
        }
        return json({ ok: true, call_id: callId, raw: text });
      }

      default:
        return json({ error: `unknown action: ${body.action}` }, 400);
    }
  } catch (e) {
    console.error("voip-proxy error", e);
    return json({ error: (e as Error).message }, 500);
  }
});