import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Crown, Lock, Sparkles, TrendingUp, ArrowRight,
  Shield, BarChart3, Layers, Briefcase, Building2, Landmark,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/hooks/useLanguage";

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

const PLAN_NAME_ALIASES: Record<string, Tier> = {
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

const TIER_ICONS: Record<Tier, any> = {
  "Starter": Shield,
  "Select": BarChart3,
  "Prestige": Layers,
  "Elite": Briefcase,
  "Emerald Club": Building2,
  "Diamond Club": Landmark,
  "Sovereign Circle": Crown,
};

const TIER_SHORT: Record<Tier, string> = {
  "Starter": "Starter",
  "Select": "Select",
  "Prestige": "Prestige",
  "Elite": "Elite",
  "Emerald Club": "Emerald",
  "Diamond Club": "Diamond",
  "Sovereign Circle": "Sovereign",
};

const TIER_GRADIENTS: Record<Tier, string> = {
  "Starter": "from-slate-400 via-slate-200 to-slate-400",
  "Select": "from-amber-700 via-amber-400 to-amber-700",
  "Prestige": "from-yellow-600 via-yellow-300 to-yellow-600",
  "Elite": "from-cyan-400 via-white to-cyan-400",
  "Emerald Club": "from-emerald-500 via-emerald-300 to-emerald-500",
  "Diamond Club": "from-sky-300 via-white to-sky-300",
  "Sovereign Circle": "from-yellow-300 via-amber-100 to-yellow-300",
};

const TIER_COLORS: Record<Tier, string> = {
  "Starter": "bg-slate-400",
  "Select": "bg-amber-500",
  "Prestige": "bg-yellow-500",
  "Elite": "bg-cyan-500",
  "Emerald Club": "bg-emerald-500",
  "Diamond Club": "bg-sky-500",
  "Sovereign Circle": "bg-amber-400",
};

const TIER_MINS: Record<Tier, number> = {
  "Starter": 250,
  "Select": 10000,
  "Prestige": 25000,
  "Elite": 50000,
  "Emerald Club": 100000,
  "Diamond Club": 200000,
  "Sovereign Circle": 1000000,
};

const normalize = (v: string | null | undefined): Tier => {
  if (!v) return "Starter";
  if ((TIER_ORDER as readonly string[]).includes(v)) return v as Tier;
  return PLAN_NAME_ALIASES[v] ?? "Starter";
};

interface Props {
  balance: number;
}

export default function TierProgress({ balance }: Props) {
  const { t, lang } = useLanguage();
  const [accountType, setAccountType] = useState<string | null>(null);

  const [celebrateTier, setCelebrateTier] = useState<Tier | null>(null);
  const userIdRef = useRef<string | null>(null);
  const upgradeAttemptRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setAccountType((data as any)?.account_type ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-upgrade account_type when balance crosses a threshold
  useEffect(() => {
    const uid = userIdRef.current;
    if (!uid || balance <= 0 || accountType === null) return;
    let target: Tier = "Starter";
    for (const t of TIER_ORDER) {
      if (balance >= TIER_MINS[t]) target = t;
    }
    const currentNorm = normalize(accountType);
    if (TIER_ORDER.indexOf(target) > TIER_ORDER.indexOf(currentNorm)) {
      const now = Date.now();
      if (now - upgradeAttemptRef.current < 5000) return;
      upgradeAttemptRef.current = now;
      (async () => {
        const { error } = await supabase
          .from("profiles")
          .update({ account_type: target } as any)
          .eq("id", uid);
        if (!error) {
          setAccountType(target);
          setCelebrateTier(target);
        }
      })();
    }
  }, [balance, accountType]);

  // Confetti burst when a new tier is reached
  useEffect(() => {
    if (!celebrateTier) return;
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#FFD700", "#FFF8DC", "#B8860B"],
        ...opts,
        particleCount: Math.floor(260 * particleRatio),
      });
    };
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
    const timeout = setTimeout(() => setCelebrateTier(null), 5500);
    return () => clearTimeout(timeout);
  }, [celebrateTier]);

  const current: Tier = normalize(accountType);
  const currentIdx = TIER_ORDER.indexOf(current);
  const isMax = currentIdx === TIER_ORDER.length - 1;
  const nextTier = isMax ? null : TIER_ORDER[currentIdx + 1];

  const currentMin = TIER_MINS[current] ?? 0;
  const nextMin = nextTier ? TIER_MINS[nextTier] : currentMin;
  const span = Math.max(1, nextMin - currentMin);
  const progressed = Math.max(0, balance - currentMin);
  const pct = isMax ? 100 : Math.min(100, (progressed / span) * 100);
  const remaining = isMax ? 0 : Math.max(0, nextMin - balance);

  const fmt = (n: number) =>
    n.toLocaleString(lang === "en" ? "en-US" : "de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <>
      <AnimatePresence>
        {celebrateTier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm pointer-events-auto"
            onClick={() => setCelebrateTier(null)}
          >
            <motion.div
              initial={{ scale: 0.5, y: 40, opacity: 0, rotateX: -30 }}
              animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className={`relative max-w-md mx-4 rounded-3xl border-2 border-primary/60 bg-gradient-to-br ${TIER_GRADIENTS[celebrateTier]} p-[2px] shadow-[0_0_80px_hsl(var(--primary)/0.6)]`}
            >
              <div className="rounded-3xl bg-card px-8 py-10 text-center relative overflow-hidden">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-20 opacity-20 pointer-events-none"
                  style={{ background: "conic-gradient(from 0deg, transparent, hsl(var(--primary)/0.6), transparent 30%)" }}
                />
                <motion.div
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className={`mx-auto h-20 w-20 rounded-2xl flex items-center justify-center bg-gradient-to-br ${TIER_GRADIENTS[celebrateTier]} shadow-[0_0_40px_hsl(var(--primary)/0.8)]`}
                >
                  {(() => { const Icon = TIER_ICONS[celebrateTier]; return <Icon className="h-10 w-10 text-background" strokeWidth={2.5} />; })()}
                </motion.div>
                <div className="relative mt-5 text-[11px] uppercase tracking-[0.4em] text-primary font-bold">
                  {t("Rang aufgestiegen!", "Rank Up!")}
                </div>
                <motion.h2
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className={`relative mt-2 text-3xl sm:text-4xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r ${TIER_GRADIENTS[celebrateTier]}`}
                >
                  {celebrateTier}
                </motion.h2>
                <p className="relative mt-3 text-sm text-muted-foreground">
                  {t(
                    "Herzlichen Glückwunsch! Sie haben einen neuen Rang erreicht.",
                    "Congratulations! You've reached a new rank.",
                  )}
                </p>
                <button
                  onClick={() => setCelebrateTier(null)}
                  className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  {t("Weiter", "Continue")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-xl shadow-black/5">

      <div className="relative p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("Rang-Fortschritt", "Rank Progress")}
          </div>
          {!isMax && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="tabular-nums">
                {t("Noch", "Still")} <span className="font-bold text-primary">€{fmt(remaining)}</span>{" "}
                {t("bis", "to")}{" "}
                <span className="font-semibold text-foreground">{nextTier}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${TIER_COLORS[current]} shrink-0`}>
              {(() => { const Icon = TIER_ICONS[current]; return <Icon className="h-4 w-4 text-background" strokeWidth={2.5} />; })()}
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{t("Aktueller Rang", "Current Rank")}</div>
              <div className="text-sm sm:text-base font-display font-bold text-foreground truncate leading-tight">
                {current}
              </div>
            </div>
          </div>

          {!isMax ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-right min-w-0">
                <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{t("Nächster Rang", "Next Rank")}</div>
                <div className="text-sm sm:text-base font-display font-bold text-muted-foreground truncate leading-tight">
                  {nextTier}
                </div>
              </div>
              <div className={`relative h-9 w-9 rounded-lg flex items-center justify-center ${TIER_COLORS[nextTier!]} opacity-50 shrink-0`}>
                <Lock className="h-4 w-4 text-background" strokeWidth={2.5} />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-yellow-500/40 bg-yellow-500/10">
              <Crown className="h-3 w-3 text-yellow-500" />
              <span className="text-[11px] font-semibold text-yellow-500">{t("Höchster Rang erreicht", "Top rank reached")}</span>
            </div>
          )}
        </div>

        <div className="relative">
          <div className="relative h-4 rounded-full bg-muted/40 border border-border/60 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className={`absolute inset-y-0 left-0 ${TIER_COLORS[isMax ? current : nextTier!]} opacity-90`}
            />
            <div className="absolute inset-0 flex pointer-events-none">
              {[20, 40, 60, 80].map((p) => (
                <div key={p} style={{ left: `${p}%` }} className="absolute inset-y-0 w-px bg-background/40" />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold tabular-nums text-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                {pct.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex justify-between mt-2 text-[11px] tabular-nums text-muted-foreground">
            <span>€{fmt(currentMin)}</span>
            <span className="font-semibold text-foreground/80">€{fmt(balance)}</span>
            <span>{isMax ? "MAX" : `€${fmt(nextMin)}`}</span>
          </div>
        </div>

        <div className="mt-6 flex items-start justify-between gap-1">
          {TIER_ORDER.map((tier, i) => {
            const unlocked = i <= currentIdx;
            const isCurrent = i === currentIdx;
            const TierIcon = TIER_ICONS[tier];
            return (
              <div key={tier} className="flex flex-col items-center gap-1 flex-1 min-w-0 relative">
                {isCurrent && (
                  <motion.div
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-sm bg-primary text-primary-foreground text-[8px] font-bold uppercase tracking-wider shadow-[0_0_10px_hsl(var(--primary)/0.7)] z-10"
                  >
                    {t("Sie", "You")}
                  </motion.div>
                )}
                <div
                  className={`relative h-6 w-6 rounded-full flex items-center justify-center ${
                    isCurrent
                      ? `${TIER_COLORS[tier]} ring-2 ring-primary ring-offset-2 ring-offset-card`
                      : unlocked
                      ? `${TIER_COLORS[tier]} opacity-70`
                      : "bg-muted/60 border border-border/60"
                  }`}
                >
                  <TierIcon
                    className={`h-3 w-3 ${unlocked ? "text-background" : "text-muted-foreground"}`}
                    strokeWidth={2.5}
                  />
                  {!unlocked && (
                    <Lock className="absolute h-2.5 w-2.5 text-muted-foreground" strokeWidth={3} />
                  )}
                </div>
                <span
                  className={`text-[9px] uppercase tracking-wider truncate w-full text-center ${
                    isCurrent ? "text-primary font-bold" : unlocked ? "text-foreground/70" : "text-muted-foreground/60"
                  }`}
                >
                  {TIER_SHORT[tier]}
                </span>
              </div>
            );
          })}
        </div>

        <Link
          to="/account-types"
          className="mt-4 group flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          {t("Alle Ränge & Vorteile ansehen", "View all ranks & benefits")}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
    </>
  );
}
