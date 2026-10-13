import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TZ = "Europe/Berlin";

const fmtDate = (d: Date) =>
  d.toLocaleDateString("de-DE", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: TZ,
  });
const fmtTime = (d: Date) =>
  d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ, hour12: false });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // Appointments starting within the next hour that haven't been reminded yet
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id, title, description, start_at, client_id, agent_id, notify_client, notify_agent")
    .eq("reminded", false)
    .or("notify_client.eq.true,notify_agent.eq.true")
    .gte("start_at", now.toISOString())
    .lte("start_at", oneHourLater.toISOString());

  if (error) {
    console.error("Error fetching appointments:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!appointments || appointments.length === 0) {
    return new Response(JSON.stringify({ reminded: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let reminded = 0;

  for (const apt of appointments) {
    const start = new Date(apt.start_at);
    const dateStr = fmtDate(start);
    const timeStr = fmtTime(start);

    const ids = [apt.client_id, apt.agent_id].filter(Boolean) as string[];
    const { data: people } = ids.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
      : { data: [] as any[] };
    const client = people?.find((p: any) => p.id === apt.client_id);
    const agent = people?.find((p: any) => p.id === apt.agent_id);

    let clientOk = true;

    // ---- Client: dashboard notification + email ----
    if (apt.client_id && (apt as any).notify_client !== false) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: apt.client_id,
        title: "Terminerinnerung",
        message: `${apt.title} – heute um ${timeStr} Uhr (in etwa einer Stunde)`,
        type: "appointment",
        priority: 2,
      });
      if (notifError) {
        clientOk = false;
        console.error(`Client notification failed for ${apt.id}:`, notifError.message);
      }

      if (client?.email) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              templateName: "appointment-reminder",
              recipientEmail: client.email,
              idempotencyKey: `appt-reminder-${apt.id}`,
              templateData: {
                clientName: client.full_name || undefined,
                topic: apt.title,
                date: dateStr,
                time: timeStr,
                agentName: agent?.full_name || undefined,
                notes: apt.description || undefined,
              },
            }),
          });
          if (!res.ok) {
            console.error(`Reminder email failed for ${apt.id}:`, await res.text());
          }
        } catch (e) {
          console.error(`Reminder email error for ${apt.id}:`, e);
        }
      }
    }

    // ---- Agent: backoffice notification only ----
    if (apt.agent_id && (apt as any).notify_agent !== false) {
      const who = client?.full_name || client?.email || "Kunde";
      const { error: agentNotifErr } = await supabase.from("notifications").insert({
        user_id: apt.agent_id,
        title: "Appointment in 1 hour",
        message: `${apt.title}${apt.client_id ? ` with ${who}` : ""} — ${dateStr} at ${timeStr}`,
        type: "appointment",
        priority: 2,
      });
      if (agentNotifErr) {
        console.error(`Agent notification failed for ${apt.id}:`, agentNotifErr.message);
      }
    }

    if (clientOk) {
      await supabase.from("appointments").update({ reminded: true }).eq("id", apt.id);
      reminded++;
    }
  }

  console.log(`Reminded ${reminded} appointments`);

  return new Response(JSON.stringify({ reminded }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
