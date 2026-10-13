import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, CreditCard, Wallet, Sparkles } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import PageHero from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import cardEmblem from "@/assets/crypto-boerse-card-emblem.png.asset.json";

type CardTier = {
  name: string;
  tagline: string;
  minBalance: string;
  benefits: string[];
  features?: string[];
  cardClass: string;
  labelClass: string;
  numberClass: string;
  logoSrc: string;
  tierLabel: string;
};

const tiers: CardTier[] = [
  {
    name: "Prestige Karte",
    tagline: "Für ambitionierte Anleger, die Exklusivität schätzen.",
    minBalance: "€50.000",
    benefits: [
      "1 % Krypto-Cashback auf jede Transaktion",
      "Weltweiter Zugang zu Geldautomaten mit minimalen Gebühren",
      "Schnelle SEPA- und SWIFT-Überweisungen",
      "Komplimentäre Reiseversicherung im Ausland",
    ],
    tierLabel: "PRESTIGE",
    cardClass: "bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#3b82f6]",
    labelClass: "text-white/70",
    numberClass: "text-white",
    logoSrc: cardEmblem.url,
  },
  {
    name: "Elite Karte",
    tagline: "Der nächste Schritt für ambitionierte Profis.",
    minBalance: "€100.000",
    benefits: [
      "1,5 % Krypto-Cashback auf alle Käufe",
      "Gebührenfreie Abhebungen weltweit",
      "Priorisierte Transaktionen — schneller international & national",
      "Lounge-Vergünstigungen und exklusive Reiseversicherung",
      "Erweiterte Sicherheit mit Verschlüsselung & Echtzeit-Benachrichtigungen",
    ],
    tierLabel: "ELITE",
    cardClass: "bg-gradient-to-br from-slate-300 via-slate-100 to-slate-400",
    labelClass: "text-slate-600",
    numberClass: "text-slate-800",
    logoSrc: cardEmblem.url,
  },
  {
    name: "Diamond Club Karte",
    tagline: "Gefertigt für Elite-Reisende und ernsthafte Investoren.",
    minBalance: "€250.000",
    benefits: [
      "2 % Krypto-Cashback auf jede Transaktion",
      "Unbegrenzte, gebührenfreie Abhebungen weltweit",
      "Priority-Lounge-Zugang & Priority-Boarding",
      "Dedizierter persönlicher Account-Manager",
      "Einladungen zu globalen Krypto-Summits & Galas",
    ],
    tierLabel: "DIAMOND CLUB",
    cardClass: "bg-gradient-to-br from-[#0b1220] via-[#0f1a2f] to-[#1e3a8a]",
    labelClass: "text-white/60",
    numberClass: "text-white",
    logoSrc: cardEmblem.url,
  },
  {
    name: "Sovereign Circle Karte",
    tagline: "Der Gipfel des Luxus und finanzieller Souveränität.",
    minBalance: "€1.000.000",
    benefits: [
      "3,5 % Krypto-Cashback — die höchsten Rewards überhaupt",
      "Privatjet-Kontingent: 12 Stunden pro Jahr innerhalb Europas",
      "Persönlicher Concierge rund um die Uhr",
      "VIP-Lounge-Zugang in über 1.200 Flughäfen weltweit",
      "Keine Wechselgebühren — globaler Fee-Waiver",
    ],
    features: [
      "KI-basierter Betrugsschutz und mehrstufige Authentifizierung",
      "Früher Zugang zu Premium-Krypto- und Fiat-Portfolios",
      "Exklusive Concierge-Services für jeden Lebensbereich",
      "Einladungen zu globalen Krypto-Summits und Premium-Events",
    ],
    tierLabel: "SOVEREIGN CIRCLE",
    cardClass: "bg-gradient-to-br from-black via-[#0a0a0a] to-[#111827]",
    labelClass: "text-white/50",
    numberClass: "text-white/95",
    logoSrc: cardEmblem.url,
  },
];

const CardMockup = ({ tier }: { tier: CardTier }) => (
  <div className="relative w-full max-w-[440px] mx-auto">
    <div
      className={`relative aspect-[1.586/1] rounded-2xl shadow-2xl ${tier.cardClass} p-6 md:p-7 flex flex-col justify-between overflow-hidden rotate-[-3deg] hover:rotate-0 transition-transform duration-500`}
      style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)" }}
    >
      {/* subtle pattern overlay */}
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
          src={tier.logoSrc}
          alt="Crypto-Börse"
          className="h-11 md:h-12 w-auto object-contain drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]"
        />
        <span className={`text-[10px] font-semibold tracking-[0.15em] uppercase ${tier.labelClass}`}>{tier.tierLabel}</span>
      </div>

      {/* Chip */}
      <div className="relative flex items-center gap-3 -mt-2">
        <div className="w-10 h-8 rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 relative overflow-hidden">
          <div className="absolute inset-1 border border-yellow-700/40 rounded-sm" />
          <div className="absolute top-1/2 left-0 right-0 border-t border-yellow-700/40" />
          <div className="absolute top-0 bottom-0 left-1/2 border-l border-yellow-700/40" />
        </div>
        {/* contactless icon */}
        <svg viewBox="0 0 24 24" className={`h-5 w-5 ${tier.numberClass} opacity-80`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 8c2 2 2 6 0 8" />
          <path d="M9 6c3 3 3 9 0 12" />
          <path d="M12 4c4 4 4 12 0 16" />
        </svg>
      </div>

      <div className="relative">
        <div className={`font-mono text-lg md:text-xl tracking-widest ${tier.numberClass}`}>
          •••• •••• •••• 4823
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className={`text-[9px] uppercase tracking-widest ${tier.labelClass}`}>Karteninhaber</div>
            <div className={`text-sm font-semibold ${tier.numberClass}`}>M. MUSTERMANN</div>
          </div>
          <div className="text-right">
            <div className={`text-[9px] uppercase tracking-widest ${tier.labelClass}`}>Gültig bis</div>
            <div className={`text-sm font-semibold ${tier.numberClass}`}>12/29</div>
          </div>
          {/* payment brand mark */}
          <div className="flex items-center gap-[-6px]">
            <div className="h-6 w-6 rounded-full bg-red-500/90 -mr-2" />
            <div className="h-6 w-6 rounded-full bg-yellow-400/90" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Cards = () => {
  useEffect(() => {
    document.title = "Karten — Crypto-Börse";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <PageHero
        kicker="Karten"
        icon={CreditCard}
        title="Grenzenlos"
        highlight="leben"
        description="Die Crypto-Börse Karte ist mehr als eine Karte — sie ist Ihr persönlicher Zugang zu einer Welt ohne Grenzen. Bezahlen, reisen und investieren mit Vertrauen."
        compact
      >
        <Button asChild variant="secondary" className="rounded-full">
          <Link to="/account-types">
            Zu den Kontotypen <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </PageHero>

      <section className="container mx-auto px-4 py-16 md:py-24 space-y-20 md:space-y-28">
        {tiers.map((tier, i) => {
          const reverse = i % 2 === 1;
          return (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`grid md:grid-cols-2 gap-10 md:gap-16 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
            >
              <div>
                <CardMockup tier={tier} />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                  {tier.name}
                </h2>
                <p className="mt-2 text-muted-foreground text-base md:text-lg">{tier.tagline}</p>

                <div className="mt-6 rounded-xl border bg-card p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Voraussetzung</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    Mindestguthaben: <span className="text-primary">{tier.minBalance}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Vorteile</div>
                  <ul className="space-y-2.5">
                    {tier.benefits.map((b) => (
                      <li key={b} className="flex gap-3 text-sm md:text-base text-foreground/90">
                        <Check className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {tier.features && (
                  <div className="mt-6">
                    <div className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Weitere Merkmale</div>
                    <ul className="space-y-2.5">
                      {tier.features.map((f) => (
                        <li key={f} className="flex gap-3 text-sm md:text-base text-foreground/90">
                          <Sparkles className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-8">
                  <Button asChild size="lg" className="rounded-full">
                    <Link to="/contact">
                      » Karte anfordern
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Topping up */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border bg-card p-8 md:p-12 grid md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Wallet className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">Karte aufladen</h3>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              Ihre Crypto-Börse Karte lässt sich jederzeit direkt aus Ihrem Wallet aufladen — per SEPA-Überweisung, Krypto-Einzahlung oder sofortigem Krypto-zu-Fiat-Swap. Guthaben steht in wenigen Minuten zur Verfügung.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/wallet">Zum Wallet</Link>
              </Button>
              <Button asChild className="rounded-full">
                <Link to="/contact">Karte anfordern</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default Cards;