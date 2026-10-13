import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORT_EMAIL = "support@crypto-borse.com";
const ONLINE_WINDOW_SECONDS = 60; // staff is "online" if last_seen_at within 60 seconds
const STAFF_REPLY_WINDOW_SECONDS = 300; // if no staff reply for 5 min, AI takes over

const SYSTEM_PROMPT = `Du bist ein professioneller Kundenservice-Assistent für Crypto-Börse, eine Investmentplattform.
Antworte immer auf Deutsch (außer der Kunde schreibt in einer anderen Sprache, dann antworte in derselben Sprache), freundlich, höflich und professionell.
Halte deine Antworten kurz und präzise (max 2-3 Sätze).

WICHTIGE REGELN:
- Beantworte einfache, allgemeine Fragen zu Konto, Trading, Plattformnutzung, Öffnungszeiten oder Navigation direkt und hilfreich.
- Für EINZAHLUNGEN, AUSZAHLUNGEN, KONTOPROBLEME, KYC-VERIFIZIERUNG, SPEZIFISCHE FINANZIELLE FRAGEN oder wenn der Kunde Hilfe bei einer Transaktion braucht, sage ihm IMMER, dass er sich an seinen persönlichen Account Manager oder den Support wendet:
  ✉️ E-Mail: ${SUPPORT_EMAIL}
  💬 Live-Chat: auf crypto-boerse.com
- Wenn du die Antwort auf eine Frage NICHT sicher kennst, sag dem Kunden ehrlich, dass er sich für eine zuverlässige Antwort an den Support wenden soll (E-Mail + Live-Chat oben angeben).
- Gib NIEMALS finanzielle Beratung, Einzahlungsanweisungen, Kontodaten oder Versprechungen zu Renditen.
- Sei niemals erfunden oder ungenau – im Zweifel an Support verweisen.`;

async function isAnyStaffOnline(admin: any, assignedAgentId: string | null): Promise<boolean> {
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000).toISOString();

  // Check assigned agent
  if (assignedAgentId) {
    const { data: agent } = await admin
      .from("profiles")
      .select("last_seen_at")
      .eq("id", assignedAgentId)
      .maybeSingle();
    if (agent?.last_seen_at && agent.last_seen_at >= cutoff) return true;
  }

  // Check any admin/manager online
  const { data: staffRoles } = await admin
    .from("user_roles")
    .select("user_id, roles!inner(name)")
    .in("roles.name", ["Admin", "Manager"]);
  const staffIds = [...new Set((staffRoles || []).map((r: any) => r.user_id).filter(Boolean))];
  if (staffIds.length === 0) return false;

  const { data: onlineStaff } = await admin
    .from("profiles")
    .select("id")
    .in("id", staffIds)
    .gte("last_seen_at", cutoff)
    .limit(1);

  return (onlineStaff || []).length > 0;
}

async function notifyStaff(admin: any, opts: {
  assignedAgentId: string | null;
  clientName: string;
  preview: string;
  roomId: string;
}) {
  const { data: staffRoles } = await admin
    .from("user_roles")
    .select("user_id, roles!inner(name)")
    .in("roles.name", ["Admin", "Manager"]);
  const staffIds = (staffRoles || []).map((r: any) => r.user_id).filter(Boolean);
  if (opts.assignedAgentId) staffIds.push(opts.assignedAgentId);

  const unique = [...new Set(staffIds)];
  if (unique.length === 0) return;

  const rows = unique.map((sid) => ({
    user_id: sid,
    title: "Neue Live-Chat Nachricht",
    message: `${opts.clientName}: ${opts.preview}`,
    type: "chat",
    priority: 2,
  }));
  await admin.from("notifications").insert(rows);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { room_id, message, action } = await req.json();

    // Action: escalate to agent
    if (action === "escalate") {
      const { data: profile } = await admin
        .from("profiles")
        .select("assigned_agent, full_name")
        .eq("id", user.id)
        .single();
      const agentId = profile?.assigned_agent || null;

      await admin.from("chat_rooms").update({
        mode: "agent",
        agent_id: agentId,
        status: "escalated",
      }).eq("id", room_id);

      await admin.from("chat_messages").insert({
        room_id,
        sender_id: user.id,
        content: "Chat wurde an einen Berater weitergeleitet.",
        type: "system",
      });

      await notifyStaff(admin, {
        assignedAgentId: agentId,
        clientName: profile?.full_name || "Ein Kunde",
        preview: "Eskalation – möchte mit Berater sprechen.",
        roomId: room_id,
      });

      return new Response(JSON.stringify({ success: true, escalated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: create room
    if (action === "create_room") {
      const { data: existing } = await admin.from("chat_rooms")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["open", "escalated"])
        .limit(1)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ room_id: existing.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: room } = await admin.from("chat_rooms").insert({
        user_id: user.id,
        mode: "ai",
        status: "open",
      }).select("id").single();

      const greeting = "Willkommen bei Crypto-Börse! Mein Name ist Ihr KI-Assistent. Wie kann ich Ihnen heute behilflich sein? Ich stehe Ihnen gerne bei Fragen zu Ihrem Konto, Trading oder allgemeinen Anliegen zur Verfügung.";
      await admin.from("chat_messages").insert({
        room_id: room!.id,
        sender_id: "00000000-0000-0000-0000-000000000000",
        content: greeting,
        type: "text",
      });

      return new Response(JSON.stringify({ room_id: room!.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: send message
    if (!room_id || !message) {
      return new Response(JSON.stringify({ error: "room_id and message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save user message
    await admin.from("chat_messages").insert({
      room_id,
      sender_id: user.id,
      content: message,
      type: "text",
    });

    await admin.from("chat_rooms").update({ updated_at: new Date().toISOString() }).eq("id", room_id);

    const { data: room } = await admin
      .from("chat_rooms")
      .select("mode, agent_id")
      .eq("id", room_id)
      .single();

    const { data: clientProfile } = await admin
      .from("profiles")
      .select("full_name, assigned_agent")
      .eq("id", user.id)
      .single();

    const assignedAgentId = room?.agent_id || clientProfile?.assigned_agent || null;
    const clientName = clientProfile?.full_name || user.email || "Kunde";
    const preview = message.length > 80 ? message.slice(0, 80) + "…" : message;

    // Always notify staff so they don't miss it
    await notifyStaff(admin, {
      assignedAgentId,
      clientName,
      preview,
      roomId: room_id,
    });

    // Check if any staff is online
    const staffOnline = await isAnyStaffOnline(admin, assignedAgentId);

    // Check if a staff member has actually replied recently in this room
    const replyCutoff = new Date(Date.now() - STAFF_REPLY_WINDOW_SECONDS * 1000).toISOString();
    const { data: recentStaffMsgs } = await admin
      .from("chat_messages")
      .select("sender_id")
      .eq("room_id", room_id)
      .eq("type", "text")
      .neq("sender_id", user.id)
      .neq("sender_id", "00000000-0000-0000-0000-000000000000")
      .gte("created_at", replyCutoff)
      .limit(1);
    const staffRepliedRecently = (recentStaffMsgs || []).length > 0;

    // Suppress AI only if room is in agent mode AND staff is online AND has actually replied recently.
    if (room?.mode === "agent" && staffOnline && staffRepliedRecently) {
      return new Response(JSON.stringify({ reply: null, mode: "agent", staff_online: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Otherwise (AI mode, OR agent mode but no one online) → AI replies
    const { data: history } = await admin.from("chat_messages")
      .select("sender_id, content, type")
      .eq("room_id", room_id)
      .eq("type", "text")
      .order("created_at")
      .limit(20);

    const messages = (history || []).map((m: any) => ({
      role: m.sender_id === user.id ? "user" : "assistant",
      content: m.content,
    }));

    const offlineNotice =
      room?.mode === "agent" && (!staffOnline || !staffRepliedRecently)
        ? `\n\nHINWEIS: Der Kunde wartet im Berater-Modus, aber aktuell antwortet KEIN Mitarbeiter. Antworte hilfsbereit auf die Frage des Kunden, soweit dir möglich. Entschuldige die Wartezeit höflich und erwähne, dass das Team in Kürze persönlich antworten wird. Bei finanziellen oder kontospezifischen Anliegen verweise zusätzlich auf E-Mail ${SUPPORT_EMAIL} oder den Live-Chat auf crypto-boerse.com.`
        : "";

    if (!lovableKey) {
      const fallback = `Entschuldigung, der KI-Assistent ist gerade nicht verfügbar. Bitte kontaktieren Sie unseren Support per E-Mail (${SUPPORT_EMAIL}) oder Live-Chat auf crypto-boerse.com.`;
      await admin.from("chat_messages").insert({
        room_id,
        sender_id: "00000000-0000-0000-0000-000000000000",
        content: fallback,
        type: "text",
      });
      return new Response(JSON.stringify({ reply: fallback, mode: room?.mode || "ai" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + offlineNotice },
          ...messages,
        ],
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResp.json();
    const reply =
      aiData.choices?.[0]?.message?.content ||
      `Entschuldigung, ich konnte keine Antwort generieren. Bitte kontaktieren Sie den Support per E-Mail (${SUPPORT_EMAIL}) oder Live-Chat auf crypto-boerse.com.`;

    await admin.from("chat_messages").insert({
      room_id,
      sender_id: "00000000-0000-0000-0000-000000000000",
      content: reply,
      type: "text",
    });

    return new Response(JSON.stringify({ reply, mode: room?.mode || "ai", staff_online: staffOnline }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("live-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
