import { useState } from "react";
import { ChevronDown, Building2, Users, Globe, Shield, Award, TrendingUp } from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";
import { motion, AnimatePresence } from "framer-motion";

const companyStats = [
  { icon: Users, value: "150.000+", label: "Aktive Kunden weltweit" },
  { icon: Globe, value: "30+", label: "Länder bedient" },
  { icon: TrendingUp, value: "€4,2 Mrd.", label: "Verwaltetes Volumen" },
  { icon: Award, value: "12+", label: "Jahre Markterfahrung" },
];

const faqItems = [
  {
    q: "Wer ist Crypto-Börse und wie lange gibt es das Unternehmen?",
    a: "Crypto-Börse ist eine etablierte europäische Investmentgesellschaft mit Hauptsitz in Wien (Österreich) und weiteren Niederlassungen in Berlin und Zürich. Seit über einem Jahrzehnt unterstützen wir Privat- und institutionelle Anleger im DACH-Raum beim Aufbau und Schutz ihres Vermögens. Aktuell betreuen wir über 150.000 Kunden in mehr als 30 Ländern.",
  },
  {
    q: "Ist Crypto-Börse reguliert und sicher?",
    a: "Ja. Crypto-Börse operiert als regulierter europäischer Crypto-Asset Service Provider (CASP) gemäß MiCA-Verordnung und nutzt das EU-Passporting. Kundengelder werden auf segregierten Treuhandkonten bei renommierten europäischen Bankpartnern verwahrt und sind strikt vom Firmenvermögen getrennt.",
  },
  {
    q: "Welche Märkte und Anlageklassen kann ich handeln?",
    a: "Über unsere Plattform handeln Sie über 500 Instrumente: Kryptowährungen (Bitcoin, Ethereum, Solana und über 50 weitere), Aktien & Wertpapiere weltweit (Apple, Tesla, NVIDIA u.v.m.), Rohstoffe (Gold, Silber, Öl) sowie globale Indizes (DAX 40, S&P 500, NASDAQ 100, Nikkei 225).",
  },
  {
    q: "Wie hoch ist die Mindesteinzahlung und welche Zahlungsmethoden werden akzeptiert?",
    a: "Die Mindesteinzahlung beträgt 250 €. Wir akzeptieren SEPA-Überweisung, Visa, Mastercard, PayPal, Apple Pay, Skrill, Neteller sowie Kryptowährungen (BTC, ETH, USDT). Alle Transaktionen werden verschlüsselt und PCI-DSS-konform abgewickelt.",
  },
  {
    q: "Wie funktioniert die KI-gestützte Handelsstrategie?",
    a: "Unsere proprietäre KI analysiert in Echtzeit Millionen von Marktdatenpunkten, identifiziert Trends und führt – mit Ihrer Genehmigung – Trades autonom aus. Sie behalten jederzeit volle Kontrolle und können das System pausieren oder anpassen. Persönliche Strategien werden gemeinsam mit unseren Senior-Beratern definiert.",
  },
  {
    q: "Welche Gebühren fallen an?",
    a: "Wir arbeiten mit transparenter Spread-Struktur ab 0,2 %. Es gibt keine versteckten Kontoführungs-, Einzahlungs- oder Auszahlungsgebühren bei Standard-Transaktionsmethoden. Eine vollständige Gebührenübersicht finden Sie in den Konditionen Ihres jeweiligen Kontotyps.",
  },
  {
    q: "Wie schnell erhalte ich meine Auszahlung?",
    a: "Auszahlungen werden in der Regel innerhalb von 24 Stunden bearbeitet. SEPA-Auszahlungen sind je nach Bank in 1–3 Werktagen auf Ihrem Konto, Krypto-Auszahlungen meist innerhalb weniger Stunden bestätigt.",
  },
  {
    q: "Bietet Crypto-Börse persönliche Beratung?",
    a: "Ja. Jeder Kunde wird einem persönlichen Senior-Berater zugewiesen, der Sie telefonisch, per E-Mail oder über unseren Live-Chat betreut. Unser Support ist Montag bis Freitag, 8:00–20:00 Uhr (MEZ) erreichbar.",
  },
  {
    q: "Kann ich mein Vermögen langfristig vorsorgen lassen?",
    a: "Ja, mit unserem Krypto-Vorsorge-Programm bauen Sie systematisch ein digitales Anlageportfolio für Ihre Altersvorsorge auf — steueroptimiert nach österreichischem und deutschem Recht, mit professioneller Verwahrung und regelmäßigem Rebalancing.",
  },
  {
    q: "Wie schütze ich mein Konto?",
    a: "Wir setzen auf 2-Faktor-Authentifizierung (2FA), TLS-1.3-Verschlüsselung, biometrische Login-Optionen und Cold-Storage für digitale Vermögenswerte. Zusätzlich überwachen unsere Compliance-Teams 24/7 verdächtige Aktivitäten.",
  },
];

const CompanyFaq = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="ueber-uns-faq" className="py-20 md:py-24">
      <div className="container mx-auto px-4">
        {/* Company Info Block */}
        <AnimatedSection className="max-w-5xl mx-auto mb-16 text-center space-y-5">
          <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">Über Crypto-Börse</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
            Ein europäisches Investmenthaus mit Tradition und Vision
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-[#3b82f6] to-[#1e40af] mx-auto rounded-full" />
          <p className="text-[hsl(var(--l-fg-mid))] text-base md:text-lg leading-relaxed max-w-3xl mx-auto pt-2">
            Mit Hauptsitz in Wien und Niederlassungen in Berlin und Zürich gehört Crypto-Börse
            zu den führenden Investment-Plattformen im deutschsprachigen Raum. Über 150.000 Anleger
            vertrauen auf unsere Expertise, unsere KI-gestützten Strategien und unsere kompromisslose
            Ausrichtung auf Sicherheit, Transparenz und langfristigen Vermögensaufbau.
          </p>
        </AnimatedSection>

        {/* Stats grid */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto mb-20">
          {companyStats.map((s) => (
            <StaggerItem key={s.label}>
              <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-[#3b82f6]/10 to-[#3b82f6]/3 border border-[#3b82f6]/15 hover:border-[#3b82f6]/30 transition-all duration-300 hover:-translate-y-1">
                <s.icon className="h-7 w-7 text-[#3b82f6] mx-auto mb-3" />
                <p className="text-2xl md:text-3xl font-display-landing font-bold bg-gradient-to-r from-[#3b82f6] via-[#93c5fd] to-[#3b82f6] bg-clip-text text-transparent tabular-nums">
                  {s.value}
                </p>
                <p className="text-xs md:text-sm text-[hsl(var(--l-fg-low))] mt-2">{s.label}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Trust pillars */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
          {[
            {
              icon: Building2,
              title: "Etablierte Struktur",
              text: "Eingetragene Crypto-Börse VV FlexCo mit Sitz in Wien. Reguliert nach EU-Standards und MiCA-Verordnung als CASP.",
            },
            {
              icon: Shield,
              title: "Maximale Sicherheit",
              text: "Segregierte Treuhandkonten, Cold-Storage, 2FA und 24/7-Compliance-Überwachung schützen Ihr Vermögen.",
            },
            {
              icon: Award,
              title: "Ausgezeichneter Service",
              text: "Persönlicher Senior-Berater für jeden Kunden, mehrsprachiger Support und über 95 % Kundenzufriedenheit.",
            },
          ].map((p) => (
            <div
              key={p.title}
              className="p-7 rounded-2xl bg-[hsl(var(--l-card-bg)/0.06)] border border-[#3b82f6]/10 hover:border-[#3b82f6]/25 transition-all duration-300"
            >
              <div className="h-12 w-12 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center mb-4">
                <p.icon className="h-6 w-6 text-[#3b82f6]" />
              </div>
              <h3 className="font-display-landing font-bold text-lg text-[hsl(var(--l-fg))] mb-2">{p.title}</h3>
              <p className="text-[hsl(var(--l-fg-low))] text-[14px] leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <AnimatedSection className="text-center mb-12 space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">Häufige Fragen</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
            Antworten auf Ihre wichtigsten Fragen
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-[#3b82f6] to-[#1e40af] mx-auto rounded-full" />
        </AnimatedSection>

        <div className="max-w-4xl mx-auto space-y-3">
          {faqItems.map((item, i) => (
            <div
              key={item.q}
              className="rounded-xl border border-[#3b82f6]/10 bg-[hsl(var(--l-card-bg)/0.04)] overflow-hidden transition-all duration-300 hover:border-[#3b82f6]/20"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left group"
                aria-expanded={openIndex === i}
              >
                <h3 className="font-display-landing font-semibold text-[15px] md:text-lg text-[hsl(var(--l-fg))] group-hover:text-[#3b82f6] transition-colors">
                  {item.q}
                </h3>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-[#3b82f6] transition-transform duration-300 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 border-t border-[#3b82f6]/8 pt-4">
                      <p className="text-[hsl(var(--l-fg-low))] text-[14px] md:text-[15px] leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CompanyFaq;
