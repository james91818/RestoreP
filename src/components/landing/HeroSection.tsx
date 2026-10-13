import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Zap, ShieldCheck, Lock, UserRound, Headphones } from "lucide-react";
import type { Lang } from "@/lib/landingTranslations";
import heroBg from "@/assets/hero-trading.jpg";

const t = (lang: Lang, de: string, en: string) => (lang === "de" ? de : en);

const HeroSection = ({ lang }: { lang: Lang }) => {
  const reduce = useReducedMotion();

  const fadeUp = (delay = 0) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay } }
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay },
        };

  const allocation = [
    { label: "Bitcoin", pct: 42 },
    { label: "Ethereum", pct: 31 },
    { label: t(lang, "Weitere Assets", "Other assets"), pct: 27 },
  ];

  const benefits = [
    { icon: Zap, label: t(lang, "Blitzschnelle Transaktionen", "Lightning-fast transactions") },
    { icon: ShieldCheck, label: t(lang, "Institutioneller Vermögensschutz", "Institutional wealth protection") },
    { icon: Lock, label: t(lang, "Marktführende KI-Intelligenz", "Market-leading AI intelligence") },
    { icon: UserRound, label: t(lang, "Lizenzierte Partner", "Licensed partners") },
    { icon: UserRound, label: t(lang, "Persönliche DACH-Betreuung", "Personal DACH advisory") },
    { icon: Headphones, label: t(lang, "24/7 Support", "24/7 support") },
  ];

  return (
    <section
      id="hero"
      className="relative overflow-hidden"
      style={{ color: "#F5F7FA" }}
    >
      {/* Cinematic background photo */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      {/* Navy overlay */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(2,12,27,0.78) 0%, rgba(3,15,34,0.58) 40%, rgba(5,22,48,0.28) 70%, rgba(3,14,31,0.42) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 72% 42%, rgba(76,135,255,0.08), transparent 48%), linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.16))",
        }}
      />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-16 sm:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* LEFT COLUMN */}
          <div className="w-full text-left max-w-xl lg:max-w-2xl">
            <motion.div {...fadeUp(0)} className="mb-5">
              <span className="inline-block text-[10px] sm:text-[11px] font-medium tracking-[0.18em] uppercase text-white/60 px-3 py-1.5 rounded-full border border-white/[0.08] bg-[#081830]/40">
                {t(lang, "DIGITALE VERMÖGENSVERWALTUNG", "DIGITAL WEALTH MANAGEMENT")}
              </span>
            </motion.div>

            <motion.h1
              {...fadeUp(0.05)}
              lang="de"
              className="hero-glass-text font-display-landing text-4xl sm:text-5xl lg:text-6xl xl:text-[4.5rem] font-normal leading-[1.08] tracking-tight mb-5 pb-1"
            >
              <span className="block pb-1">{t(lang, "Ihr Partner für", "Your partner for")}</span>
              <strong className="hero-glass-text-animated block font-semibold pb-1">{t(lang, "digitales", "digital")}</strong>
              <strong className="hero-glass-text-animated block font-semibold pb-1">{t(lang, "Vermögen.", "wealth.")}</strong>
            </motion.h1>

            <motion.p
              {...fadeUp(0.1)}
              className="text-sm sm:text-base leading-relaxed text-[#9BA9BD] max-w-xl mb-6"
            >
              {t(
                lang,
                "Unsere KI-gestützten Systeme analysieren globale Kryptomärkte in Echtzeit und ermöglichen eine hochperformante Umsetzung mit moderner Handelsinfrastruktur und Ausführungszeiten von unter 50 Millisekunden. Erfahrene Experten und lizenzierte Finanzpartner begleiten dabei die Umsetzung.",
                "Our AI-powered systems analyse global crypto markets in real time and enable high-performance execution with modern trading infrastructure and execution times of under 50 milliseconds. Experienced experts and licensed financial partners guide every step.",
              )}
            </motion.p>

            <motion.div {...fadeUp(0.15)} className="flex flex-wrap items-center gap-3 mb-6">
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center h-10 px-5 rounded-md bg-white text-[#071326] text-sm font-semibold border border-white transition-transform hover:-translate-y-0.5"
              >
                {t(lang, "Strategie entdecken", "Discover strategy")}
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.25} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-[#061328]/60 border border-white/20 text-white/90 text-sm font-medium transition-colors hover:bg-[#061328]/80"
              >
                {t(lang, "Mehr erfahren", "Learn more")}
              </Link>
            </motion.div>

            {/* Benefit pills — 2 col grid */}
            <motion.div
              {...fadeUp(0.22)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg"
            >
              {benefits.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 min-h-[34px] px-3 py-2 rounded-full bg-[#06142b]/60 border border-[#9bbef0]/20 text-[#e7eef9]/80 text-xs font-medium backdrop-blur-md"
                >
                  <Icon className="w-3 h-3 text-[#4C87FF] shrink-0" strokeWidth={2} />
                  {label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* RIGHT COLUMN — Musterportfolio */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="relative w-full mx-auto max-w-xl lg:max-w-2xl xl:max-w-none z-10"
          >
            <div
              className="relative rounded-2xl border border-[#a7c3eb]/20 bg-gradient-to-br from-[#325489]/20 to-[#0e284f]/20 backdrop-blur-xl shadow-2xl p-6 sm:p-8 text-[#F3F6FA]"
              style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.05)" }}
            >
              {/* Header */}
              <div className="mb-4">
                <p className="text-[10px] sm:text-[11px] font-medium tracking-[0.18em] uppercase text-[#bbcde7]/60">
                  {t(lang, "Verwaltetes Vermögen", "Assets under management")}
                </p>
                <h3 className="font-display-landing text-lg sm:text-xl font-medium tracking-tight text-white mt-1">
                  Crypto-Börse Portfolio
                </h3>
              </div>

              {/* Main value */}
              <div className="mb-4">
                <p className="text-[10px] sm:text-[11px] font-medium tracking-[0.18em] uppercase text-[#bbcde7]/60 mb-2">
                  {t(lang, "Performance", "Performance")}
                </p>
                <div className="flex items-baseline gap-3">
                  <p className="font-display-landing text-3xl sm:text-4xl font-normal text-white tracking-tight leading-none">
                    +24,8 %
                  </p>
                  <span className="text-[10px] sm:text-[11px] font-medium tracking-[0.12em] uppercase text-white/50">
                    12M
                  </span>
                </div>
              </div>

              {/* Chart */}
              <div className="relative mb-4 h-28 sm:h-36">
                <svg viewBox="0 0 560 150" width="100%" height="100%" preserveAspectRatio="none">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line
                      key={i}
                      x1={0}
                      x2={560}
                      y1={15 + i * 28}
                      y2={15 + i * 28}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={1}
                    />
                  ))}
                  <motion.path
                    d="M0,115 C80,110 140,102 200,92 C260,83 320,72 380,58 C440,46 500,37 560,30"
                    fill="none"
                    stroke="#4C87FF"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 0 10px rgba(76,135,255,0.55))" }}
                    initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.25 }}
                  />
                  <motion.path
                    d="M0,115 C80,110 140,102 200,92 C260,83 320,72 380,58 C440,46 500,37 560,30 L560,150 L0,150 Z"
                    fill="rgba(76,135,255,0.12)"
                    stroke="none"
                    initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.0, ease: "easeOut", delay: 0.25 }}
                  />
                </svg>
              </div>

              {/* Allocation */}
              <div className="mb-4">
                <p className="text-[10px] sm:text-[11px] font-medium tracking-[0.18em] uppercase text-[#bbcde7]/60 mb-3">
                  {t(lang, "Strategische Allokation", "Strategic allocation")}
                </p>
                <div className="space-y-2">
                  {allocation.map((a) => (
                    <div key={a.label} className="grid grid-cols-[120px_1fr_44px] sm:grid-cols-[150px_1fr_44px] items-center gap-3">
                      <span className="text-xs sm:text-sm font-medium text-[#f0f5fc]/90">
                        {a.label}
                      </span>
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={reduce ? { width: `${a.pct}%` } : { width: 0 }}
                          whileInView={{ width: `${a.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.0, ease: "easeOut", delay: 0.2 }}
                          className="h-full rounded-full bg-[#4C87FF]"
                          style={{ boxShadow: "0 0 8px rgba(76,135,255,0.35)" }}
                        />
                      </div>
                      <span className="font-mono text-xs font-medium text-[#f0f5fc]/90 text-right">
                        {a.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security badges */}
              <div className="pt-3 border-t border-white/10">
                <p className="text-[10px] sm:text-[11px] font-medium tracking-[0.14em] uppercase text-[#bbcde7]/60 mb-3">
                  {t(lang, "Gesichert durch", "Secured by")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    "TLS 1.3",
                    "AES-256",
                    "Argon2id",
                    "HSM",
                    "KMS",
                    "Multi-Sig",
                    "MPC",
                    "Cold Storage",
                  ].map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium font-mono text-[#dce8ff]/80 bg-white/10 border border-white/10"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
