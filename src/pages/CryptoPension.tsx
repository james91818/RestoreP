import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PublicNav from "@/components/layout/PublicNav";
import { motion } from "framer-motion";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/landing/AnimatedSection";
import {
  Shield, TrendingUp, Clock, Lock, PiggyBank, CheckCircle2,
  ArrowRight, HelpCircle, Landmark, Users, BarChart3, Heart,
  MessageSquare, Mail,
} from "lucide-react";
import logoAsset from "@/assets/crypto-boerse-logo.png.asset.json";
const logo = logoAsset.url;

const benefits = [
  {
    icon: TrendingUp,
    title: "Langfristiges Wachstum",
    desc: "Bitcoin hat seit 2010 eine durchschnittliche j\u00e4hrliche Rendite von \u00fcber 100% erzielt. Selbst konservative Beimischungen von 5\u201310% k\u00f6nnen Ihr Portfolio erheblich st\u00e4rken.",
  },
  {
    icon: Shield,
    title: "Reguliert & Sicher",
    desc: "Ihre digitalen Verm\u00f6genswerte werden in institutionellen Cold-Storage-L\u00f6sungen verwahrt \u2014 getrennt von Firmengeldern, versichert und gepr\u00fcft.",
  },
  {
    icon: Lock,
    title: "Inflationsschutz",
    desc: "Bitcoin hat eine feste Obergrenze von 21 Millionen Einheiten. Im Gegensatz zu Fiat-W\u00e4hrungen kann kein Staat mehr davon drucken \u2014 ein nat\u00fcrlicher Schutz gegen Geldentwertung.",
  },
  {
    icon: Clock,
    title: "Flexible Laufzeiten",
    desc: "W\u00e4hlen Sie zwischen Sparpl\u00e4nen ab 5, 10, 15 oder 20 Jahren. Monatliche Beitr\u00e4ge ab 100\u20ac \u2014 jederzeit anpassbar.",
  },
  {
    icon: Users,
    title: "Pers\u00f6nliche Beratung",
    desc: "Jeder Kunde erh\u00e4lt einen deutschsprachigen Berater, der die Strategie erkl\u00e4rt, begleitet und regelm\u00e4\u00dfig \u00fcberpr\u00fcft. Keine Fachbegriffe, klare Sprache.",
  },
  {
    icon: Landmark,
    title: "DACH-konform",
    desc: "Unser Modell ber\u00fccksichtigt die steuerlichen Rahmenbedingungen in Deutschland, \u00d6sterreich und der Schweiz. Wir arbeiten mit Steuerberatern zusammen.",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Beratungsgespr\u00e4ch",
    desc: "In einem kostenlosen Erstgespr\u00e4ch analysieren wir Ihre Situation, Ihre Ziele und Ihren Zeithorizont. Kein Fachwissen n\u00f6tig.",
  },
  {
    step: "2",
    title: "Strategie festlegen",
    desc: "Gemeinsam legen wir Ihren pers\u00f6nlichen Krypto-Anteil fest \u2014 typischerweise 5\u201320% Ihres Gesamtportfolios, abgestimmt auf Ihr Risikoprofil.",
  },
  {
    step: "3",
    title: "Automatischer Sparplan",
    desc: "Ihr monatlicher Beitrag wird automatisch investiert \u2014 per SEPA-Lastschrift. Sie m\u00fcssen sich um nichts k\u00fcmmern.",
  },
  {
    step: "4",
    title: "Regelm\u00e4\u00dfige Berichte",
    desc: "Jeden Monat erhalten Sie einen verst\u00e4ndlichen Bericht \u00fcber die Entwicklung Ihres Krypto-Vorsorgeplans.",
  },
];

const faqs = [
  {
    q: "Ist Krypto nicht zu riskant f\u00fcr die Altersvorsorge?",
    a: "Bei einer Beimischung von 5\u201310% in einem diversifizierten Portfolio bleibt das Gesamtrisiko \u00fcberschaubar. Studien zeigen, dass selbst kleine Bitcoin-Anteile die risikoadjustierte Rendite langfristig verbessern k\u00f6nnen. Au\u00dferdem investieren bereits gro\u00dfe Pensionsfonds \u2014 wie die \u00c4rzteversorgung Nordrhein \u2014 in Kryptow\u00e4hrungen.",
  },
  {
    q: "Ab welchem Betrag kann ich starten?",
    a: "Unser Krypto-Vorsorgeplan beginnt ab 100\u20ac monatlich oder einer Einmalanlage ab 5.000\u20ac. Sie k\u00f6nnen Ihren Beitrag jederzeit erh\u00f6hen, senken oder pausieren.",
  },
  {
    q: "Wie werden meine Kryptow\u00e4hrungen aufbewahrt?",
    a: "Ihre digitalen Verm\u00f6genswerte werden in institutionellen Cold-Storage-L\u00f6sungen verwahrt \u2014 offline, versichert und getrennt von Firmengeldern. Zus\u00e4tzlich sichern Zwei-Faktor-Authentifizierung und Multi-Signatur-Verfahren Ihr Konto.",
  },
  {
    q: "Was passiert steuerlich?",
    a: "In Deutschland sind Krypto-Gewinne nach einer Haltedauer von \u00fcber einem Jahr steuerfrei. In \u00d6sterreich gilt ein fester Steuersatz von 27,5%. In der Schweiz f\u00e4llt lediglich Verm\u00f6genssteuer an. Wir unterst\u00fctzen Sie bei der steuerlichen Dokumentation.",
  },
  {
    q: "Kann ich jederzeit auf mein Geld zugreifen?",
    a: "Ja. Obwohl ein Krypto-Vorsorgeplan langfristig angelegt ist, k\u00f6nnen Sie jederzeit Teilauszahlungen vornehmen. Es gibt keine Sperrfristen.",
  },
];

const CryptoPension = () => {
  return (
    <div className="min-h-screen bg-[hsl(var(--l-bg))] text-[hsl(var(--l-fg))]">
      <PublicNav />

      {/* Hero */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-radial from-[#3b82f6]/8 via-transparent to-transparent rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 text-[#3b82f6] text-sm font-semibold tracking-wider uppercase mb-4">
                <PiggyBank className="h-4 w-4" />
                Krypto-Vorsorge
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display-landing font-bold leading-tight">
                Ihre Altersvorsorge.{" "}
                <span className="bg-gradient-to-r from-[#3b82f6] via-[#93c5fd] to-[#3b82f6] bg-clip-text text-transparent">
                  Zukunftssicher.
                </span>
              </h1>
              <p className="text-[hsl(var(--l-fg-mid))] text-lg md:text-xl mt-6 max-w-2xl mx-auto leading-relaxed">
                Erg{"\u00e4"}nzen Sie Ihre klassische Altersvorsorge mit Bitcoin und digitalen Verm{"\u00f6"}genswerten.
                Bereits gro{"\u00df"}e Pensionsfonds in Deutschland setzen auf Krypto {"\u2014"} jetzt k{"\u00f6"}nnen auch Sie davon profitieren.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button size="lg" asChild className="rounded-xl px-10 text-lg h-14 bg-gradient-to-r from-[#3b82f6] to-[#1e40af] text-white hover:from-[#60a5fa] hover:to-[#3b82f6] font-bold shadow-xl shadow-[#3b82f6]/25">
                <Link to="/signup">
                  Kostenlose Beratung anfragen
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-xl px-8 h-14 text-lg border-[hsl(var(--l-card-border)/0.2)] text-[hsl(var(--l-fg))] hover:bg-[#3b82f6]/10 bg-transparent">
                <a href="#so-funktioniert-es">So funktioniert es</a>
              </Button>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center gap-6 text-sm text-[hsl(var(--l-fg-low))]"
            >
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />Ab 100{"\u20ac"} monatlich</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />Keine Sperrfristen</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#3b82f6]" />Steueroptimiert f{"\u00fc"}r DACH</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Crypto for Retirement */}
      <section className="bg-[hsl(var(--l-bg-alt))] border-y border-[#3b82f6]/8 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-14 space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">Warum Krypto-Vorsorge?</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
              6 Gr{"\u00fc"}nde f{"\u00fc"}r digitale Altersvorsorge
            </h2>
            <p className="text-[hsl(var(--l-fg-mid))] text-lg max-w-2xl mx-auto">
              Immer mehr institutionelle Investoren {"\u2014"} darunter Pensionsfonds, Versicherungen und Verm{"\u00f6"}gensverwalter {"\u2014"} erg{"\u00e4"}nzen ihre Portfolios um Bitcoin und digitale Assets.
            </p>
          </AnimatedSection>

          <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {benefits.map((b) => (
              <StaggerItem key={b.title}>
                <div className="flex gap-5 p-6 rounded-2xl bg-[hsl(var(--l-card-bg)/0.04)] border border-[#3b82f6]/6 hover:border-[#3b82f6]/20 transition-all duration-300 h-full">
                  <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-[#3b82f6]/15 to-[#3b82f6]/5 border border-[#3b82f6]/20 flex items-center justify-center">
                    <b.icon className="h-7 w-7 text-[#3b82f6]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display-landing font-bold text-[hsl(var(--l-fg))] text-lg">{b.title}</h3>
                    <p className="text-[hsl(var(--l-fg-low))] text-[15px] leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Real-world context box */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="max-w-4xl mx-auto rounded-2xl bg-gradient-to-r from-[#3b82f6]/10 via-[#3b82f6]/5 to-[#3b82f6]/10 border border-[#3b82f6]/15 p-8 md:p-12">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-[#3b82f6]/20 flex items-center justify-center">
                  <Landmark className="h-8 w-8 text-[#3b82f6]" />
                </div>
                <div className="space-y-4">
                  <h3 className="font-display-landing font-bold text-2xl text-[hsl(var(--l-fg))]">
                    Pensionsfonds setzen bereits auf Krypto
                  </h3>
                  <p className="text-[hsl(var(--l-fg-mid))] text-[16px] leading-relaxed">
                    Die <strong>Nordrheinische {"\u00c4"}rzteversorgung (NAEV)</strong>, einer der gr{"\u00f6"}{"\u00df"}ten berufsst{"\u00e4"}ndischen Pensionsfonds in Deutschland, hat nach einer zweij{"\u00e4"}hrigen Testphase erstmals in Kryptow{"\u00e4"}hrungen investiert.
                    In der <strong>Schweiz</strong> bietet <strong>finpension</strong> seit 2021 die M{"\u00f6"}glichkeit, in der S{"\u00e4"}ule 3a bis zu 100% in Bitcoin zu investieren.
                    Weltweit verwalten Krypto-Pensionsfonds bereits {"\u00fc"}ber <strong>1 Milliarde US-Dollar</strong>.
                  </p>
                  <p className="text-sm text-[hsl(var(--l-fg-low))] italic">
                    Quellen: IPE (Insurance & Pensions Europe), finpension.ch, CoinShares Institutional Report 2024
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* How it works */}
      <section id="so-funktioniert-es" className="bg-[hsl(var(--l-bg-alt))] border-y border-[#3b82f6]/8 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-14 space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">Einfach erkl{"\u00e4"}rt</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
              So funktioniert Ihre Krypto-Vorsorge
            </h2>
          </AnimatedSection>

          <StaggerContainer className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {howItWorks.map((s, i) => (
              <StaggerItem key={s.step}>
                <div className="text-center space-y-5 relative">
                  {i < 3 && <div className="hidden lg:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-[2px] bg-gradient-to-r from-[#3b82f6]/30 to-[#3b82f6]/10" />}
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1e40af] text-white mx-auto shadow-lg shadow-[#3b82f6]/20 text-xl font-bold">
                    {s.step}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display-landing font-bold text-[hsl(var(--l-fg))] text-xl">{s.title}</h3>
                    <p className="text-[hsl(var(--l-fg-low))] text-[15px] leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Example calculation */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-14 space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">Rechenbeispiel</p>
            <h2 className="text-3xl md:text-4xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
              Was w{"\u00e4"}re, wenn Sie vor 5 Jahren begonnen h{"\u00e4"}tten?
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { label: "Monatlicher Beitrag", value: "200\u20ac", sub: "per SEPA-Lastschrift" },
              { label: "Investiert (5 Jahre)", value: "12.000\u20ac", sub: "60 Monate \u00d7 200\u20ac" },
              { label: "Heutiger Wert (BTC)", value: "~38.400\u20ac", sub: "+220% Wertentwicklung*" },
            ].map((item) => (
              <AnimatedSection key={item.label}>
                <div className="text-center p-8 rounded-2xl bg-[hsl(var(--l-card-bg)/0.06)] border border-[#3b82f6]/10">
                  <p className="text-sm text-[hsl(var(--l-fg-low))] uppercase tracking-wider mb-2">{item.label}</p>
                  <p className="text-4xl font-display-landing font-bold bg-gradient-to-r from-[#3b82f6] to-[#93c5fd] bg-clip-text text-transparent">{item.value}</p>
                  <p className="text-xs text-[hsl(var(--l-fg-low))] mt-2">{item.sub}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
          <p className="text-center text-xs text-[hsl(var(--l-fg-low))] mt-6 max-w-lg mx-auto">
            *Basierend auf dem historischen Bitcoin-Preis (April 2021 {"\u2013"} April 2026). Vergangene Performance ist kein Indikator f{"\u00fc"}r zuk{"\u00fc"}nftige Ergebnisse.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[hsl(var(--l-bg-alt))] border-y border-[#3b82f6]/8 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-14 space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">H{"\u00e4"}ufige Fragen</p>
            <h2 className="text-3xl md:text-4xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
              Ihre Fragen {"\u2014"} ehrlich beantwortet
            </h2>
          </AnimatedSection>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <AnimatedSection key={i}>
                <details className="group rounded-2xl bg-[hsl(var(--l-card-bg)/0.04)] border border-[#3b82f6]/8 hover:border-[#3b82f6]/20 transition-colors">
                  <summary className="flex items-center gap-4 p-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <HelpCircle className="h-5 w-5 text-[#3b82f6] shrink-0" />
                    <span className="font-display-landing font-semibold text-[hsl(var(--l-fg))] text-[16px] flex-1">{faq.q}</span>
                    <ArrowRight className="h-4 w-4 text-[#3b82f6] transition-transform group-open:rotate-90 shrink-0" />
                  </summary>
                  <div className="px-6 pb-6 pl-[52px]">
                    <p className="text-[hsl(var(--l-fg-mid))] text-[15px] leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4 text-center space-y-8">
          <AnimatedSection>
            <Heart className="h-10 w-10 text-[#3b82f6] mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
              Sorgen Sie heute f{"\u00fc"}r morgen vor
            </h2>
            <p className="text-[hsl(var(--l-fg-mid))] text-lg max-w-xl mx-auto mt-4">
              Vereinbaren Sie ein kostenloses, unverbindliches Beratungsgespr{"\u00e4"}ch mit einem unserer Experten. Wir erkl{"\u00e4"}ren alles in einfachen Worten.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button size="lg" asChild className="rounded-xl px-10 text-lg h-14 bg-gradient-to-r from-[#3b82f6] to-[#1e40af] text-white hover:from-[#60a5fa] hover:to-[#3b82f6] font-bold shadow-xl shadow-[#3b82f6]/25">
                <Link to="/signup">
                  Jetzt Beratung anfragen
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-xl px-8 h-14 text-lg border-[hsl(var(--l-card-border)/0.2)] text-[hsl(var(--l-fg))] hover:bg-[#3b82f6]/10 bg-transparent">
                <Link to="/contact">Kontakt aufnehmen</Link>
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-[hsl(var(--l-fg-low))] mt-6">
              <span className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-[#3b82f6]/60" /> Live-Chat & E-Mail-Support</span>
              <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-[#3b82f6]/60" /> support@crypto-borse.com</span>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(var(--l-bg-deep))] border-t border-[#3b82f6]/10 py-8">
        <div className="container mx-auto px-4 text-center space-y-3">
          <img src={logo} alt="Crypto-Börse" className="h-14 w-auto mx-auto" />
          <p className="text-sm text-[hsl(var(--l-fg-low))]">
            {"\u00a9"} {new Date().getFullYear()} Crypto-Börse. Alle Rechte vorbehalten.
          </p>
          <p className="text-xs text-[hsl(var(--l-fg-low))] max-w-xl mx-auto">
            Investitionen in Kryptow{"\u00e4"}hrungen bergen Risiken. Vergangene Performance ist kein Indikator f{"\u00fc"}r zuk{"\u00fc"}nftige Ergebnisse.
            Der Wert Ihrer Anlage kann fallen und steigen. Kapitalverlust ist m{"\u00f6"}glich.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CryptoPension;
