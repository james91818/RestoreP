import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const FALLBACK_CHAT_ID = '';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!LOVABLE_API_KEY || !TELEGRAM_BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'Telegram credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read config
  let TELEGRAM_CHAT_ID = FALLBACK_CHAT_ID;
  let enabled = true;
  try {
    const { data: cfg } = await supabase
      .from('platform_settings').select('value').eq('key', 'telegram_bot').maybeSingle();
    const ftdCfg = (cfg?.value as any)?.ftd ?? {};
    if (ftdCfg.chat_id) TELEGRAM_CHAT_ID = String(ftdCfg.chat_id);
    if (ftdCfg.enabled === false) enabled = false;
  } catch (e) { console.error('settings read failed', e); }

  if (!enabled) {
    return new Response(JSON.stringify({ success: true, skipped: 'disabled' }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!TELEGRAM_CHAT_ID.trim()) {
    await supabase.from('telegram_message_log').insert({
      notification_type: 'ftd',
      chat_id: 'not_configured',
      message_preview: 'FTD notification skipped: Telegram chat ID is not configured.',
      status: 'failed',
      error_message: 'Telegram ftd chat_id is not configured in platform_settings.telegram_bot.ftd.chat_id',
    });
    return new Response(JSON.stringify({ success: true, skipped: 'chat_not_configured' }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { user_id, deposit_id } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, display_id, assigned_agent, ftd_agent, country, affiliate, funnel, shaved_from')
      .eq('id', user_id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Fetch the deposit
    const { data: deposit } = await supabase
      .from('deposits')
      .select('amount, currency, method, admin_notes, processed_by')
      .eq('id', deposit_id)
      .single();

    // Resolve the agent who handled the FTD (priority: deposit.processed_by > ftd_agent > assigned_agent)
    const agentId = (profile as any).ftd_agent || (profile as any).assigned_agent;
    let agentDisplay = 'N/A';
    if (agentId) {
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', agentId)
        .single();
      if (agentProfile) {
        agentDisplay = (agentProfile as any).full_name || (agentProfile as any).email || 'N/A';
      }
    }

    // Fetch all admin notes for this client
    const { data: notes } = await supabase
      .from('admin_notes')
      .select('content, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: true });

    const notesText = (notes || []).map((n: any) => n.content).join('\n---\n');

    // Use AI to analyze comments for experience and job
    let experience = 'Unknown';
    let job = 'Unknown';
    let rating = '5';
    let age = 'Unknown';
    let callTime = 'Unknown';

    if (notesText.trim()) {
      try {
        const aiResp = await fetch(AI_GATEWAY_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You analyze client notes from a trading platform. Extract information and respond ONLY in this exact JSON format, nothing else:
{"experience":"brief description of client's PRIOR trading experience with crypto and stocks only","job":"company name + position/role","rating":"number 1-10","age":"client age or Not mentioned","call_time":"when the client wants to be called or Not mentioned"}

EXPERIENCE field — STRICT RULES:
- ONLY describe the client's prior experience trading CRYPTO and STOCKS (e.g. "5 years trading Bitcoin and tech stocks", "Beginner, never traded before", "Traded stocks for 10 years, new to crypto").
- Do NOT mention forex, real estate, business experience, work experience, hobbies, or anything else.
- If notes don't say anything about prior crypto/stock trading experience, set it to "Not mentioned in notes".

JOB field — STRICT RULES:
- Write the COMPANY/EMPLOYER name AND the client's POSITION/ROLE there (e.g. "Siemens — Senior Engineer", "BMW — Production Manager", "Self-employed — Restaurant owner", "Deutsche Bank — Branch Manager").
- If only the position is mentioned, write just the position. If only the company is mentioned, write just the company.
- Do NOT write generic things like "Employed" or "Works full time". Be specific.
- If notes don't mention job/employer, set it to "Not mentioned in notes".

RATING field — IMPORTANT, be GENEROUS and FAIR (1–10 scale):
- This rates the client's overall QUALITY and POTENTIAL as an investor (wealth + seriousness + deposit capacity).
- Default rating for a client who just made an FTD is 6–7. They proved they can deposit real money — that already puts them above average.
- Use 8–9 for clients with senior roles (manager, director, executive, business owner, doctor, lawyer, engineer, IT specialist, dentist, pilot), or who mention significant savings/assets, or who seem very engaged and ready to invest more.
- Use 10 ONLY for clearly very wealthy clients (C-level execs, business owners with multiple companies, mentions of 100k+ portfolios, clearly high net worth).
- Use 4–5 ONLY if the notes show clear red flags (very low income job mentioned, hesitant, tiny budget, retired with small pension, unemployed).
- Use 1–3 ONLY for very clear bad signs (no money, refusing to deposit more, very negative attitude).
- Do NOT default to low ratings just because info is missing. Missing info = give them 6–7 (benefit of the doubt for a fresh depositor).

OTHER FIELDS:
- age: extract age if mentioned (number or description). Otherwise "Not mentioned in notes".
- call_time: when the client wants to be called back (e.g. "tomorrow at 3pm", "next Monday morning"). Otherwise "Not mentioned in notes".

Translate everything to English. Respond ONLY with the JSON, no other text.`,
              },
              {
                role: 'user',
                content: `Client name: ${profile.full_name}\n\nClient notes:\n${notesText}`,
              },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const content = aiData.choices?.[0]?.message?.content?.trim() || '';
          try {
            // Extract JSON from response (may be wrapped in markdown code blocks)
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              experience = parsed.experience || experience;
              job = parsed.job || job;
              rating = parsed.rating || rating;
              age = parsed.age || age;
              callTime = parsed.call_time || callTime;
            }
          } catch {
            console.error('Failed to parse AI response:', content);
          }
        }
      } catch (aiErr) {
        console.error('AI analysis failed:', aiErr);
      }
    }

    // If experience/job still unknown, add note about asking the agent
    if (experience === 'Unknown' || experience === 'Not mentioned in notes') {
      experience = '⚠️ Not found in notes — ask the assigned agent';
    }
    if (job === 'Unknown' || job === 'Not mentioned in notes') {
      job = '⚠️ Not found in notes — ask the assigned agent';
    }
    if (age === 'Unknown' || age === 'Not mentioned in notes' || age === 'Not mentioned') {
      age = '⚠️ Not found in notes — ask the assigned agent';
    }
    if (callTime === 'Unknown' || callTime === 'Not mentioned in notes' || callTime === 'Not mentioned') {
      callTime = '⚠️ Not mentioned by agent — please ask the client when they want to be called';
    }

    const depositAmount = deposit ? `${Number(deposit.amount).toLocaleString('de-DE')} ${deposit.currency}` : 'N/A';
    const paymentMethod = deposit?.method || 'N/A';

    // Country with flag emoji
    const COUNTRY_FLAGS: Record<string, string> = {
      'germany': '🇩🇪', 'austria': '🇦🇹', 'switzerland': '🇨🇭', 'united states': '🇺🇸',
      'united kingdom': '🇬🇧', 'france': '🇫🇷', 'netherlands': '🇳🇱', 'belgium': '🇧🇪',
      'italy': '🇮🇹', 'spain': '🇪🇸', 'portugal': '🇵🇹', 'sweden': '🇸🇪', 'norway': '🇳🇴',
      'denmark': '🇩🇰', 'finland': '🇫🇮', 'iceland': '🇮🇸', 'ireland': '🇮🇪',
      'luxembourg': '🇱🇺', 'liechtenstein': '🇱🇮', 'poland': '🇵🇱', 'czech republic': '🇨🇿',
      'slovakia': '🇸🇰', 'slovenia': '🇸🇮', 'hungary': '🇭🇺', 'romania': '🇷🇴',
      'bulgaria': '🇧🇬', 'croatia': '🇭🇷', 'greece': '🇬🇷', 'estonia': '🇪🇪',
      'latvia': '🇱🇻', 'lithuania': '🇱🇹', 'malta': '🇲🇹', 'cyprus': '🇨🇾',
      'australia': '🇦🇺', 'canada': '🇨🇦', 'japan': '🇯🇵', 'new zealand': '🇳🇿',
      'united arab emirates': '🇦🇪', 'singapore': '🇸🇬',
    };
    const countryName = profile.country || '';
    const countryFlag = COUNTRY_FLAGS[countryName.toLowerCase()] || '';
    const countryDisplay = countryName ? `${countryFlag} ${countryName}`.trim() : 'N/A';
    const affiliateDisplay = profile.affiliate || 'N/A';
    const funnelDisplay = profile.funnel || 'N/A';
    const shavedLine = (profile as any).shaved_from ? '\n\n<b>⚠️ Shaved Lead:</b> Yes — duplicated from another account' : '';

    // Extract PSP provider from admin_notes if present (e.g. "[PSP: Max - Stripe] ...")
    let pspLine = '';
    const pspMatch = deposit?.admin_notes?.match(/\[PSP:\s*([^\]]+)\]/);
    if (pspMatch) {
      pspLine = `\n\n<b>PSP Provider:</b> ${pspMatch[1].trim()}`;
    }

    const message = `🎉 <b>NEW FTD !</b>

—————————————————

<b>Name:</b> ${profile.full_name || 'N/A'}

<b>Email:</b> ${profile.email || 'N/A'}

<b>ID:</b> ${profile.display_id}${shavedLine}

<b>Country:</b> ${countryDisplay}

<b>Affiliate:</b> ${affiliateDisplay}

<b>Funnel:</b> ${funnelDisplay}

<b>Experience:</b> ${experience}

<b>Job:</b> ${job}

<b>Age:</b> ${age}

<b>Amount:</b> ${depositAmount}

<b>Payment Method:</b> ${paymentMethod}${pspLine}

<b>Agent:</b> ${agentDisplay}

<b>When to Call:</b> ${callTime}

<b>Rate:</b> ${rating}/10

—————————————————`;

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      await supabase.from('telegram_message_log').insert({
        notification_type: 'ftd', chat_id: TELEGRAM_CHAT_ID,
        message_preview: message.slice(0, 200),
        status: 'failed', error_message: JSON.stringify(data).slice(0, 500),
        metadata: { user_id, deposit_id },
      });
      throw new Error(`Telegram API call failed [${response.status}]: ${JSON.stringify(data)}`);
    }

    await supabase.from('telegram_message_log').insert({
      notification_type: 'ftd', chat_id: TELEGRAM_CHAT_ID,
      message_preview: message.slice(0, 200),
      telegram_message_id: data.result?.message_id, status: 'sent',
      metadata: { user_id, deposit_id },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending FTD Telegram notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
