import { supabase } from "@/lib/supabase";

export interface CrgCheckRow {
  deal_id: string;
  affiliate_id: string;
  affiliate_name: string;
  funnel: string;
  country: string;
  cpa_usd: number;
  crg_pct: number;
  week_leads: number;
  week_ftds: number;
  guaranteed: number;
  would_exceed: boolean;
}

/**
 * Run the CRG check for a profile. Returns null if no active deal matches
 * (so no warning should be shown). When `would_exceed` is true, the caller
 * should show a "shave suggestion" warning before approving the FTD.
 */
export async function checkCrgForProfile(profileId: string): Promise<CrgCheckRow | null> {
  try {
    const { data, error } = await (supabase as any).rpc("affiliate_crg_check", {
      _profile_id: profileId,
    });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.deal_id) return null;
    return {
      ...row,
      cpa_usd: Number(row.cpa_usd),
      crg_pct: Number(row.crg_pct),
      guaranteed: Number(row.guaranteed),
    } as CrgCheckRow;
  } catch {
    return null;
  }
}
