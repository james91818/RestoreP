// Polls public block explorers for incoming crypto on client-assigned addresses.
// Detected transactions become pending deposits (in native crypto amount) for
// manual approval by an agent. Idempotent via (network, tx_hash) unique index.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH = 25; // addresses scanned per run (keeps free APIs happy)

type AddrRow = {
  id: string;
  user_id: string;
  currency: string;
  network: string;
  address: string;
};

type Inbound = {
  tx_hash: string;
  amount: number;
  confirmations: number;
  block_time: string | null;
  raw: unknown;
};

// ---------- BTC (Blockstream) ----------
async function fetchBtc(address: string): Promise<Inbound[]> {
  const r = await fetch(`https://blockstream.info/api/address/${address}/txs`);
  if (!r.ok) return [];
  const txs: any[] = await r.json();
  const results: Inbound[] = [];
  for (const tx of txs) {
    let received = 0;
    for (const out of tx.vout ?? []) {
      if (out.scriptpubkey_address === address) received += Number(out.value || 0);
    }
    if (received <= 0) continue;
    results.push({
      tx_hash: tx.txid,
      amount: received / 1e8, // sats -> BTC
      confirmations: tx.status?.confirmed ? 1 : 0,
      block_time: tx.status?.block_time
        ? new Date(tx.status.block_time * 1000).toISOString()
        : null,
      raw: { fee: tx.fee, status: tx.status },
    });
  }
  return results;
}

// ---------- USDT TRC20 (Tronscan) ----------
async function fetchTrc20(address: string): Promise<Inbound[]> {
  // contract = USDT (TRC20)
  const url =
    `https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=20&start=0` +
    `&sort=-timestamp&count=true&toAddress=${address}` +
    `&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const data = await r.json();
  const list: any[] = data?.token_transfers ?? data?.data ?? [];
  const out: Inbound[] = [];
  for (const t of list) {
    const to = t.to_address ?? t.toAddress;
    if (!to || to.toLowerCase() !== address.toLowerCase()) continue;
    const decimals = Number(t.tokenInfo?.tokenDecimal ?? 6);
    const raw = Number(t.quant ?? t.amount_str ?? 0);
    if (!raw) continue;
    out.push({
      tx_hash: t.transaction_id ?? t.hash,
      amount: raw / Math.pow(10, decimals),
      confirmations: t.confirmed ? 1 : 0,
      block_time: t.block_ts ? new Date(t.block_ts).toISOString() : null,
      raw: { from: t.from_address, contract: t.contract_address },
    });
  }
  return out;
}

// ---------- USDT ERC20 (Etherscan public, no key — rate-limited) ----------
async function fetchErc20(address: string): Promise<Inbound[]> {
  const url =
    `https://api.etherscan.io/api?module=account&action=tokentx` +
    `&contractaddress=0xdAC17F958D2ee523a2206206994597C13D831ec7` +
    `&address=${address}&page=1&offset=20&sort=desc`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const data = await r.json();
  if (data.status !== "1" || !Array.isArray(data.result)) return [];
  const out: Inbound[] = [];
  for (const t of data.result) {
    if ((t.to ?? "").toLowerCase() !== address.toLowerCase()) continue;
    const decimals = Number(t.tokenDecimal || 6);
    const raw = Number(t.value || 0);
    if (!raw) continue;
    out.push({
      tx_hash: t.hash,
      amount: raw / Math.pow(10, decimals),
      confirmations: Number(t.confirmations || 0),
      block_time: t.timeStamp
        ? new Date(Number(t.timeStamp) * 1000).toISOString()
        : null,
      raw: { from: t.from },
    });
  }
  return out;
}

async function scanOne(addr: AddrRow): Promise<Inbound[]> {
  try {
    const cur = addr.currency.toUpperCase();
    const net = addr.network;
    if (cur === "BTC") return await fetchBtc(addr.address);
    if (cur === "USDT" && net === "TRC20") return await fetchTrc20(addr.address);
    if (cur === "USDT" && net === "ERC20") return await fetchErc20(addr.address);
    return [];
  } catch (e) {
    console.error("scan failed", addr.address, e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Pick BATCH addresses, oldest checked first
  const { data: addrs, error } = await supabase
    .from("client_crypto_addresses")
    .select("id, user_id, currency, network, address")
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(BATCH);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let detected = 0;
  let imported = 0;

  for (const a of (addrs ?? []) as AddrRow[]) {
    const inbounds = await scanOne(a);
    for (const tx of inbounds) {
      detected++;

      // Insert into inbound log (idempotent)
      const { data: logRow, error: logErr } = await supabase
        .from("crypto_inbound_tx")
        .upsert(
          {
            tx_hash: tx.tx_hash,
            network: a.network,
            currency: a.currency,
            address: a.address,
            amount: tx.amount,
            confirmations: tx.confirmations,
            user_id: a.user_id,
            block_time: tx.block_time,
            raw: tx.raw as any,
          },
          { onConflict: "network,tx_hash,address", ignoreDuplicates: false },
        )
        .select("id, deposit_id, status")
        .maybeSingle();

      if (logErr) {
        console.error("inbound log error", logErr.message);
        continue;
      }
      // Already imported earlier
      if (logRow?.deposit_id) continue;

      // Try to attach this on-chain TX to an EXISTING pending crypto deposit
      // request from the client (so we don't create a duplicate row).
      // Match on: same user, crypto method, pending, no tx_hash yet.
      // Prefer the request with the closest amount, then the oldest.
      const { data: candidates } = await supabase
        .from("deposits")
        .select("id, amount")
        .eq("user_id", a.user_id)
        .eq("method", "crypto")
        .eq("status", "pending")
        .is("tx_hash", null)
        .order("created_at", { ascending: true })
        .limit(20);

      let matchedId: string | null = null;
      if (candidates && candidates.length > 0) {
        const sorted = [...candidates].sort(
          (x: any, y: any) =>
            Math.abs(Number(x.amount) - tx.amount) -
            Math.abs(Number(y.amount) - tx.amount),
        );
        matchedId = sorted[0].id;
      }

      let dep: { id: string } | null = null;
      let depErr: any = null;

      if (matchedId) {
        // Attach on-chain details to the client's pending request — keep status pending.
        const { data: updated, error: updErr } = await supabase
          .from("deposits")
          .update({
            tx_hash: tx.tx_hash,
            network: a.network,
            wallet_address: a.address,
            currency: a.currency,
            amount: tx.amount, // trust on-chain amount
            admin_notes:
              `On-chain ${a.currency} (${a.network}) transfer of ${tx.amount} ` +
              `received at ${a.address}. Tx: ${tx.tx_hash}. ` +
              `Confirmations: ${tx.confirmations}. Linked to client request — ready to approve.`,
          })
          .eq("id", matchedId)
          .select("id")
          .maybeSingle();
        dep = (updated as any) ?? null;
        depErr = updErr;
      } else {
        // No matching request — create a new pending deposit from on-chain data.
        const { data: inserted, error: insErr } = await supabase
          .from("deposits")
          .insert({
            user_id: a.user_id,
            amount: tx.amount,
            currency: a.currency,
            method: "crypto",
            status: "pending",
            wallet_address: a.address,
            tx_hash: tx.tx_hash,
            network: a.network,
            admin_notes:
              `Auto-detected on-chain ${a.currency} (${a.network}) transfer of ` +
              `${tx.amount} to ${a.address}. Tx: ${tx.tx_hash}. ` +
              `Confirmations: ${tx.confirmations}. Awaiting agent approval.`,
          })
          .select("id")
          .maybeSingle();
        dep = (inserted as any) ?? null;
        depErr = insErr;
      }

      if (depErr) {
        // Likely duplicate (race). Mark log and continue.
        console.warn("deposit insert skipped", depErr.message);
        await supabase
          .from("crypto_inbound_tx")
          .update({ status: "imported" })
          .eq("id", logRow!.id);
        continue;
      }

      await supabase
        .from("crypto_inbound_tx")
        .update({ status: "imported", deposit_id: dep?.id ?? null })
        .eq("id", logRow!.id);

      imported++;

      // Notify staff about the incoming on-chain transaction
      try {
        const { data: client } = await supabase
          .from("profiles")
          .select("full_name, email, assigned_agent, ftd_agent")
          .eq("id", a.user_id)
          .maybeSingle();

        const label =
          (client?.full_name && client.full_name.trim()) ||
          client?.email ||
          "A client";

        const shortHash =
          tx.tx_hash.length > 16
            ? `${tx.tx_hash.slice(0, 8)}…${tx.tx_hash.slice(-6)}`
            : tx.tx_hash;

        const amountStr = `${tx.amount} ${a.currency}`;
        const title = `🪙 Incoming ${amountStr} (${a.network})`;
        const message =
          `${label} received ${amountStr} on ${a.network}. ` +
          `Amount: ${amountStr}. Tx: ${shortHash}. ` +
          `A pending deposit was created — please review and approve.`;

        // Recipients: assigned agent, ftd agent, all admins & managers
        const recipients = new Set<string>();
        if (client?.assigned_agent) recipients.add(client.assigned_agent);
        if (client?.ftd_agent) recipients.add(client.ftd_agent);

        const { data: staff } = await supabase
          .from("user_roles")
          .select("user_id, roles!inner(name)")
          .in("roles.name", ["Admin", "Manager"]);
        for (const s of (staff ?? []) as any[]) {
          if (s.user_id) recipients.add(s.user_id);
        }
        recipients.delete(a.user_id);

        if (recipients.size > 0) {
          const rows = Array.from(recipients).map((uid) => ({
            user_id: uid,
            title,
            message,
            type: "deposit",
            priority: 3,
          }));
          await supabase.from("notifications").insert(rows);
        }
      } catch (notifyErr) {
        console.error("notify staff failed", notifyErr);
      }
    }

    await supabase
      .from("client_crypto_addresses")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", a.id);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      scanned: addrs?.length ?? 0,
      detected,
      imported,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
