import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-affiliate-key, x-api-key",
};

const parseRequestBody = async (req: Request) => {
  const contentType = req.headers.get("content-type")?.toLowerCase() || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = new URLSearchParams(await req.text());
    return Object.fromEntries(form.entries());
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    return Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, typeof value === "string" ? value : value.name]));
  }

  return await req.json();
};

const shouldRedirectBrowser = (req: Request, body: Record<string, unknown>) => {
  const url = new URL(req.url);
  const redirectParam = String(url.searchParams.get("redirect") || body.redirect || "").toLowerCase();
  const accept = req.headers.get("accept")?.toLowerCase() || "";
  const contentType = req.headers.get("content-type")?.toLowerCase() || "";

  return redirectParam === "1" ||
    redirectParam === "true" ||
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data") ||
    (accept.includes("text/html") && !accept.includes("application/json"));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
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

    let affQuery = adminClient.from("affiliates").select("id, name, status, allowed_ips, api_key, username, password");
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
    if (!apiKey && affiliate.password !== basicPass) {
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
    const allowedIps: string[] = affiliate.allowed_ips ?? [];
    if (allowedIps.length > 0 && !allowedIps.includes(callerIp)) {
      return new Response(JSON.stringify({ error: "IP not whitelisted", your_ip: callerIp }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await parseRequestBody(req);
    // Accept both "full_name" and "name" for flexibility
    const email = body.email;
    const full_name = body.full_name || body.name;
    const phone = typeof body.phone === "string" ? body.phone.replace(/^\++/, "").trim() : body.phone;
    const country = body.country;
    const funnel = body.funnel;

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "email and full_name (or name) are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check duplicate email in profiles
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "A lead with this email already exists" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user with random password (lead won't log in directly)
    const randomPassword = crypto.randomUUID() + "Aa1!";
    const { data: secretRow } = await adminClient.from("internal_secrets" as any)
      .select("value").eq("key", "server_signup_key").maybeSingle();
    const serverKey = (secretRow as any)?.value;
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      app_metadata: { pre_approved: true },
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name, phone, country, ...(serverKey ? { server_signup_key: serverKey } : {}) },
    });
    if (!authError && serverKey) {
      await adminClient.auth.admin.updateUserById(authData.user.id, {
        user_metadata: { full_name, phone, country, server_signup_key: null },
      });
    }

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wait briefly for the handle_new_user trigger to create the profile
    await new Promise((r) => setTimeout(r, 1500));

    // Ensure profile exists (trigger may have failed); upsert as fallback
    const { data: profileCheck } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (!profileCheck) {
      // Trigger didn't fire — insert the profile manually
      await adminClient.from("profiles").insert({
        id: authData.user.id,
        email,
        full_name,
        phone: phone || null,
        country: country || null,
        affiliate: affiliate.name,
        funnel: funnel || null,
        status: "New",
        is_lead: true,
        created_via_affiliate_api: true,
      } as any);
    } else {
      // Profile exists from trigger — update with affiliate info
      await adminClient.from("profiles").update({
        affiliate: affiliate.name,
        funnel: funnel || null,
        status: "New",
        is_lead: true,
        created_via_affiliate_api: true,
      } as any).eq("id", authData.user.id);
    }

    // Generate a stable auto-login token (90 days). Each click of /al/<token>
    // creates a brand new single-use Supabase session server-side, so link
    // scanners (Outlook Safe Links, antivirus, etc.) cannot burn the magic
    // link before the real user clicks it.
    const autoLoginToken = crypto.randomUUID().replace(/-/g, "") +
                           crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    await adminClient.from("profiles").update({
      auto_login_token: autoLoginToken,
      auto_login_expires_at: expiresAt,
    } as any).eq("id", authData.user.id);

    const siteUrl = Deno.env.get("SITE_URL") || "https://crypto-boerse.com";
    const redirectUrl = `${siteUrl}/al/${autoLoginToken}`;

    if (shouldRedirectBrowser(req, body)) {
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, Location: redirectUrl },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      lead_id: authData.user.id,
      redirect_url: redirectUrl,
      landing_url: redirectUrl,
      next_step: "Redirect the lead's browser to redirect_url immediately so the auto-login opens /welcome and the visit is tracked.",
    }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
