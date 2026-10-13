import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield, BarChart3, Star,
  Landmark, Headphones, Monitor,
  CheckCircle2, UserPlus, Wallet, LineChart,
  ArrowRight, Users, TrendingUp, Lock, Globe, Phone, Mail,
  Building2, BadgeCheck,
  Coins, Layers, Menu, X,
  Award, Clock, Zap, PieChart, PiggyBank,
  Target, Sparkles, DollarSign, ArrowUpRight, Gem,
  ShieldCheck, KeyRound, Fingerprint, KeySquare, Network, Snowflake, Server,
  CreditCard,
} from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/landing/AnimatedSection";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import TradingViewTicker from "@/components/tradingview/TradingViewTicker";
import MarketWidget from "@/components/landing/MarketWidget";
import TradingViewHeatmap from "@/components/tradingview/TradingViewHeatmap";
import TradingViewScreener from "@/components/tradingview/TradingViewScreener";
import LazyMount from "@/components/landing/LazyMount";
import AvailableMarkets from "@/components/landing/AvailableMarkets";
import CompanyFaq from "@/components/landing/CompanyFaq";
import PublicNav from "@/components/layout/PublicNav";
import PriceTicker from "@/components/landing/PriceTicker";
import {
  useAnimatedInvestmentVolume,
  useInvestmentVolume,
  formatVolumeFull,
  formatVolumeMrd,
} from "@/lib/investmentVolume";
import AITradingSection from "@/components/landing/AITradingSection";
import HeroSection from "@/components/landing/HeroSection";
import SectionNav from "@/components/landing/SectionNav";
import SectionSidebar from "@/components/landing/SectionSidebar";
import tr, { type Lang } from "@/lib/landingTranslations";
import PublicFooter from "@/components/layout/PublicFooter";

import heroImg from "@/assets/hero-trading.jpg";
import btcIcon from "@/assets/crypto/btc.png";
import ethIcon from "@/assets/crypto/eth.png";
import solIcon from "@/assets/crypto/sol.png";
import tradingDashboardImg from "@/assets/trading-dashboard.jpg";
import dachFinanceImg from "@/assets/dach-finance.jpg";
import advisorMeetingImg from "@/assets/advisor-meeting.jpg";

import visaLogo from "@/assets/payments/visa.png";
import mastercardLogo from "@/assets/payments/mastercard.png";
import cryptoLogo from "@/assets/payments/crypto.png";
import bankLogo from "@/assets/payments/bank.png";
import paypalLogo from "@/assets/payments/paypal.png";
import skrillLogo from "@/assets/payments/skrill.png";
import netellerLogo from "@/assets/payments/neteller.png";
import sepaLogo from "@/assets/payments/sepa.png";
import applePayLogo from "@/assets/payments/apple-pay.png";
import cardEmblem from "@/assets/crypto-boerse-card-emblem.png.asset.json";

const AnimatedInvestmentCounter = ({ lang }: { lang: Lang }) => {
  const { amount, bumps, flash } = useAnimatedInvestmentVolume();
  const formatted = formatVolumeFull(amount, lang === "de" ? "de-DE" : "en-US");

  const bumpClass = (size: "small" | "medium" | "large") => {
    if (size === "large") {
      return "bg-emerald-400/20 border-emerald-300/50 text-emerald-200 text-sm md:text-base font-bold px-3 py-1.5 shadow-emerald-500/30";
    }
    if (size === "medium") {
      return "bg-emerald-500/15 border-emerald-400/40 text-emerald-300 text-xs md:text-sm font-semibold px-2.5 py-1 shadow-emerald-500/20";
    }
    return "bg-emerald-500/10 border-emerald-400/30 text-emerald-300 text-xs font-medium px-2 py-0.5 shadow-emerald-500/10";
  };

  return (
    <div className="relative inline-block">
      <motion.p
        animate={flash ? { color: "#3b82f6", scale: 1.015 } : { color: "hsl(var(--l-fg))", scale: 1 }}
        transition={{ duration: 0.4 }}
        className="font-display-landing font-bold text-3xl md:text-4xl lg:text-[2.75rem] tabular-nums"
      >
        {formatted}
      </motion.p>
      <AnimatePresence>
        {bumps.map((b) => (
          <motion.span
            key={b.id}
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: b.size === "large" ? -44 : -32, scale: 1 }}
            exit={{ opacity: 0, y: -70 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className={`absolute -right-2 top-0 pointer-events-none rounded-full border tabular-nums whitespace-nowrap shadow-lg ${bumpClass(b.size)}`}
          >
            +€{b.value.toLocaleString("de-DE")}
          </motion.span>
        ))}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">{lang === "de" ? "Anlagevolumen" : "Investment volume"}: {formatted}</span>
    </div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { lang: globalLang } = useLanguage();
  const lang = globalLang as Lang;
  const liveVolume = useInvestmentVolume(1000);
  const liveVolumeMrd = formatVolumeMrd(liveVolume, lang);

  // If a magic-link lands on /, honor explicit redirect targets first.
  useEffect(() => {
    const hash = window.location.hash;
    const search = new URLSearchParams(window.location.search);
    const redirectTo = search.get("redirect_to");

    if (redirectTo) {
      try {
        const target = new URL(redirectTo, window.location.origin);
        if (target.origin === window.location.origin) {
          navigate(`${target.pathname}${target.search}${target.hash}`, { replace: true });
          return;
        }
      } catch {
        if (redirectTo.startsWith("/")) {
          navigate(redirectTo, { replace: true });
          return;
        }
      }
    }

    if (hash && (hash.includes("access_token") || hash.includes("refresh_token"))) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase.from("profiles").select("is_lead").eq("id", session.user.id).single().then(({ data }) => {
            if (data?.is_lead) {
              navigate("/welcome", { replace: true });
            }
          });
        }
      });
    }
  }, [navigate]);

  // No longer redirect logged-in users — let them browse the website
  const l = (key: keyof typeof tr) => {
    const entry = tr[key];
    if (typeof entry === "object" && "de" in entry && typeof (entry as any)[lang] === "string") {
      return (entry as any)[lang] as string;
    }
    return "";
  };
  const la = (key: keyof typeof tr): string[] => {
    const entry = tr[key];
    if (typeof entry === "object" && "de" in entry && Array.isArray((entry as any)[lang])) {
      return (entry as any)[lang] as string[];
    }
    return [];
  };

  const paymentMethods = [
    { name: "Visa", logo: visaLogo },
    { name: "Mastercard", logo: mastercardLogo },
    { name: "SEPA", logo: sepaLogo },
    { name: "Crypto", logo: cryptoLogo },
    { name: l("payBank"), logo: bankLogo },
    { name: "PayPal", logo: paypalLogo },
    { name: "Apple Pay", logo: applePayLogo },
    { name: "Skrill", logo: skrillLogo },
    { name: "Neteller", logo: netellerLogo },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--l-bg))] overflow-x-hidden text-[hsl(var(--l-fg))]">
      <PublicNav />
      {/* Live crypto ticker — sliding, updates every 15s from Binance */}
      <div className="relative border-b border-white/5 bg-[#030d1d]/95 backdrop-blur">
        <PriceTicker />
      </div>
      <SectionSidebar />

      {/* ========== 1. HERO ========== */}
      <HeroSection lang={lang} />

      {/* ========== 1b. Verwaltetes Vermögen — live counter strip ========== */}
      <section
        aria-label={lang === "de" ? "Verwaltetes Vermögen" : "Assets under management"}
        className="relative border-y border-white/5"
        style={{
          background:
            "linear-gradient(180deg, rgba(3,13,29,0.72) 0%, rgba(3,13,29,0.88) 100%)",
        }}
      >
        <div className="container mx-auto px-6 py-5 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4C87FF] opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4C87FF]" />
            </span>
            <p
              className="uppercase text-white/60"
              style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.24em" }}
            >
              {lang === "de" ? "Verwaltetes Vermögen · Live" : "Assets under management · Live"}
            </p>
          </div>
          <AnimatedInvestmentCounter lang={lang} />
          <p
            className="hidden md:block text-white/40 max-w-2xl"
            style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em" }}
          >
            {lang === "de"
            ? "Kapital, das unsere Investoren aktuell über Crypto-Börse verwalten lassen."
            : "Capital our investors currently entrust to Crypto-Börse."}
          </p>
        </div>
      </section>

      {/* ========== UNSER ANSATZ ========== */}
      <section id="ansatz" className="py-20 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <AnimatedSection className="mb-14 space-y-4 max-w-3xl">
            <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">
              {lang === "de" ? "Unser Ansatz" : "Our Approach"}
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
              {lang === "de"
                ? "Ein institutioneller Ansatz für digitale Vermögenswerte."
                : "An institutional approach to digital assets."}
            </h2>
            <p className="text-[hsl(var(--l-fg-mid))] text-lg">
              {lang === "de"
                ? "Wir verbinden traditionelle Vermögensverwaltung mit modernster Finanztechnologie, künstlicher Intelligenz und quantitativen Investmentmodellen. Digitale Assets erfordern neue Denkweisen in der Vermögensverwaltung — unser Ansatz kombiniert intelligente Technologie mit menschlicher Expertise, um globale Märkte strukturiert zu analysieren und individuelle Investmentstrategien zu entwickeln."
                : "We combine traditional wealth management with cutting-edge financial technology, artificial intelligence and quantitative investment models. Digital assets require new thinking in wealth management — our approach pairs intelligent technology with human expertise to analyse global markets and build individual investment strategies."}
            </p>
          </AnimatedSection>

          <StaggerContainer className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01 / 03",
                title: lang === "de" ? "KI-gestützte Marktintelligenz" : "AI-powered market intelligence",
                sub: lang === "de" ? "Technologie, die Märkte versteht." : "Technology that understands markets.",
                desc: lang === "de"
                  ? "Unsere Systeme analysieren große Mengen globaler Marktdaten in Echtzeit und unterstützen unsere Experten bei der Identifikation relevanter Entwicklungen und strategischer Möglichkeiten."
                  : "Our systems analyse large volumes of global market data in real time and support our experts in identifying relevant developments and strategic opportunities.",
                bullets: lang === "de"
                  ? ["Echtzeit-Marktanalyse", "KI-basierte Mustererkennung", "Datengetriebene Entscheidungsprozesse"]
                  : ["Real-time market analysis", "AI-based pattern recognition", "Data-driven decision processes"],
              },
              {
                step: "02 / 03",
                title: lang === "de" ? "Quantitative Investmentstrategien" : "Quantitative investment strategies",
                sub: lang === "de" ? "Strukturierte Modelle für digitale Märkte." : "Structured models for digital markets.",
                desc: lang === "de"
                  ? "Wir kombinieren quantitative Analysen, algorithmische Modelle und Arbitrage-Strategien, um komplexe Marktbewegungen systematisch zu bewerten."
                  : "We combine quantitative analytics, algorithmic models and arbitrage strategies to systematically assess complex market movements.",
                bullets: lang === "de"
                  ? ["Quantitative Modelle", "Globale Marktanalyse", "Strategische Portfolio-Allokation"]
                  : ["Quantitative models", "Global market analysis", "Strategic portfolio allocation"],
              },
              {
                step: "03 / 03",
                title: lang === "de" ? "Menschliche Expertise" : "Human expertise",
                sub: lang === "de" ? "Technologie mit persönlicher Verantwortung." : "Technology with personal responsibility.",
                desc: lang === "de"
                  ? "Hinter jeder Strategie stehen erfahrene Spezialisten, die Prozesse überwachen, Entscheidungen begleiten und Investoren persönlich betreuen."
                  : "Behind every strategy stand experienced specialists who monitor processes, guide decisions and personally support investors.",
                bullets: lang === "de"
                  ? ["Persönliche Ansprechpartner", "Professionelle Partnerinfrastruktur", "Transparente Prozesse"]
                  : ["Personal advisors", "Professional partner infrastructure", "Transparent processes"],
              },
            ].map((pillar) => (
              <StaggerItem key={pillar.step}>
                <div className="h-full rounded-2xl border border-[#3b82f6]/12 bg-[hsl(var(--l-card-bg)/0.05)] p-7 hover:border-[#3b82f6]/30 transition-all duration-300">
                  <p className="text-xs font-mono tracking-[0.2em] text-[#3b82f6] mb-5">{pillar.step}</p>
                  <h3 className="font-display-landing font-bold text-[hsl(var(--l-fg))] text-xl mb-1.5">{pillar.title}</h3>
                  <p className="text-[#3b82f6] text-sm mb-4">{pillar.sub}</p>
                  <p className="text-[hsl(var(--l-fg-mid))] text-[15px] leading-relaxed mb-5">{pillar.desc}</p>
                  <ul className="space-y-2">
                    {pillar.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-[hsl(var(--l-fg-low))]">
                        <CheckCircle2 className="h-4 w-4 text-[#3b82f6] shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <div className="mt-10 flex flex-wrap justify-center gap-3 text-xs uppercase tracking-[0.18em] text-[hsl(var(--l-fg-low))]">
            <span className="px-4 py-2 rounded-full border border-[#3b82f6]/15 bg-[hsl(var(--l-card-bg)/0.05)]">{lang === "de" ? "KI-Powered Analytics" : "AI-Powered Analytics"}</span>
            <span className="px-4 py-2 rounded-full border border-[#3b82f6]/15 bg-[hsl(var(--l-card-bg)/0.05)]">{lang === "de" ? "Institutionelle Prozesse" : "Institutional processes"}</span>
            <span className="px-4 py-2 rounded-full border border-[#3b82f6]/15 bg-[hsl(var(--l-card-bg)/0.05)]">{lang === "de" ? "Persönliche Betreuung" : "Personal advisory"}</span>
          </div>
        </div>
      </section>

      {/* ========== 2. MARKETS ========== */}
      <section className="bg-[hsl(var(--l-bg-alt))] border-y border-[#3b82f6]/8 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-14 space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">{l("marketsTag")}</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
              {l("marketsTitle")}
            </h2>
            <p className="text-[hsl(var(--l-fg-mid))] text-lg max-w-2xl mx-auto">
              {l("marketsDesc")}
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-3 text-xs text-[hsl(var(--l-fg-low))]">
              <span className="px-3 py-1 rounded-full border border-[#3b82f6]/15">{lang === "de" ? "Aktives Research" : "Active research"}</span>
              <span className="px-3 py-1 rounded-full border border-[#3b82f6]/15">EU-{lang === "de" ? "reguliert" : "regulated"}</span>
              <span className="px-3 py-1 rounded-full border border-[#3b82f6]/15">{lang === "de" ? "Persönliche Betreuung" : "Personal advisory"}</span>
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {[
              { icon: Coins, title: "Major Coins", desc: lang === "de" ? "Bitcoin, Ethereum und weitere etablierte Blue-Chip-Kryptowährungen." : "Bitcoin, Ethereum and other established blue-chip cryptocurrencies.", color: "from-orange-500/20 to-yellow-500/10" },
              { icon: Layers, title: "Altcoins", desc: lang === "de" ? "Ausgewählte Layer-1s und Ökosystem-Token mit Wachstumspotenzial." : "Selected layer-1s and ecosystem tokens with growth potential.", color: "from-blue-500/20 to-cyan-500/10" },
              { icon: Sparkles, title: "Memecoins", desc: lang === "de" ? "Hochvolatile Community-Token für taktische Allokationen." : "High-volatility community tokens for tactical allocations.", color: "from-pink-500/20 to-fuchsia-500/10" },
              { icon: PiggyBank, title: "Staking", desc: lang === "de" ? "Passive Erträge durch professionelles Krypto-Staking." : "Passive income through professional crypto staking.", color: "from-emerald-500/20 to-green-500/10" },
              { icon: Zap, title: "DeFi", desc: lang === "de" ? "Dezentrale Finanzprotokolle und On-Chain-Renditemodelle." : "Decentralized finance protocols and on-chain yield models.", color: "from-cyan-500/20 to-blue-500/10" },
              { icon: Users, title: "DAO", desc: lang === "de" ? "Governance-Token führender dezentraler Organisationen." : "Governance tokens of leading decentralized organizations.", color: "from-violet-500/20 to-purple-500/10" },
              { icon: Star, title: "ICOs", desc: lang === "de" ? "Kuratierter Zugang zu geprüften Frühphasen-Projekten." : "Curated access to vetted early-stage projects.", color: "from-amber-500/20 to-orange-500/10" },
              { icon: Gem, title: lang === "de" ? "Verwaltete Portfolios" : "Managed Portfolios", desc: lang === "de" ? "Individuell strukturierte Krypto-Portfolios mit persönlicher Betreuung." : "Individually structured crypto portfolios with personal advisory.", color: "from-blue-500/20 to-indigo-500/10" },
            ].map((m) => (
              <StaggerItem key={m.title}>
                <Card className="bg-[hsl(var(--l-card-bg)/0.06)] border-[#3b82f6]/8 hover:border-[#3b82f6]/30 transition-all duration-500 h-full group hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3b82f6]/10">
                  <CardContent className="p-7 space-y-4 text-center">
                    <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${m.color} border border-[#3b82f6]/15 flex items-center justify-center mx-auto`}>
                      <m.icon className="h-8 w-8 text-[#3b82f6]" />
                    </div>
                    <h3 className="font-display-landing font-bold text-[hsl(var(--l-fg))] text-xl">{m.title}</h3>
                    <p className="text-[hsl(var(--l-fg-low))] text-[15px] leading-relaxed">{m.desc}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ========== PERFORMANCE / RESULTS ========== */}
      <section id="performance" className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-6xl">
          <AnimatedSection className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center mb-16">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">{l("perfTag")}</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))] leading-[1.1]">
                {l("perfTitle")}
              </h2>
              <p className="text-[hsl(var(--l-fg-mid))] text-lg leading-relaxed">
                {l("perfDesc")}
              </p>
            </div>
            <div className="flex items-center justify-center md:justify-end">
              <div className="text-center md:text-right space-y-3">
                <p className="text-sm uppercase tracking-[0.2em] text-[hsl(var(--l-fg-low))] font-medium">
                  {lang === "de" ? "Ø Jahresrendite" : "Avg. annual return"}
                </p>
                <p className="text-6xl md:text-7xl lg:text-8xl font-display-landing font-bold bg-gradient-to-r from-[#3b82f6] via-[#93c5fd] to-[#3b82f6] bg-clip-text text-transparent leading-none">
                  +87%
                </p>
                <p className="text-[hsl(var(--l-fg-mid))] text-sm">
                  {lang === "de" ? "für DACH-Investoren nachweisbar erzielt" : "verifiably achieved for DACH investors"}
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Key performance stats */}
          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {[
              { value: l("perfS1v"), label: l("perfS1l"), icon: TrendingUp },
              { value: l("perfS2v"), label: l("perfS2l"), icon: Gem },
              { value: l("perfS3v"), label: l("perfS3l"), icon: Target },
              { value: l("perfS4v"), label: l("perfS4l"), icon: Zap },
            ].map((s) => (
              <StaggerItem key={s.label}>
                <div className="text-center p-6 md:p-8 rounded-2xl bg-gradient-to-br from-[#3b82f6]/10 to-[#3b82f6]/3 border border-[#3b82f6]/15 hover:border-[#3b82f6]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3b82f6]/10 h-full">
                  <s.icon className="h-8 w-8 text-[#3b82f6] mx-auto mb-3" />
                  <p className="text-3xl md:text-4xl font-display-landing font-bold bg-gradient-to-r from-[#3b82f6] via-[#93c5fd] to-[#3b82f6] bg-clip-text text-transparent">{s.value}</p>
                  <p className="text-sm text-[hsl(var(--l-fg-low))] mt-2">{s.label}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Return comparison chart */}
          <AnimatedSection>
            <div id="rendite" className="rounded-2xl bg-[hsl(var(--l-card-bg)/0.06)] border border-[#3b82f6]/10 p-8 md:p-12">
              <div className="text-center mb-10 space-y-2">
                <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">{lang === "de" ? "Rendite im Vergleich" : "Return comparison"}</p>
                <h3 className="text-2xl md:text-3xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
                  {lang === "de" ? "Durchschnittliche Jahresrendite nach Anlageform" : "Average annual return by asset class"}
                </h3>
              </div>
              <div className="space-y-6 max-w-3xl mx-auto">
                {[
                  { label: l("perfComp1"), pct: 2, color: "bg-gray-500" },
                  { label: l("perfComp2"), pct: 12, color: "bg-blue-400" },
                  { label: l("perfComp3"), pct: 8, color: "bg-emerald-500" },
                  { label: l("perfComp4"), pct: 87, color: "bg-gradient-to-r from-[#3b82f6] to-[#93c5fd]" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-[hsl(var(--l-fg-mid))]">{bar.label}</span>
                      <span className={`text-sm font-bold ${bar.pct === 87 ? "text-[#3b82f6]" : "text-[hsl(var(--l-fg-low))]"}`}>+{bar.pct}%</span>
                    </div>
                    <div className="h-4 rounded-full bg-[hsl(var(--l-card-bg)/0.2)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(bar.pct / 87) * 100}%` }}
                        transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                        viewport={{ once: true }}
                        className={`h-full rounded-full ${bar.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[hsl(var(--l-fg-low))] text-center mt-8 italic max-w-2xl mx-auto">
                {lang === "de" ? "*Basierend auf durchschnittlichen Ergebnissen unserer Investoren 2023–2024. Vergangene Performance garantiert keine zukünftigen Ergebnisse." : "*Based on average results of our investors 2023–2024. Past performance does not guarantee future results."}
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>


      {/* ========== PREMIUM CARDS SECTION ========== */}
      <section id="cards" className="bg-[hsl(var(--l-bg-alt))] border-y border-[#3b82f6]/8 py-20 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 max-w-6xl">
          <AnimatedSection className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Copy + CTA */}
            <div className="space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-[#3b82f6]/15 border border-[#3b82f6]/25 rounded-full px-4 py-1.5">
                <CreditCard className="h-4 w-4 text-[#3b82f6]" />
                <span className="text-sm font-semibold text-[#3b82f6]">{lang === "de" ? "Premium Karten" : "Premium Cards"}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))] leading-tight">
                {lang === "de" ? "Ihre Krypto. Ihre Karte." : "Your Crypto. Your Card."}{" "}
                <span className="bg-gradient-to-r from-[#3b82f6] to-[#93c5fd] bg-clip-text text-transparent">
                  {lang === "de" ? "Grenzenlos leben." : "Live without limits."}
                </span>
              </h2>
              <p className="text-[hsl(var(--l-fg-mid))] text-lg leading-relaxed">
                {lang === "de"
                  ? "Die Crypto-Börse Karte ist mehr als nur eine Karte — sie ist Ihr persönlicher Zugang zu einer Welt ohne Grenzen. Bezahlen, reisen und investieren mit Vertrauen, direkt verbunden mit Ihrem Wallet."
                  : "The Crypto-Börse card is more than just a card — it's your personal access to a world without borders. Pay, travel and invest with confidence, directly linked to your wallet."}
              </p>
              <ul className="space-y-3 max-w-md mx-auto md:mx-0">
                {[
                  lang === "de" ? "Bis zu 3,5 % Krypto-Cashback" : "Up to 3.5% crypto cashback",
                  lang === "de" ? "Weltweite gebührenfreie Abhebungen" : "Worldwide fee-free withdrawals",
                  lang === "de" ? "Prestige · Elite · Diamond Club · Sovereign Circle" : "Prestige · Elite · Diamond Club · Sovereign Circle",
                  lang === "de" ? "VIP-Lounge-Zugang & 24/7 Concierge" : "VIP lounge access & 24/7 concierge",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[hsl(var(--l-fg-mid))]">
                    <CheckCircle2 className="h-5 w-5 text-[#3b82f6] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-3">
                <Button size="lg" asChild className="rounded-xl px-8 h-13 text-base bg-gradient-to-r from-[#3b82f6] to-[#1e40af] text-white hover:from-[#60a5fa] hover:to-[#3b82f6] font-bold shadow-lg shadow-[#3b82f6]/20 hover:scale-[1.02] transition-all">
                  <Link to="/cards">
                    {lang === "de" ? "Mehr erfahren" : "Learn More"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" asChild variant="outline" className="rounded-xl px-8 h-13 text-base border-[#3b82f6]/30 hover:bg-[#3b82f6]/10 hover:border-[#3b82f6]/50">
                  <Link to="/contact">
                    {lang === "de" ? "Karte anfordern" : "Request Card"}
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right: Floating card mockups */}
            <div className="relative h-[320px] md:h-[420px] flex items-center justify-center">
              {[
                {
                  label: "PRESTIGE",
                  gradient: "from-[#1e3a8a] via-[#1d4ed8] to-[#3b82f6]",
                  labelColor: "text-white/70",
                  textColor: "text-white",
                  rotate: -12,
                  x: -70,
                  y: 20,
                  z: 10,
                  logo: cardEmblem.url,
                },
                {
                  label: "DIAMOND CLUB",
                  gradient: "from-[#0b1220] via-[#0f1a2f] to-[#1e3a8a]",
                  labelColor: "text-white/60",
                  textColor: "text-white",
                  rotate: 0,
                  x: 0,
                  y: -10,
                  z: 20,
                  logo: cardEmblem.url,
                },
                {
                  label: "SOVEREIGN CIRCLE",
                  gradient: "from-black via-[#0a0a0a] to-[#111827]",
                  labelColor: "text-white/50",
                  textColor: "text-white/95",
                  rotate: 12,
                  x: 70,
                  y: 30,
                  z: 10,
                  logo: cardEmblem.url,
                },
              ].map((c) => (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, y: 40, rotate: c.rotate * 0.5 }}
                  whileInView={{ opacity: 1, y: 0, rotate: c.rotate }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                  className="absolute w-[260px] md:w-[340px]"
                  style={{
                    transform: `translate(${c.x}px, ${c.y}px) rotate(${c.rotate}deg)`,
                    zIndex: c.z,
                  }}
                >
                  <div
                    className={`relative aspect-[1.586/1] rounded-2xl shadow-2xl bg-gradient-to-br ${c.gradient} p-5 md:p-6 flex flex-col justify-between overflow-hidden`}
                    style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.45)" }}
                  >
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 0%, transparent 40%)",
                      }}
                    />
                    <div className="relative flex items-start justify-between">
                      <img
                        src={c.logo}
                        alt="Crypto-Börse"
                        className="h-9 md:h-11 w-auto object-contain drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]"
                      />
                      <span className={`text-[9px] font-semibold tracking-[0.15em] uppercase ${c.labelColor}`}>{c.label}</span>
                    </div>
                    <div className="relative flex items-center gap-2 -mt-2">
                      <div className="w-9 h-7 rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 relative overflow-hidden">
                        <div className="absolute inset-1 border border-yellow-700/40 rounded-sm" />
                        <div className="absolute top-1/2 left-0 right-0 border-t border-yellow-700/40" />
                        <div className="absolute top-0 bottom-0 left-1/2 border-l border-yellow-700/40" />
                      </div>
                      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${c.textColor} opacity-80`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M6 8c2 2 2 6 0 8" />
                        <path d="M9 6c3 3 3 9 0 12" />
                        <path d="M12 4c4 4 4 12 0 16" />
                      </svg>
                    </div>
                    <div className="relative">
                      <div className={`font-mono text-base md:text-lg tracking-widest ${c.textColor}`}>
                        •••• •••• •••• 4823
                      </div>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <div className={`text-[8px] uppercase tracking-widest ${c.labelColor}`}>Karteninhaber</div>
                          <div className={`text-xs font-semibold ${c.textColor}`}>M. MUSTERMANN</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-[8px] uppercase tracking-widest ${c.labelColor}`}>Gültig bis</div>
                          <div className={`text-xs font-semibold ${c.textColor}`}>12/29</div>
                        </div>
                        <div className="flex items-center">
                          <div className="h-5 w-5 rounded-full bg-red-500/90 -mr-2" />
                          <div className="h-5 w-5 rounded-full bg-yellow-400/90" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>


      <section id="vertrauen" className="py-20 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* TOP: Headline and subheadline */}
          <AnimatedSection className="text-center mb-14 space-y-6 max-w-3xl mx-auto">
            <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">{l("trustTag")}</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))] leading-tight">
              {l("trustTitle")}
            </h2>
            <p className="text-[hsl(var(--l-fg-mid))] text-lg leading-relaxed">
              {l("trustSubtitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <span className="px-3 py-1.5 rounded-full border border-[#3b82f6]/15 bg-[hsl(var(--l-card-bg)/0.05)] text-xs text-[hsl(var(--l-fg-low))]">TLS 1.3</span>
              <span className="px-3 py-1.5 rounded-full border border-[#3b82f6]/15 bg-[hsl(var(--l-card-bg)/0.05)] text-xs text-[hsl(var(--l-fg-low))]">AES-256</span>
              <span className="px-3 py-1.5 rounded-full border border-[#3b82f6]/15 bg-[hsl(var(--l-card-bg)/0.05)] text-xs text-[hsl(var(--l-fg-low))]">Cold Storage</span>
              <span className="px-3 py-1.5 rounded-full border border-[#3b82f6]/15 bg-[hsl(var(--l-card-bg)/0.05)] text-xs text-[hsl(var(--l-fg-low))]">2FA / MFA</span>
            </div>
          </AnimatedSection>

          {/* BELOW: Security cards grid */}
          <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Shield, title: l("t1"), desc: l("t1d") },
              { icon: Lock, title: l("t2"), desc: l("t2d") },
              { icon: Headphones, title: l("t3"), desc: l("t3d") },
              { icon: Zap, title: l("t4"), desc: l("t4d") },
              { icon: Award, title: l("t5"), desc: l("t5d") },
              { icon: Landmark, title: l("t6"), desc: l("t6d") },
              { icon: Lock, title: l("s1"), desc: l("s1d") },
              { icon: KeyRound, title: l("s2"), desc: l("s2d") },
              { icon: Fingerprint, title: l("s3"), desc: l("s3d") },
              { icon: Shield, title: l("s4"), desc: l("s4d") },
              { icon: KeySquare, title: l("s5"), desc: l("s5d") },
              { icon: Users, title: l("s6"), desc: l("s6d") },
              { icon: Network, title: l("s7"), desc: l("s7d") },
              { icon: Snowflake, title: l("s8"), desc: l("s8d") },
              { icon: ShieldCheck, title: l("s9"), desc: l("s9d") },
              { icon: Monitor, title: l("s10"), desc: l("s10d") },
              { icon: Globe, title: l("s11"), desc: l("s11d") },
              { icon: Server, title: l("s12"), desc: l("s12d") },
            ].map((f) => (
              <StaggerItem key={f.title}>
                <div className="flex flex-col gap-4 p-5 rounded-2xl bg-[hsl(var(--l-card-bg)/0.04)] border border-[#3b82f6]/6 hover:border-[#3b82f6]/25 hover:bg-[hsl(var(--l-card-bg)/0.08)] transition-all duration-300 h-full group">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#3b82f6]/15 to-[#3b82f6]/5 border border-[#3b82f6]/20 flex items-center justify-center">
                    <f.icon className="h-6 w-6 text-[#3b82f6]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display-landing font-bold text-[hsl(var(--l-fg))] text-base">{f.title}</h3>
                    <p className="text-[hsl(var(--l-fg-low))] text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ========== LIVE MARKET WIDGET ========== */}
      <div id="maerkte">
        <LazyMount minHeight={650}>
          <MarketWidget />
        </LazyMount>


        {/* Crypto Screener */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center mb-10 space-y-4">
              <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">Markt-Screener</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
                Asset Screener
              </h2>
              <p className="text-[hsl(var(--l-fg-mid))] text-lg max-w-2xl mx-auto">
                Filtern und sortieren Sie Assets nach technischen und fundamentalen Indikatoren.
              </p>
            </AnimatedSection>
            <div className="max-w-6xl mx-auto rounded-2xl border border-[#3b82f6]/10 overflow-hidden">
              <LazyMount minHeight={500}>
                <TradingViewScreener market="crypto" height={500} />
              </LazyMount>
            </div>
          </div>
        </section>

      {/* ========== AVAILABLE MARKETS ACCORDION ========== */}
      <AvailableMarkets />

      {/* ========== COMPANY INFO + FAQ ========== */}
      <CompanyFaq />
      </div>

      {/* ========== 4. HOW IT WORKS ========== */}
      <section className="bg-[hsl(var(--l-bg-alt))] border-y border-[#3b82f6]/8 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-14 space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">{l("howTag")}</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
              {l("howTitle")}
            </h2>
            <p className="text-[hsl(var(--l-fg-mid))] text-lg">
              {l("howDesc")}
            </p>
          </AnimatedSection>

          <StaggerContainer className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { step: "1", title: l("step1"), desc: l("step1d"), icon: UserPlus },
              { step: "2", title: l("step2"), desc: l("step2d"), icon: Wallet },
              { step: "3", title: l("step3"), desc: l("step3d"), icon: LineChart },
            ].map((s, i) => (
              <StaggerItem key={s.step}>
                <div className="text-center space-y-5 relative">
                  {i < 2 && <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-[2px] bg-gradient-to-r from-[#3b82f6]/30 to-[#3b82f6]/10" />}
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1e40af] text-white mx-auto shadow-lg shadow-[#3b82f6]/20">
                    <s.icon className="h-7 w-7" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#3b82f6]">{l("stepLabel")} {s.step}</p>
                    <h3 className="font-display-landing font-bold text-[hsl(var(--l-fg))] text-xl">{s.title}</h3>
                    <p className="text-[hsl(var(--l-fg-low))] text-[15px] leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <div className="text-center mt-12">
            <Button size="lg" asChild className="rounded-xl px-10 text-lg h-14 bg-gradient-to-r from-[#3b82f6] to-[#1e40af] text-white hover:from-[#60a5fa] hover:to-[#3b82f6] font-bold shadow-xl shadow-[#3b82f6]/25 hover:scale-[1.02] transition-all">
              <Link to="/signup">
                {l("stepCta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ========== AI TRADING SECTION ========== */}
      <AITradingSection />

      {/* ========== KRYPTO-VORSORGE TEASER ========== */}
      <section id="krypto" className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-[#3b82f6]/10 via-[hsl(var(--l-bg-alt))] to-[#3b82f6]/5 border border-[#3b82f6]/15 p-10 md:p-14 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-radial from-[#3b82f6]/10 via-transparent to-transparent rounded-full blur-3xl" />
              <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 bg-[#3b82f6]/15 border border-[#3b82f6]/25 rounded-full px-4 py-1.5">
                    <PiggyBank className="h-4 w-4 text-[#3b82f6]" />
                    <span className="text-sm font-semibold text-[#3b82f6]">{l("kvBadge")}</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display-landing font-bold text-[hsl(var(--l-fg))] leading-tight">
                    {l("kvTitle1")}{" "}
                    <span className="bg-gradient-to-r from-[#3b82f6] to-[#93c5fd] bg-clip-text text-transparent">{l("kvTitle2")}</span>
                  </h2>
                  <p className="text-[hsl(var(--l-fg-mid))] text-[16px] leading-relaxed">
                    {l("kvDesc")}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-[hsl(var(--l-fg-low))]">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />{l("kvF1")}</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />{l("kvF2")}</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />{l("kvF3")}</span>
                  </div>
                  <Button size="lg" asChild className="rounded-xl px-8 h-13 text-base bg-gradient-to-r from-[#3b82f6] to-[#1e40af] text-white hover:from-[#60a5fa] hover:to-[#3b82f6] font-bold shadow-lg shadow-[#3b82f6]/20">
                    <Link to="/krypto-vorsorge">
                      {l("kvCta")}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: "5\u201310%", label: l("kvS1") },
                    { value: "21 Mio.", label: l("kvS2") },
                    { value: "+220%", label: l("kvS3") },
                    { value: "3", label: l("kvS4") },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-5 rounded-xl bg-[hsl(var(--l-card-bg)/0.08)] border border-[#3b82f6]/10">
                      <p className="text-2xl font-display-landing font-bold bg-gradient-to-r from-[#3b82f6] to-[#93c5fd] bg-clip-text text-transparent">{s.value}</p>
                      <p className="text-xs text-[hsl(var(--l-fg-low))] mt-1">{s.label}</p>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ========== DACH SECTION ========== */}
      <section id="dach" className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <AnimatedSection className="mb-14">
            <div className="relative rounded-3xl overflow-hidden mb-10">
              <img src={dachFinanceImg} alt="Europäisches Finanzzentrum" loading="lazy" width={1280} height={720} className="w-full h-64 md:h-80 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--l-bg))] via-[hsl(var(--l-bg)/0.4)] to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 space-y-3">
                <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">{l("dachTag")}</p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
                  {l("dachTitle")}
                </h2>
                <p className="text-[hsl(var(--l-fg-mid))] text-lg max-w-2xl">
                  {l("dachDesc")}
                </p>
              </div>
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto mb-16">
            {[
              {
                country: lang === "de" ? "Österreich" : "Austria",
                city: lang === "de" ? "Wien (Hauptsitz)" : "Vienna (Main Office)",
                flag: (
                  <div className="flex flex-col gap-[2px]">
                    <div className="w-10 h-[8px] bg-red-700 rounded-t-md" />
                    <div className="w-10 h-[8px] bg-white" />
                    <div className="w-10 h-[8px] bg-red-700 rounded-b-md" />
                  </div>
                ),
                features: la("at_features"),
              },
              {
                country: lang === "de" ? "Deutschland" : "Germany",
                city: lang === "de" ? "Berlin (Investoren-Niederlassung)" : "Berlin (Investors Branch)",
                flag: (
                  <div className="flex flex-col gap-[2px]">
                    <div className="w-10 h-[8px] bg-black rounded-t-md" />
                    <div className="w-10 h-[8px] bg-[#DD0000]" />
                    <div className="w-10 h-[8px] bg-[#FFCE00] rounded-b-md" />
                  </div>
                ),
                features: la("de_features"),
              },
              {
                country: lang === "de" ? "Schweiz" : "Switzerland",
                city: lang === "de" ? "Zürich (Finanz-Niederlassung)" : "Zurich (Finance Branch)",
                flag: (
                  <div className="w-10 h-[28px] bg-red-600 rounded-md relative flex items-center justify-center">
                    <div className="absolute w-[18px] h-[5px] bg-white rounded-[1px]" />
                    <div className="absolute w-[5px] h-[18px] bg-white rounded-[1px]" />
                  </div>
                ),
                features: la("ch_features"),
              },
            ].map((region) => (
              <StaggerItem key={region.country}>
                <div className="rounded-2xl bg-[hsl(var(--l-card-bg)/0.06)] border border-[#3b82f6]/10 hover:border-[#3b82f6]/25 transition-all duration-300 p-7 h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-5">
                    {region.flag}
                    <div>
                      <h3 className="font-display-landing font-bold text-xl text-[hsl(var(--l-fg))]">{region.country}</h3>
                      <p className="text-sm text-[#3b82f6]">{region.city}</p>
                    </div>
                  </div>
                  
                  <ul className="space-y-2.5 flex-1">
                    {region.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[15px] text-[hsl(var(--l-fg-mid))]">
                        <CheckCircle2 className="h-4 w-4 text-[#3b82f6] shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Europe-wide notice + stats combined */}
          <AnimatedSection>
            <div className="rounded-2xl bg-gradient-to-r from-[#3b82f6]/10 via-[#3b82f6]/5 to-[#3b82f6]/10 border border-[#3b82f6]/15 overflow-hidden">
              <div className="p-6 md:p-8 flex items-center gap-5 border-b border-[#3b82f6]/10">
                <Globe className="h-10 w-10 text-[#3b82f6] shrink-0" />
                <div>
                  <h4 className="font-display-landing font-bold text-lg text-[hsl(var(--l-fg))]">
                    {lang === "de" ? "Europaweit für Sie da" : "Serving All of Europe"}
                  </h4>
                  <p className="text-sm text-[hsl(var(--l-fg-mid))] leading-relaxed mt-1">
                    {lang === "de"
                      ? "Neben unseren DACH-Standorten betreuen wir Investoren in ganz Europa — von Frankreich über Italien bis Skandinavien. Profitieren Sie von unserem mehrsprachigen Team und europaweiten Zahlungsmöglichkeiten."
                      : "Beyond our DACH offices, we serve investors across all of Europe — from France and Italy to Scandinavia. Benefit from our multilingual team and Europe-wide payment options."}
                  </p>
                </div>
              </div>
              <div className="p-8 md:p-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  {[
                    { value: "3", label: l("dachS1") },
                    { value: "95%", label: l("dachS2") },
                    { value: "€250", label: l("dachS3") },
                    { value: "8+", label: l("dachS4") },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-3xl md:text-4xl font-display-landing font-bold bg-gradient-to-r from-[#3b82f6] to-[#93c5fd] bg-clip-text text-transparent">{stat.value}</p>
                      <p className="text-sm text-[hsl(var(--l-fg-low))] mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ========== 5. PAYMENT METHODS ========== */}
      <section id="zahlung" className="py-14">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h3 className="text-xl md:text-2xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
            {l("payTitle")}
          </h3>
          <p className="text-[hsl(var(--l-fg-mid))] text-sm">{l("payDesc")}</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
            {paymentMethods.map((pm) => (
              <div key={pm.name} className="flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                {<img src={pm.logo} alt={pm.name} className="h-14 w-auto object-contain" />}
                <span className="text-xs text-[hsl(var(--l-fg-low))] font-medium">{pm.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 6. FOOTER ========== */}
      <PublicFooter />
    </div>
  );
};

export default Landing;
