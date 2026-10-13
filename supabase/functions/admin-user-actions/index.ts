import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is authenticated and has permission
    const authHeader = req.headers.get("Authorization")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check permission
    const { data: hasPerm } = await callerClient.rpc("has_permission", {
      _user_id: caller.id,
      _permission_key: "users.manage",
    });
    if (!hasPerm) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, user_id, password, site_url } = body;

    if (action === "create_client") {
      const { email, full_name, phone, country, funnel } = body;
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "email and password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // If a profile with this email already exists, return it as a no-op success
      // (admins reuse existing accounts, e.g. to send emails from agent addresses).
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      if (existingProfile) {
        return new Response(JSON.stringify({
          success: true,
          user_id: existingProfile.id,
          reused: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      app_metadata: { pre_approved: true },
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || "", phone: phone || "", country: country || "" },
      });
      if (createErr) {
        // If auth says the email already exists, look up the existing profile and return it.
        if (/already|registered|exists/i.test(createErr.message)) {
          const { data: existing } = await adminClient
            .from("profiles").select("id").ilike("email", email).maybeSingle();
          if (existing) {
            return new Response(JSON.stringify({ success: true, user_id: existing.id, reused: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        return new Response(JSON.stringify({ error: createErr.message, code: "create_failed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Update profile with funnel if provided
      if (funnel && newUser?.user) {
        await adminClient.from("profiles").update({ funnel }).eq("id", newUser.user.id);
      }
      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_user") {
      const { email, full_name, role_id, team_id } = body;
      if (!email || !password || !role_id) {
        return new Response(JSON.stringify({ error: "email, password, and role_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      app_metadata: { pre_approved: true },
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || "" },
      });
      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Assign role
      const { error: roleErr } = await adminClient.from("user_roles").insert({
        user_id: newUser.user.id,
        role_id,
      });
      if (roleErr) {
        return new Response(JSON.stringify({ error: roleErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Ensure a profile row exists and mark as staff (not a lead)
      await adminClient.from("profiles").upsert({
        id: newUser.user.id,
        email,
        full_name: full_name || "",
        is_lead: false,
        status: "active",
      }, { onConflict: "id" });
      // Assign team if provided
      if (team_id) {
        await adminClient.from("team_members").insert({
          user_id: newUser.user.id,
          team_id,
        });
      }
      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm_email") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        email_confirm: true,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "change_password") {
      if (!user_id || !password) {
        return new Response(JSON.stringify({ error: "user_id and password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reveal_password") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Restrict to Admin role only — sensitive operation
      const { data: isAdmin } = await callerClient.rpc("has_role_by_name", {
        _user_id: caller.id,
        _role_name: "Admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin role required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Read existing stored password
      const { data: profileRow } = await adminClient
        .from("profiles")
        .select("admin_visible_password")
        .eq("id", user_id)
        .maybeSingle();

      let pwd = (profileRow as any)?.admin_visible_password as string | null;
      const force = body.force === true;

      if (!pwd || force) {
        // Generate a strong but readable password and set it
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        let gen = "";
        const rand = new Uint8Array(12);
        crypto.getRandomValues(rand);
        for (let i = 0; i < rand.length; i++) gen += chars[rand[i] % chars.length];
        gen += "!9";
        pwd = gen;

        const { error: updErr } = await adminClient.auth.admin.updateUserById(user_id, { password: pwd });
        if (updErr) {
          return new Response(JSON.stringify({ error: updErr.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await adminClient.from("profiles").update({ admin_visible_password: pwd }).eq("id", user_id);
      }

      return new Response(JSON.stringify({ success: true, password: pwd }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_reset_link") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Get user email
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(user_id);
      if (userError || !userData?.user?.email) {
        return new Response(JSON.stringify({ error: "User not found or no email" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Generate password reset link
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: userData.user.email,
      });
      if (linkError) {
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, email: userData.user.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "login_as_client" || action === "login_as_agent") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(user_id);
      if (userError || !userData?.user?.email) {
        return new Response(JSON.stringify({ error: "User not found or no email" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });
      if (linkError) {
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Build the redirect URL using the hashed token
      const props = linkData?.properties;
      const token = props?.hashed_token;
      const baseUrl = supabaseUrl + "/auth/v1/verify";
      const requestOrigin = req.headers.get("origin");
      const siteUrl = typeof site_url === "string" && /^https?:\/\//i.test(site_url)
        ? site_url
        : requestOrigin && /^https?:\/\//i.test(requestOrigin)
          ? requestOrigin
          : (Deno.env.get("SITE_URL") || "https://crypto-boerse.com");
      // impersonated=1 tells the app not to record presence (last_seen_at / current page)
      const targetPath = action === "login_as_agent"
        ? "/backoffice/users?impersonated=1"
        : "/dashboard?impersonated=1";
      const redirectUrl = `${baseUrl}?token=${token}&type=magiclink&redirect_to=${encodeURIComponent(siteUrl + targetPath)}`;
      return new Response(JSON.stringify({ success: true, url: redirectUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "shave_lead") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Get original profile
      const { data: origProfile, error: profErr } = await adminClient
        .from("profiles")
        .select("*")
        .eq("id", user_id)
        .single();
      if (profErr || !origProfile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (origProfile.shaved_to) {
        return new Response(JSON.stringify({ error: "Lead already shaved" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Get original auth user
      const { data: origAuth, error: origAuthErr } = await adminClient.auth.admin.getUserById(user_id);
      if (origAuthErr || !origAuth?.user?.email) {
        return new Response(JSON.stringify({ error: "Auth user not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const realEmail = origAuth.user.email;
      const shavedEmail = `shaved_${user_id.substring(0, 8)}@internal.shaved`;

      // 3. Change original auth user's email to internal one (so we can reuse the real email)
      const { error: emailChangeErr } = await adminClient.auth.admin.updateUserById(user_id, {
        email: shavedEmail,
        email_confirm: true,
      });
      if (emailChangeErr) {
        return new Response(JSON.stringify({ error: "Failed to update original email: " + emailChangeErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 4. Ban original auth user so they can't log in
      const { error: banErr } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "876600h", // ~100 years
      });
      if (banErr) {
        // Revert email change
        await adminClient.auth.admin.updateUserById(user_id, { email: realEmail, email_confirm: true });
        return new Response(JSON.stringify({ error: "Failed to ban original user: " + banErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 5. Create new auth user with the real email (temp password, will be overwritten)
      const tempPassword = crypto.randomUUID().substring(0, 16) + "Aa1!";
      const { data: newAuthUser, error: createErr } = await adminClient.auth.admin.createUser({
      app_metadata: { pre_approved: true },
        email: realEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: origProfile.full_name || "",
          phone: origProfile.phone || "",
          country: origProfile.country || "",
        },
      });
      if (createErr) {
        // Revert: unban + restore email
        await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "none", email: realEmail, email_confirm: true });
        return new Response(JSON.stringify({ error: "Failed to create duplicate user: " + createErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newUserId = newAuthUser.user.id;

      // 5b. Copy the original user's password hash to the new user
      await adminClient.rpc("copy_user_password", {
        _source_user_id: user_id,
        _target_user_id: newUserId,
      });

      // 6. Update the new profile (created by handle_new_user trigger) with original's details but NO affiliate
      await adminClient.from("profiles").update({
        full_name: origProfile.full_name,
        phone: origProfile.phone,
        country: origProfile.country,
        status: origProfile.status,
        assigned_agent: origProfile.assigned_agent,
        is_lead: origProfile.is_lead,
        kyc_status: origProfile.kyc_status,
        shaved_from: user_id,
        // Deliberately exclude: affiliate, funnel (so affiliate can't see this one)
      }).eq("id", newUserId);

      // 7. Update original profile's email to internal one and set shaved_to
      //    Store original_email so affiliate API can still show the real email
      await adminClient.from("profiles").update({
        shaved_to: newUserId,
        original_email: realEmail,
        email: shavedEmail,
      }).eq("id", user_id);

      // 7b. Keep the verbal verification code on the NEW (client-facing) profile.
      //     Done in one DB function so the UNIQUE column never clashes mid-swap.
      const { error: codeSwapErr } = await adminClient.rpc("swap_verification_codes", {
        _orig_id: user_id,
        _new_id: newUserId,
      });
      if (codeSwapErr) {
        console.error("verification code swap failed", codeSwapErr);
      }


      // 8. Copy wallets from original to new user
      const { data: origWallets } = await adminClient
        .from("wallets")
        .select("currency, balance")
        .eq("user_id", user_id);

      if (origWallets && origWallets.length > 0) {
        for (const w of origWallets) {
          await adminClient.from("wallets").upsert({
            user_id: newUserId,
            currency: w.currency,
            balance: w.balance,
          }, { onConflict: "user_id,currency" });
        }
      }

      // 9. Copy admin notes to new user
      const { data: origNotes } = await adminClient
        .from("admin_notes")
        .select("content, author_id, created_at, attachments")
        .eq("user_id", user_id);

      if (origNotes && origNotes.length > 0) {
        for (const n of origNotes) {
          await adminClient.from("admin_notes").insert({
            user_id: newUserId,
            content: n.content,
            author_id: n.author_id,
            attachments: n.attachments,
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        new_user_id: newUserId,
        temp_password: tempPassword,
        message: "Lead shaved successfully. Original lead frozen for affiliate. New account created for client.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_kyc_documents") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let resolvedUserId = user_id;
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(user_id)) {
        const displayId = Number(user_id);
        if (!Number.isFinite(displayId)) {
          return new Response(JSON.stringify({ error: "Invalid user identifier" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: profileByDisplayId, error: profileLookupError } = await adminClient
          .from("profiles")
          .select("id")
          .eq("display_id", displayId)
          .single();

        if (profileLookupError || !profileByDisplayId?.id) {
          return new Response(JSON.stringify({ error: "Client not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        resolvedUserId = profileByDisplayId.id;
      }

      const { data: docs, error: docsError } = await adminClient
        .from("kyc_documents")
        .select("id, document_type, file_url, status, admin_notes, created_at")
        .eq("user_id", resolvedUserId)
        .order("created_at", { ascending: false });

      if (docsError) {
        return new Response(JSON.stringify({ error: docsError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, docs: docs ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_kyc_document_url") {
      const { document_id } = body;
      if (!document_id) {
        return new Response(JSON.stringify({ error: "document_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: doc, error: docError } = await adminClient
        .from("kyc_documents")
        .select("id, file_url")
        .eq("id", document_id)
        .single();

      if (docError || !doc?.file_url) {
        return new Response(JSON.stringify({ error: "Document not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: signed, error: signedError } = await adminClient.storage
        .from("kyc-documents")
        .createSignedUrl(doc.file_url, 300);

      if (signedError || !signed?.signedUrl) {
        return new Response(JSON.stringify({ error: signedError?.message || "Could not create file URL" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, signedUrl: signed.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_kyc_document_status") {
      const { document_id, status, admin_notes } = body;
      if (!document_id || !["approved", "rejected"].includes(status)) {
        return new Response(JSON.stringify({ error: "document_id and valid status required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload: Record<string, unknown> = {
        status,
        reviewed_by: caller.id,
        admin_notes: status === "rejected" ? admin_notes ?? null : null,
      };

      const { error: updateError } = await adminClient
        .from("kyc_documents")
        .update(payload)
        .eq("id", document_id);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete related data first (order matters for foreign keys)
      // Delete child records that reference parent tables
      const { data: ticketIds } = await adminClient.from("support_tickets").select("id").eq("user_id", user_id);
      if (ticketIds && ticketIds.length > 0) {
        for (const t of ticketIds) {
          await adminClient.from("ticket_messages").delete().eq("ticket_id", t.id);
        }
      }
      const { data: roomIds } = await adminClient.from("chat_rooms").select("id").eq("user_id", user_id);
      if (roomIds && roomIds.length > 0) {
        for (const r of roomIds) {
          await adminClient.from("chat_messages").delete().eq("room_id", r.id);
        }
      }

      await adminClient.from("admin_notes").delete().eq("user_id", user_id);
      await adminClient.from("admin_notes").delete().eq("author_id", user_id);
      await adminClient.from("notifications").delete().eq("user_id", user_id);
      await adminClient.from("wallets").delete().eq("user_id", user_id);
      await adminClient.from("deposits").delete().eq("user_id", user_id);
      await adminClient.from("withdrawals").delete().eq("user_id", user_id);
      await adminClient.from("trade_overrides").delete().in("trade_id",
        (await adminClient.from("trades").select("id").eq("user_id", user_id)).data?.map((t: any) => t.id) ?? []
      );
      await adminClient.from("trades").delete().eq("user_id", user_id);
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("activity_log").delete().eq("user_id", user_id);
      await adminClient.from("kyc_documents").delete().eq("user_id", user_id);
      await adminClient.from("user_stakes").delete().eq("user_id", user_id);
      await adminClient.from("watchlist").delete().eq("user_id", user_id);
      await adminClient.from("price_alerts").delete().eq("user_id", user_id);
      await adminClient.from("support_tickets").delete().eq("user_id", user_id);
      await adminClient.from("chat_rooms").delete().eq("user_id", user_id);
      await adminClient.from("swaps").delete().eq("user_id", user_id);
      await adminClient.from("referrals").delete().eq("referrer_id", user_id);
      await adminClient.from("referrals").delete().eq("referred_id", user_id);
      await adminClient.from("copied_trades").delete().eq("user_id", user_id);
      await adminClient.from("copy_subscriptions").delete().eq("user_id", user_id);
      await adminClient.from("client_bank_details").delete().eq("user_id", user_id);
      await adminClient.from("client_crypto_addresses").delete().eq("user_id", user_id);
      await adminClient.from("report_settings").delete().eq("user_id", user_id);
      await adminClient.from("welcome_page_visits").delete().eq("user_id", user_id);
      await adminClient.from("appointments").delete().eq("agent_id", user_id);
      await adminClient.from("appointments").delete().eq("client_id", user_id);
      await adminClient.from("team_members").delete().eq("user_id", user_id);
      await adminClient.from("profiles").delete().eq("id", user_id);

      // Delete auth user — ignore "User not found" errors (e.g. seeded/orphan profiles)
      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user_id);
      if (deleteErr && !deleteErr.message?.includes("not found")) {
        return new Response(JSON.stringify({ error: deleteErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
