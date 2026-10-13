import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// DEPRECATED: Crypto wallet polling has been merged into `poll-payment-links` to avoid
// concurrent Telegram getUpdates calls (which cause 409 Conflict errors).
// This stub is kept so any existing schedules / direct invocations no-op cleanly.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({ ok: true, deprecated: true, message: "Merged into poll-payment-links" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
