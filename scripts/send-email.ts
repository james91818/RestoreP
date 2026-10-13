const url = process.env.SUPABASE_URL + "/functions/v1/send-transactional-email";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const r = await fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${key}`,
    "apikey": key,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    templateName: "leverage-100-notice",
    recipientEmail: "tlorz@ok.de",
    idempotencyKey: "leverage100-tlorz-2026-05-04-y1",
    templateData: { clientName: "Lorz" },
  }),
});
console.log(r.status, await r.text());
