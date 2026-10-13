import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { motion, AnimatePresence } from "framer-motion";

const marketCategories = [
  {
    title: "Major Coins",
    content: [
      {
        heading: "Die Marktführer",
        text: "Handeln Sie Bitcoin, Ethereum, Solana, XRP, BNB und weitere Top-10-Coins mit tiefer Liquidität und engen Spreads.",
      },
      {
        heading: "24/7 Markt",
        text: "Kryptowährungen werden rund um die Uhr gehandelt. Nutzen Sie Preisbewegungen jederzeit — auch am Wochenende.",
      },
      {
        heading: "Long & Short gehen",
        text: "Profitieren Sie sowohl von steigenden als auch von fallenden Kursen — maximale Flexibilität für Ihre Strategie.",
      },
    ],
  },
  {
    title: "Altcoins & DeFi",
    content: [
      {
        heading: "Über 100 Altcoins",
        text: "Zugang zu Cardano, Polkadot, Avalanche, Arbitrum, Optimism, Sui, Aptos und vielen weiteren aufstrebenden Layer-1- und Layer-2-Projekten.",
      },
      {
        heading: "DeFi-Token",
        text: "Investieren Sie in die führenden DeFi-Protokolle wie Uniswap, Aave, Curve, Lido und Chainlink — das Rückgrat der dezentralen Finanzwelt.",
      },
      {
        heading: "Flexible Positionsgrößen",
        text: "Handeln Sie auch Bruchteile von Coins. Sie müssen keine ganze Einheit kaufen — starten Sie bereits ab kleinen Beträgen.",
      },
    ],
  },
  {
    title: "Staking & ICOs",
    content: [
      {
        heading: "Passives Einkommen durch Staking",
        text: "Verdienen Sie attraktive APYs durch Staking von ETH, SOL, ADA, DOT und weiteren Proof-of-Stake-Assets — direkt aus Ihrem Konto heraus.",
      },
      {
        heading: "Exklusiver ICO-Zugang",
        text: "Erhalten Sie frühzeitigen Zugang zu ausgewählten Token-Launches und Initial Coin Offerings — bevor sie den freien Markt erreichen.",
      },
      {
        heading: "Flexible Laufzeiten",
        text: "Wählen Sie zwischen flexiblem Staking und Lock-up-Perioden mit erhöhten Renditen — ganz nach Ihrer Strategie.",
      },
      {
        heading: "Renditepotenzial",
        text: "Kombinieren Sie Preisentwicklung und Staking-Rewards für eine doppelte Ertragsquelle — ideal für langfristige Investoren.",
      },
    ],
  },
  {
    title: "Memecoins & DAOs",
    content: [
      {
        heading: "Die volatilsten Memecoins",
        text: "Handeln Sie DOGE, SHIB, PEPE, WIF, BONK und weitere Memecoins — hohe Volatilität, hohes Momentum, viele Chancen.",
      },
      {
        heading: "DAO Governance-Token",
        text: "Investieren Sie in Governance-Token führender DAOs wie MakerDAO, Uniswap DAO oder Aave — Mitgestaltung dezentraler Protokolle.",
      },
      {
        heading: "Frühzeitig einsteigen",
        text: "Unsere Analyse-Tools helfen Ihnen, aufsteigende Community-Token früh zu erkennen und Trends aktiv zu nutzen.",
      },
    ],
  },
];
const AvailableMarkets = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-[hsl(var(--l-bg-alt))] border-y border-[#3b82f6]/8 py-16 md:py-20">
      <div className="container mx-auto px-4">
        <AnimatedSection className="text-center mb-12 space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">Märkte im Detail</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
            Verfügbare Märkte mit Crypto-Börse
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-[#3b82f6] to-[#1e40af] mx-auto rounded-full" />
        </AnimatedSection>

        <div className="max-w-4xl mx-auto space-y-3">
          {marketCategories.map((cat, i) => (
            <div
              key={cat.title}
              className="rounded-xl border border-[#3b82f6]/10 bg-[hsl(var(--l-card-bg)/0.04)] overflow-hidden transition-all duration-300 hover:border-[#3b82f6]/20"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left group"
              >
                <h3 className="font-display-landing font-bold text-lg text-[hsl(var(--l-fg))] group-hover:text-[#3b82f6] transition-colors">
                  {cat.title}
                </h3>
                <ChevronDown
                  className={`h-5 w-5 text-[#3b82f6] transition-transform duration-300 ${
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
                    <div className="px-6 pb-6 space-y-4 border-t border-[#3b82f6]/8 pt-4">
                      {cat.content.map((item) => (
                        <div key={item.heading} className="space-y-1">
                          <p className="text-[hsl(var(--l-fg))] font-semibold text-[15px]">
                            {item.heading}:
                          </p>
                          <p className="text-[hsl(var(--l-fg-low))] text-[14px] leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      ))}
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

export default AvailableMarkets;
