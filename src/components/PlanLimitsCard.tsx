import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap, Repeat, TrendingUp, Crown, ArrowUpRight, Infinity as InfinityIcon, Lock,
} from "lucide-react";

const TIER_ORDER = [
  "Starter",
  "Select",
  "Prestige",
  "Elite",
  "Emerald Club",
  "Diamond Club",
  "Sovereign Circle",
] as const;

const PLAN_NAME_ALIASES: Record<string, string> = {
  "Basic": "Starter",
  "Starter Vermögensplan": "Starter",
  "Starter Vermoegensplan": "Starter",
  "Bronze": "Starter",
  "Silver": "Select",
  "Wachstumsplan": "Select",
  "Starter Plan": "Select",
  "Gold": "Prestige",
  "Diversifikation": "Prestige",
  "Diamond": "Elite",
  "Erweiterter Plan": "Elite",
  "VIP": "Emerald Club",
  "Professional": "Emerald Club",
  "Professional Vermögensplan": "Emerald Club",
  "Legacy Wealth": "Diamond Club",
  "Legacy Wealth Strategy": "Diamond Club",
  "Legacy Wealth Strategie": "Diamond Club",
  "Family Office": "Sovereign Circle",
  "Millionaire Club": "Sovereign Circle",
};

const normalize = (v: string | null | undefined): string => {
  if (!v) return "Starter";
  if ((TIER_ORDER as readonly string[]).includes(v)) return v;
  return PLAN_NAME_ALIASES[v] ?? v;
};

type Limits = {
  daily_trade_limit: number | null;
  daily_copy_trade_limit: number | null;
  yield_min_pct: number | null;
  yield_max_pct: number | null;
};

interface Props {
  compact?: boolean;
}

export default function PlanLimitsCard({ compact = false }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tier, setTier] = useState<string>("Starter");
  const [limits, setLimits] = useState<Limits | null>(null);
  const [tradesToday, setTradesToday] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const isMax = tier === "Sovereign Circle";
  const currentIdx = TIER_ORDER.indexOf(tier as any);
  const nextTier = isMax || currentIdx < 0 ? null : TIER_ORDER[currentIdx + 1];

  const reload = async () => {
    if (!user) return;
    const [{ data: prof }, todayCount] = await Promise.all([
      supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle(),
      (async () => {
        const since = new Date();
        since.setUTCHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("trades")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("opened_at", since.toISOString());
        return count ?? 0;
      })(),
    ]);
    const resolved = normalize((prof as any)?.account_type);
    setTier(resolved);
    const { data: tl } = await (supabase as any)
      .from("tier_trade_limits")
      .select("daily_trade_limit, daily_copy_trade_limit, yield_min_pct, yield_max_pct")
      .eq("tier", resolved)
      .maybeSingle();
    setLimits((tl as Limits) ?? {
      daily_trade_limit: null,
      daily_copy_trade_limit: null,
      yield_min_pct: null,
      yield_max_pct: null,
    });
    setTradesToday(todayCount);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    const id = setInterval(() => { void reload(); }, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-4 text-xs text-muted-foreground">
          {t("Plan-Limits laden…", "Loading plan limits…")}
        </CardContent>
      </Card>
    );
  }

  const dt = limits?.daily_trade_limit;
  const dct = limits?.daily_copy_trade_limit;
  const yMin = limits?.yield_min_pct;
  const yMax = limits?.yield_max_pct;

  const tradesRemaining = dt === null || dt === undefined ? null : Math.max(0, dt - tradesToday);
  const tradesReached = dt !== null && dt !== undefined && tradesToday >= dt;

  const fmtLimit = (v: number | null | undefined) =>
    v === null || v === undefined ? (
      <span className="inline-flex items-center gap-1 text-success font-semibold">
        <InfinityIcon className="h-4 w-4" /> {t("Unbegrenzt", "Unlimited")}
      </span>
    ) : (
      <span className="font-semibold tabular-nums">{v}</span>
    );

  return (
    <Card className="relative overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/[0.07] via-card to-card shadow-sm">
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)),transparent_60%)]" />
      <CardContent className={`relative ${compact ? "p-3 md:p-4" : "p-4 md:p-5"}`}>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Crown className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">
                {t("Ihr Plan", "Your plan")}
              </div>
              <div className="text-sm md:text-base font-display font-bold truncate">
                {tier}
              </div>
            </div>
          </div>
          {!isMax && (
            <Button asChild size="sm" className="rounded-full h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
              <Link to="/account-types">
                {t("Plan upgraden", "Upgrade plan")}
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Daily trades */}
          <div className={`rounded-lg border ${tradesReached ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-muted/30"} p-3`}>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <Zap className="h-3.5 w-3.5 text-primary" />
              {t("Trades pro Tag", "Trades per day")}
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className={`text-xl font-bold tabular-nums ${tradesReached ? "text-destructive" : "text-foreground"}`}>
                {tradesToday}
              </span>
              <span className="text-sm text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">{fmtLimit(dt)}</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {tradesReached
                ? t("Tageslimit erreicht", "Daily limit reached")
                : tradesRemaining === null
                  ? t("Unbegrenzte Trades heute", "Unlimited trades today")
                  : t(`Noch ${tradesRemaining} heute übrig`, `${tradesRemaining} left today`)}
            </div>
          </div>

          {/* Daily copy trades */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <Repeat className="h-3.5 w-3.5 text-primary" />
              {t("Copy-Trades pro Tag", "Copy trades per day")}
            </div>
            <div className="mt-1.5 text-xl font-bold">
              {fmtLimit(dct)}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {t("Auto-Strategien je Tag", "Auto strategies per day")}
            </div>
          </div>

          {/* Monthly yield */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              {t("Monatliche Rendite", "Monthly yield")}
            </div>
            <div className="mt-1.5 text-xl font-bold tabular-nums text-primary">
              {yMin != null && yMax != null
                ? `${yMin}% – ${yMax}%`
                : yMin != null
                  ? `${yMin}%`
                  : t("—", "—")}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {t("Erwartete Spanne", "Expected range")}
            </div>
          </div>
        </div>

        {!isMax && nextTier && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-primary" />
              {t("Mehr Trades & höhere Rendite mit", "More trades & higher yield with")}{" "}
              <span className="font-semibold text-foreground">{nextTier}</span>
            </span>
            <Link to="/account-types" className="text-primary font-semibold hover:underline shrink-0">
              {t("Ansehen", "View")} →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
