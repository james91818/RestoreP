import { motion, useInView, animate } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Brain, Activity, Shield, Zap, Database, Eye, Target } from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";


/* ─── Animated counter ─── */
const CountUp = ({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, target, {
      duration: 2,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString("de-DE")),
    });
    return () => controls.stop();
  }, [isInView, target]);

  return <span ref={ref}>{prefix}{display}{suffix}</span>;
};

/* ─── Floating badge ─── */
const FloatingBadge = ({ text, delay, position }: { text: string; delay: number; position: string }) => (
  <motion.div
    className={`absolute ${position} bg-[hsl(var(--l-bg-alt))]/90 backdrop-blur-sm border border-[#3b82f6]/25 rounded-xl px-4 py-2 shadow-xl z-20`}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.9] }}
    transition={{ duration: 4, delay, repeat: Infinity, repeatDelay: 8, ease: "easeInOut" }}
  >
    <span className="text-[hsl(var(--l-fg-mid))] text-sm font-medium whitespace-nowrap">{text}</span>
  </motion.div>
);

/* ─── Orbiting dot ─── */
const OrbitDot = ({ size, radius, duration, color }: { size: number; radius: number; duration: number; color: string }) => (
  <motion.div
    className="absolute top-1/2 left-1/2"
    style={{ width: radius * 2, height: radius * 2, marginLeft: -radius, marginTop: -radius }}
    animate={{ rotate: 360 }}
    transition={{ duration, repeat: Infinity, ease: "linear" }}
  >
    <div className={`absolute top-0 left-1/2 -translate-x-1/2 rounded-full ${color}`} style={{ width: size, height: size }} />
  </motion.div>
);

const stats = [
  { value: 247, suffix: "+", label: "Analysierte Märkte" },
  { value: 89, suffix: "%", label: "Signalgenauigkeit" },
  { value: 12400, suffix: "/s", label: "Datenpunkte" },
  { value: 50, prefix: "<", suffix: "ms", label: "Reaktionszeit" },
];

const steps = [
  { icon: Database, title: "Marktdaten sammeln", desc: "Die KI scannt 500+ Märkte in Echtzeit — Preise, Volumen, Nachrichten und Social-Media-Stimmung." },
  { icon: Eye, title: "Muster erkennen", desc: "Machine Learning identifiziert profitable Muster, die dem menschlichen Auge verborgen bleiben." },
  { icon: Target, title: "Signal senden", desc: "Sie erhalten sofortige Handelssignale mit Ein- und Ausstiegspunkten und Risikobewertung." },
];

const features = [
  { icon: Brain, title: "KI-Analyse", stat: "89%", statLabel: "Genauigkeit", desc: "Echtzeit-Marktanalyse mit Deep Learning für fundierte Einblicke." },
  { icon: Activity, title: "Auto-Strategien", stat: "24/7", statLabel: "Aktivität", desc: "Emotionslose Ausführung vordefinierter Handelsregeln." },
  { icon: Shield, title: "Risikoschutz", stat: "3×", statLabel: "Absicherung", desc: "Automatische Stop-Loss und Positionsgrößen-Optimierung." },
  { icon: Zap, title: "Blitzschnell", stat: "<50", statLabel: "ms Latenz", desc: "Millisekunden-Reaktionszeit bei Marktveränderungen." },
];

export default function AITradingSection() {
  return (
    <section id="technology" className="relative py-28 md:py-40 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[hsl(var(--l-bg))]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#3b82f6]/[0.06] via-transparent to-[#3b82f6]/[0.04]" />
      <div
        className="absolute inset-0 opacity-[0.5] dark:opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(59,130,246,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.10) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 75%)",
        }}
      />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#3b82f6]/[0.10] rounded-full blur-[180px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#60a5fa]/[0.08] rounded-full blur-[140px]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <AnimatedSection className="text-center mb-6 space-y-4">
          <p className="text-[#3b82f6] text-sm font-semibold tracking-[0.2em] uppercase">KI-Technologie</p>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-display-landing font-bold text-[hsl(var(--l-fg))] leading-tight">
            Ihr persönlicher<br />
            <span className="bg-gradient-to-r from-[#3b82f6] via-[#93c5fd] to-[#3b82f6] bg-clip-text text-transparent">
              KI-Trading-Assistent
            </span>
          </h2>
          <p className="text-[hsl(var(--l-fg-low))] text-lg max-w-2xl mx-auto">
            Modernste künstliche Intelligenz analysiert die Märkte rund um die Uhr — damit Sie fundierte Entscheidungen treffen können.
          </p>
        </AnimatedSection>

        {/* ─── Robot Hero with animated rings ─── */}
        <AnimatedSection className="flex justify-center my-12 md:my-20">
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-[22rem] md:h-[22rem] lg:w-[26rem] lg:h-[26rem]">
            {/* Radar sweep */}
            <div className="absolute inset-0 rounded-full animate-radar-sweep" />

            {/* Pulsing rings */}
            <div className="absolute inset-[-12px] sm:inset-[-16px] rounded-full border border-[#3b82f6]/20 animate-ai-pulse" />
            <div className="absolute inset-[-28px] sm:inset-[-36px] rounded-full border border-[#3b82f6]/10 animate-ai-pulse" style={{ animationDelay: "0.7s" }} />
            <div className="hidden sm:block absolute inset-[-56px] rounded-full border border-[#3b82f6]/5 animate-ai-pulse" style={{ animationDelay: "1.4s" }} />

            {/* Orbiting dots - hidden on small screens to prevent overflow */}
            <div className="hidden sm:block">
              <OrbitDot size={8} radius={170} duration={12} color="bg-[#3b82f6]" />
              <OrbitDot size={6} radius={200} duration={18} color="bg-emerald-400" />
            </div>
            <div className="hidden lg:block">
              <OrbitDot size={5} radius={230} duration={25} color="bg-[#3b82f6]/60" />
            </div>

            {/* AI core */}
            <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-[#3b82f6]/30 shadow-2xl shadow-[#3b82f6]/20 bg-gradient-to-br from-[#3b82f6]/20 via-[#3b82f6]/5 to-[hsl(var(--l-bg-alt))] flex items-center justify-center">
              <Brain className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 text-[#3b82f6]/80 drop-shadow-[0_0_30px_rgba(59,130,246,0.4)]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#3b82f6]/15 via-transparent to-transparent" />
            </div>

            {/* Status badge */}
            <motion.div
              className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 bg-[hsl(var(--l-bg-alt))]/95 backdrop-blur-sm border border-[#3b82f6]/30 rounded-xl px-3 py-2 md:px-4 md:py-2.5 shadow-xl z-20"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 text-xs md:text-sm font-semibold">Aktiv — Echtzeit</span>
              </div>
            </motion.div>

            {/* Floating badges - hidden on very small screens */}
            <div className="hidden sm:block">
              <FloatingBadge text="📡 Scanning BTC/EUR…" delay={0} position="top-0 -left-8 md:-left-20" />
              <FloatingBadge text="✅ Signal erkannt" delay={4} position="top-1/4 -right-6 md:-right-24" />
              <FloatingBadge text="🛡️ Risiko: Niedrig" delay={8} position="bottom-1/4 -left-6 md:-left-24" />
            </div>
          </div>
        </AnimatedSection>

        {/* ─── Stats Row with count-up ─── */}
        <AnimatedSection delay={0.15} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto mb-20">
          {stats.map((s) => (
            <div key={s.label} className="text-center px-2">
              <p className="text-2xl md:text-4xl font-display-landing font-bold text-[#3b82f6]">
                <CountUp target={s.value} suffix={s.suffix} prefix={s.prefix} />
              </p>
              <p className="text-[hsl(var(--l-fg-low))] text-xs md:text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </AnimatedSection>

        {/* ─── How It Works - 3 Steps ─── */}
        <AnimatedSection className="mb-20">
          <h3 className="text-center text-2xl md:text-3xl font-display-landing font-bold text-[hsl(var(--l-fg))] mb-12">
            So funktioniert es
          </h3>
          <div className="relative max-w-4xl mx-auto">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[16.7%] right-[16.7%] h-px border-t-2 border-dashed border-[#3b82f6]/20" />

            <StaggerContainer className="grid md:grid-cols-3 gap-8">
              {steps.map((step, i) => (
                <StaggerItem key={step.title}>
                  <div className="text-center space-y-4 relative">
                    {/* Step number ring */}
                    <div className="relative mx-auto w-20 h-20">
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-[#3b82f6]/30"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      />
                      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/5 flex items-center justify-center">
                        <step.icon className="h-8 w-8 text-[#3b82f6]" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#3b82f6] text-[hsl(var(--l-bg))] text-xs font-bold flex items-center justify-center shadow-lg">
                        {i + 1}
                      </div>
                    </div>
                    <h4 className="font-display-landing font-bold text-[hsl(var(--l-fg))] text-lg">{step.title}</h4>
                    <p className="text-[hsl(var(--l-fg-low))] text-[15px] leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </AnimatedSection>

        {/* ─── Feature Cards 2×2 ─── */}
        <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <div className="group relative bg-[hsl(var(--l-bg-alt))] border border-[#3b82f6]/15 rounded-xl p-7 text-center hover:border-[#3b82f6]/50 transition-all duration-500 h-full hover:-translate-y-1 hover:shadow-xl hover:shadow-[#3b82f6]/15 backdrop-blur-sm">
                {/* Icon */}
                <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/5 border border-[#3b82f6]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                  <f.icon className="h-8 w-8 text-[#3b82f6]" />
                </div>
                {/* Stat */}
                <p className="text-2xl font-display-landing font-bold text-[#3b82f6] mb-0.5">{f.stat}</p>
                <p className="text-[hsl(var(--l-fg-low))] text-xs mb-3">{f.statLabel}</p>
                {/* Title & desc */}
                <h3 className="font-display-landing font-bold text-[hsl(var(--l-fg))] text-lg mb-2">{f.title}</h3>
                <p className="text-[hsl(var(--l-fg-low))] text-[15px] leading-relaxed">{f.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
