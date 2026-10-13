import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, BarChart3, Layers, Briefcase, Building2, Landmark, Bot, Cpu, ShieldCheck, UserCheck, Lock, AlertOctagon, TrendingUp, Crown, Sparkles, Copy, X, Check, Sprout } from "lucide-react";
import { motion } from "framer-motion";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import { usePageVisitTracker } from "@/hooks/usePageVisitTracker";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Tier rank — lower number = lower tier. Starter is the entry tier.
const TIER_RANK: Record<string, number> = {
  "Starter": 0,
  "Select": 1,
  "Prestige": 2,
  "Elite": 3,
  "Emerald Club": 4,
  "Diamond Club": 5,
  "Sovereign Circle": 6,
};

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

const normalizePlanName = (value: string | null | undefined) => {
  if (!value) return null;
  return PLAN_NAME_ALIASES[value] ?? value;
};

const plans = [
  {
    name: "Starter",
    codename: "Sicherer Einstieg",
    tagline: "Der Standard-Einstiegsplan für neue Anleger — bereits ab €250 aktivierbar.",
    summary: "Sicherer Einstieg in den Krypto-Markt — ideal für erste Erfahrungen mit geringem Kapital und täglichem Reporting.",
    tier: "01",
    icon: Sprout,
    minDeposit: "€250 – €1.000",
    monthlyReturn: "~€25",
    yieldRange: "8 % — 10 %",
    assetClasses: ["BTC", "ETH"],
    revenueSources: ["Krypto-Wertzuwachs", "Spot-Trading-Erträge"],
    copyTrading: true,
    perks: [
      "Standard-Stufe für neue Einzahler",
      "2 Trades pro Tag",
      "1 Copy Trade pro Tag",
      "Stop-Loss: 10 %",
      "Hebelprodukte über 1:1 verfügbar",
      "Standard Support per Chat und E-Mail",
      "Tägliches Portfolio-Reporting",
    ],
  } as any,
  {
    name: "Select",
    codename: "Momentum",
    tagline: "Mehr Dynamik, breitere Märkte und stärkerer Vermögensaufbau.",
    summary: "Mehr Dynamik und KI-Signale — breitere Märkte, priorisierter Support und automatische Handelsstrategien.",
    tier: "02",
    icon: BarChart3,
    minDeposit: "€10.000",
    monthlyReturn: "~€2.500",
    yieldRange: "10 % — 12 %",
    assetClasses: ["BTC", "ETH", "BNB", "SOL", "XRP"],
    revenueSources: ["Krypto-Wertzuwachs", "Spot-Trading-Erträge", "Staking-Rewards"],
    copyTrading: true,
    perks: [
      "10 Trades pro Tag",
      "1 Copy Trade pro Tag",
      "Stop-Loss: 8 %",
      "Hebel bis 25×",
      "Mehrere Anlageklassen in einer Stufe",
      "Priorisierter Support",
      "Tägliches Portfolio-Reporting",
      "KI-Trading-Assistent inklusive",
    ],
  } as any,
  {
    name: "Prestige",
    codename: "Balance",
    tagline: "Breiter aufgestellt, defensiver abgesichert und für Stabilität optimiert.",
    summary: "Balance aus Diversifikation und Schutz — unbegrenzte Trades, persönlicher Ansprechpartner und wöchentliche Reviews.",
    tier: "03",
    icon: Layers,
    minDeposit: "€50.000",
    monthlyReturn: "~€5.500",
    yieldRange: "11 % — 14 %",
    assetClasses: ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TON", "TRX", "AVAX"],
    revenueSources: ["Krypto-Wertzuwachs", "Spot-Trading-Erträge", "Staking-Rewards", "Copy-Trading-Gewinne"],
    copyTrading: true,
    perks: [
      "Unbegrenzte Trades pro Tag",
      "1 Copy Trade pro Tag",
      "Stop-Loss: 6 %",
      "Hebel bis 50×",
      "Mehr Diversifikation über defensive und offensive Bausteine",
      "Persönlicher Ansprechpartner",
      "Wöchentliche Strategie-Reviews",
      "KI-Trading-Assistent inklusive",
    ],
  } as any,
  {
    name: "Elite",
    codename: "Apex",
    tagline: "Mehr Freiheit in der Strategie, mehr Tiefe im Markt und mehr Betreuung.",
    summary: "Apex-Stufe für aktive Anleger — Derivater-Zugang, proprietäre KI-Signale und persönlicher Account Manager.",
    tier: "04",
    icon: Briefcase,
    minDeposit: "€100.000",
    monthlyReturn: "~€11.800",
    yieldRange: "12 % — 15 %",
    assetClasses: ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TON", "TRX", "AVAX", "DOT", "LINK", "MATIC", "LTC", "BCH", "UNI", "ATOM", "XLM", "ETC", "FIL"],
    revenueSources: ["Krypto-Wertzuwachs", "Spot- und Derivate-Erträge", "Staking-Rewards", "DeFi-Yield", "Copy-Trading-Gewinne"],
    copyTrading: true,
    elevated: true,
    perks: [
      "Unbegrenzte Trades pro Tag",
      "1 Copy Trade pro Tag",
      "Stop-Loss: 4 %",
      "Hebel bis 50×",
      "Themen-ETFs, Projektfonds und erweiterte Strategien",
      "Copy Trading + proprietäre KI-Trade-Signale",
      "Persönlicher Account Manager — Direktdraht, wöchentliche Reviews",
      "KI-Trading-Assistent inklusive",
    ],
  } as any,
  {
    name: "Emerald Club",
    codename: "Institutional",
    tagline: "Für größere Mandate mit anspruchsvoller Betreuung und institutioneller Struktur.",
    summary: "Institutioneller Rahmen für große Mandate — Hebel bis 100×, Senior Portfolio Manager und 24/7 Prioritätsleitung.",
    tier: "05",
    icon: Building2,
    minDeposit: "€250.000",
    monthlyReturn: "~€28.000",
    yieldRange: "14 % — 18 %",
    elevated: true,
    assetClasses: ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TON", "TRX", "AVAX", "DOT", "LINK", "MATIC", "LTC", "BCH", "UNI", "ATOM", "XLM", "ETC", "FIL", "NEAR", "APT", "ARB", "OP", "INJ", "SUI", "IMX", "AAVE", "MKR", "LDO"],
    revenueSources: ["Krypto-Wertzuwachs", "Spot- und Derivate-Erträge", "Staking-Rewards", "DeFi-Yield", "Liquiditäts-Mining", "Copy-Trading-Gewinne"],
    copyTrading: true,
    perks: [
      "Unbegrenzte Trades pro Tag",
      "1 Copy Trade pro Tag",
      "Stop-Loss: 2 %",
      "Hebel bis 100×",
      "Zugang zu Private Equity und alternativen Projektfonds",
      "Maßgeschneiderte Strategien für größere Mandate",
      "Senior Portfolio Manager + 24/7 Prioritätsleitung",
      "Auszahlungen innerhalb von 24 Stunden",
      "KI-Trading-Assistent inklusive",
    ],
  } as any,
  {
    name: "Diamond Club",
    codename: "Sovereign",
    tagline: "Für sehr große Vermögen mit maximaler Individualisierung und Private-Wealth-Betreuung.",
    summary: "Sovereign-Status für sehr große Vermögen — ICO-Allokationen, exklusive Events, Concierge und Private-Wealth-Betreuung.",
    tier: "06",
    icon: Landmark,
    minDeposit: "€500.000",
    monthlyReturn: "~€28.100",
    yieldRange: "16 % — 22 %",
    premium: true,
    assetClasses: ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TON", "TRX", "AVAX", "DOT", "LINK", "MATIC", "LTC", "BCH", "UNI", "ATOM", "XLM", "ETC", "FIL", "NEAR", "APT", "ARB", "OP", "INJ", "SUI", "IMX", "AAVE", "MKR", "LDO", "RUNE", "SEI", "TIA", "PEPE", "SHIB", "WIF", "FLOKI", "RNDR", "FET", "GRT"],
    revenueSources: ["Krypto-Wertzuwachs", "Spot- und Derivate-Erträge", "Staking-Rewards", "DeFi-Yield", "Liquiditäts-Mining", "Pre-Launch-/ICO-Allokationen", "Copy-Trading-Gewinne"],
    copyTrading: true,
    perks: [
      "Unbegrenzte Trades pro Tag, Hebel bis 200×",
      "1 Copy Trade pro Tag",
      "Stop-Loss: 1 %",
      "Zugang zu Pre-Launch- und ICO-Allokationen",
      "Persönlicher Private-Wealth-Berater",
      "Einladungen zu exklusiven Events, Krypto-Summits und Roundtables",
      "Concierge Service — Reisen, Reservierungen und persönliche Anliegen",
      "Auszahlungen priorisiert über dedizierte Prozesse",
      "White-Glove-Concierge für alles jenseits der Märkte",
      "KI-Trading-Assistent inklusive",
    ],
  } as any,
  {
    name: "Sovereign Circle",
    codename: "Heritage",
    tagline: "Der exklusivste Kreis — strukturierte Co-Investments, Family-Office-Betreuung und persönliche Wealth-Architektur.",
    summary: "Der exklusivste Kreis — Family-Office-Team, Venture-Co-Investments, weltweite Retreats und persönliche Wealth-Architektur.",
    tier: "07",
    icon: Crown,
    minDeposit: "€1.000.000",
    monthlyReturn: "~€87.500",
    yieldRange: "17 % — 23 %",
    premium: true,
    assetClasses: ["Vollzugang zu allen 50+ gelisteten Kryptowährungen", "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TON", "TRX", "AVAX", "DOT", "LINK", "MATIC", "LTC", "UNI", "ATOM", "AAVE", "MKR", "LDO", "NEAR", "APT", "ARB", "OP", "INJ", "SUI", "TIA", "SEI", "RNDR", "FET", "Institutionelles OTC-Krypto-Sleeve"],
    revenueSources: ["Krypto-Wertzuwachs", "Institutionelles OTC-Trading", "Staking-Rewards", "DeFi-Yield", "Liquiditäts-Mining", "Pre-Launch-/ICO-Allokationen", "Venture-Krypto-Co-Investments"],
    copyTrading: true,
    perks: [
      "Offizielle Mitgliedschaft im Sovereign Circle",
      "Unbegrenzte Trades pro Tag, Hebel bis 200×",
      "1 Copy Trade pro Tag",
      "Stop-Loss: 0.5 %",
      "Exklusive Sovereign-Circle-Events, Meetups und Retreats weltweit",
      "Private Krypto-Summits und Founder-Dinners nur auf Einladung",
      "Venture-Krypto Co-Investments und Pre-Launch-Allokationen",
      "Dediziertes Family-Office-Team und persönlicher Senior Wealth-Architekt",
      "24/7 Global Concierge — Reisen, Yachten, Jets, Reservierungen",
      "Auszahlungen mit höchster Priorität",
      "KI-Trading-Assistent inklusive",
    ],
  } as any,
];

const AccountTypes = () => {
  usePageVisitTracker("/account-types", "Account Types");

  const [userTier, setUserTier] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setUserTier(normalizePlanName((data as any)?.account_type) ?? "Starter");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const userRank = userTier != null ? (TIER_RANK[userTier] ?? 0) : -1;

  return (
    <div className="min-h-screen bg-[hsl(var(--l-bg))] text-[hsl(var(--l-fg))] overflow-x-hidden">
      <PublicNav />

      {/* Hero — editorial luxury */}
      <section className="relative border-b border-[#3b82f6]/15 overflow-hidden">
        <div className="absolute inset-0 bg-[hsl(var(--l-bg))] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#3b82f6]/40 to-transparent pointer-events-none" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-[#3b82f6]/[0.06] blur-[140px] pointer-events-none" />

        <div className="container mx-auto px-5 sm:px-6 py-24 md:py-32 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl mx-auto text-center space-y-6"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#3b82f6]/15 via-[#3b82f6]/10 to-[#3b82f6]/15 border border-[#3b82f6]/30 rounded-full px-4 py-1.5 backdrop-blur-sm">
              <Crown className="h-3.5 w-3.5 text-[#3b82f6]" />
              <span className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#3b82f6]">Die Private-Wealth-Stufenleiter</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display-landing font-bold leading-[1.02] tracking-tight text-[#3b82f6]">
              Kontotypen
            </h1>
            <div className="mx-auto h-px w-24 bg-gradient-to-r from-transparent via-[#3b82f6]/60 to-transparent" />
            <p className="text-[hsl(var(--l-fg-mid))] text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              Sieben Stufen. Ein kompromissloser Standard. Jede Stufe nach oben öffnet tiefere Märkte, stärkere Strategien, engere Betreuung — und Instrumente, die darunter schlicht nicht verfügbar sind. Je höher Sie steigen, desto individueller wird die Struktur für Ihr Kapital.
            </p>
            {userTier && (
              <div className="inline-flex items-center gap-3 mt-2 px-5 py-2.5 rounded-full border border-[#3b82f6]/30 bg-[hsl(var(--l-card-bg)/0.5)] backdrop-blur-sm">
                <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[hsl(var(--l-fg-mid))]">Sie sind hier</span>
                <span className="h-3 w-px bg-[#3b82f6]/30" />
                <span className="text-sm font-bold text-[#3b82f6] flex items-center gap-1.5"><Check className="h-3.5 w-3.5" />{userTier}</span>
              </div>
            )}
          </motion.div>

          {/* Tier ladder visualization */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-16 max-w-5xl mx-auto"
          >
            <div className="relative px-4">
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-[hsl(var(--l-fg-low))]/30 via-[#3b82f6]/40 to-[#3b82f6]" />
              <div className="relative grid grid-cols-7 gap-2">
                {plans.map((p) => {
                  const r = TIER_RANK[p.name] ?? 0;
                  const isCurrent = userTier === p.name;
                  const reached = userRank >= 0 && r <= userRank;
                  const isLuxe = r >= 3;
                  return (
                    <div key={p.name} className="flex flex-col items-center gap-2">
                      <div className={`h-9 w-9 md:h-11 md:w-11 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCurrent
                          ? "bg-[#3b82f6] border-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/40 scale-110"
                          : reached
                          ? "bg-[#3b82f6]/20 border-[#3b82f6]/60 text-[#3b82f6]"
                          : isLuxe
                          ? "bg-[hsl(var(--l-bg))] border-[#3b82f6]/40 text-[#3b82f6]/70"
                          : "bg-[hsl(var(--l-bg))] border-[hsl(var(--l-fg-low))]/40 text-[hsl(var(--l-fg-low))]"
                      }`}>
                        <p.icon className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-center leading-tight ${isCurrent ? "text-[#3b82f6]" : reached ? "text-[hsl(var(--l-fg-mid))]" : "text-[hsl(var(--l-fg-low))]"}`}>{p.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tiers Grid */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-5 sm:px-6">
          <div className="mb-6">
            {plans.filter((p) => p.name === "Starter").map((plan) => {
              const Icon = plan.icon;
              const planRank = TIER_RANK[plan.name] ?? 0;
              const isCurrent = userTier === plan.name;
              const isDowngrade = userRank >= 0 && planRank < userRank;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`relative rounded-xl border w-full transition-all duration-500 ${
                    isCurrent
                      ? "bg-[hsl(var(--l-fg-low))]/8 border-[hsl(var(--l-fg-low))]/40 ring-1 ring-[hsl(var(--l-fg-low))]/30"
                      : "bg-[hsl(var(--l-fg-low))]/5 border-dashed border-[hsl(var(--l-fg-low))]/25"
                  }`}
                >
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[hsl(var(--l-fg-low))]/80 text-[hsl(var(--l-bg))] text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertOctagon className="h-2.5 w-2.5" /> Einstiegsstufe
                  </div>

                  <div className="p-5 md:p-6 opacity-95">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center border bg-[hsl(var(--l-fg-low))]/10 border-[hsl(var(--l-fg-low))]/25 grayscale shrink-0">
                          <Icon className="h-5 w-5 text-[hsl(var(--l-fg-low))]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-[hsl(var(--l-fg-low))]">Stufe {plan.tier} · {plan.codename}</p>
                          <h3 className="font-display-landing font-bold text-xl text-[hsl(var(--l-fg-mid))] leading-tight">{plan.name}</h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--l-fg-low))]">Mindesteinlage</p>
                        <p className="font-display-landing font-bold text-2xl text-[hsl(var(--l-fg-mid))] tabular-nums leading-none">{plan.minDeposit}</p>
                      </div>
                    </div>

                    {plan.perks && plan.perks.length > 0 && (
                      <div className="mt-4 p-3 rounded-lg border border-[#3b82f6]/25 bg-[#3b82f6]/[0.04]">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="h-3.5 w-3.5 text-[#3b82f6]" />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--l-fg-mid))]">
                            Trading-Limits & Vorteile
                          </p>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                          {plan.perks.map((pk: string) => (
                            <li key={pk} className="flex items-start gap-1.5 text-[11px] text-[hsl(var(--l-fg-mid))] leading-snug">
                              <Check className="h-3 w-3 shrink-0 mt-0.5 text-[#3b82f6]" />
                              <span>{pk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-[11px] text-[hsl(var(--l-fg-mid))] leading-snug flex-1 min-w-[200px]">
                        <span className="font-semibold text-[#3b82f6]">{plan.name}</span> — {plan.summary}
                      </p>
                      {isCurrent ? (
                        <Button disabled size="sm" className="bg-[hsl(var(--l-fg-low))]/15 text-[hsl(var(--l-fg-mid))] border border-[hsl(var(--l-fg-low))]/30 cursor-default">
                          <Check className="h-3.5 w-3.5 mr-1.5" /> Aktueller Plan
                        </Button>
                      ) : isDowngrade ? (
                        <Link to="/contact-us"><Button size="sm" variant="outline" className="border-[hsl(var(--l-fg-low))]/30 text-[hsl(var(--l-fg-mid))]">Support kontaktieren</Button></Link>
                      ) : (
                        <Link to="/signup"><Button size="sm" variant="outline" className="border-[#3b82f6]/40 text-[#3b82f6] hover:bg-[#3b82f6]/10">Starter-Konto eröffnen</Button></Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.filter((p) => p.name !== "Starter").map((plan, index) => {
              const Icon = plan.icon;
              const isPremium = plan.premium;
              const isElevated = plan.elevated;
              const planRank = TIER_RANK[plan.name] ?? 0;
              const isLuxe = planRank >= 3;
              const accent = "#3b82f6";
              const accentDark = "#B8860B";
              const isCurrent = userTier === plan.name;
              const isUpgrade = userRank >= 0 && planRank > userRank;
              const isDowngrade = userRank >= 0 && planRank < userRank;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3) }}
                  style={{
                    boxShadow: isPremium ? `0 0 60px -20px ${accent}40, inset 0 1px 0 ${accent}30` : undefined,
                  }}
                  className={`relative rounded-2xl border transition-all duration-500 hover:-translate-y-1 h-full flex flex-col ${
                    plan.wide ? "md:col-span-2 lg:col-span-3" : ""
                  } ${
                    isCurrent
                      ? `bg-gradient-to-b from-[${accent}]/20 via-[hsl(var(--l-card-bg)/0.08)] to-[hsl(var(--l-card-bg)/0.06)] ring-2`
                      : isPremium
                      ? "bg-gradient-to-b from-[#3b82f6]/12 via-[hsl(var(--l-card-bg)/0.1)] to-[hsl(var(--l-card-bg)/0.06)]"
                      : isElevated
                      ? "bg-gradient-to-b from-[#3b82f6]/8 via-[hsl(var(--l-card-bg)/0.08)] to-[hsl(var(--l-card-bg)/0.06)]"
                      : "bg-[hsl(var(--l-card-bg)/0.06)]"
                  }`}
                >
                  <div className="absolute inset-0 rounded-2xl pointer-events-none border" style={{ borderColor: `${accent}${isPremium ? "55" : isElevated ? "35" : "1A"}`, ...(isCurrent ? { borderColor: accent, boxShadow: `0 0 0 2px ${accent}40` } : {}) }} />
                  {isLuxe && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent" />
                  )}

                  {isCurrent ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg flex items-center gap-1" style={{ background: `linear-gradient(90deg, ${accent}, ${accentDark})`, boxShadow: `0 8px 24px -6px ${accent}60` }}>
                      <Check className="h-3 w-3" /> Aktueller Plan
                    </div>
                  ) : plan.popular ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r from-[#3b82f6] to-[#F4D03F] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-[#3b82f6]/30">
                      Am häufigsten gewählt
                    </div>
                  ) : isLuxe ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-[hsl(var(--l-bg))] border border-[#3b82f6]/50 text-[#3b82f6] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Private Wealth
                    </div>
                  ) : null}

                  {plan.wide ? (
                    <div className="p-7 md:p-9 relative z-[1]">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-start">
                        {/* Left: identity + deposit */}
                        <div className="md:col-span-4 flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <div
                              className="h-14 w-14 rounded-xl flex items-center justify-center border shrink-0"
                              style={{ background: `${accent}1A`, borderColor: `${accent}55` }}
                            >
                              <Icon className="h-7 w-7" style={{ color: accent }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[hsl(var(--l-fg-low))]">
                                Stufe {plan.tier}{isLuxe && " · Private"}
                              </p>
                              <h3 className="font-display-landing font-bold text-2xl text-[hsl(var(--l-fg))] leading-tight">
                                {plan.name}
                              </h3>
                            </div>
                          </div>
                          {plan.tagline && (
                            <p className="text-sm italic text-[hsl(var(--l-fg-low))] leading-relaxed">{plan.tagline}</p>
                          )}
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-[hsl(var(--l-fg-low))] mb-1">Mindesteinlage</p>
                            <p className="font-display-landing font-bold text-3xl text-[hsl(var(--l-fg))] tabular-nums leading-none">
                              {plan.minDeposit}
                            </p>
                          </div>
                        </div>

                        {/* Middle: perks */}
                        <div className="md:col-span-5">
                          {plan.perks && plan.perks.length > 0 && (
                            <div className="p-4 rounded-xl border h-full" style={{ borderColor: `${accent}26`, background: `${accent}0D` }}>
                              <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="h-4 w-4" style={{ color: accent }} />
                                <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--l-fg-mid))]">
                                  Private-Wealth-Privilegien
                                </p>
                              </div>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                {plan.perks.map((pk: string) => (
                                  <li key={pk} className="flex items-start gap-2 text-[13px] text-[hsl(var(--l-fg-mid))] leading-snug">
                                    <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: accent }} />
                                    <span>{pk}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Right: counts + CTA */}
                        <div className="md:col-span-3 flex flex-col gap-3">
                          <div className="p-4 rounded-xl border" style={{ borderColor: `${accent}26`, background: `${accent}08` }}>
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--l-fg-mid))]">Anlageklassen</p>
                              <span className="text-base font-bold tabular-nums" style={{ color: accent }}>{plan.assetClasses.length}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--l-fg-mid))]">Einkommensquellen</p>
                              <span className="text-base font-bold tabular-nums" style={{ color: accent }}>{plan.revenueSources.length}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 p-3 rounded-xl border" style={{ borderColor: `${accent}1A`, background: `${accent}0D` }}>
                            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" style={{ color: accent }} />
                            <p className="text-[11px] text-[hsl(var(--l-fg-mid))] leading-snug">
                              <span className="text-[hsl(var(--l-fg))] font-semibold">{plan.name}</span> — {plan.summary}
                            </p>
                          </div>
                          {isCurrent ? (
                            <Button asChild size="lg" disabled className="w-full rounded-xl font-bold text-[hsl(var(--l-fg))] cursor-default opacity-100" style={{ background: `${accent}26`, border: `1px solid ${accent}66` }}>
                              <span>
                                <Check className="mr-2 h-4 w-4" /> Ihr aktueller Plan
                              </span>
                            </Button>
                          ) : isDowngrade ? (
                            <Button asChild size="lg" variant="outline" className="w-full rounded-xl font-bold border-[hsl(var(--l-fg-low))]/30 text-[hsl(var(--l-fg-mid))] hover:bg-[hsl(var(--l-fg-low))]/10">
                              <Link to="/contact-us">Support kontaktieren</Link>
                            </Button>
                          ) : (
                            <Button asChild size="lg" className="w-full rounded-xl font-bold transition-all text-white hover:opacity-90" style={{ background: "linear-gradient(90deg, #3b82f6, #F4D03F)", boxShadow: "0 12px 30px -10px rgba(212,175,55,0.5)" }}>
                              <Link to={isUpgrade ? "/dashboard/wallet" : "/signup"}>
                                Privates Vorgespräch anfragen
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div className="p-7 md:p-8 flex flex-col flex-1 relative z-[1]">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-12 w-12 rounded-xl flex items-center justify-center border"
                          style={{ background: `${accent}1A`, borderColor: `${accent}55` }}
                        >
                          <Icon className="h-6 w-6" style={{ color: accent }} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[hsl(var(--l-fg-low))]">
                            Stufe {plan.tier}{isLuxe && " · Private"}
                          </p>
                          <h3 className="font-display-landing font-bold text-2xl text-[hsl(var(--l-fg))] leading-tight">
                            {plan.name}
                          </h3>
                          {plan.tagline && (
                            <p className="text-[11px] italic text-[hsl(var(--l-fg-low))] mt-1 leading-snug max-w-[16rem]">{plan.tagline}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-5">
                      <p className="text-xs uppercase tracking-wider text-[hsl(var(--l-fg-low))] mb-1">Mindesteinlage</p>
                      <p className="font-display-landing font-bold text-3xl text-[hsl(var(--l-fg))] tabular-nums">
                        {plan.minDeposit}
                      </p>
                    </div>

                    {plan.name === "Select" ? (
                      <div className="mb-6 pt-8 px-4 pb-4 rounded-xl border-2 border-[#3b82f6]/50 bg-gradient-to-br from-[#3b82f6]/15 to-[#3b82f6]/5 relative">
                        <div className="absolute top-2 left-4 z-10 px-2.5 py-1 rounded-full bg-[#3b82f6] text-white text-[10px] font-bold uppercase tracking-widest shadow-md whitespace-nowrap">Hier freigeschaltet</div>
                        <div className="flex items-start gap-2 mt-1">
                          <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-[#3b82f6]" />
                          <p className="text-xs text-[hsl(var(--l-fg))] leading-relaxed">
                            <span className="font-bold text-[#3b82f6]">Copy Trading & KI-Signale — ab Select verfügbar.</span>{" "}
                            <span className="text-[hsl(var(--l-fg-mid))]">Spiegeln Sie Strategien, erhalten Sie KI-gestützte Signale und steigen Sie mit jeder Stufe in Tiefe, Betreuung und Marktbreite auf.</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="mb-6 flex items-start gap-2 p-3 rounded-xl border"
                        style={plan.copyTrading
                          ? { borderColor: `${accent}33`, background: `${accent}0D` }
                          : { borderColor: "hsl(var(--l-fg-low) / 0.15)", background: "hsl(var(--l-fg-low) / 0.05)" }}
                      >
                        {plan.copyTrading ? (
                          <Copy className="h-4 w-4 shrink-0 mt-0.5" style={{ color: accent }} />
                        ) : (
                          <Lock className="h-4 w-4 text-[hsl(var(--l-fg-low))] shrink-0 mt-0.5" />
                        )}
                        <p className="text-xs text-[hsl(var(--l-fg-mid))] leading-relaxed">
                          <span className="text-[hsl(var(--l-fg))] font-semibold">Copy Trading & KI-Signale</span>{" "}
                          {plan.copyTrading
                            ? "— enthalten. Spiegeln Sie Top-Trader und nutzen Sie proprietäre KI-Signale."
                            : "— gesperrt. Wird mit einem aktiven Vermögensplan freigeschaltet."}
                        </p>
                      </div>
                    )}

                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--l-fg-mid))]">
                          Anlageklassen
                        </p>
                        <span className="text-xs font-bold tabular-nums" style={{ color: accent }}>{plan.assetClasses.length}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {plan.assetClasses.map((a: string) => (
                          <li key={a} className="flex items-start gap-2 text-sm text-[hsl(var(--l-fg-mid))]">
                            <span className="mt-1" style={{ color: accent }}>•</span>
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--l-fg-mid))] mb-3">
                        Einkommensquellen
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.revenueSources.map((r: string) => (
                          <span key={r} className="text-[11px] px-2.5 py-1 rounded-full text-[hsl(var(--l-fg-mid))] border" style={{ background: `${accent}14`, borderColor: `${accent}26` }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    {plan.perks && plan.perks.length > 0 && (
                      <div className="mb-5 p-4 rounded-xl border" style={{ borderColor: `${accent}26`, background: `${accent}0D` }}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <Sparkles className="h-4 w-4" style={{ color: accent }} />
                          <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--l-fg-mid))]">
                            {isLuxe ? "Private-Wealth-Privilegien" : "Trading-Limits & Vorteile"}
                          </p>
                        </div>
                        <ul className="space-y-1.5">
                          {plan.perks.map((pk: string) => (
                            <li key={pk} className="flex items-start gap-2 text-xs text-[hsl(var(--l-fg-mid))] leading-relaxed">
                              <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: accent }} />
                              <span>{pk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-auto mb-6 flex items-start gap-2 p-3 rounded-xl border" style={{ borderColor: `${accent}1A`, background: `${accent}0D` }}>
                      <Sparkles className="h-4 w-4 shrink-0 mt-0.5" style={{ color: accent }} />
                      <p className="text-xs text-[hsl(var(--l-fg-mid))] leading-relaxed">
                        <span className="text-[hsl(var(--l-fg))] font-semibold">{plan.name}</span> — {plan.summary}
                      </p>
                    </div>

                    {isCurrent ? (
                      <Button asChild size="lg" disabled className="w-full rounded-xl font-bold text-[hsl(var(--l-fg))] cursor-default opacity-100" style={{ background: `${accent}26`, border: `1px solid ${accent}66` }}>
                        <span>
                          <Check className="mr-2 h-4 w-4" /> Ihr aktueller Plan
                        </span>
                      </Button>
                    ) : isDowngrade ? (
                      <Button asChild size="lg" variant="outline" className="w-full rounded-xl font-bold border-[hsl(var(--l-fg-low))]/30 text-[hsl(var(--l-fg-mid))] hover:bg-[hsl(var(--l-fg-low))]/10">
                        <Link to="/contact-us">
                          Support kontaktieren
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="lg"
                        className="w-full rounded-xl font-bold transition-all text-white hover:opacity-90"
                        style={
                          isPremium
                            ? { background: "linear-gradient(90deg, #3b82f6, #F4D03F)", boxShadow: "0 12px 30px -10px rgba(212,175,55,0.5)" }
                            : isLuxe
                            ? { background: `linear-gradient(90deg, ${accent}, ${accentDark})`, boxShadow: `0 12px 30px -10px ${accent}66` }
                            : { background: `linear-gradient(90deg, ${accent}, ${accentDark})` }
                        }
                      >
                        <Link to={isUpgrade ? "/dashboard/wallet" : "/signup"}>
                          {isUpgrade
                            ? `Upgrade auf ${plan.name}`
                            : isPremium
                            ? "Privates Vorgespräch anfragen"
                            : isLuxe
                            ? `${plan.name}-Konto eröffnen`
                            : "Konto eröffnen"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Institutional foundation strip */}
          <div className="mt-16 relative">
            <div className="absolute -inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/40 to-transparent" />
            <p className="text-center text-[10px] font-bold tracking-[0.28em] uppercase text-[#3b82f6] mt-6 mb-6">Auf institutionellen Fundamenten gebaut</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Plattform-Verfügbarkeit", value: "99,99 %" },
                { label: "Order-Ausführung", value: "<100 ms" },
                { label: "Verwaltetes Vermögen", value: "€2,2 Mrd." },
                { label: "Getrennte Verwahrung", value: "Tier-1-Banken" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-[#3b82f6]/15 bg-[hsl(var(--l-card-bg)/0.06)] p-5 hover:border-[#3b82f6]/40 transition-colors">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--l-fg-low))] mb-2">{s.label}</p>
                  <p className="font-display-landing font-bold text-2xl text-[hsl(var(--l-fg))] tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Engine + Capital Protection */}
      <section className="py-16 md:py-20 border-t border-[#3b82f6]/8 bg-[hsl(var(--l-bg-alt))]">
        <div className="container mx-auto px-5 sm:px-6 grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-[#3b82f6]/10 bg-[hsl(var(--l-card-bg)/0.06)] p-8 md:p-10"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-[#3b82f6]" />
              </div>
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#3b82f6]">Algorithmische Engine</span>
            </div>
            <h2 className="font-display-landing font-bold text-2xl md:text-3xl mb-4 leading-tight text-[hsl(var(--l-fg))]">
              Autonome Ausführung. Menschliche Aufsicht.
            </h2>
            <p className="text-[hsl(var(--l-fg-mid))] leading-relaxed mb-5">
              Sie müssen keinen einzigen Trade selbst platzieren. Unsere quantitative Engine analysiert globale Märkte rund um die Uhr, identifiziert hochüberzeugende Chancen und führt Positionen für Sie aus — stets innerhalb einer strikten 10 %-Allokationsregel und 10 %-Stop-Loss.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Cpu, label: "24/7 Überwachung" },
                { icon: Bot, label: "Autonome Ausführung" },
                { icon: ShieldCheck, label: "Regelbasiertes Risiko" },
                { icon: UserCheck, label: "Manuelle Freigabe" },
              ].map(({ icon: I, label }) => (
                <span key={label} className="text-xs px-3 py-1.5 rounded-full bg-[#3b82f6]/8 border border-[#3b82f6]/15 text-[hsl(var(--l-fg-mid))] flex items-center gap-1.5">
                  <I className="h-3 w-3 text-[#3b82f6]" /> {label}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="rounded-2xl border border-[#3b82f6]/10 bg-[hsl(var(--l-card-bg)/0.06)] p-8 md:p-10"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center">
                <Lock className="h-5 w-5 text-[#3b82f6]" />
              </div>
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-[#3b82f6]">Kapitalschutz</span>
            </div>
            <h2 className="font-display-landing font-bold text-2xl md:text-3xl mb-6 leading-tight text-[hsl(var(--l-fg))]">
              Schutz auf institutionellem Niveau — by Design.
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { stat: "90 %", label: "Kapitalreserve" },
                { stat: "10 %", label: "Stop-Loss" },
                { stat: "1 %", label: "Max. Tages-Exposure" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-[#3b82f6]/5 border border-[#3b82f6]/10 p-4 text-center">
                  <p className="font-display-landing font-bold text-3xl bg-gradient-to-r from-[#3b82f6] to-[#B8860B] bg-clip-text text-transparent tabular-nums">
                    {s.stat}
                  </p>
                  <p className="text-xs text-[hsl(var(--l-fg-low))] mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[hsl(var(--l-fg-mid))] leading-relaxed">
              Nicht investiertes Kapital wird auf getrennten Kundenkonten bei Tier-1-Verwahrstellen gehalten — vollständig getrennt von Betriebsmitteln.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why upgrade — luxe */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#3b82f612_0%,_transparent_60%)] pointer-events-none" />
        <div className="container mx-auto px-5 sm:px-6 relative">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
            <div className="inline-flex items-center gap-2 border border-[#3b82f6]/30 rounded-full px-4 py-1.5">
              <Crown className="h-3.5 w-3.5 text-[#3b82f6]" />
              <span className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#3b82f6]">Der Zinseszins-Vorteil</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))] leading-[1.05]">
              Jede Stufe, die Sie aufsteigen,{" "}
              <span className="italic font-light text-[hsl(var(--l-fg-mid))]">vervielfacht</span>{" "}
              <span className="bg-gradient-to-r from-[#3b82f6] to-[#F4D03F] bg-clip-text text-transparent">was Ihr Kapital leisten kann.</span>
            </h2>
            <div className="mx-auto h-px w-24 bg-gradient-to-r from-transparent via-[#3b82f6]/60 to-transparent" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: TrendingUp, title: "Renditen mit Zinseszinseffekt", desc: "Vom Starter-Plan ab etwa €25 pro Monat bis zum Sovereign Circle mit deutlich höherem Ertragspotenzial — disziplinierte Renditen, auf Ihr Kapital kalibriert." },
              { icon: Layers, title: "Märkte, zu denen Sie allein keinen Zugang haben", desc: "Private Equity. Direktimmobilien. Strukturierte Produkte. Spezialfonds, die der Öffentlichkeit verschlossen sind. Jede Stufe öffnet Anlageklassen, die Retail-Plattformen schlicht nicht bieten." },
              { icon: Crown, title: "Ein Berater, der Ihren Namen kennt", desc: "Vom persönlichen Ansprechpartner in höheren Stufen bis zum dedizierten Private-Wealth-Berater im Sovereign Circle — maßgeschneidert, diskret und direkt erreichbar." },
            ].map((item) => (
              <div key={item.title} className="group rounded-2xl border border-[#3b82f6]/15 bg-[hsl(var(--l-card-bg)/0.06)] p-8 hover:-translate-y-1 hover:border-[#3b82f6]/40 hover:shadow-[0_20px_60px_-20px_rgba(212,175,55,0.3)] transition-all duration-500">
                <div className="h-12 w-12 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <item.icon className="h-6 w-6 text-[#3b82f6]" />
                </div>
                <h3 className="font-display-landing font-bold text-xl mb-2 text-[hsl(var(--l-fg))]">{item.title}</h3>
                <p className="text-[hsl(var(--l-fg-mid))] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — luxe */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-5 sm:px-6">
          <div className="relative rounded-3xl border border-[#3b82f6]/30 overflow-hidden p-10 md:p-16">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/12 via-[hsl(var(--l-card-bg)/0.1)] to-[#0a0f1a]/40 pointer-events-none" />
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#3b82f6]/15 blur-[100px] pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent" />
            <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 mb-4 border border-[#3b82f6]/30 rounded-full px-3 py-1">
                  <Crown className="h-3 w-3 text-[#3b82f6]" />
                  <span className="text-[10px] font-bold tracking-[0.28em] uppercase text-[#3b82f6]">Private Beratung</span>
                </div>
                <h2 className="font-display-landing font-bold text-3xl md:text-5xl mb-4 leading-[1.05] text-[hsl(var(--l-fg))]">
                  Sprechen Sie mit einem privaten Berater.{" "}
                  <span className="italic font-light text-[hsl(var(--l-fg-mid))]">Diskret.</span>
                </h2>
                <p className="text-[hsl(var(--l-fg-mid))] leading-relaxed text-base md:text-lg">
                  Ein kurzes, vertrauliches Gespräch mit unserem Private-Wealth-Desk identifiziert die richtige Stufe für Ihr Kapital, Ihren Zeithorizont und Ihre Ziele.
                </p>
              </div>
              <Button size="lg" asChild className="rounded-xl px-10 h-14 text-base bg-gradient-to-r from-[#3b82f6] to-[#F4D03F] text-white hover:opacity-90 font-bold shadow-[0_20px_50px_-15px_rgba(212,175,55,0.6)] shrink-0">
                <Link to="/signup">
                  Konto eröffnen
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default AccountTypes;
