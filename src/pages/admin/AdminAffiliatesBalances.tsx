import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Pencil, Trash2, Wallet, Handshake, TrendingDown, TrendingUp, Archive, Search, ChevronRight, AlertTriangle, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

const usd = (n: number | null | undefined) =>
  n == null || isNaN(Number(n))
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(n));

// Today in Europe/Berlin as {y,m,d}
function berlinToday(): { y: number; m: number; d: number; weekday: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")), weekday: get("weekday") };
}
function isoDate(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toISOString().slice(0, 10);
}
// Monday-of-current-week date in Europe/Berlin, returned as YYYY-MM-DD
function startOfBerlinWeekISO(): string {
  const t = berlinToday();
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = map[t.weekday] ?? 0;
  const dt = new Date(Date.UTC(t.y, t.m - 1, t.d));
  dt.setUTCDate(dt.getUTCDate() - offset);
  return dt.toISOString().slice(0, 10);
}
function endOfBerlinWeekISO(): string {
  const start = startOfBerlinWeekISO();
  const [y, m, d] = start.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 6);
  return dt.toISOString().slice(0, 10);
}
function startOfBerlinMonthISO(): string {
  const t = berlinToday();
  return isoDate(t.y, t.m, 1);
}
function endOfBerlinMonthISO(): string {
  const t = berlinToday();
  const dt = new Date(Date.UTC(t.y, t.m, 0)); // day 0 of next month = last day
  return dt.toISOString().slice(0, 10);
}
function startOfBerlinYearISO(): string {
  const t = berlinToday();
  return isoDate(t.y, 1, 1);
}
function endOfBerlinYearISO(): string {
  const t = berlinToday();
  return isoDate(t.y, 12, 31);
}
function berlinTodayISO(): string {
  const t = berlinToday();
  return isoDate(t.y, t.m, t.d);
}
function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
function startOfMonthISO(y: number, m: number): string { return isoDate(y, m, 1); }
function endOfMonthISO(y: number, m: number): string {
  const dt = new Date(Date.UTC(y, m, 0));
  return dt.toISOString().slice(0, 10);
}
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type PeriodKind = "today" | "yesterday" | "last7" | "last30" | "week" | "month" | "specific_month" | "year" | "all" | "custom";


interface Affiliate { id: string; name: string; }
interface Deal {
  id: string;
  affiliate_id: string;
  funnel: string;
  country: string;
  cpa_usd: number;
  crg_pct: number;
  max_invalid_pct: number | null;
  status: "active" | "archived";
  notes: string | null;
  created_at: string;
}
interface Topup {
  id: string;
  affiliate_id: string;
  amount_usd: number;
  sent_at: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
}
interface BalanceRow {
  affiliate_id: string;
  affiliate_name: string;
  total_topups: number;
  billable_ftds: number;
  shaved_ftds: number;
  spent_usd: number;
  balance_usd: number;
  cpa_before_shave: number | null;
  cpa_after_shave: number | null;
}
interface WeekRow {
  week_start: string;
  funnel: string;
  country: string;
  cpa_usd: number;
  crg_pct: number;
  max_invalid_pct: number | null;
  leads: number;
  invalids: number;
  counted_invalids: number;
  effective_leads: number;
  ftds: number;
  guaranteed: number;
  extra_owed: number;
  week_charge: number;
}


export default function AdminAffiliatesBalances() {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [allTopups, setAllTopups] = useState<Topup[]>([]);
  const [topupSearch, setTopupSearch] = useState("");
  const [dealSearch, setDealSearch] = useState("");
  const [dealStatusFilter, setDealStatusFilter] = useState<"all" | "active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);



  // create-deal dialog (from header)
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [dealForm, setDealForm] = useState({
    affiliate_id: "", funnel: "", country: "", cpa_usd: "", crg_pct: "15", max_invalid_pct: "", notes: "",
  });

  // Funnels already sent by the affiliate selected in the deal dialog (from profiles table).
  const [affiliateFunnels, setAffiliateFunnels] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!dealDialogOpen || !dealForm.affiliate_id) { setAffiliateFunnels([]); return; }
    const aff = affiliates.find((a) => a.id === dealForm.affiliate_id);
    if (!aff) { setAffiliateFunnels([]); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("funnel")
        .ilike("affiliate", aff.name)
        .not("funnel", "is", null)
        .limit(2000);
      if (cancelled) return;
      const fromProfiles = (data || []).map((r: any) => (r.funnel || "").trim()).filter(Boolean);
      const fromDeals = allDeals
        .filter((d) => d.affiliate_id === dealForm.affiliate_id)
        .map((d) => (d.funnel || "").trim())
        .filter(Boolean);
      const uniq = Array.from(new Set([...fromDeals, ...fromProfiles])).sort((a, b) => a.localeCompare(b));
      setAffiliateFunnels(uniq);
    })();
    return () => { cancelled = true; };
  }, [dealDialogOpen, dealForm.affiliate_id, affiliates, allDeals]);


  // top-up dialog
  const [topupDialogOpen, setTopupDialogOpen] = useState(false);
  const [editingTopup, setEditingTopup] = useState<Topup | null>(null);
  const [topupForm, setTopupForm] = useState({
    affiliate_id: "", amount_usd: "", fees_pct: "", sent_at: new Date().toISOString().slice(0, 10), reference: "", notes: "",
  });

  // Raw weekly rows keyed by affiliate_id, fetched once from RPC.
  const [weeklyByAff, setWeeklyByAff] = useState<Record<string, WeekRow[]>>({});

  // Period filter
  const [periodKind, setPeriodKind] = useState<PeriodKind>("week");
  const [customFrom, setCustomFrom] = useState<string>(startOfBerlinMonthISO());
  const [customTo, setCustomTo] = useState<string>(endOfBerlinMonthISO());
  const _bt = berlinToday();
  const [specificMonth, setSpecificMonth] = useState<string>(`${_bt.y}-${String(_bt.m).padStart(2,"0")}`);

  const periodRange = useMemo(() => {
    const todayISO = berlinTodayISO();
    switch (periodKind) {
      case "today":     return { from: todayISO, to: todayISO, label: "Today" };
      case "yesterday": { const y = addDaysISO(todayISO, -1); return { from: y, to: y, label: "Yesterday" }; }
      case "last7":     return { from: addDaysISO(todayISO, -6),  to: todayISO, label: "Last 7 days" };
      case "last30":    return { from: addDaysISO(todayISO, -29), to: todayISO, label: "Last 30 days" };
      case "week":      return { from: startOfBerlinWeekISO(),  to: endOfBerlinWeekISO(),  label: "This week" };
      case "month":     return { from: startOfBerlinMonthISO(), to: endOfBerlinMonthISO(), label: "This month" };
      case "specific_month": {
        const [yy, mm] = specificMonth.split("-").map(Number);
        if (!yy || !mm) return { from: startOfBerlinMonthISO(), to: endOfBerlinMonthISO(), label: "Month" };
        return { from: startOfMonthISO(yy, mm), to: endOfMonthISO(yy, mm), label: `${MONTH_NAMES[mm-1]} ${yy}` };
      }
      case "year":      return { from: startOfBerlinYearISO(),  to: endOfBerlinYearISO(),  label: "This year" };
      case "all":       return { from: "0001-01-01",            to: "9999-12-31",          label: "All time" };
      case "custom":    return { from: customFrom,              to: customTo,              label: "Custom range" };
    }
  }, [periodKind, customFrom, customTo, specificMonth]);


  // Period-specific per-deal stats from RPC (accurate for any date range)
  type PeriodStat = {
    leads: number; invalids: number; effective: number;
    ftds: number; guaranteed: number; extra_owed: number; charge: number;
  };
  const [periodStatsByKey, setPeriodStatsByKey] = useState<Record<string, PeriodStat>>({});
  const [periodLoading, setPeriodLoading] = useState(false);
  const [includeShaved, setIncludeShaved] = useState(false);

  // All-time per-deal totals derived from the weekly RPC (stable, fetched once)
  const allTimeStats = useMemo(() => {
    const stats: Record<string, { leads: number; invalids: number; effective: number; ftds: number; spent: number; }> = {};
    for (const [id, rows] of Object.entries(weeklyByAff)) {
      for (const w of rows) {
        const key = `${id}|${(w.funnel ?? "").toLowerCase()}|${(w.country ?? "").toLowerCase()}`;
        if (!stats[key]) stats[key] = { leads: 0, invalids: 0, effective: 0, ftds: 0, spent: 0 };
        stats[key].leads     += Number(w.leads) || 0;
        stats[key].invalids  += Number(w.invalids) || 0;
        stats[key].effective += Number(w.effective_leads) || 0;
        stats[key].ftds      += Number(w.ftds) || 0;
        stats[key].spent     += Number(w.week_charge) || 0;
      }
    }
    return stats;
  }, [weeklyByAff]);

  // Combined per-deal stats consumed by the UI (period + all-time)
  const dealStats = useMemo(() => {
    const out: Record<string, {
      week_leads: number; week_invalids: number; week_effective: number;
      week_ftds: number; week_guaranteed: number;
      week_extra_owed: number; week_charge: number;
      all_leads: number; all_invalids: number; all_effective: number;
      all_ftds: number; all_spent: number;
    }> = {};
    const keys = new Set<string>([...Object.keys(periodStatsByKey), ...Object.keys(allTimeStats)]);
    for (const key of keys) {
      const p = periodStatsByKey[key];
      const a = allTimeStats[key];
      out[key] = {
        week_leads:     p?.leads     ?? 0,
        week_invalids:  p?.invalids  ?? 0,
        week_effective: p?.effective ?? 0,
        week_ftds:      p?.ftds      ?? 0,
        week_guaranteed:p?.guaranteed?? 0,
        week_extra_owed:p?.extra_owed?? 0,
        week_charge:    p?.charge    ?? 0,
        all_leads:      a?.leads     ?? 0,
        all_invalids:   a?.invalids  ?? 0,
        all_effective:  a?.effective ?? 0,
        all_ftds:       a?.ftds      ?? 0,
        all_spent:      a?.spent     ?? 0,
      };
    }
    return out;
  }, [periodStatsByKey, allTimeStats]);

  // Lifetime balances shown in the UI. When "Include shaves" is on, recompute
  // spent / balance / FTDs from the shave-aware weekly RPC instead of the view
  // (the view always excludes shaved leads).
  const adjBalances = useMemo(() => {
    if (!includeShaved) return balances;
    const cpaByKey: Record<string, number> = {};
    for (const d of allDeals) {
      cpaByKey[`${d.affiliate_id}|${(d.funnel ?? "").toLowerCase()}|${(d.country ?? "").toLowerCase()}`] = Number(d.cpa_usd) || 0;
    }
    const perAff: Record<string, { ftds: number; spent: number }> = {};
    for (const [key, s] of Object.entries(allTimeStats)) {
      const affId = key.split("|")[0];
      if (!perAff[affId]) perAff[affId] = { ftds: 0, spent: 0 };
      perAff[affId].ftds += s.ftds || 0;
      perAff[affId].spent += (s.ftds || 0) * (cpaByKey[key] ?? 0);
    }
    return balances.map((b) => {
      const agg = perAff[b.affiliate_id];
      if (!agg) return b;
      return {
        ...b,
        billable_ftds: agg.ftds,
        spent_usd: agg.spent,
        balance_usd: b.total_topups - agg.spent,
        cpa_after_shave: agg.ftds > 0 ? b.total_topups / agg.ftds : null,
      };
    });
  }, [balances, allTimeStats, allDeals, includeShaved]);

  // Fetch precise period stats whenever the selected range changes
  useEffect(() => {
    const affIds = Array.from(new Set(allDeals.map((d) => d.affiliate_id)));
    if (affIds.length === 0) { setPeriodStatsByKey({}); return; }
    let cancelled = false;
    setPeriodLoading(true);
    Promise.all(affIds.map((id) =>
      (supabase as any).rpc("affiliate_period_stats", {
        _affiliate_id: id, _from: periodRange.from, _to: periodRange.to, _include_shaved: includeShaved,
      }).then((r: any) => ({ id, rows: (r.data ?? []) as any[] }))
    )).then((results) => {
      if (cancelled) return;
      const out: Record<string, PeriodStat> = {};
      for (const { id, rows } of results) {
        for (const r of rows) {
          const key = `${id}|${(r.funnel ?? "").toLowerCase()}|${(r.country ?? "").toLowerCase()}`;
          out[key] = {
            leads: Number(r.leads) || 0,
            invalids: Number(r.invalids) || 0,
            effective: Number(r.effective_leads) || 0,
            ftds: Number(r.ftds) || 0,
            guaranteed: Number(r.guaranteed) || 0,
            extra_owed: Number(r.extra_owed) || 0,
            charge: Number(r.period_charge) || 0,
          };
        }
      }
      setPeriodStatsByKey(out);
      setPeriodLoading(false);
    }).catch(() => { if (!cancelled) setPeriodLoading(false); });
    return () => { cancelled = true; };
  }, [allDeals, periodRange.from, periodRange.to, includeShaved]);

  // Refetch all-time weekly stats when the shaved toggle changes
  useEffect(() => {
    const affIds = Array.from(new Set(allDeals.map((d) => d.affiliate_id)));
    if (affIds.length === 0) return;
    let cancelled = false;
    Promise.all(affIds.map((id) =>
      (supabase as any)
        .rpc("affiliate_weekly_stats", { _affiliate_id: id, _include_shaved: includeShaved })
        .then((r: any) => ({ id, rows: (r.data ?? []) as WeekRow[] }))
    )).then((results) => {
      if (cancelled) return;
      const byAff: Record<string, WeekRow[]> = {};
      for (const { id, rows } of results) byAff[id] = rows;
      setWeeklyByAff(byAff);
    });
    return () => { cancelled = true; };
  }, [allDeals, includeShaved]);




  const load = async () => {
    const [{ data: b }, { data: a }, { data: d }, { data: tu }] = await Promise.all([
      (supabase as any).from("v_affiliate_balances").select("*"),
      supabase.from("affiliates").select("id,name").order("name"),
      (supabase as any).from("affiliate_deals").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("affiliate_topups").select("*").order("sent_at", { ascending: false }),
    ]);
    setBalances(((b as any[]) ?? []).map((r) => ({
      ...r,
      total_topups: Number(r.total_topups),
      spent_usd: Number(r.spent_usd),
      balance_usd: Number(r.balance_usd),
      cpa_before_shave: r.cpa_before_shave == null ? null : Number(r.cpa_before_shave),
      cpa_after_shave: r.cpa_after_shave == null ? null : Number(r.cpa_after_shave),
    })));
    setAffiliates((a as Affiliate[]) ?? []);
    setAllDeals(((d as any[]) ?? []).map((r) => ({ ...r, cpa_usd: Number(r.cpa_usd), crg_pct: Number(r.crg_pct), max_invalid_pct: r.max_invalid_pct == null ? null : Number(r.max_invalid_pct) })));
    setAllTopups(((tu as any[]) ?? []).map((r) => ({ ...r, amount_usd: Number(r.amount_usd) })));
    setLoading(false);

    // Fetch all weekly rows per affiliate once; period filtering happens client-side.
    const affIds = Array.from(new Set(((d as any[]) ?? []).map((r) => r.affiliate_id)));
    const results = await Promise.all(affIds.map((id) =>
      (supabase as any).rpc("affiliate_weekly_stats", { _affiliate_id: id }).then((r: any) => ({ id, rows: r.data ?? [] }))
    ));
    const byAff: Record<string, WeekRow[]> = {};
    for (const { id, rows } of results) byAff[id] = rows as WeekRow[];
    setWeeklyByAff(byAff);
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const t = adjBalances.reduce(
      (acc, r) => {
        acc.topups += r.total_topups;
        acc.spent += r.spent_usd;
        acc.balance += r.balance_usd;
        acc.ftds += r.billable_ftds;
        return acc;
      },
      { topups: 0, spent: 0, balance: 0, ftds: 0 }
    );
    return t;
  }, [adjBalances]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return adjBalances;
    return adjBalances.filter((b) => b.affiliate_name.toLowerCase().includes(q));
  }, [adjBalances, search]);

  const affiliateNameById = useMemo(() => {
    const m: Record<string, string> = {};
    affiliates.forEach((a) => { m[a.id] = a.name; });
    return m;
  }, [affiliates]);

  const filteredDeals = useMemo(() => {
    const q = dealSearch.trim().toLowerCase();
    return allDeals.filter((d) => {
      if (dealStatusFilter !== "all" && d.status !== dealStatusFilter) return false;
      if (!q) return true;
      const name = (affiliateNameById[d.affiliate_id] ?? "").toLowerCase();
      return (
        name.includes(q) ||
        d.funnel.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q)
      );
    });
  }, [allDeals, dealSearch, dealStatusFilter, affiliateNameById]);

  // Filter the global top-up history by free-text search across affiliate name, reference, notes
  const filteredTopups = useMemo(() => {
    const q = topupSearch.trim().toLowerCase();
    if (!q) return allTopups;
    return allTopups.filter((t) => {
      const name = (affiliateNameById[t.affiliate_id] ?? "").toLowerCase();
      return name.includes(q)
        || (t.reference ?? "").toLowerCase().includes(q)
        || (t.notes ?? "").toLowerCase().includes(q);
    });
  }, [allTopups, topupSearch, affiliateNameById]);

  const deleteTopupTop = async (id: string) => {
    if (!confirm("Delete this top-up?")) return;
    const { error } = await (supabase as any).from("affiliate_topups").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Top-up deleted");
    load();
  };


  const deleteDealTop = async (id: string) => {
    if (!confirm("Delete this deal?")) return;
    const { error } = await (supabase as any).from("affiliate_deals").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deal deleted");
    load();
  };
  const archiveDealTop = async (d: Deal) => {
    const next = d.status === "active" ? "archived" : "active";
    const { error } = await (supabase as any).from("affiliate_deals").update({ status: next }).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next === "archived" ? "Deal archived" : "Deal reactivated");
    load();
  };

  // ---- Deal CRUD ----
  const openCreateDeal = (affiliate_id?: string) => {
    setEditingDeal(null);
    setDealForm({
      affiliate_id: affiliate_id ?? "",
      funnel: "", country: "", cpa_usd: "", crg_pct: "15", max_invalid_pct: "", notes: "",
    });
    setDealDialogOpen(true);
  };
  const openEditDeal = (d: Deal) => {
    setEditingDeal(d);
    setDealForm({
      affiliate_id: d.affiliate_id,
      funnel: d.funnel,
      country: d.country,
      cpa_usd: String(d.cpa_usd),
      crg_pct: String(d.crg_pct),
      max_invalid_pct: d.max_invalid_pct == null ? "" : String(d.max_invalid_pct),
      notes: d.notes ?? "",
    });
    setDealDialogOpen(true);
  };
  const saveDeal = async () => {
    if (!dealForm.affiliate_id || !dealForm.funnel || !dealForm.country || !dealForm.cpa_usd) {
      toast.error("Affiliate, funnel, country and CPA are required");
      return;
    }
    const payload = {
      affiliate_id: dealForm.affiliate_id,
      funnel: dealForm.funnel.trim(),
      country: dealForm.country.trim(),
      cpa_usd: Number(dealForm.cpa_usd),
      crg_pct: Number(dealForm.crg_pct || 0),
      max_invalid_pct: dealForm.max_invalid_pct.trim() === "" ? null : Number(dealForm.max_invalid_pct),
      notes: dealForm.notes || null,
    };

    const { error } = editingDeal
      ? await (supabase as any).from("affiliate_deals").update(payload).eq("id", editingDeal.id)
      : await (supabase as any).from("affiliate_deals").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editingDeal ? "Deal updated" : "Deal created");
    setDealDialogOpen(false);
    load();
  };

  // ---- Topup CRUD ----
  const openCreateTopup = (affiliate_id?: string) => {
    setEditingTopup(null);
    setTopupForm({
      affiliate_id: affiliate_id ?? "",
      amount_usd: "",
      fees_pct: "",
      sent_at: new Date().toISOString().slice(0, 10),
      reference: "", notes: "",
    });
    setTopupDialogOpen(true);
  };
  const saveTopup = async () => {
    if (!topupForm.affiliate_id || !topupForm.amount_usd) {
      toast.error("Affiliate and amount are required");
      return;
    }
    const payload = {
      affiliate_id: topupForm.affiliate_id,
      amount_usd: Number(topupForm.amount_usd),
      fees_pct: topupForm.fees_pct === "" ? 0 : Number(topupForm.fees_pct),
      sent_at: topupForm.sent_at,
      reference: topupForm.reference || null,
      notes: topupForm.notes || null,
    };
    const { error } = editingTopup
      ? await (supabase as any).from("affiliate_topups").update(payload).eq("id", editingTopup.id)
      : await (supabase as any).from("affiliate_topups").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editingTopup ? "Top-up updated" : "Top-up added");
    setTopupDialogOpen(false);
    load();
  };

  // ---- Command-center insights (period-aware) ----
  const insights = useMemo(() => {
    let burning = 0;
    let attainmentSum = 0;
    let attainmentN = 0;
    let periodSpent = 0;
    let periodFtds = 0;
    let periodLeads = 0;
    for (const d of allDeals) {
      if (d.status !== "active") continue;
      const key = `${d.affiliate_id}|${(d.funnel ?? "").toLowerCase()}|${(d.country ?? "").toLowerCase()}`;
      const s = dealStats[key];
      if (!s) continue;
      periodSpent += s.week_charge || 0;
      periodFtds += s.week_ftds || 0;
      periodLeads += s.week_leads || 0;
      if (s.week_leads > 0 && s.week_ftds > s.week_guaranteed) burning += 1;
      if (s.week_guaranteed > 0) {
        attainmentSum += (s.week_ftds / s.week_guaranteed) * 100;
        attainmentN += 1;
      }
    }
    // Top-ups within the selected range (date string compare works for ISO YYYY-MM-DD)
    const periodTopups = allTopups.reduce((acc, t) => {
      const d = (t.sent_at ?? "").slice(0, 10);
      if (d >= periodRange.from && d <= periodRange.to) return acc + Number(t.amount_usd || 0);
      return acc;
    }, 0);
    const needsTopup = adjBalances.filter((b) => b.balance_usd < 0 || (b.balance_usd === 0 && (b.total_topups > 0 || b.spent_usd > 0))).length;
    const avgCrgAttainment = attainmentN > 0 ? attainmentSum / attainmentN : null;
    return { burning, needsTopup, avgCrgAttainment, periodSpent, periodFtds, periodLeads, periodTopups };
  }, [allDeals, dealStats, adjBalances, allTopups, periodRange.from, periodRange.to]);


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Affiliate Balances
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor health, manage liquidity, and optimize deal performance. Amounts in USD.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1">
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={periodKind} onValueChange={(v) => setPeriodKind(v as PeriodKind)}>
              <SelectTrigger className="h-8 w-[170px] border-0 bg-transparent shadow-none focus:ring-0" title="Time frame for stats">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Quick ranges</div>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7">Last 7 days</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground border-t mt-1">Calendar</div>
                <SelectItem value="week">This week (Mon–Sun)</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="year">This year</SelectItem>
                <SelectItem value="specific_month">Specific month…</SelectItem>
                <SelectItem value="custom">Custom range…</SelectItem>
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground border-t mt-1">Lifetime</div>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            {periodKind === "specific_month" && (
              <Input type="month" value={specificMonth} onChange={(e) => setSpecificMonth(e.target.value)} className="h-8 w-[150px]" />
            )}
            {periodKind === "custom" && (
              <>
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 w-[140px]" />
                <span className="text-xs text-muted-foreground">→</span>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 w-[140px]" />
              </>
            )}
            <Badge variant="outline" className="ml-1 font-normal">
              {periodLoading ? "…" : `${periodRange.from} → ${periodRange.to}`}
            </Badge>
          </div>
          <div
            className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5"
            title="Count shaved leads as FTDs in all stats below"
          >
            <Switch id="include-shaved" checked={includeShaved} onCheckedChange={setIncludeShaved} />
            <Label htmlFor="include-shaved" className="text-xs font-normal cursor-pointer">
              Include shaves
            </Label>
          </div>
          <Button variant="outline" onClick={() => openCreateDeal()}>
            <Plus className="h-4 w-4 mr-1" /> New Deal
          </Button>
          <Button onClick={() => openCreateTopup()}>
            <Plus className="h-4 w-4 mr-1" /> Add Top-up
          </Button>
        </div>
      </div>

      {/* Command-center insight strip — period-aware */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <InsightCard tone="rose" icon={<AlertTriangle className="h-5 w-5" />} label="Burning Deals" value={String(insights.burning)} hint={`Over CRG · ${periodRange.label}`} />
        <InsightCard tone="amber" icon={<TrendingDown className="h-5 w-5" />} label="Need Top-up" value={String(insights.needsTopup)} hint="Active budget depleted" />
        <InsightCard tone="indigo" icon={<TrendingUp className="h-5 w-5" />} label="Avg CRG Attainment" value={insights.avgCrgAttainment == null ? "—" : `${insights.avgCrgAttainment.toFixed(0)}%`} hint={`FTDs vs guaranteed · ${periodRange.label}`} />
        <InsightCard tone="emerald" icon={<TrendingUp className="h-5 w-5" />} label="Top-ups" value={usd(insights.periodTopups)} hint={periodRange.label} />
        <InsightCard tone="slate" icon={<TrendingDown className="h-5 w-5" />} label="Spent" value={usd(insights.periodSpent)} hint={`${insights.periodFtds} FTDs · ${periodRange.label}`} />
        <InsightCard tone="primary" icon={<Wallet className="h-5 w-5" />} label="Net Balance" value={usd(totals.balance)} hint={`Lifetime · ${totals.ftds} FTDs`} />
      </div>


      <Tabs defaultValue="deals" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="topups">Top-up history</TabsTrigger>
        </TabsList>

        <TabsContent value="deals" className="mt-4 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap py-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Handshake className="h-5 w-5 text-primary" /> Deals ({filteredDeals.length})
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    Sorted: critical → at-risk → healthy
                  </span>
                </CardTitle>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <Select value={dealStatusFilter} onValueChange={(v) => setDealStatusFilter(v as any)}>
                  <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search affiliate, funnel, country…"
                    className="pl-8 w-[260px] h-9"
                    value={dealSearch}
                    onChange={(e) => setDealSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-10 text-center text-muted-foreground">Loading…</div>
              ) : filteredDeals.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  No deals match. Click <span className="font-medium">New Deal</span> to create one.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-muted/40 border-y">
                      <tr className="text-left">
                        <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Deal & Affiliate</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Terms</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{periodRange.label} · CRG</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...filteredDeals]
                        .map((d) => {
                          const key = `${d.affiliate_id}|${(d.funnel ?? "").toLowerCase()}|${(d.country ?? "").toLowerCase()}`;
                          const s = dealStats[key] ?? { week_leads: 0, week_invalids: 0, week_effective: 0, week_ftds: 0, week_guaranteed: 0, week_extra_owed: 0, week_charge: 0, all_leads: 0, all_invalids: 0, all_effective: 0, all_ftds: 0, all_spent: 0 };
                          const bal = adjBalances.find((b) => b.affiliate_id === d.affiliate_id);
                          const balance = bal?.balance_usd ?? 0;
                          const overCrg = s.week_leads > 0 && s.week_ftds > s.week_guaranteed;
                          const lowBal = balance < 0 || (balance === 0 && ((bal?.total_topups ?? 0) > 0 || (bal?.spent_usd ?? 0) > 0));
                          const sortKey = overCrg ? 0 : lowBal ? 1 : balance < d.cpa_usd ? 2 : 3;
                          return { d, s, bal, balance, overCrg, lowBal, sortKey };
                        })
                        .sort((a, b) => a.sortKey - b.sortKey || b.balance - a.balance)
                        .map(({ d, s, bal, balance, overCrg, lowBal }) => {
                          const affName = affiliateNameById[d.affiliate_id] ?? "—";
                          const totalTopups = bal?.total_topups ?? 0;
                          const burnPct = totalTopups > 0 ? Math.min(100, ((bal?.spent_usd ?? 0) / totalTopups) * 100) : 0;
                          const crgAttainment = s.week_guaranteed > 0 ? (s.week_ftds / s.week_guaranteed) * 100 : null;
                          const status: "critical" | "warn" | "ok" | "neutral" =
                            overCrg ? "critical" : lowBal ? "warn" : balance < d.cpa_usd ? "warn" : balance > 0 ? "ok" : "neutral";
                          const rowTint =
                            status === "critical" ? "hover:bg-rose-50/40 dark:hover:bg-rose-500/5" :
                            status === "warn"     ? "hover:bg-amber-50/40 dark:hover:bg-amber-500/5" :
                            "hover:bg-muted/40";
                          const railColor =
                            status === "critical" ? "bg-rose-500" :
                            status === "warn"     ? "bg-amber-500" :
                            status === "ok"       ? "bg-emerald-500" : "bg-muted-foreground/30";
                          const balColor =
                            balance < 0 ? "text-rose-600 dark:text-rose-400" :
                            balance === 0 ? "text-amber-600 dark:text-amber-400" :
                            "text-emerald-600 dark:text-emerald-400";
                          return (
                            <tr key={d.id} className={`group transition-colors ${rowTint} ${d.status === "archived" ? "opacity-60" : ""}`}>
                              {/* Deal & Affiliate */}
                              <td className="px-4 py-3 relative">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${railColor}`} />
                                <button
                                  className="font-semibold text-foreground hover:underline text-left"
                                  onClick={() => setDrawerId(d.affiliate_id)}
                                >
                                  {affName}
                                </button>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  <span className="font-medium">{d.funnel}</span>
                                  <span className="mx-1">·</span>
                                  <span className="uppercase">{d.country}</span>
                                  {d.status === "archived" && <Badge variant="secondary" className="ml-2 text-[9px] h-4 px-1.5">archived</Badge>}
                                </div>
                              </td>

                              {/* Terms */}
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-0.5 text-xs">
                                  <span className="tabular-nums"><span className="text-muted-foreground">CPA</span> <span className="font-semibold text-foreground">{usd(d.cpa_usd)}</span></span>
                                  <span className="tabular-nums"><span className="text-muted-foreground">CRG</span> <span className="font-semibold text-foreground">{d.crg_pct}%</span></span>
                                  <span className="tabular-nums text-muted-foreground">Max invalid: {d.max_invalid_pct == null ? "∞" : `${d.max_invalid_pct}%`}</span>
                                </div>
                              </td>



                              {/* CRG period */}
                              <td className="px-4 py-3 min-w-[180px]">
                                <div className="space-y-1">
                                  <div className="flex items-baseline gap-1.5 text-xs tabular-nums">
                                    <span className="text-base font-bold text-foreground">{s.week_ftds}</span>
                                    <span className="text-muted-foreground">/ {s.week_guaranteed.toFixed(1)} FTDs</span>
                                  </div>
                                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                                    <div className={
                                      overCrg ? "bg-rose-500 h-full" :
                                      crgAttainment != null && crgAttainment >= 90 ? "bg-emerald-500 h-full" :
                                      "bg-amber-500 h-full"
                                    } style={{ width: `${Math.min(100, crgAttainment ?? 0)}%` }} />
                                  </div>
                                  <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                                    <span>{s.week_leads} leads · {s.week_invalids} inv</span>
                                    <span className={overCrg ? "font-bold text-rose-600 dark:text-rose-400" : ""}>
                                      {crgAttainment == null ? "—" : `${crgAttainment.toFixed(0)}%`}
                                    </span>
                                  </div>
                                  {s.week_charge > 0 && (
                                    <div className="text-[10px] text-muted-foreground tabular-nums">
                                      Charge: <span className="font-semibold text-foreground">{usd(s.week_charge)}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3">
                                {overCrg ? (
                                  <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 font-bold uppercase text-[10px]">Over Limit</Badge>
                                ) : lowBal ? (
                                  <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-bold uppercase text-[10px]">Top-up</Badge>
                                ) : balance < d.cpa_usd ? (
                                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/15 font-bold uppercase text-[10px]">Low</Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 font-bold uppercase text-[10px]">Optimal</Badge>
                                )}
                              </td>

                              {/* Action */}
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center gap-1 justify-end">
                                  {(lowBal || balance < d.cpa_usd) ? (
                                    <Button
                                      size="sm"
                                      className={overCrg || lowBal
                                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm h-8 text-xs font-bold uppercase"
                                        : "bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs font-bold uppercase"}
                                      onClick={() => openCreateTopup(d.affiliate_id)}
                                    >
                                      Top Up
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setDrawerId(d.affiliate_id)}>
                                      Manage
                                    </Button>
                                  )}
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDeal(d)} title="Edit deal">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => archiveDealTop(d)} title={d.status === "active" ? "Archive" : "Reactivate"}>
                                    <Archive className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteDealTop(d.id)} title="Delete">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="affiliates" className="mt-4 space-y-4">
      {/* Affiliates summary — secondary view */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Affiliates summary</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Totals per affiliate across all their deals. Click a row for full history.</p>
          </div>
          <Input
            placeholder="Search affiliate…"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left p-2">Affiliate</th>
                <th className="text-right p-2">Top-ups</th>
                <th className="text-right p-2">Spent</th>
                <th className="text-right p-2">Balance</th>
                <th className="text-right p-2">FTDs</th>
                <th className="text-right p-2">Shaved</th>
                <th className="text-right p-2">CPA before</th>
                <th className="text-right p-2">CPA after</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No affiliates yet</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.affiliate_id} className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                  onClick={() => setDrawerId(r.affiliate_id)}>
                  <td className="p-2 font-medium">{r.affiliate_name}</td>
                  <td className="p-2 text-right tabular-nums">{usd(r.total_topups)}</td>
                  <td className="p-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{usd(r.spent_usd)}</td>
                  <td className="p-2 text-right tabular-nums font-semibold">
                    <span className={r.balance_usd < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {usd(r.balance_usd)}
                    </span>
                  </td>
                  <td className="p-2 text-right tabular-nums">{r.billable_ftds}</td>
                  <td className="p-2 text-right tabular-nums text-muted-foreground">{r.shaved_ftds}</td>
                  <td className="p-2 text-right tabular-nums">{usd(r.cpa_before_shave)}</td>
                  <td className="p-2 text-right tabular-nums">{usd(r.cpa_after_shave)}</td>
                  <td className="p-2 text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="topups" className="mt-4 space-y-4">
      {/* Top-up history — global */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" /> Top-up history ({filteredTopups.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              All money sent to affiliates across all deals. Click an affiliate name to open their full history.
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search affiliate, reference, notes…"
                className="pl-8 w-[260px]"
                value={topupSearch}
                onChange={(e) => setTopupSearch(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={() => openCreateTopup()}>
              <Plus className="h-4 w-4 mr-1" /> Add Top-up
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Affiliate</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-left p-2">Reference</th>
                <th className="text-left p-2">Notes</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : filteredTopups.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No top-ups yet</td></tr>
              ) : filteredTopups.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-2 whitespace-nowrap">{new Date(t.sent_at).toLocaleDateString("en-GB")}</td>
                  <td className="p-2">
                    <button
                      className="font-medium hover:underline"
                      onClick={() => setDrawerId(t.affiliate_id)}
                    >
                      {affiliateNameById[t.affiliate_id] ?? "—"}
                    </button>
                  </td>
                  <td className={`p-2 text-right tabular-nums font-semibold ${t.amount_usd < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {usd(t.amount_usd)}
                  </td>
                  <td className="p-2 text-muted-foreground">{t.reference ?? "—"}</td>
                  <td className="p-2 text-muted-foreground truncate max-w-[280px]">{t.notes ?? ""}</td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => deleteTopupTop(t.id)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            {filteredTopups.length > 0 && (
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="p-2" colSpan={2}>Total ({filteredTopups.length})</td>
                  <td className="p-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {usd(filteredTopups.reduce((s, t) => s + t.amount_usd, 0))}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>


      {/* Drawer */}
      <AffiliateDrawer
        affiliateId={drawerId}
        affiliates={affiliates}
        onClose={() => setDrawerId(null)}
        onChanged={load}
        onAddDeal={(id) => { openCreateDeal(id); }}
        onEditDeal={openEditDeal}
        onAddTopup={(id) => { openCreateTopup(id); }}
      />

      {/* Deal dialog */}
      <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDeal ? "Edit Deal" : "New Deal"}</DialogTitle>
            <DialogDescription>
              Each deal is one affiliate + funnel + country combo with its CPA in USD and CRG guarantee %.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Affiliate</Label>
              <Select value={dealForm.affiliate_id} onValueChange={(v) => setDealForm({ ...dealForm, affiliate_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select affiliate…" /></SelectTrigger>
                <SelectContent>
                  {affiliates.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Funnel</Label>
                <Input
                  list="affiliate-funnels-datalist"
                  value={dealForm.funnel}
                  onChange={(e) => setDealForm({ ...dealForm, funnel: e.target.value })}
                  placeholder={affiliateFunnels.length ? "Pick or type a funnel…" : "Hormanu Capital"}
                />
                <datalist id="affiliate-funnels-datalist">
                  {affiliateFunnels.map((f) => <option key={f} value={f} />)}
                </datalist>
                {affiliateFunnels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] text-muted-foreground self-center mr-1">Already sent:</span>
                    {affiliateFunnels.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setDealForm((prev) => ({ ...prev, funnel: f }))}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                          dealForm.funnel === f
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted hover:bg-accent border-border"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Country</Label>
                <Input value={dealForm.country} onChange={(e) => setDealForm({ ...dealForm, country: e.target.value })} placeholder="AT" />
              </div>
              <div>
                <Label>CPA (USD)</Label>
                <Input type="number" step="0.01" value={dealForm.cpa_usd} onChange={(e) => setDealForm({ ...dealForm, cpa_usd: e.target.value })} placeholder="1750" />
              </div>
              <div>
                <Label>CRG %</Label>
                <Input type="number" step="0.01" value={dealForm.crg_pct} onChange={(e) => setDealForm({ ...dealForm, crg_pct: e.target.value })} placeholder="15" />
              </div>
            </div>
            <div>
              <Label>Max invalid % <span className="text-muted-foreground font-normal">(empty = no limit, all invalids excluded)</span></Label>
              <Input type="number" step="0.01" value={dealForm.max_invalid_pct} onChange={(e) => setDealForm({ ...dealForm, max_invalid_pct: e.target.value })} placeholder="e.g. 5  (caps invalids removed from lead count at 5% of leads)" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={dealForm.notes} onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })} rows={2} />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDealDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDeal}>{editingDeal ? "Save changes" : "Create deal"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top-up dialog */}
      <Dialog open={topupDialogOpen} onOpenChange={setTopupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTopup ? "Edit Top-up" : "Add Top-up"}</DialogTitle>
            <DialogDescription>Record money sent to an affiliate (in USD).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Affiliate</Label>
              <Select value={topupForm.affiliate_id} onValueChange={(v) => setTopupForm({ ...topupForm, affiliate_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select affiliate…" /></SelectTrigger>
                <SelectContent>
                  {affiliates.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (USD) <span className="text-muted-foreground font-normal">(fees included)</span></Label>
                <Input type="number" step="0.01" value={topupForm.amount_usd} onChange={(e) => setTopupForm({ ...topupForm, amount_usd: e.target.value })} placeholder="10000" />
                <p className="text-[11px] text-muted-foreground mt-1">Enter the total amount you sent — including any fees the affiliate charged.</p>
              </div>
              <div>
                <Label>Fees %</Label>
                <Input type="number" step="0.01" value={topupForm.fees_pct} onChange={(e) => setTopupForm({ ...topupForm, fees_pct: e.target.value })} placeholder="e.g. 2.5" />
                <p className="text-[11px] text-muted-foreground mt-1">Fee % the affiliate charged on this top-up (0 if none).</p>
              </div>
            </div>
            <div>
              <Label>Sent at</Label>
              <Input type="date" value={topupForm.sent_at} onChange={(e) => setTopupForm({ ...topupForm, sent_at: e.target.value })} />
            </div>
            <div>
              <Label>Reference</Label>
              <Input value={topupForm.reference} onChange={(e) => setTopupForm({ ...topupForm, reference: e.target.value })} placeholder="Wire ref / invoice #" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={topupForm.notes} onChange={(e) => setTopupForm({ ...topupForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopupDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTopup}>{editingTopup ? "Save changes" : "Add top-up"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type InsightTone = "rose" | "amber" | "indigo" | "emerald" | "slate" | "primary";
function InsightCard({ tone, icon, label, value, hint }: { tone: InsightTone; icon: React.ReactNode; label: string; value: string; hint?: string }) {
  const toneMap: Record<InsightTone, { border: string; bg: string; text: string }> = {
    rose:    { border: "border-rose-500/30",    bg: "bg-rose-500/10",    text: "text-rose-600 dark:text-rose-400" },
    amber:   { border: "border-amber-500/30",   bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400" },
    indigo:  { border: "border-indigo-500/30",  bg: "bg-indigo-500/10",  text: "text-indigo-600 dark:text-indigo-400" },
    emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
    slate:   { border: "border-border",         bg: "bg-muted",          text: "text-foreground" },
    primary: { border: "border-primary/40",     bg: "bg-primary/10",     text: "text-primary" },
  };
  const t = toneMap[tone];
  return (
    <div className={`rounded-xl border ${t.border} bg-card p-4 flex items-center gap-3 shadow-sm`}>
      <div className={`w-10 h-10 rounded-lg ${t.bg} ${t.text} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${t.text}`}>{label}</p>
        <p className="text-xl font-bold tabular-nums text-foreground truncate">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground truncate">{hint}</p>}
      </div>
    </div>
  );
}

function DealMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`p-3 ${accent ? "bg-card" : "bg-muted/20"}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
      <div className="text-lg font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function Mini({ label, value, tone, mono }: { label: string; value: string | number; tone?: "ok" | "warn" | "muted"; mono?: boolean }) {
  const toneClass =
    tone === "warn" ? "text-amber-600 dark:text-amber-400" :
    tone === "muted" ? "text-muted-foreground" : "";
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-semibold tabular-nums truncate ${mono ? "text-xs" : ""} ${toneClass}`}>{value}</div>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>{icon}
        </div>
        <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function AffiliateDrawer({
  affiliateId, affiliates, onClose, onChanged, onAddDeal, onEditDeal, onAddTopup,
}: {
  affiliateId: string | null;
  affiliates: Affiliate[];
  onClose: () => void;
  onChanged: () => void;
  onAddDeal: (id: string) => void;
  onEditDeal: (d: Deal) => void;
  onAddTopup: (id: string) => void;
}) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [loading, setLoading] = useState(false);

  const name = affiliates.find((a) => a.id === affiliateId)?.name ?? "Affiliate";

  const load = async () => {
    if (!affiliateId) return;
    setLoading(true);
    const [{ data: d }, { data: t }, { data: w }] = await Promise.all([
      (supabase as any).from("affiliate_deals").select("*").eq("affiliate_id", affiliateId).order("created_at", { ascending: false }),
      (supabase as any).from("affiliate_topups").select("*").eq("affiliate_id", affiliateId).order("sent_at", { ascending: false }),
      (supabase as any).rpc("affiliate_weekly_stats", { _affiliate_id: affiliateId }),
    ]);
    setDeals(((d as any[]) ?? []).map((r) => ({ ...r, cpa_usd: Number(r.cpa_usd), crg_pct: Number(r.crg_pct), max_invalid_pct: r.max_invalid_pct == null ? null : Number(r.max_invalid_pct) })));
    setTopups(((t as any[]) ?? []).map((r) => ({ ...r, amount_usd: Number(r.amount_usd) })));
    setWeeks(((w as any[]) ?? []).map((r) => ({
      ...r,
      cpa_usd: Number(r.cpa_usd), crg_pct: Number(r.crg_pct),
      max_invalid_pct: r.max_invalid_pct == null ? null : Number(r.max_invalid_pct),
      leads: Number(r.leads), invalids: Number(r.invalids ?? 0),
      counted_invalids: Number(r.counted_invalids ?? 0),
      effective_leads: Number(r.effective_leads ?? r.leads ?? 0),
      ftds: Number(r.ftds),
      guaranteed: Number(r.guaranteed), extra_owed: Number(r.extra_owed),
      week_charge: Number(r.week_charge),
    })));

    setLoading(false);
  };

  useEffect(() => { if (affiliateId) load(); /* eslint-disable-next-line */ }, [affiliateId]);

  const deleteDeal = async (id: string) => {
    if (!confirm("Delete this deal?")) return;
    const { error } = await (supabase as any).from("affiliate_deals").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deal deleted");
    load(); onChanged();
  };
  const archiveDeal = async (d: Deal) => {
    const next = d.status === "active" ? "archived" : "active";
    const { error } = await (supabase as any).from("affiliate_deals").update({ status: next }).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    load(); onChanged();
  };
  const deleteTopup = async (id: string) => {
    if (!confirm("Delete this top-up?")) return;
    const { error } = await (supabase as any).from("affiliate_topups").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Top-up deleted");
    load(); onChanged();
  };

  return (
    <Sheet open={!!affiliateId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{name}</SheetTitle>
        </SheetHeader>
        {!affiliateId ? null : (
          <Tabs defaultValue="deals" className="mt-4">
            <TabsList>
              <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
              <TabsTrigger value="topups">Top-ups ({topups.length})</TabsTrigger>
              <TabsTrigger value="weekly">Weekly breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="deals" className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => onAddDeal(affiliateId)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Deal
                </Button>
              </div>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-2">Funnel</th>
                      <th className="p-2">Country</th>
                      <th className="p-2 text-right">CPA</th>
                      <th className="p-2 text-right">CRG %</th>
                      <th className="p-2">Status</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
                    : deals.length === 0 ? <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No deals yet</td></tr>
                    : deals.map((d) => (
                      <tr key={d.id} className="border-t">
                        <td className="p-2">{d.funnel}</td>
                        <td className="p-2 uppercase">{d.country}</td>
                        <td className="p-2 text-right tabular-nums">{usd(d.cpa_usd)}</td>
                        <td className="p-2 text-right tabular-nums">{d.crg_pct}%</td>
                        <td className="p-2">
                          <Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge>
                        </td>
                        <td className="p-2 text-right whitespace-nowrap">
                          <Button size="icon" variant="ghost" onClick={() => onEditDeal(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => archiveDeal(d)} title={d.status === "active" ? "Archive" : "Reactivate"}>
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteDeal(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="topups" className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => onAddTopup(affiliateId)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Top-up
                </Button>
              </div>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-2">Date</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2">Reference</th>
                      <th className="p-2">Notes</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
                    : topups.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No top-ups yet</td></tr>
                    : topups.map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="p-2 whitespace-nowrap">{new Date(t.sent_at).toLocaleDateString("en-US")}</td>
                        <td className={`p-2 text-right tabular-nums ${t.amount_usd < 0 ? "text-rose-600" : "text-emerald-600"}`}>{usd(t.amount_usd)}</td>
                        <td className="p-2 text-muted-foreground">{t.reference ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{t.notes ?? ""}</td>
                        <td className="p-2 text-right">
                          <Button size="icon" variant="ghost" onClick={() => deleteTopup(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Weeks run Monday to Saturday (Europe/Berlin). "Extra owed" = CRG guarantee minus kept FTDs.
              </p>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-2">Week of</th>
                      <th className="p-2">Funnel</th>
                      <th className="p-2">Country</th>
                      <th className="p-2 text-right">Leads</th>
                      <th className="p-2 text-right">FTDs</th>
                      <th className="p-2 text-right">Guaranteed</th>
                      <th className="p-2 text-right">Extra owed</th>
                      <th className="p-2 text-right">Week charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
                    : weeks.length === 0 ? <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No activity yet</td></tr>
                    : weeks.map((w, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 whitespace-nowrap">{new Date(w.week_start).toLocaleDateString("en-US")}</td>
                        <td className="p-2">{w.funnel}</td>
                        <td className="p-2 uppercase">{w.country}</td>
                        <td className="p-2 text-right tabular-nums">{w.leads}</td>
                        <td className="p-2 text-right tabular-nums">{w.ftds}</td>
                        <td className="p-2 text-right tabular-nums">{w.guaranteed.toFixed(2)}</td>
                        <td className={`p-2 text-right tabular-nums ${w.extra_owed > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                          {w.extra_owed.toFixed(2)}
                        </td>
                        <td className="p-2 text-right tabular-nums">{usd(w.week_charge)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
