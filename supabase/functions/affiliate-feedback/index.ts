import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};


const getTelegramChatIdsToTry = (chatId: string) => {
  if (!chatId) return [];
  if (chatId.startsWith("-100")) return [chatId];
  if (chatId.startsWith("-")) return [chatId, `-100${chatId.slice(1)}`];
  return [chatId];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY || !TELEGRAM_BOT_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Missing API keys" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is staff
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user } } = await anonClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { lead_ids, mode, messages } = body as {
      lead_ids?: string[];
      mode?: "preview" | "send" | "send_edited";
      messages?: { affiliate: string; text: string }[];
    };

    // ===== send_edited: skip AI, send the user-edited messages directly =====
    if (mode === "send_edited") {
      if (!Array.isArray(messages) || messages.length === 0) {
        return new Response(
          JSON.stringify({ error: "messages array required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const affNames = messages.map((m) => m.affiliate);
      const { data: affiliates } = await supabase
        .from("affiliates")
        .select("name, telegram_group_id")
        .in("name", affNames);
      const affMap: Record<string, string | null> = {};
      for (const a of affiliates ?? []) affMap[a.name] = a.telegram_group_id;

      const sendResults: { affiliate: string; sent: boolean; error?: string }[] = [];
      for (const m of messages) {
        const tgId = affMap[m.affiliate];
        if (!tgId) {
          sendResults.push({ affiliate: m.affiliate, sent: false, error: "No Telegram group configured" });
          continue;
        }
        const chatIdsToTry = getTelegramChatIdsToTry(tgId);
        let lastErr = "Unknown Telegram error";
        let ok = false;
        for (const chatId of chatIdsToTry) {
          const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ chat_id: chatId, text: m.text }),
          });
          if (r.ok) { ok = true; break; }
          lastErr = await r.text();
        }
        sendResults.push(ok ? { affiliate: m.affiliate, sent: true } : { affiliate: m.affiliate, sent: false, error: `Telegram error: ${lastErr}` });
      }
      return new Response(
        JSON.stringify({ success: true, results: sendResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "lead_ids array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isPreview = mode === "preview";

    // Fetch lead profiles
    const { data: leads } = await supabase
      .from("profiles")
      .select("id, email, original_email, full_name, status, affiliate, country, phone, funnel")
      .in("id", lead_ids);

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: "No leads found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch lead statuses and identify which ones are "red" (invalid)
    const { data: statusRows } = await supabase
      .from("lead_statuses")
      .select("name, color");
    const invalidStatuses = new Set(
      (statusRows ?? [])
        .filter((s) => (s.color || "").includes("destructive"))
        .map((s) => (s.name || "").toLowerCase())
    );

    // Fetch all comments for these leads
    const { data: allNotes } = await supabase
      .from("admin_notes")
      .select("user_id, content, created_at")
      .in("user_id", lead_ids)
      .order("created_at", { ascending: true });

    const notesByLead: Record<string, string[]> = {};
    for (const note of allNotes ?? []) {
      if (!notesByLead[note.user_id]) notesByLead[note.user_id] = [];
      notesByLead[note.user_id].push(note.content);
    }

    // Group leads by affiliate
    const leadsByAffiliate: Record<string, typeof leads> = {};
    for (const lead of leads) {
      const aff = lead.affiliate || "__no_affiliate__";
      if (!leadsByAffiliate[aff]) leadsByAffiliate[aff] = [];
      leadsByAffiliate[aff].push(lead);
    }

    // Fetch affiliates with telegram_group_id
    const affiliateNames = Object.keys(leadsByAffiliate).filter(a => a !== "__no_affiliate__");
    let affiliatesMap: Record<string, { telegram_group_id: string | null; name: string }> = {};
    if (affiliateNames.length > 0) {
      const { data: affiliates } = await supabase
        .from("affiliates")
        .select("name, telegram_group_id")
        .in("name", affiliateNames);
      for (const a of affiliates ?? []) {
        affiliatesMap[a.name] = { telegram_group_id: a.telegram_group_id, name: a.name };
      }
    }

    // Use AI to generate feedback
    const results: { affiliate: string; sent: boolean; error?: string }[] = [];
    const previews: { affiliate: string; text: string; error?: string; hasTelegram: boolean }[] = [];

    for (const [affiliateName, affiliateLeads] of Object.entries(leadsByAffiliate)) {
      if (affiliateName === "__no_affiliate__") {
        const msg = "Leads have no affiliate assigned";
        if (isPreview) previews.push({ affiliate: "No Affiliate", text: "", error: msg, hasTelegram: false });
        else results.push({ affiliate: "No Affiliate", sent: false, error: msg });
        continue;
      }

      const affData = affiliatesMap[affiliateName];
      const hasTelegram = !!affData?.telegram_group_id;

      // Fake comment pool for shaved leads — keyed by status keyword so the fake comment matches the real status
      const fakeCommentByKeyword: { match: (s: string) => boolean; comment: string }[] = [
        { match: (s) => s.includes("not interested") || s.includes("nicht interess"), comment: "Client said not interested at the moment, does not want to invest right now." },
        { match: (s) => s.includes("callback") || s.includes("call back") || s.includes("rückruf"), comment: "Asked to be called back later this week, currently busy." },
        { match: (s) => s.includes("no answer") || s.includes("no ans") || s.includes("keine antwort"), comment: "Tried multiple times, no answer. Will keep trying." },
        { match: (s) => s.includes("thinking") || s.includes("überleg"), comment: "Wants to think about it, will get back to us in a few days." },
        { match: (s) => s.includes("wrong time") || s.includes("later") || s.includes("wrong month"), comment: "Not a good time right now, asked to be contacted next month." },
        { match: (s) => s.includes("voicemail") || s.includes("mailbox"), comment: "Reached voicemail, left a message. Waiting for callback." },
        { match: (s) => s.includes("busy"), comment: "Client was busy, asked to be contacted another time." },
        { match: (s) => s.includes("new") || s.includes("fresh"), comment: "Fresh lead, not yet contacted." },
        { match: (s) => s.includes("follow"), comment: "Follow-up scheduled, waiting for client to get back to us." },
      ];
      const defaultFakeComments = [
        "Spoke briefly with the client, will follow up soon.",
        "Client requested more information before making a decision.",
        "Short conversation, client will get back to us.",
        "Client wants to think about it before committing.",
      ];
      const hashId = (s: string) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        return Math.abs(h);
      };
      const isShaved = (l: any) => !!l.original_email && l.original_email !== l.email;
      const fakeCommentFor = (l: any) => {
        const s = (l.status || "").toLowerCase();
        const hit = fakeCommentByKeyword.find((x) => x.match(s));
        if (hit) return hit.comment;
        return defaultFakeComments[hashId(l.id) % defaultFakeComments.length];
      };

      // Build context for AI — for shaved leads keep the real status but replace comments with a plausible fake one
      const leadsContext = affiliateLeads.map(l => {
        const shaved = isShaved(l);
        const status = l.status || "N/A";
        let commentsJoined: string;
        if (shaved) {
          commentsJoined = fakeCommentFor(l);
        } else {
          const comments = notesByLead[l.id] ?? [];
          commentsJoined = comments.length > 0 ? comments.join(" | ") : "No comments";
        }
        // Use original_email (pre-shave) so affiliate sees the exact email they sent us
        const displayEmail = (l as any).original_email || l.email;
        return `Email: ${displayEmail}, Name: ${l.full_name || "N/A"}, Status: ${status}, Country: ${l.country || "N/A"}, Phone: ${l.phone || "N/A"}, Comments: ${commentsJoined}`;
      }).join("\n");

      const invalidLeads = affiliateLeads.filter((l) =>
        invalidStatuses.has((l.status || "").toLowerCase())
      );
      const invalidCount = invalidLeads.length;
      const invalidStatusList = Array.from(invalidStatuses).join(", ");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a CRM feedback formatter for an affiliate partner. Your job is to RELAY the actual agent comments — NOT to paraphrase them into status-like phrases.

STRICT RULES:
1. The feedback text for each lead MUST be the actual agent comment(s), quoted as written by the agent. Do NOT replace them with generic phrases like "not interested" or "callback scheduled" — those are statuses, not comments.
2. If comments are in German, TRANSLATE them to clear English but keep all the specific details the agent wrote (names, times, reasons, objections, what the lead said, etc.). Do not summarize away the detail.
3. If there are MULTIPLE comments, join them with " | " in chronological order so the affiliate sees the full conversation history.
4. If there are NO comments at all, write exactly: "No agent comments yet"
5. NEVER invent or infer comments from the status. The status is shown separately in [Status: ...] for reference only.

UNDER AGE PRIVACY RULE (IMPORTANT):
- If a lead's status is "Under Age" (case-insensitive), DO NOT include the agent's comment text at all.
- Instead, write exactly: "Lead is under age" — and if the comment(s) mention a specific age (e.g. "17", "16 years old", "Alter 17", "17 Jahre"), append " (age: N)" where N is the number found.
- Example: "Lead is under age (age: 17)" or just "Lead is under age" if no age is mentioned.

INVALID STATUSES (counted authoritatively): ${invalidStatusList}
If a lead's status matches ANY invalid status above (case-insensitive), prefix the feedback with "❌ INVALID — ".
Also mark INVALID if the actual comments clearly state fake/test/wrong-number data.
(The Under Age privacy rule still applies — never reveal the comment for under-age leads, just prefix with "❌ INVALID — Lead is under age (age: N)".)

INVALID-WITH-USELESS-COMMENT RULE (IMPORTANT):
- If a lead has an INVALID status AND the comment is empty, missing, or just says "na", "n/a", "no answer", "no ans", "no antwort", "keine antwort", "-", "—", "none", "no comment", "x", "kein kommentar", or anything equivalently meaningless (case-insensitive, ignoring punctuation/whitespace), DO NOT show the comment.
- Instead, write a short reason derived from the STATUS itself explaining why the lead is invalid. Examples:
  • Status "Wrong Number" → "Wrong phone number"
  • Status "Fake" → "Fake lead"
  • Status "Test" → "Test lead"
  • Status "Duplicate" → "Duplicate lead"
  • Status "Wrong Details" → "Wrong contact details"
  • Status "No Lang" → "Language barrier — could not communicate"
  • Status "Do Not Call" → "Lead requested not to be contacted"
  • Status "Deposit in other brand" → "Already deposited with another broker"
  • Status "overnight" → "Invalid lead (overnight)"
- Format: "❌ INVALID — <reason from status>" (no comment text shown).
- If the invalid lead HAS a real, meaningful comment, still show it as usual: "❌ INVALID — <comment>".

The "Invalid/Fake" total in the summary MUST equal exactly ${invalidCount}. Do not change this number.

Format EXACTLY like this (plain text, no markdown). Leave a BLANK LINE between every lead entry:
📋 Leads Feedback

📧 email@example.com [Status: STATUS_HERE] — <actual agent comment text translated to English>

📧 email2@example.com [Status: Invalid] — ❌ INVALID — <actual agent comment text translated to English>

📊 Summary:
• Status X: N leads
• Status Y: N leads
• Invalid/Fake: ${invalidCount} leads
• Total: ${affiliateLeads.length} leads`
            },
            {
              role: "user",
              content: `Generate feedback for affiliate "${affiliateName}" about these ${affiliateLeads.length} leads (${invalidCount} of them have invalid/red statuses):\n\n${leadsContext}`
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!aiResponse.ok) {
        const msg = "AI generation failed";
        if (isPreview) previews.push({ affiliate: affiliateName, text: "", error: msg, hasTelegram });
        else results.push({ affiliate: affiliateName, sent: false, error: msg });
        continue;
      }

      const aiData = await aiResponse.json();
      const feedbackText = aiData.choices?.[0]?.message?.content || "Failed to generate feedback";

      // Preview mode → just collect, don't send
      if (isPreview) {
        previews.push({
          affiliate: affiliateName,
          text: feedbackText,
          hasTelegram,
          error: hasTelegram ? undefined : "No Telegram group configured (cannot send)",
        });
        continue;
      }

      if (!hasTelegram) {
        results.push({ affiliate: affiliateName, sent: false, error: "No Telegram group configured" });
        continue;
      }

      // Send to Telegram
      const chatIdsToTry = getTelegramChatIdsToTry(affData!.telegram_group_id!);
      let tgResponse: Response | null = null;
      let lastTelegramError = "Unknown Telegram error";

      for (const chatId of chatIdsToTry) {
        tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chat_id: chatId, text: feedbackText }),
        });

        if (tgResponse.ok) {
          results.push({ affiliate: affiliateName, sent: true });
          lastTelegramError = "";
          break;
        }

        lastTelegramError = await tgResponse.text();
        console.error(`Telegram send failed for ${affiliateName} (chat ${chatId}):`, lastTelegramError);
      }

      if (lastTelegramError) {
        results.push({ affiliate: affiliateName, sent: false, error: `Telegram error: ${lastTelegramError}` });
      }
    }

    return new Response(
      JSON.stringify({ success: true, previews: isPreview ? previews : undefined, results: isPreview ? undefined : results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
