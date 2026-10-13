import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

export const FOLLOWUP_OVERDUE_HOURS = 48;
export const FOLLOWUP_SOON_HOURS = 36;

export interface FollowUpRow {
  customer_id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  display_id: number | null;
  is_lead: boolean | null;
  agent_id: string | null;
  agent_name: string | null;
  last_activity_at: string;
  has_comment: boolean;
  hours_since: number;
}

export type FollowUpLevel = "ok" | "soon" | "overdue";

export const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;
export const levelFor = (iso: string): FollowUpLevel => {
  const h = hoursSince(iso);
  return h >= FOLLOWUP_OVERDUE_HOURS ? "overdue" : h >= FOLLOWUP_SOON_HOURS ? "soon" : "ok";
};
/** Unique key for one customer's current overdue period (changes once a new comment resets the timer). */
export const periodKey = (r: FollowUpRow) => `${r.customer_id}:${r.last_activity_at}`;

export const formatSince = (iso: string) => {
  const h = hoursSince(iso);
  if (h < 48) return `${Math.floor(h)} h`;
  const d = Math.floor(h / 24);
  return `${d} d ${Math.floor(h % 24)} h`;
};

// ---------- shared store (one fetch per scope, shared by all components) ----------
type Scope = "mine" | "all";
interface State { rows: FollowUpRow[]; loaded: boolean; tick: number }
const stores: Record<Scope, State> = {
  mine: { rows: [], loaded: false, tick: 0 },
  all: { rows: [], loaded: false, tick: 0 },
};
const listeners: Record<Scope, Set<() => void>> = { mine: new Set(), all: new Set() };
const subscribers: Record<Scope, number> = { mine: 0, all: 0 };
const emit = (s: Scope) => listeners[s].forEach((l) => l());

async function load(scope: Scope) {
  const { data, error } = await (supabase as any).rpc("get_followup_status", { _scope: scope });
  if (error) return;
  stores[scope] = { rows: (data ?? []) as FollowUpRow[], loaded: true, tick: stores[scope].tick + 1 };
  emit(scope);
}

export const refreshFollowUps = () => {
  (Object.keys(subscribers) as Scope[]).forEach((s) => subscribers[s] > 0 && load(s));
};

let ticker: number | null = null;
let poller: number | null = null;
let channel: any = null;
function startGlobal() {
  if (ticker) return;
  // Re-render every minute so customers crossing 36h/48h flip without any request
  ticker = window.setInterval(() => (Object.keys(stores) as Scope[]).forEach((s) => {
    stores[s] = { ...stores[s], tick: stores[s].tick + 1 }; emit(s);
  }), 60_000);
  // Light background refresh to pick up reassignments / status changes
  poller = window.setInterval(refreshFollowUps, 5 * 60_000);
  window.addEventListener("focus", refreshFollowUps);
  window.addEventListener("followup:refresh", refreshFollowUps);
  try {
    channel = supabase.channel("followup-notes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notes" }, () => refreshFollowUps())
      .subscribe();
  } catch { /* realtime optional */ }
}
function stopGlobal() {
  if (subscribers.mine + subscribers.all > 0) return;
  if (ticker) clearInterval(ticker);
  if (poller) clearInterval(poller);
  ticker = poller = null;
  window.removeEventListener("focus", refreshFollowUps);
  window.removeEventListener("followup:refresh", refreshFollowUps);
  if (channel) supabase.removeChannel(channel);
  channel = null;
}

export function useFollowUps(scope: Scope = "mine", enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    subscribers[scope]++;
    startGlobal();
    load(scope);
    return () => { subscribers[scope]--; stopGlobal(); };
  }, [scope, enabled]);

  const state = useSyncExternalStore(
    (cb) => { listeners[scope].add(cb); return () => listeners[scope].delete(cb); },
    () => stores[scope],
  );
  const overdue = state.rows
    .filter((r) => levelFor(r.last_activity_at) === "overdue")
    .sort((a, b) => +new Date(a.last_activity_at) - +new Date(b.last_activity_at));
  return { rows: state.rows, overdue, loaded: state.loaded, refresh: () => load(scope) };
}

/** Notify all reminder views that a comment was just added. */
export const notifyCommentAdded = () => window.dispatchEvent(new Event("followup:refresh"));
