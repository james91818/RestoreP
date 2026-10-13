import { useEffect, useMemo, useState } from "react";
import { fetchCryptoPricesEur } from "@/lib/fetchCryptoPrices";
import { useLanguage } from "@/hooks/useLanguage";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Plus, Minus,
  Landmark, LineChart as LineChartIcon, Eye, EyeOff, HandCoins, ChevronRight, CalendarPlus,
  ArrowLeftRight, BarChart3, Copy as CopyIcon, Calendar as CalendarIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import { useIsMobile } from "@/hooks/use-mobile";

import btcIcon from "@/assets/crypto/btc.png";
import ethIcon from "@/assets/crypto/eth.png";
import solIcon from "@/assets/crypto/sol.png";
import xrpIcon from "@/assets/crypto/xrp.png";
import bnbIcon from "@/assets/crypto/bnb.png";
import dogeIcon from "@/assets/crypto/doge.png";
import adaIcon from "@/assets/crypto/ada.png";
import dotIcon from "@/assets/crypto/dot.png";
import linkIcon from "@/assets/crypto/link.png";
import avaxIcon from "@/assets/crypto/avax.png";

const CURRENCY_ICONS: Record<string, { type: "img"; src: string } | { type: "emoji"; src: string }> = {
  EUR: { type: "emoji", src: "🇪🇺" },
  USD: { type: "emoji", src: "🇺🇸" },
  GBP: { type: "emoji", src: "🇬🇧" },
  CHF: { type: "emoji", src: "🇨🇭" },
  AUD: { type: "emoji", src: "🇦🇺" },
  CAD: { type: "emoji", src: "🇨🇦" },
  BTC: { type: "img", src: btcIcon },
  ETH: { type: "img", src: ethIcon },
  SOL: { type: "img", src: solIcon },
  XRP: { type: "img", src: xrpIcon },
  BNB: { type: "img", src: bnbIcon },
  DOGE: { type: "img", src: dogeIcon },
  ADA: { type: "img", src: adaIcon },
  DOT: { type: "img", src: dotIcon },
  LINK: { type: "img", src: linkIcon },
  AVAX: { type: "img", src: avaxIcon },
};
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import TradingViewMarketOverview from "@/components/tradingview/TradingViewMarketOverview";
import TierProgress from "@/components/TierProgress";
import AccountManagerCard from "@/components/client/AccountManagerCard";

import PlanLimitsCard from "@/components/PlanLimitsCard";
import TradingViewTopStories from "@/components/tradingview/TradingViewTopStories";
import TradingViewCalendar from "@/components/tradingview/TradingViewCalendar";

const ASSET_COLORS: Record<string, string> = {
  EUR: "#3b82f6", USD: "#22c55e", GBP: "#a855f7", CHF: "#ef4444",
  AUD: "#f59e0b", CAD: "#ec4899", BTC: "#f7931a", ETH: "#627eea",
  SOL: "#9945ff", XRP: "#00aae4", BNB: "#f3ba2f", DOGE: "#c2a633",
  ADA: "#0033ad", DOT: "#e6007a", LINK: "#2a5ada", AVAX: "#e84142",
};
const COLORS_FALLBACK = ["#3b82f6", "#22c55e", "#a855f7", "#ef4444", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#f97316", "#14b8a6"];
const FIAT_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD"];

type DisplayCurrency = "EUR" | "USD" | "AUD";
const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = { EUR: "€", USD: "$", AUD: "A$" };
const fmtEur = (v: number) =>
  `€${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtSigned = (v: number) => `${v >= 0 ? "+" : "-"}${fmtEur(Math.abs(v))}`;

type RangeKey = "1W" | "1M" | "3M" | "YTD" | "ALL";
const RANGES: { key: RangeKey; label: string }[] = [
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "YTD", label: "YTD" },
  { key: "ALL", label: "All" },
];

const ClientDashboard = () => {
  const { user } = useAuth();
  const { inTradesEur, stakingEur, openTradesPnlEur, copyTradingEur } = useBalance();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [wallets, setWallets] = useState<any[]>([]);
  const [openTrades, setOpenTrades] = useState(0);
  const [inTradesAmount, setInTradesAmount] = useState(0);
  const [openPnl, setOpenPnl] = useState(0);
  const [todayPnl, setTodayPnl] = useState(0);
  const [weekPnl, setWeekPnl] = useState(0);
  const [monthPnl, setMonthPnl] = useState(0);
  const [ytdPnl, setYtdPnl] = useState(0);
  const [allTimePnl, setAllTimePnl] = useState(0);
  const [allClosed, setAllClosed] = useState<{ closed_at: string; pnl: number }[]>([]);
  // copyTradingEur now sourced from useBalance for consistency with sidebar
  const [stakingRewardsEur, setStakingRewardsEur] = useState(0);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);
  const [watchlistAssets, setWatchlistAssets] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [cryptoPricesEur, setCryptoPricesEur] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [chartRange, setChartRange] = useState<RangeKey>("1M");
  const [hideBalance, setHideBalance] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("dashboard-hide-balance") === "1";
  });
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("EUR");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dashboard-display-currency") as DisplayCurrency | null;
      if (saved && ["EUR", "USD", "AUD"].includes(saved)) {
        setDisplayCurrency(saved);
      }
    } catch {}
  }, []);
  const [fxRates, setFxRates] = useState<Record<DisplayCurrency, number>>({ EUR: 1, USD: 1.08, AUD: 1.65 });

  const changeDisplayCurrency = (c: DisplayCurrency) => {
    setDisplayCurrency(c);
    try { localStorage.setItem("dashboard-display-currency", c); } catch {}
  };

  const toggleHideBalance = () => {
    setHideBalance((v) => {
      const next = !v;
      try { localStorage.setItem("dashboard-hide-balance", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  useEffect(() => {
    fetchCryptoPricesEur().then(setCryptoPricesEur).catch(() => {});
    // Fetch live FX rates (EUR base) — display-only, base currency stays EUR
    fetch("https://api.frankfurter.app/latest?from=EUR&to=USD,AUD")
      .then((r) => r.json())
      .then((j: any) => {
        if (j?.rates) {
          setFxRates({
            EUR: 1,
            USD: Number(j.rates.USD) || 1.08,
            AUD: Number(j.rates.AUD) || 1.65,
          });
        }
      })
      .catch(() => {});
  }, []);


  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const safetyTimer = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);

    const safe = <T,>(p: PromiseLike<{ data: T | null }>) =>
      Promise.resolve(p).then((r) => r, () => ({ data: null as T | null }));

    const fetchData = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const ytdStart = new Date(now.getFullYear(), 0, 1);

        const [
          { data: wals },
          { data: trades },
          { data: closedAll },
          { data: deps },
          { data: wds },
          { data: wl },
          { data: priceData },
          { data: profile },
          { data: copySubs },
          { data: stakings },
        ] = await Promise.all([
          safe(supabase.from("wallets").select("balance, currency").eq("user_id", user.id)),
          safe(supabase.from("trades").select("*, assets(symbol, name)").eq("user_id", user.id).order("opened_at", { ascending: false }).limit(20)),
          safe(supabase.from("trades").select("pnl, closed_at").eq("user_id", user.id).eq("status", "closed").order("closed_at", { ascending: true })),
          safe(supabase.from("deposits").select("id, amount, currency, method, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5)),
          safe(supabase.from("withdrawals").select("id, amount, currency, method, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5)),
          safe(supabase.from("watchlist").select("asset_id, assets(symbol, name, type, icon_url)").eq("user_id", user.id).limit(8)),
          safe(supabase.from("price_cache").select("symbol, price")),
          safe(supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()),
          safe(supabase.from("copy_subscriptions").select("invested_capital").eq("user_id", user.id).eq("is_active", true)),
          safe(supabase.from("stakings" as any).select("rewards_earned").eq("user_id", user.id)),
        ]) as any;

        if (cancelled) return;

        if ((profile as any)?.full_name) setProfileName((profile as any).full_name.split(" ")[0]);

        setWallets((wals as any[]) ?? []);

        if (trades) {
          const open = (trades as any[]).filter((t) => t.status === "open");
          setOpenTrades(open.length);
          setOpenPnl(open.reduce((s, t) => s + Number(t.pnl || 0), 0));
          setInTradesAmount(open.reduce((s, t) => s + Number(t.size || 0), 0));
          setRecentTrades((trades as any[]).slice(0, 5));
        }

        const closedRows = ((closedAll as any[]) ?? []).map((r) => ({
          closed_at: r.closed_at, pnl: Number(r.pnl || 0),
        }));
        setAllClosed(closedRows);
        const sumInRange = (from: Date) =>
          closedRows.filter((r) => r.closed_at && new Date(r.closed_at) >= from).reduce((s, r) => s + r.pnl, 0);
        setTodayPnl(sumInRange(todayStart));
        setWeekPnl(sumInRange(weekStart));
        setMonthPnl(sumInRange(monthStart));
        setYtdPnl(sumInRange(ytdStart));
        setAllTimePnl(closedRows.reduce((s, r) => s + r.pnl, 0));

        setRecentDeposits((deps as any[]) ?? []);
        setRecentWithdrawals((wds as any[]) ?? []);
        setWatchlistAssets((wl as any[]) ?? []);

        const priceMap: Record<string, number> = {};
        (priceData as any[])?.forEach((p) => { priceMap[p.symbol] = Number(p.price); });
        setPrices(priceMap);

        // copyTradingEur sourced from useBalance
        setStakingRewardsEur(((stakings as any[]) ?? []).reduce((s, r) => s + Number(r.rewards_earned || 0), 0));
      } catch (err) {
        console.error("[ClientDashboard] fetchData error:", err);
      } finally {
        if (!cancelled) setLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`dashboard-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, () => { if (!cancelled) fetchData(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` }, () => { if (!cancelled) fetchData(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals", filter: `user_id=eq.${user.id}` }, () => { if (!cancelled) fetchData(); })
      .subscribe();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const walletToEur = (w: any) => {
    const b = Number(w.balance || 0);
    if (FIAT_CURRENCIES.includes(w.currency)) return b;
    const r = cryptoPricesEur[w.currency];
    return r ? b * r : b;
  };

  const availableEur = wallets.reduce((s, w) => s + walletToEur(w), 0);
  const totalBalance = availableEur + inTradesEur + stakingEur + copyTradingEur + openTradesPnlEur;

  const portfolioData = wallets
    .filter((w) => Number(w.balance) > 0)
    .map((w) => ({ name: w.currency, value: walletToEur(w) }))
    .filter((w) => w.value > 0);

  // Chart data
  const chartData = useMemo(() => {
    if (allClosed.length === 0) return [];
    const now = new Date();
    let from: Date | null = null;
    switch (chartRange) {
      case "1W": from = new Date(now); from.setDate(now.getDate() - 7); break;
      case "1M": from = new Date(now); from.setMonth(now.getMonth() - 1); break;
      case "3M": from = new Date(now); from.setMonth(now.getMonth() - 3); break;
      case "YTD": from = new Date(now.getFullYear(), 0, 1); break;
      case "ALL": from = null; break;
    }
    const filtered = from ? allClosed.filter((r) => r.closed_at && new Date(r.closed_at) >= from!) : allClosed;
    if (filtered.length === 0) return [];
    const byDay = new Map<string, number>();
    filtered.forEach((r) => {
      const d = new Date(r.closed_at).toISOString().slice(0, 10);
      byDay.set(d, (byDay.get(d) || 0) + r.pnl);
    });
    const sorted = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let cum = 0;
    return sorted.map(([date, pnl]) => {
      cum += pnl;
      return { date, value: cum };
    });
  }, [allClosed, chartRange]);

  const chartTotal = chartData.length ? chartData[chartData.length - 1].value : 0;

  // Trading stats from all closed trades
  const tradeStats = useMemo(() => {
    const total = allClosed.length;
    const wins = allClosed.filter((r) => r.pnl > 0);
    const losses = allClosed.filter((r) => r.pnl < 0);
    const winRate = total > 0 ? (wins.length / total) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((s, r) => s + r.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, r) => s + r.pnl, 0) / losses.length : 0;
    const bestTrade = allClosed.reduce((m, r) => (r.pnl > m ? r.pnl : m), 0);
    const worstTrade = allClosed.reduce((m, r) => (r.pnl < m ? r.pnl : m), 0);
    return { total, wins: wins.length, losses: losses.length, winRate, avgWin, avgLoss, bestTrade, worstTrade };
  }, [allClosed]);

  const statusLabels: Record<string, string> = {
    approved: t("Genehmigt", "Approved"),
    pending: t("In Bearbeitung", "Pending"),
    rejected: t("Abgelehnt", "Rejected"),
    open: t("Offen", "Open"),
    closed: t("Geschlossen", "Closed"),
  };

  const statusColors: Record<string, string> = {
    approved: "text-success",
    pending: "text-yellow-600",
    rejected: "text-destructive",
    open: "text-primary",
    closed: "text-muted-foreground",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t("GUTEN MORGEN", "GOOD MORNING");
    if (h < 18) return t("GUTEN TAG", "GOOD AFTERNOON");
    return t("GUTEN ABEND", "GOOD EVENING");
  };

  const mask = (txt: string) => (hideBalance ? "••••••" : txt);
  const rate = fxRates[displayCurrency] ?? 1;
  const sym = CURRENCY_SYMBOLS[displayCurrency];
  const fmtMoney = (v: number) =>
    `${sym}${(v * rate).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtMoneySigned = (v: number) => `${v >= 0 ? "+" : "-"}${fmtMoney(Math.abs(v))}`;

  return (
    <div className="space-y-5 md:space-y-6 max-w-6xl mx-auto">
      {/* Header: greeting + Account Overview + currency toggle + visibility toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] sm:text-xs font-semibold tracking-[0.18em] text-primary/80">
            {greeting()}{profileName ? `, ${profileName.toUpperCase()}` : ""}
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold leading-tight mt-1">
            {t("Konto-Übersicht", "Account Overview")}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
            {(["EUR", "USD", "AUD"] as DisplayCurrency[]).map((c) => (
              <button
                key={c}
                onClick={() => changeDisplayCurrency(c)}
                className={`px-2.5 h-8 text-xs font-semibold rounded-[5px] transition-colors ${
                  displayCurrency === c
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={toggleHideBalance}
            aria-label={hideBalance ? "Show balances" : "Hide balances"}
            className="h-9 w-9 grid place-items-center rounded-md border border-border bg-card hover:bg-accent transition-colors"
          >
            {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>


      {/* Main Account Card — 5 columns + 4 actions */}
      <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border/60">
            {/* Total Balance */}
            <div className="col-span-2 p-5 sm:p-6 md:col-span-2">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                <Wallet className="h-3.5 w-3.5" /> {t("Gesamtsaldo", "Total Balance")}
              </div>
              <p className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tabular-nums break-all leading-tight">
                {mask(fmtMoney(totalBalance))} <span className="text-base font-normal text-muted-foreground">{displayCurrency}</span>
              </p>
              <p className={`mt-3 text-xs sm:text-sm tabular-nums ${todayPnl >= 0 ? "text-success" : "text-destructive"}`}>
                <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
                {hideBalance ? "••••" : fmtMoneySigned(todayPnl)} {t("Heute", "Today")}
              </p>
            </div>
            {/* Available */}
            <div className="p-5 sm:p-6">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                {t("Verfügbar", "Available")}
              </p>
              <p className="text-xl sm:text-2xl font-display font-bold tabular-nums">{mask(fmtMoney(availableEur))}</p>
            </div>
            {/* In Trades / Staking / Copy Trading */}
            <div className="p-5 sm:p-6 space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  {t("In Trades", "In Trades")}
                </p>
                <p className="text-lg sm:text-xl font-display font-bold tabular-nums">{mask(fmtMoney(inTradesEur))}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-0.5">
                  {t("Im Staking", "In Staking")}
                </p>
                <p className="text-sm font-semibold tabular-nums">{mask(fmtMoney(stakingEur))}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-0.5">
                  {t("Im Copy Trading", "In Copy Trading")}
                </p>
                <p className="text-sm font-semibold tabular-nums">{mask(fmtMoney(copyTradingEur))}</p>
              </div>
            </div>
            {/* Open P&L + Staking rewards */}
            <div className="p-5 sm:p-6 space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  {t("Offene G&V", "Open P&L")}
                </p>
                <p className={`text-lg sm:text-xl font-display font-bold tabular-nums ${openTradesPnlEur >= 0 ? "text-success" : "text-destructive"}`}>
                  {hideBalance ? "••••" : fmtMoneySigned(openTradesPnlEur)}
                </p>
                {inTradesEur > 0 && (
                  <p className={`text-[11px] tabular-nums mt-0.5 ${openTradesPnlEur >= 0 ? "text-success" : "text-destructive"}`}>
                    {hideBalance ? "••••" : `${openTradesPnlEur >= 0 ? "+" : ""}${((openTradesPnlEur / inTradesEur) * 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {openTrades} {t(openTrades === 1 ? "offener Trade" : "offene Trades", openTrades === 1 ? "open trade" : "open trades")}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-0.5">
                  {t("Staking-Erträge", "Staking Rewards")}
                </p>
                <p className="text-sm font-semibold tabular-nums text-success">{mask(fmtMoney(stakingRewardsEur))}</p>
              </div>
            </div>
            {/* All-time profit */}
            <div className="p-5 sm:p-6 col-span-2 md:col-span-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                {t("Gesamtgewinn", "All-Time Profit")}
              </p>
              <p className={`text-xl sm:text-2xl font-display font-bold tabular-nums ${allTimePnl >= 0 ? "text-success" : "text-destructive"}`}>
                {hideBalance ? "••••" : fmtMoneySigned(allTimePnl)}
              </p>
            </div>

          </div>

          {/* Action buttons row */}
          <div className="border-t border-border/60 p-4 sm:p-5 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <Button className="rounded-xl font-semibold" onClick={() => navigate("/wallet?action=deposit")}>
              <Plus className="h-4 w-4 mr-1.5" /> {t("Einzahlen", "Deposit")}
            </Button>
            <Button variant="outline" className="rounded-xl font-semibold" onClick={() => navigate("/wallet?action=withdraw")}>
              <Minus className="h-4 w-4 mr-1.5" /> {t("Auszahlen", "Withdraw")}
            </Button>
            <Button variant="outline" className="rounded-xl font-semibold" onClick={() => navigate("/trading")}>
              <TrendingUp className="h-4 w-4 mr-1.5" /> {t("Handeln", "Trade")}
            </Button>
            <Button variant="outline" className="rounded-xl font-semibold" onClick={() => navigate("/wallet?action=swap")}>
              <ArrowLeftRight className="h-4 w-4 mr-1.5" /> {t("Konvertieren", "Convert")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Personal account manager */}
      <AccountManagerCard />

      {/* Rank Progress */}
      <TierProgress balance={totalBalance} />


      {/* Plan limits */}
      <PlanLimitsCard />

      {/* Realized Performance — Profit & Loss tiles */}
      <div>
        <div className="flex items-end justify-between mb-3 gap-3">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold tracking-[0.18em] text-muted-foreground">
              {t("REALISIERTE PERFORMANCE", "REALIZED PERFORMANCE")}
            </p>
            <h2 className="text-xl sm:text-2xl font-display font-bold mt-1">{t("Ihre Gewinne & Verluste", "Your Profit & Loss")}</h2>
          </div>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => navigate("/pnl-summary")}>
            <BarChart3 className="h-4 w-4 mr-1.5" /> {t("Vollständiger Bericht", "Full Report")}
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: t("Heute", "Today"), value: todayPnl },
            { label: t("Diese Woche", "This Week"), value: weekPnl },
            { label: t("Dieser Monat", "This Month"), value: monthPnl },
            { label: t("Seit Jahresbeginn", "Year to Date"), value: ytdPnl },
            { label: t("Gesamt", "All Time"), value: allTimePnl },
          ].map((tile) => {
            const pct = availableEur > 0 ? (tile.value / availableEur) * 100 : 0;
            const positive = tile.value >= 0;
            return (
              <Card key={tile.label} className="rounded-xl">
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                    {tile.label}
                  </p>
                  <p className={`text-xl sm:text-2xl font-display font-bold tabular-nums ${positive ? "text-success" : "text-destructive"}`}>
                    {hideBalance ? "••••" : fmtSigned(tile.value)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                    {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                    {pct.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% {t("auf Kapital", "on capital")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Trading Stats — Win rate & performance */}
      <div>
        <div className="mb-3">
          <p className="text-[11px] sm:text-xs font-semibold tracking-[0.18em] text-muted-foreground">
            {t("HANDELS-STATISTIK", "TRADING STATISTICS")}
          </p>
          <h2 className="text-xl sm:text-2xl font-display font-bold mt-1">
            {t("Ihre Trading-Performance", "Your Trading Performance")}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                {t("Gewinnrate", "Win Rate")}
              </p>
              <p className={`text-xl sm:text-2xl font-display font-bold tabular-nums ${tradeStats.winRate >= 50 ? "text-success" : "text-destructive"}`}>
                {tradeStats.total > 0 ? `${tradeStats.winRate.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {tradeStats.wins}/{tradeStats.total} {t("Trades", "trades")}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                {t("Gesamt Trades", "Total Trades")}
              </p>
              <p className="text-xl sm:text-2xl font-display font-bold tabular-nums">{tradeStats.total}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {t("Geschlossen", "Closed")}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                {t("Gewinne", "Wins")}
              </p>
              <p className="text-xl sm:text-2xl font-display font-bold tabular-nums text-success">{tradeStats.wins}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {t("Ø", "Avg")} {hideBalance ? "••" : fmtSigned(tradeStats.avgWin)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                {t("Verluste", "Losses")}
              </p>
              <p className="text-xl sm:text-2xl font-display font-bold tabular-nums text-destructive">{tradeStats.losses}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {t("Ø", "Avg")} {hideBalance ? "••" : fmtSigned(tradeStats.avgLoss)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                {t("Offene Trades", "Open Trades")}
              </p>
              <p className="text-xl sm:text-2xl font-display font-bold tabular-nums">{openTrades}</p>
              <p className={`text-[10px] tabular-nums mt-1 ${openTradesPnlEur >= 0 ? "text-success" : "text-destructive"}`}>
                {hideBalance ? "••••" : fmtSigned(openTradesPnlEur)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                {t("Bester Trade", "Best Trade")}
              </p>
              <p className="text-xl sm:text-2xl font-display font-bold tabular-nums text-success">
                {hideBalance ? "••••" : (tradeStats.bestTrade > 0 ? fmtSigned(tradeStats.bestTrade) : "—")}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                {t("Schlechtester Trade", "Worst Trade")}
              </p>
              <p className="text-xl sm:text-2xl font-display font-bold tabular-nums text-destructive">
                {hideBalance ? "••••" : (tradeStats.worstTrade < 0 ? fmtSigned(tradeStats.worstTrade) : "—")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Profit Chart */}
      <Card className="rounded-xl">
        <CardContent className="pt-5 pb-4 px-4 sm:px-6">
          <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t("Gewinn-Verlauf", "Profit Chart")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {chartRange === "1W" ? t("Letzte 7 Tage", "Last 7 days") :
                 chartRange === "1M" ? t("Letzte 30 Tage", "Last 30 days") :
                 chartRange === "3M" ? t("Letzte 3 Monate", "Last 3 months") :
                 chartRange === "YTD" ? t("Seit Jahresbeginn", "Year to date") :
                 t("Gesamte Laufzeit", "All time")}
              </p>
              <p className={`text-2xl sm:text-3xl font-display font-bold tabular-nums mt-1 ${chartTotal >= 0 ? "text-success" : "text-destructive"}`}>
                {hideBalance ? "••••" : fmtSigned(chartTotal)}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setChartRange(r.key)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    chartRange === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-48 sm:h-56">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm">{t("Noch kein Handelsverlauf für diesen Zeitraum.", "Not enough trade history yet for this period.")}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `€${v}`} width={50} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => fmtEur(v)}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#profitFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> {t("Ihr Konto wächst — weiter so!", "Your account is growing — keep it up!")}
          </p>
        </CardContent>
      </Card>

      {/* Portfolio + Watchlist */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-xl">
          <CardContent className="pt-5 pb-5 px-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("BESTAND", "HOLDINGS")}</p>
                <h3 className="text-lg font-display font-semibold mt-0.5">{t("Portfolio-Aufteilung", "Portfolio Allocation")}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/wallet")}>
                {t("Verwalten", "Manage")} <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>
            </div>
            {portfolioData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <HandCoins className="h-12 w-12 mb-3 text-muted-foreground/30" />
                <p className="text-base text-center">{t("Noch kein Guthaben vorhanden.", "No balance yet.")}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/wallet")}>
                  {t("Erste Einzahlung tätigen", "Make first deposit")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="w-32 h-32 sm:w-36 sm:h-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={portfolioData} cx="50%" cy="50%" innerRadius={38} outerRadius={65} dataKey="value" strokeWidth={2}>
                        {portfolioData.map((d, i) => (
                          <Cell key={i} fill={ASSET_COLORS[d.name] || COLORS_FALLBACK[i % COLORS_FALLBACK.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtEur(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5 flex-1 w-full min-w-0">
                  {portfolioData.map((d, i) => {
                    const icon = CURRENCY_ICONS[d.name];
                    const pct = availableEur > 0 ? ((d.value / availableEur) * 100).toFixed(1) : "0";
                    return (
                      <div key={d.name} className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[d.name] || COLORS_FALLBACK[i % COLORS_FALLBACK.length] }} />
                          {icon?.type === "img" ? (
                            <img src={icon.src} alt={d.name} className="h-5 w-5 rounded-full shrink-0" />
                          ) : icon?.type === "emoji" ? (
                            <span className="text-base leading-none shrink-0">{icon.src}</span>
                          ) : null}
                          <span className="font-medium text-sm sm:text-base truncate">{d.name}</span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm tabular-nums shrink-0">{mask(fmtEur(d.value))}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="pt-5 pb-5 px-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("MÄRKTE", "MARKETS")}</p>
                <h3 className="text-lg font-display font-semibold mt-0.5">{t("Watchlist", "Watchlist")}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/watchlist")}>
                {t("Alle", "All")} <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>
            </div>
            {watchlistAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <LineChartIcon className="h-12 w-12 mb-3 text-muted-foreground/30" />
                <p className="text-base text-center">{t("Noch keine Favoriten.", "No favorites yet.")}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/watchlist")}>
                  {t("Märkte entdecken", "Discover markets")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {watchlistAssets.map((w) => {
                  const asset = (w as any).assets;
                  if (!asset) return null;
                  const price = prices[asset.symbol];
                  return (
                    <div key={w.asset_id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        {asset.icon_url && <img src={asset.icon_url} alt={asset.symbol} className="h-7 w-7 rounded-full" />}
                        <div>
                          <p className="font-semibold text-base">{asset.symbol}</p>
                          <p className="text-xs text-muted-foreground capitalize">{asset.type}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-base tabular-nums">
                        {price ? fmtEur(price) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades + Transactions */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-xl">
          <CardContent className="pt-5 pb-5 px-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("AKTIVITÄT", "ACTIVITY")}</p>
                <h3 className="text-lg font-display font-semibold mt-0.5">{t("Letzte Trades", "Recent Trades")}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/trading")}>
                {t("Alle", "All")} <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>
            </div>
            {recentTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <TrendingUp className="h-10 w-10 mb-2 text-muted-foreground/30" />
                <p className="text-base">{t("Noch keine Trades vorhanden.", "No trades yet.")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${trade.direction === "buy" ? "bg-success/10" : "bg-destructive/10"}`}>
                        {trade.direction === "buy" ? (
                          <ArrowUpRight className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-base">{(trade as any).assets?.symbol ?? "—"}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          {trade.direction === "buy" ? t("KAUF", "BUY") : t("VERKAUF", "SELL")} · {statusLabels[trade.status] ?? trade.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-base tabular-nums">{fmtEur(Number(trade.entry_price))}</p>
                      <p className={`text-sm font-semibold tabular-nums ${Number(trade.pnl) >= 0 ? "text-success" : "text-destructive"}`}>
                        {hideBalance ? "••••" : fmtSigned(Number(trade.pnl || 0))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="pt-5 pb-5 px-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("KASSE", "CASHIER")}</p>
                <h3 className="text-lg font-display font-semibold mt-0.5">{t("Letzte Transaktionen", "Recent Transactions")}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/wallet")}>
                {t("Alle", "All")} <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>
            </div>
            {recentDeposits.length === 0 && recentWithdrawals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Wallet className="h-10 w-10 mb-2 text-muted-foreground/30" />
                <p className="text-base">{t("Noch keine Transaktionen.", "No transactions yet.")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  ...recentDeposits.map(d => ({ ...d, _type: "deposit" as const })),
                  ...recentWithdrawals.map(w => ({ ...w, _type: "withdrawal" as const })),
                ]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 6)
                  .map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-2 py-2.5 border-b last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-full shrink-0 ${tx._type === "deposit" ? "bg-success/10" : "bg-destructive/10"}`}>
                          {tx._type === "deposit" ? (
                            <ArrowUpRight className="h-4 w-4 text-success" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm sm:text-base truncate">
                            {tx._type === "deposit" ? t("Einzahlung", "Deposit") : t("Auszahlung", "Withdrawal")}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{tx.method}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 max-w-[55%]">
                        <p className="font-semibold text-xs sm:text-base tabular-nums break-all">
                          {hideBalance ? "••••" : `${tx._type === "deposit" ? "+" : "-"}${tx.currency} ${Number(tx.amount).toLocaleString("de-DE")}`}
                        </p>
                        <p className={`text-xs font-semibold uppercase tracking-wide ${statusColors[tx.status] ?? "text-muted-foreground"}`}>
                          {statusLabels[tx.status] ?? tx.status}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Services / Quick Access */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("SERVICES", "SERVICES")}</p>
        <h2 className="text-lg sm:text-xl font-display font-semibold mt-0.5 mb-3">{t("Schnellzugriff", "Quick Access")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Staking", desc: t("Zinsen verdienen", "Earn interest"), icon: Landmark, path: "/staking" },
            { label: t("Copy Trading", "Copy Trading"), desc: t("Profis folgen", "Follow pros"), icon: CopyIcon, path: "/copy-trading" },
            { label: t("Watchlist", "Watchlist"), desc: t("Märkte verfolgen", "Track markets"), icon: Eye, path: "/watchlist" },
            { label: t("Kalender", "Calendar"), desc: t("Ihr Terminplan", "Your schedule"), icon: CalendarIcon, path: "/calendar" },
            { label: t("Termin buchen", "Book meeting"), desc: t("Mit Ihrem Berater", "With your advisor"), icon: CalendarPlus, path: "/calendar?book=1", highlight: true },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`group text-left rounded-xl border p-4 transition-all hover:bg-accent ${
                action.highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className={`h-9 w-9 rounded-lg grid place-items-center mb-3 ${action.highlight ? "bg-primary/15 text-primary" : "bg-muted text-foreground"}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-sm">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Live Market Overview */}
      <Card className="rounded-xl">
        <CardContent className="pt-5 pb-2 px-3 sm:px-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 sm:px-0">
            {t("LIVE MARKTÜBERSICHT", "LIVE MARKET OVERVIEW")}
          </p>
          <div className="mt-3">
            <TradingViewMarketOverview height={isMobile ? 320 : 420} />
          </div>
        </CardContent>
      </Card>

      {/* News + Calendar */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-xl">
          <CardContent className="pt-5 pb-2 px-3 sm:px-6">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 sm:px-0">
              {t("TOP NACHRICHTEN", "TOP NEWS")}
            </p>
            <div className="mt-3">
              <TradingViewTopStories height={isMobile ? 320 : 400} />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-5 pb-2 px-3 sm:px-6">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 sm:px-0">
              {t("WIRTSCHAFTSKALENDER", "ECONOMIC CALENDAR")}
            </p>
            <div className="mt-3">
              <TradingViewCalendar height={isMobile ? 320 : 400} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
