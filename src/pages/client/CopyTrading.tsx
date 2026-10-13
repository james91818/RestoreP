import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import elonMuskAvatar from "@/assets/copy-traders/elon-musk.jpg";
import rayDalioAvatar from "@/assets/copy-traders/ray-dalio.jpg";
import warrenBuffettAvatar from "@/assets/copy-traders/warren-buffett.jpg";
import georgeSorosAvatar from "@/assets/copy-traders/george-soros.jpg";
import cathieWoodAvatar from "@/assets/copy-traders/cathie-wood.jpg";
import michaelSaylorAvatar from "@/assets/copy-traders/michael-saylor.jpg";
import marcFaberAvatar from "@/assets/copy-traders/marc-faber.jpg";
import carstenMaschmeyerAvatar from "@/assets/copy-traders/carsten-maschmeyer.jpg";
import andreKostolanyAvatar from "@/assets/copy-traders/andre-kostolany.jpg";
import dirkMuellerAvatar from "@/assets/copy-traders/dirk-mueller.jpg";
import felixZulaufAvatar from "@/assets/copy-traders/felix-zulauf.jpg";
import florianHommAvatar from "@/assets/copy-traders/florian-homm.jpg";
import beateSanderAvatar from "@/assets/copy-traders/beate-sander.jpg";
import { playDepositSound, playWarningSound } from "@/lib/notificationSound";

import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Copy, TrendingUp, TrendingDown, Users, Award, Zap, Sparkles, Activity,
  UserPlus, Settings2, Pause, Play, X, History, ArrowUpRight, ArrowDownRight, Lock, Crown,
} from "lucide-react";
import { Link } from "react-router-dom";
import PlanLimitsCard from "@/components/PlanLimitsCard";

// Project tier hierarchy (higher index = higher rank)
const TIER_ORDER = [
  "Starter",
  "Select",
  "Prestige",
  "Elite",
  "Emerald Club",
  "Diamond Club",
  "Sovereign Circle",
] as const;
type Tier = typeof TIER_ORDER[number];

const TIER_RANK: Record<string, number> = Object.fromEntries(
  TIER_ORDER.map((t, i) => [t, i])
);
const TIER_ALIASES: Record<string, Tier> = {
  "Basic": "Starter",
  "Starter Plan": "Select",
  "Diversifikation": "Prestige",
  "Erweitert": "Elite",
  "Erweiterter Plan": "Elite",
  "Professional": "Emerald Club",
  "Legacy Wealth": "Diamond Club",
  "Legacy": "Diamond Club",
  "Legacy Wealth Strategie": "Diamond Club",
  "Family Office": "Sovereign Circle",
  "Millionaire": "Sovereign Circle",
  "Millionaire Club": "Sovereign Circle",
};
const normalizeTier = (v: string | null | undefined): Tier => {
  if (!v) return "Starter";
  if ((TIER_ORDER as readonly string[]).includes(v)) return v as Tier;
  return TIER_ALIASES[v] ?? "Starter";
};

// Win rate -> required tier
function requiredTierForWinRate(winRate: number): Tier {
  if (winRate >= 85) return "Sovereign Circle";
  if (winRate >= 80) return "Diamond Club";
  if (winRate >= 75) return "Emerald Club";
  if (winRate >= 70) return "Elite";
  if (winRate >= 66) return "Prestige";
  if (winRate >= 63) return "Select";
  return "Starter";
}

// Traders that are always open to every depositor regardless of tier
const ALWAYS_OPEN_TRADERS = new Set<string>(["Trader AI"]);

function canAccessTrader(userTier: string, winRate: number, traderName?: string): boolean {
  if (traderName && ALWAYS_OPEN_TRADERS.has(traderName)) return true;
  const required = requiredTierForWinRate(winRate);
  return (TIER_RANK[normalizeTier(userTier)] ?? 0) >= (TIER_RANK[required] ?? 0);
}

const fmtEur = (n: number, opts: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 }) =>
  n.toLocaleString("de-DE", opts);
const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Smooth count-up for hero numbers
function useAnimatedNumber(value: number, duration = 900) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef<number>();
  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();
    const step = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return display;
}

interface CopyTrader {
  id: string;
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  description: string | null;
  win_rate: number;
  total_pnl: number;
  total_trades: number;
  followers_count: number;
  is_admin_managed: boolean;
}

const getTraderInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "T";

const localTraderAvatars: Record<string, string> = {
  "Elon Musk": elonMuskAvatar,
  "Ray Dalio": rayDalioAvatar,
  "Warren Buffett": warrenBuffettAvatar,
  "George Soros": georgeSorosAvatar,
  "Cathie Wood": cathieWoodAvatar,
  "Michael Saylor": michaelSaylorAvatar,
  "Marc Faber": marcFaberAvatar,
  "Carsten Maschmeyer": carstenMaschmeyerAvatar,
  "André Kostolany": andreKostolanyAvatar,
  "Dirk Müller": dirkMuellerAvatar,
  "Felix Zulauf": felixZulaufAvatar,
  "Florian Homm": florianHommAvatar,
  "Beate Sander": beateSanderAvatar,
};

const TraderAvatar = ({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl: string | null;
  size: "sm" | "lg";
}) => {
  const sizeClass = size === "lg" ? "h-16 w-16 text-xl" : "h-12 w-12 text-base";
  const resolvedAvatarUrl = localTraderAvatars[name] ?? avatarUrl;
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [resolvedAvatarUrl, name]);

  if (!resolvedAvatarUrl || hasImageError) {
    return (
      <div className={`${sizeClass} rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold ring-2 ring-primary/30 shrink-0 overflow-hidden`}>
        {getTraderInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={resolvedAvatarUrl}
      alt={name}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasImageError(true)}
      className={`${sizeClass} rounded-full object-cover object-top ring-2 ring-primary/30 shrink-0 overflow-hidden bg-muted`}
    />
  );
};

interface Subscription {
  id: string;
  user_id: string;
  trader_id: string;
  mode: string;
  fixed_amount: number;
  invested_capital: number;
  is_active: boolean;
  created_at: string;
  copy_traders?: CopyTrader;
}

interface CopiedTrade {
  id: string;
  trade_id: string | null;
  status: string | null;
  created_at: string | null;
  trades?: {
    asset_id: string;
    direction: string;
    size: number;
    pnl: number | null;
    closed_at: string | null;
    leverage: number;
    assets?: { symbol: string; name: string } | null;
  } | null;
  copy_subscriptions?: {
    copy_traders?: { display_name: string } | null;
  } | null;
}

const CopyTrading = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [traders, setTraders] = useState<CopyTrader[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [copiedTrades, setCopiedTrades] = useState<CopiedTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribeOpen, setSubscribeOpen] = useState<CopyTrader | null>(null);
  const [subMode, setSubMode] = useState("auto");
  const [fixedAmount, setFixedAmount] = useState("100");
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [manageSub, setManageSub] = useState<Subscription | null>(null);
  const [accountType, setAccountType] = useState<string>("Starter");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if ((data as any)?.account_type) setAccountType((data as any).account_type); });
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [{ data: td }, { data: s }, { data: ct }] = await Promise.all([
      supabase.from("copy_traders").select("*").eq("is_visible", true).order("total_pnl", { ascending: false }),
      supabase.from("copy_subscriptions").select("*, copy_traders(*)").eq("user_id", user.id),
      supabase.from("copied_trades")
        .select("id, subscription_id, trade_id, status, created_at, trades!copied_trades_trade_id_fkey(asset_id, direction, size, pnl, closed_at, leverage, assets(symbol, name)), copy_subscriptions(copy_traders(display_name))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setTraders((td ?? []) as CopyTrader[]);
    setSubscriptions((s ?? []) as Subscription[]);
    setCopiedTrades((ct ?? []) as CopiedTrade[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: highlight + celebrate new copied trades
  const [recentTradeIds, setRecentTradeIds] = useState<Record<string, "win" | "loss">>({});
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("copied-trades-live-" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "copied_trades", filter: `user_id=eq.${user.id}` },
        async (payload: any) => {
          const ctRow = payload.new;
          const { data: full } = await supabase
            .from("copied_trades")
            .select("id, subscription_id, trade_id, status, created_at, trades!copied_trades_trade_id_fkey(asset_id, direction, size, pnl, closed_at, leverage, assets(symbol, name)), copy_subscriptions(copy_traders(display_name))")
            .eq("id", ctRow.id)
            .maybeSingle();
          if (!full) return;
          const pnl = Number((full as any).trades?.pnl ?? 0);
          const traderName = ((full as any).copy_subscriptions as any)?.copy_traders?.display_name ?? "—";
          const sym = ((full as any).trades?.assets as any)?.symbol ?? "";
          setCopiedTrades(prev => [full as any, ...prev].slice(0, 50));
          setRecentTradeIds(prev => ({ ...prev, [(full as any).id]: pnl >= 0 ? "win" : "loss" }));
          setTimeout(() => {
            setRecentTradeIds(prev => {
              const c = { ...prev }; delete c[(full as any).id]; return c;
            });
          }, 6000);
          if (pnl >= 0) {
            playDepositSound();
            toast.success(
              t(`🎉 ${traderName} hat einen Gewinn-Trade geschlossen`, `🎉 ${traderName} closed a winning trade`),
              { description: `${sym} · +€${fmtEur(pnl)}`, duration: 6000 }
            );
          } else {
            playWarningSound();
            toast(
              t(`${traderName} hat einen Trade geschlossen`, `${traderName} closed a trade`),
              { description: `${sym} · -€${fmtEur(Math.abs(pnl))}`, duration: 5000 }
            );
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, t]);


  const subscribedTraderIds = new Set(subscriptions.map(s => s.trader_id));

  const handleSubscribe = async () => {
    if (!user || !subscribeOpen) return;
    const amt = Number(fixedAmount) || 0;
    if (amt < 50) { toast.error(t("Mindestbetrag 50€", "Minimum amount €50")); return; }
    const { error } = await supabase.rpc("subscribe_copy_trader", {
      _trader_id: subscribeOpen.id,
      _amount: amt,
      _mode: subMode,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t(`Sie kopieren jetzt ${subscribeOpen.display_name}`, `Now copying ${subscribeOpen.display_name}`));
    setSubscribeOpen(null);
    fetchData();
  };

  const toggleSubscription = async (sub: Subscription) => {
    const { error } = await supabase
      .from("copy_subscriptions")
      .update({ is_active: !sub.is_active })
      .eq("id", sub.id)
      .select("id")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(sub.is_active ? t("Copy Trading pausiert", "Copy trading paused") : t("Copy Trading fortgesetzt", "Copy trading resumed"));
    fetchData();
  };

  const unsubscribe = async (sub: Subscription) => {
    const ok = window.confirm(
      t(
        `Investiertes Kapital von €${fmtEur(Number(sub.invested_capital))} wird auf Ihr Wallet zurückerstattet. Fortfahren?`,
        `Your invested capital of €${fmtEur(Number(sub.invested_capital))} will be refunded to your wallet. Continue?`
      )
    );
    if (!ok) return;
    const { error } = await supabase.rpc("unsubscribe_copy_trader", { _subscription_id: sub.id });
    if (error) { toast.error(error.message); return; }
    toast.success(t("Abbestellt — Kapital erstattet", "Unsubscribed — capital refunded"));
    fetchData();
  };

  const updateSubscription = async () => {
    if (!editSub) return;
    const amt = Number(fixedAmount) || 0;
    if (amt < 50) { toast.error(t("Mindestbetrag 50€", "Minimum amount €50")); return; }
    const { error } = await supabase.rpc("update_copy_subscription_capital", {
      _subscription_id: editSub.id,
      _new_capital: amt,
      _new_mode: subMode,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t("Einstellungen aktualisiert", "Settings updated"));
    setEditSub(null);
    fetchData();
  };

  const totalCopyPnl = copiedTrades.reduce((sum, ct) => sum + Number(ct.trades?.pnl ?? 0), 0);

  const pnlBySub = copiedTrades.reduce<Record<string, number>>((acc, ct: any) => {
    const subId = ct.subscription_id;
    if (!subId) return acc;
    acc[subId] = (acc[subId] ?? 0) + Number(ct.trades?.pnl ?? 0);
    return acc;
  }, {});

  const totalInvested = subscriptions.reduce((s, sub) => s + Number(sub.invested_capital ?? sub.fixed_amount ?? 0), 0);

  const animatedPnl = useAnimatedNumber(totalCopyPnl);
  const animatedInvested = useAnimatedNumber(totalInvested);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const activeSubscriptions = subscriptions.filter(s => s.is_active);
  const lastFiveActivity = copiedTrades.slice(0, 5);
  const isPositive = totalCopyPnl >= 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Plan limits & yield */}
      <PlanLimitsCard />

      {/* TIER INFO BANNER */}
      <Card className="relative overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)),transparent_60%)]" />
        <CardContent className="relative p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                {t("Ihr Kontotyp", "Your account tier")}: {accountType}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-display font-bold leading-tight">
              {t("Höhere Win-Raten benötigen einen höheren Kontotyp", "Higher win rates require a higher account tier")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "Starter: <63% • Select: 63%+ • Prestige: 66%+ • Elite: 70%+ • Emerald Club: 75%+ • Diamond Club: 80%+ • Sovereign Circle: 85%+",
                "Starter: <63% • Select: 63%+ • Prestige: 66%+ • Elite: 70%+ • Emerald Club: 75%+ • Diamond Club: 80%+ • Sovereign Circle: 85%+"
              )}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 border-primary/40 text-primary hover:bg-primary/10">
            <Link to="/account-types">
              {t("Konto upgraden", "Upgrade Account")}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* HERO */}
      <Card className={`relative overflow-hidden border-2 ${isPositive ? "border-success/30" : "border-destructive/30"} bg-gradient-to-br from-card via-card to-muted/40`}>
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)),transparent_60%)]" />
        <CardContent className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-success">
                {t("Live · Auto-Trading aktiv", "Live · Auto-Trading active")}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold leading-tight">
              {t("Copy Trading", "Copy Trading")}
            </h1>
            <p className="text-base text-muted-foreground mt-1">
              {t("Folgen Sie Top-Tradern. Ihre Trades werden automatisch für Sie geöffnet.", "Follow top traders. Their trades open automatically for you.")}
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("Mein Gesamt-Gewinn", "My Total Profit")}</span>
            <div className={`flex items-center gap-2 ${isPositive ? "text-success" : "text-destructive"}`}>
              {isPositive ? <ArrowUpRight className="h-8 w-8" /> : <ArrowDownRight className="h-8 w-8" />}
              <span className="text-4xl md:text-5xl font-display font-bold tabular-nums">
                {isPositive ? "+" : "-"}€{fmtEur(Math.abs(animatedPnl))}
              </span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("aus", "from")} €{fmtEur(animatedInvested)} {t("investiertem Kapital", "invested capital")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="hover:shadow-md transition-all hover:-translate-y-0.5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Copy className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{t("Aktive Kopien", "Active Copies")}</p>
              <p className="text-2xl md:text-3xl font-display font-bold tabular-nums">{activeSubscriptions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all hover:-translate-y-0.5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
              <Users className="h-7 w-7 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{t("Investiert", "Invested")}</p>
              <p className="text-xl md:text-2xl font-display font-bold tabular-nums truncate">€{fmtEur(totalInvested, { maximumFractionDigits: 0 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all hover:-translate-y-0.5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0">
              <Activity className="h-7 w-7 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{t("Trades", "Trades")}</p>
              <p className="text-2xl md:text-3xl font-display font-bold tabular-nums">{copiedTrades.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`hover:shadow-md transition-all hover:-translate-y-0.5 ${isPositive ? "ring-1 ring-success/30" : "ring-1 ring-destructive/30"}`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${isPositive ? "bg-success/10" : "bg-destructive/10"}`}>
              {isPositive ? <TrendingUp className="h-7 w-7 text-success" /> : <TrendingDown className="h-7 w-7 text-destructive" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{t("Gewinn / Verlust", "Profit / Loss")}</p>
              <p className={`text-xl md:text-2xl font-display font-bold tabular-nums truncate ${isPositive ? "text-success" : "text-destructive"}`}>
                {isPositive ? "+" : ""}€{fmtEur(totalCopyPnl)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LIVE ACTIVITY FEED */}
      {lastFiveActivity.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-warning" />
              {t("Letzte Live-Aktivität", "Latest Live Activity")}
              <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                {t("Live", "Live")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {lastFiveActivity.map((ct: any, i) => {
              const pnl = Number(ct.trades?.pnl ?? 0);
              const win = pnl >= 0;
              const sym = ct.trades?.assets?.symbol ?? "—";
              const traderName = ct.copy_subscriptions?.copy_traders?.display_name ?? "—";
              const isNew = !!recentTradeIds[ct.id];
              return (
                <div
                  key={ct.id}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border ${win ? "border-success/20" : "border-destructive/20"} bg-muted/30 animate-fade-in`}
                  style={{ animationDelay: isNew ? "0ms" : `${i * 40}ms` }}
                >
                  {isNew && (
                    <span className="absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-success text-success-foreground shadow-md">
                      {t("NEU", "NEW")}
                    </span>
                  )}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${win ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                    {win ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {traderName} · <span className="text-muted-foreground font-normal">{sym}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {win ? t("Gewinn-Trade geschlossen", "Winning trade closed") : t("Trade geschlossen", "Trade closed")}
                      {" · "}
                      {ct.created_at ? new Date(ct.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                  <div className={`text-right tabular-nums font-display font-bold text-lg ${win ? "text-success" : "text-destructive"}`}>
                    {win ? "+" : ""}€{fmtEur(pnl)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="leaderboard">
        <TabsList className="h-auto p-1">
          <TabsTrigger value="leaderboard" className="text-sm md:text-base px-4 py-2">{t("Top Trader", "Top Traders")}</TabsTrigger>
          <TabsTrigger value="my-copies" className="text-sm md:text-base px-4 py-2">{t("Meine Kopien", "My Copies")} ({subscriptions.length})</TabsTrigger>
          <TabsTrigger value="history" className="text-sm md:text-base px-4 py-2">{t("Verlauf", "History")} ({copiedTrades.length})</TabsTrigger>
       </TabsList>

        {/* LEADERBOARD */}
        <TabsContent value="leaderboard" className="mt-4">
          {traders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                 <p className="font-medium">{t("Noch keine Trader verfügbar", "No traders available yet")}</p>
                 <p className="text-sm mt-1">{t("Bald wieder vorbeischauen", "Check back soon")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {traders.map((trader, idx) => {
                const isSubscribed = subscribedTraderIds.has(trader.id);
                const tierAccessible = canAccessTrader(accountType, trader.win_rate, trader.display_name);
                const requiredTier = tierAccessible ? "Starter" as Tier : requiredTierForWinRate(trader.win_rate);
                const isLocked = !tierAccessible;
                return (
                  <Card
                    key={trader.id}
                    className={`relative overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-fade-in ${
                      isLocked ? "border-warning/30 hover:border-warning/50" : "hover:border-primary/40"
                    }`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {idx < 3 && (
                      <div className="absolute top-3 right-3">
                        <Badge className={`text-[10px] ${idx === 0 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" : idx === 1 ? "bg-gray-400/10 text-gray-500 border-gray-400/30" : "bg-orange-500/10 text-orange-600 border-orange-500/30"}`}>
                          <Award className="h-3 w-3 mr-0.5" /> #{idx + 1}
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <TraderAvatar name={trader.display_name} avatarUrl={trader.avatar_url} size="lg" />
                        <div>
                          <CardTitle className="text-base">{trader.display_name}</CardTitle>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {trader.is_admin_managed && (
                              <Badge variant="outline" className="text-[10px]">
                                <Zap className="h-2.5 w-2.5 mr-0.5" /> Pro Signal
                              </Badge>
                            )}
                             <span className="text-xs text-muted-foreground">{trader.followers_count} Follower</span>
                           </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {trader.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{trader.description}</p>
                      )}

                      <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-[11px] ${
                        isLocked
                          ? "bg-warning/5 border-warning/30 text-warning"
                          : "bg-success/5 border-success/30 text-success"
                      }`}>
                        <span className="flex items-center gap-1.5 font-medium">
                          {isLocked ? <Lock className="h-3 w-3" /> : <Crown className="h-3 w-3" />}
                          {t("Erforderlich", "Required")}: {requiredTier}
                        </span>
                        {isLocked && (
                          <span className="opacity-80">{t("Upgrade nötig", "Upgrade needed")}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-[10px] text-muted-foreground uppercase">{t("Win Rate", "Win Rate")}</p>
                          <p className={`text-sm font-bold ${trader.win_rate >= 50 ? "text-success" : "text-destructive"}`}>
                            {trader.win_rate.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-[10px] text-muted-foreground uppercase">P&L</p>
                          <p className={`text-sm font-bold ${trader.total_pnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {trader.total_pnl >= 0 ? "+" : ""}€{fmtEur(trader.total_pnl, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                           <p className="text-[10px] text-muted-foreground uppercase">Trades</p>
                          <p className="text-sm font-bold">{trader.total_trades}</p>
                        </div>
                      </div>
                      {isSubscribed ? (
                         <Button variant="outline" className="w-full" onClick={() => {
                           const sub = subscriptions.find(s => s.trader_id === trader.id);
                           if (sub) setManageSub(sub);
                         }}>
                           <Settings2 className="h-4 w-4 mr-2" /> {t("Verwalten", "Manage Copy")}
                         </Button>
                      ) : isLocked ? (
                        <Button asChild variant="outline" className="w-full border-warning/40 text-warning hover:bg-warning/10">
                          <Link to="/account-types">
                            <Lock className="h-4 w-4 mr-2" />
                            {t(`Auf ${requiredTier} upgraden`, `Upgrade to ${requiredTier}`)}
                          </Link>
                        </Button>
                      ) : (
                        <Button className="w-full" onClick={() => {
                          setSubscribeOpen(trader);
                          setSubMode("auto");
                          setFixedAmount("100");
                        }}>
                          <UserPlus className="h-4 w-4 mr-2" /> {t("Trader kopieren", "Copy Trader")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* MY COPIES */}
        <TabsContent value="my-copies" className="mt-4">
          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Copy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                 <p className="font-medium">{t("Noch keine aktiven Kopien", "No active copy subscriptions")}</p>
                 <p className="text-sm mt-1">{t("Durchsuchen Sie die Bestenliste und kopieren Sie Top-Trader", "Browse the leaderboard and copy top traders")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {subscriptions.map(sub => {
                const trader = sub.copy_traders;
                if (!trader) return null;
                const invested = Number(sub.invested_capital ?? sub.fixed_amount ?? 0);
                const subPnl = Number(pnlBySub[sub.id] ?? 0);
                const roi = invested > 0 ? (subPnl / invested) * 100 : 0;
                return (
                  <Card key={sub.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <TraderAvatar name={trader.display_name} avatarUrl={trader.avatar_url} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{trader.display_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                             <Badge variant={sub.is_active ? "default" : "secondary"} className="text-[10px]">
                               {sub.is_active ? t("Aktiv", "Active") : t("Pausiert", "Paused")}
                             </Badge>
                             <span className="text-xs text-muted-foreground">
                               {sub.mode === "auto" ? t("Auto Copy", "Auto Copy") : t("Manuelle Bestätigung", "Manual Confirm")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-[10px] uppercase text-muted-foreground">{t("Investiert", "Invested")}</p>
                          <p className="text-sm font-bold tabular-nums">€{fmtEur(invested)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-[10px] uppercase text-muted-foreground">{t("Mein Gewinn", "My Profit")}</p>
                          <p className={`text-sm font-bold tabular-nums ${subPnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {subPnl >= 0 ? "+" : ""}€{fmtEur(subPnl)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-[10px] uppercase text-muted-foreground">ROI</p>
                          <p className={`text-sm font-bold tabular-nums ${roi >= 0 ? "text-success" : "text-destructive"}`}>
                            {roi >= 0 ? "+" : ""}{roi.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setEditSub(sub);
                            setSubMode(sub.mode);
                            setFixedAmount(String(sub.invested_capital ?? sub.fixed_amount));
                          }}>
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleSubscription(sub)}>
                            {sub.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => unsubscribe(sub)}>
                            <X className="h-4 w-4" />
                          </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TRADE HISTORY */}
        <TabsContent value="history" className="mt-4">
          {copiedTrades.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t("Noch keine kopierten Trades", "No copied trades yet")}</p>
                <p className="text-sm mt-1">{t("Trades erscheinen hier, sobald Ihre Trader handeln", "Trades will appear here when your copied traders trade")}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Trader</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Asset</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{t("Richtung", "Direction")}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{t("Betrag", "Amount")}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{t("Hebel", "Leverage")}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">P&L</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{t("Datum", "Date")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {copiedTrades.map(ct => {
                        const trade = ct.trades;
                        const traderName = (ct.copy_subscriptions as any)?.copy_traders?.display_name ?? "—";
                        const pnl = Number(trade?.pnl ?? 0);
                        return (
                          <tr key={ct.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3 font-medium text-xs">{traderName}</td>
                            <td className="p-3 text-xs">{(trade?.assets as any)?.symbol ?? "—"}</td>
                            <td className="p-3">
                              <Badge variant={trade?.direction === "buy" ? "default" : "destructive"} className="text-xs capitalize">
                                {trade?.direction ?? "—"}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs tabular-nums">€{fmtEur(Number(trade?.size ?? 0), { maximumFractionDigits: 0 })}</td>
                            <td className="p-3 text-xs">{trade?.leverage ?? 1}×</td>
                            <td className={`p-3 font-semibold text-xs tabular-nums ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                              {pnl >= 0 ? "+" : ""}€{fmtEur(pnl)}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {trade?.closed_at ? fmtDate(trade.closed_at) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Subscribe Dialog */}
      <Dialog open={!!subscribeOpen} onOpenChange={() => setSubscribeOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Kopieren", "Copy")} {subscribeOpen?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("Konfigurieren Sie, wie Sie die Positionen dieses Traders kopieren möchten.", "Configure how you want to copy this trader's positions.")}
             </p>
             <div className="space-y-2">
                <Label>{t("Kopier-Modus", "Copy Mode")}</Label>
                <Select value={subMode} onValueChange={setSubMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t("Auto Copy (Trades werden automatisch ausgeführt)", "Auto Copy (trades executed automatically)")}</SelectItem>
                    <SelectItem value="manual">{t("Manuelle Bestätigung (jeden Trade genehmigen)", "Manual Confirmation (approve each trade)")}</SelectItem>
                  </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
                <Label>{t("Investiertes Kapital (€)", "Invested Capital (€)")}</Label>
                <Input type="number" min={50} value={fixedAmount} onChange={e => setFixedAmount(e.target.value)} placeholder="100" />
                <p className="text-xs text-muted-foreground">{t("Dieser Betrag wird von Ihrem EUR-Wallet abgebucht und vom Trader verwaltet. Minimum 50€. Bei Abbestellung wird das Kapital erstattet.", "This amount will be debited from your EUR wallet and managed by the trader. Minimum €50. When you unsubscribe, the capital is refunded.")}</p>
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setSubscribeOpen(null)}>{t("Abbrechen", "Cancel")}</Button>
             <Button onClick={handleSubscribe}>{t("Kopieren starten", "Start Copying")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editSub} onOpenChange={() => setEditSub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Kopier-Einstellungen", "Edit Copy Settings")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
               <Label>{t("Kopier-Modus", "Copy Mode")}</Label>
               <Select value={subMode} onValueChange={setSubMode}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                    <SelectItem value="auto">{t("Auto Copy", "Auto Copy")}</SelectItem>
                    <SelectItem value="manual">{t("Manuelle Bestätigung", "Manual Confirmation")}</SelectItem>
                 </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <Label>{t("Investiertes Kapital (€)", "Invested Capital (€)")}</Label>
               <Input type="number" min={50} value={fixedAmount} onChange={e => setFixedAmount(e.target.value)} placeholder="100" />
               <p className="text-xs text-muted-foreground">{t("Erhöhung bucht mehr vom Wallet ab; Verringerung erstattet die Differenz.", "Increasing debits more from your wallet; decreasing refunds the difference.")}</p>
            </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setEditSub(null)}>{t("Abbrechen", "Cancel")}</Button>
             <Button onClick={updateSubscription}>{t("Speichern", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Copy Dialog */}
      <Dialog open={!!manageSub} onOpenChange={(o) => !o && setManageSub(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {manageSub && (() => {
            const trader = manageSub.copy_traders;
            const invested = Number(manageSub.invested_capital ?? manageSub.fixed_amount ?? 0);
            const subPnl = Number(pnlBySub[manageSub.id] ?? 0);
            const roi = invested > 0 ? (subPnl / invested) * 100 : 0;
            const subTrades = copiedTrades.filter((ct: any) => ct.subscription_id === manageSub.id);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {trader && <TraderAvatar name={trader.display_name} avatarUrl={trader.avatar_url} size="sm" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-display">{trader?.display_name ?? t("Kopier-Abonnement", "Copy Subscription")}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={manageSub.is_active ? "default" : "secondary"} className="text-[10px]">
                          {manageSub.is_active ? t("Aktiv", "Active") : t("Pausiert", "Paused")}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-normal">
                          {manageSub.mode === "auto" ? t("Auto Copy", "Auto Copy") : t("Manuelle Bestätigung", "Manual Confirm")}
                        </span>
                      </div>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">{t("Investiert", "Invested")}</p>
                    <p className="text-base font-bold tabular-nums">€{fmtEur(invested)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">{t("Mein Gewinn", "My Profit")}</p>
                    <p className={`text-base font-bold tabular-nums ${subPnl >= 0 ? "text-success" : "text-destructive"}`}>
                      {subPnl >= 0 ? "+" : ""}€{fmtEur(subPnl)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">ROI</p>
                    <p className={`text-base font-bold tabular-nums ${roi >= 0 ? "text-success" : "text-destructive"}`}>
                      {roi >= 0 ? "+" : ""}{roi.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    {t("Für Sie geöffnete Trades", "Trades opened for you")} ({subTrades.length})
                  </h4>
                  {subTrades.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      {t("Noch keine Trades — neue Trades erscheinen hier automatisch.", "No trades yet — new trades will appear here automatically.")}
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="text-left p-2 font-medium text-muted-foreground">Asset</th>
                              <th className="text-left p-2 font-medium text-muted-foreground">{t("Richtung", "Direction")}</th>
                              <th className="text-left p-2 font-medium text-muted-foreground">{t("Betrag", "Amount")}</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">P&L</th>
                              <th className="text-right p-2 font-medium text-muted-foreground">{t("Datum", "Date")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subTrades.map((ct: any) => {
                              const trade = ct.trades;
                              const pnl = Number(trade?.pnl ?? 0);
                              return (
                                <tr key={ct.id} className="border-b last:border-0 hover:bg-muted/30">
                                  <td className="p-2 font-medium">{trade?.assets?.symbol ?? "—"}</td>
                                  <td className="p-2">
                                    <Badge variant={trade?.direction === "buy" ? "default" : "destructive"} className="text-[10px] capitalize">
                                      {trade?.direction ?? "—"}
                                    </Badge>
                                  </td>
                                  <td className="p-2 tabular-nums">€{fmtEur(Number(trade?.size ?? 0), { maximumFractionDigits: 0 })}</td>
                                  <td className={`p-2 text-right font-semibold tabular-nums ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                                    {pnl >= 0 ? "+" : ""}€{fmtEur(pnl)}
                                  </td>
                                  <td className="p-2 text-right text-muted-foreground">
                                    {trade?.closed_at ? fmtDate(trade.closed_at) : ct.created_at ? fmtDate(ct.created_at) : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setEditSub(manageSub);
                      setSubMode(manageSub.mode);
                      setFixedAmount(String(manageSub.invested_capital ?? manageSub.fixed_amount));
                      setManageSub(null);
                    }}
                  >
                    <Settings2 className="h-4 w-4 mr-2" /> {t("Einstellungen bearbeiten", "Edit Settings")}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={async () => { await toggleSubscription(manageSub); setManageSub(null); }}
                  >
                    {manageSub.is_active ? <><Pause className="h-4 w-4 mr-2" /> {t("Pausieren", "Pause")}</> : <><Play className="h-4 w-4 mr-2" /> {t("Fortsetzen", "Resume")}</>}
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={async () => { await unsubscribe(manageSub); setManageSub(null); }}
                  >
                    <X className="h-4 w-4 mr-2" /> {t("Kopieren beenden", "Stop Copying")}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CopyTrading;
