import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-affiliate-key, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Validate credentials — accept API key OR HTTP Basic Auth (username/password)
    const apiKey = req.headers.get("x-affiliate-key") || req.headers.get("x-api-key");
    const authHeader = req.headers.get("authorization") || "";
    let basicUser: string | null = null;
    let basicPass: string | null = null;
    if (authHeader.toLowerCase().startsWith("basic ")) {
      try {
        const decoded = atob(authHeader.slice(6).trim());
        const idx = decoded.indexOf(":");
        if (idx > 0) {
          basicUser = decoded.slice(0, idx);
          basicPass = decoded.slice(idx + 1);
        }
      } catch { /* ignore */ }
    }

    if (!apiKey && !(basicUser && basicPass)) {
      return new Response(JSON.stringify({ error: "Missing credentials. Provide X-Affiliate-Key header or HTTP Basic Auth (username/password)." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let affQuery = adminClient.from("affiliates").select("id, name, status, visible_fields, allowed_ips, api_key, username, password");
    if (apiKey) {
      affQuery = affQuery.eq("api_key", apiKey);
    } else {
      affQuery = affQuery.ilike("username", basicUser!);
    }
    const { data: affiliate, error: affError } = await affQuery.maybeSingle();

    if (affError || !affiliate) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!apiKey && (affiliate as any).password !== basicPass) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (affiliate.status !== "active") {
      return new Response(JSON.stringify({ error: "Affiliate account suspended" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // IP whitelist check
    const callerIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("cf-connecting-ip") || "unknown";
    const allowedIps: string[] = (affiliate as any).allowed_ips ?? [];
    if (allowedIps.length > 0 && !allowedIps.includes(callerIp)) {
      return new Response(JSON.stringify({ error: "IP not whitelisted" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse visible fields config (default all true)
    const vf = affiliate.visible_fields ?? {};
    const isVisible = (field: string) => vf[field] !== false;

    // Parse params from query string (GET) or body (POST)
    let from: string | null = null;
    let to: string | null = null;
    let limit = 100;
    let page = 1;

    if (req.method === "GET") {
      const url = new URL(req.url);
      from = url.searchParams.get("from");
      to = url.searchParams.get("to");
      limit = Math.min(Number(url.searchParams.get("limit") || 100), 1000);
      page = Math.max(Number(url.searchParams.get("page") || 1), 1);
    } else {
      const body = await req.json();
      from = body.from || null;
      to = body.to || null;
      limit = Math.min(Number(body.limit || 100), 1000);
      page = Math.max(Number(body.page || 1), 1);
    }

    const offset = (page - 1) * limit;

    // Query leads belonging to this affiliate
    let query = adminClient
      .from("profiles")
      .select("id, full_name, email, original_email, phone, country, funnel, status, created_at, first_deposit_at", { count: "exact" })
      .eq("affiliate", affiliate.name)
      .eq("created_via_affiliate_api", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("created_at", `${from}T00:00:00Z`);
    if (to) query = query.lte("created_at", `${to}T23:59:59Z`);

    const { data: leads, count, error: qError } = await query;

    if (qError) {
      return new Response(JSON.stringify({ error: qError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      affiliate: affiliate.name,
      total: count,
      page,
      limit,
      leads: (leads ?? []).map(l => {
        const lead: Record<string, unknown> = { id: l.id };
        // For shaved leads, show the original email so affiliate sees no change
        const displayEmail = l.original_email || l.email;
        if (isVisible("name")) lead.name = l.full_name;
        if (isVisible("email")) lead.email = displayEmail;
        if (isVisible("phone")) lead.phone = l.phone;
        if (isVisible("country")) lead.country = l.country;
        if (isVisible("funnel")) lead.funnel = l.funnel;
        if (isVisible("status")) lead.status = l.status;
        if (isVisible("registered_at")) lead.registered_at = l.created_at;
        if (isVisible("first_deposit_at")) lead.first_deposit_at = l.first_deposit_at ?? null;
        return lead;
      }),
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
