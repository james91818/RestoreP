import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import WelcomeProofUpload from "@/components/welcome/WelcomeProofUpload";
import {
  ShieldCheck,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Lock,
  Landmark,
  Phone,
} from "lucide-react";

const P2P_URL = "https://p2p.crypto-borse.com";

interface Props {
  /** Optional client first name to personalize the headline */
  clientName?: string | null;
}

const WelcomePaymentCard = ({ clientName }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const [show, setShow] = useState<boolean | null>(true);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    if (!user) {
      setShow(true);
      return () => { cancelled = true; };
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_deposit_at")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      const hasDeposited = !!(data as any)?.first_deposit_at;
      setShow(!hasDeposited);
    })();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  // Note: do NOT auto-scroll to the iframe on mount — the client should land
  // at the top of the welcome page and decide to scroll down themselves.


  if (show === null || show === false) return null;

  const firstName = (clientName || "").split(" ")[0];

  return (
    <motion.section
      id="self-activation"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative max-w-4xl mx-auto scroll-mt-6"
    >
      {/* Top label */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/50 backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs md:text-sm font-bold text-primary uppercase tracking-[0.18em]">
            Schritt 2 von 2 · Konto aktivieren
          </span>
        </div>
      </div>

      <h2 className="text-center text-2xl md:text-4xl font-display font-bold mb-3 leading-tight tracking-tight">
        {firstName ? `${firstName}, ` : ""}aktivieren Sie Ihr Investment-Konto
      </h2>
      <p className="text-center text-sm md:text-lg text-[hsl(var(--hero-muted))] max-w-2xl mx-auto leading-relaxed mb-5">
        Sichere <strong className="text-[hsl(var(--hero-foreground))]">Banküberweisung (P2P)</strong> — der volle Betrag wird
        Ihrem Konto als Guthaben gutgeschrieben. Bitte füllen Sie die Felder im Fenster unten aus.
      </p>

      {/* Compact reassurance strip */}
      <div className="max-w-3xl mx-auto mb-6 grid gap-2 sm:grid-cols-3 text-center">
        {[
          { icon: <ShieldCheck className="w-4 h-4 text-primary" />, text: "Keine Gebühr — 100 % Guthaben" },
          { icon: <Lock className="w-4 h-4 text-primary" />, text: "SSL-verschlüsselt & SEPA-sicher" },
          { icon: <TrendingUp className="w-4 h-4 text-primary" />, text: "Jederzeit auszahlbar" },
        ].map((i) => (
          <div key={i.text} className="flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-[hsl(var(--hero-card))] px-3 py-2.5 text-xs md:text-sm font-medium">
            {i.icon}
            <span>{i.text}</span>
          </div>
        ))}
      </div>

      {/* Support shortcut — compact, does not push the frame down */}
      <div className="max-w-3xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.06] px-4 py-3">
        <span className="text-sm text-[hsl(var(--hero-muted))] text-center sm:text-left">
          Hilfe beim Ausfüllen? Wir rufen Sie aus Deutschland, Österreich oder der Schweiz von einer dieser Nummern an:
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {["+41319002336", "+41319002337", "+41319002338"].map((num) => (
            <a
              key={num}
              href={`tel:${num}`}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              {num.replace("+41", "+41 ").replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4")}
            </a>
          ))}
        </div>
      </div>


      {/* P2P bank-transfer window */}
      <div id="p2p-frame" className="relative rounded-[28px] border border-primary/20 bg-[hsl(var(--hero-card))] p-3 md:p-5 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.25)] overflow-hidden scroll-mt-4">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="flex items-center justify-between px-2 md:px-3 py-2 mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider">
            <Landmark className="w-4 h-4" /> Sichere Banküberweisung
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--hero-muted))]">
            <Lock className="w-3.5 h-3.5 text-primary" />
            SSL-verschlüsselt
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-[hsl(var(--hero-card-border))] bg-[hsl(var(--hero-bg))]">
          <iframe
            src={P2P_URL}
            title="Banküberweisung"
            className="w-full block"
            scrolling="no"
            style={{ height: "1100px", minHeight: "1100px", border: 0 }}
            allow="clipboard-write; clipboard-read"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Details, collapsible — keeps the form above the fold */}
        <details className="mt-5 group rounded-2xl border border-primary/30 bg-[hsl(var(--hero-bg))]/40 p-4 md:p-5">
          <summary className="flex items-center gap-3 cursor-pointer list-none">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm md:text-base flex-1">
              Wie funktioniert die P2P-Überweisung? Warum lautet der Empfänger auf eine Privatperson?
            </span>
            <span className="text-xs text-primary font-bold uppercase">Mehr</span>
          </summary>
          <div className="mt-3 space-y-2 text-sm md:text-base text-[hsl(var(--hero-muted))] leading-relaxed">
            <p>
              Sie kaufen Bitcoin direkt von einem anderen <strong className="text-[hsl(var(--hero-foreground))]">verifizierten Privatkunden</strong>.
              Dieser Bitcoin wird sofort in EUR umgewandelt und vollständig Ihrem Investment-Konto gutgeschrieben.
            </p>
            <p>
              Deshalb lauten die Empfängernamen der Bankkonten auf Privatpersonen — nicht auf eine Firma. Das ist normal.
              Bitte verwenden Sie als Verwendungszweck{" "}
              <strong className="text-[hsl(var(--hero-foreground))]">ausschließlich die im Fenster angezeigte Referenz</strong>.
            </p>
            <p>
              Es handelt sich um eine Einzahlung auf Ihr persönliches Handelskonto — keine Gebühr, kein Kauf eines Produkts.
              Das Guthaben gehört zu 100 % Ihnen und ist jederzeit auszahlbar.
            </p>
          </div>
        </details>

        {/* Post-deposit reassurance */}
        <div className="mt-6 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base md:text-lg text-[hsl(var(--hero-foreground))] font-medium leading-relaxed">
                Sobald Ihre Überweisung eingegangen ist, wird Ihr Investment-Konto automatisch aufgeladen
                und Ihr persönlicher Trading-Berater meldet sich bei Ihnen.
              </p>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[hsl(var(--hero-card-border))]">
          <Badge icon={<ShieldCheck className="w-5 h-5 text-primary" />} label="SEPA-sicher" />
          <Badge icon={<Landmark className="w-5 h-5 text-primary" />} label="EU-Bank" />
          <Badge icon={<Lock className="w-5 h-5 text-primary" />} label="Treuhand-Konto" />
          <Badge icon={<TrendingUp className="w-5 h-5 text-primary" />} label="Jederzeit auszahlbar" />
        </div>
      </div>

      <WelcomeProofUpload />

    </motion.section>
  );
};

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5 px-2">
      {icon}
      <span className="text-xs font-medium text-[hsl(var(--hero-foreground))]">{label}</span>
    </div>
  );
}

export default WelcomePaymentCard;
