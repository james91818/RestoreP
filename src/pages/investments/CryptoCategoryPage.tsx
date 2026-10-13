import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Shield, Zap, Clock, TrendingUp, Bitcoin, Layers, Coins, Rocket, Users, PartyPopper, Image as ImageIcon, Sparkles, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import PageHero from "@/components/layout/PageHero";

type Category = {
  slug: string;
  icon: LucideIcon;
  accent: string;
  title: string;
  tagline: string;
  intro: string;
  assets: string[];
  highlights: { icon: LucideIcon; title: string; desc: string }[];
  sections: { title: string; body: string }[];
};

const common = [
  { icon: Clock, title: "24/7 Zugang", desc: "Kryptomärkte schlafen nie — investieren Sie rund um die Uhr, auch am Wochenende." },
  { icon: Shield, title: "Institutionelle Verwahrung", desc: "Cold-Storage bei EU-regulierten Custodians, mehrfach versichert." },
  { icon: Zap, title: "KI-Signalintegration", desc: "Unsere KI überwacht Order-Flow, On-Chain-Daten und Sentiment in Echtzeit." },
  { icon: TrendingUp, title: "DACH-Beratung", desc: "Persönliche Betreuung durch deutschsprachige Portfolio-Manager in Wien, Berlin und Zürich." },
];

export const CRYPTO_CATEGORIES: Category[] = [
  {
    slug: "bitcoin-blue-chips",
    icon: Bitcoin,
    accent: "from-amber-500/25 to-orange-500/10",
    title: "Bitcoin & Blue Chips",
    tagline: "Die Fundamente digitaler Vermögen.",
    intro:
      "Bitcoin, Ethereum und weitere Top-10 Assets bilden das Rückgrat jedes seriösen Krypto-Portfolios. Tiefe Liquidität, weltweit etablierte Custodians und höchste institutionelle Akzeptanz.",
    assets: ["BTC/EUR", "ETH/EUR", "SOL/EUR", "XRP/EUR", "BNB/EUR", "TON/EUR", "ADA/EUR", "TRX/EUR"],
    highlights: common,
    sections: [
      { title: "Warum Blue Chips?", body: "Bitcoin gilt als digitales Gold und ist seit 2024 Bestandteil regulierter ETFs in Frankfurt, Zürich und den USA. Ethereum sichert weltweit den Großteil aller DeFi-, NFT- und Stablecoin-Aktivitäten ab." },
      { title: "Unser Ansatz", body: "Wir kombinieren Buy-and-Hold-Positionen mit KI-gesteuertem Rebalancing, um Volatilität in Rendite zu übersetzen — ohne den langfristigen Werttreiber aus den Augen zu verlieren." },
    ],
  },
  {
    slug: "altcoins",
    icon: Layers,
    accent: "from-emerald-500/25 to-teal-500/10",
    title: "Altcoins",
    tagline: "Selektive Chancen jenseits der Top 10.",
    intro:
      "Über 200 handverlesene Altcoins mit fundamentaler Substanz — Layer-1s, Layer-2s, Interoperabilitäts- und Datenverfügbarkeits-Projekte. Zugang zu Wachstumssegmenten, in denen sich Innovation zuerst zeigt.",
    assets: ["AVAX/EUR", "DOT/EUR", "NEAR/EUR", "SUI/EUR", "APT/EUR", "SEI/EUR", "ATOM/EUR", "ARB/EUR"],
    highlights: common,
    sections: [
      { title: "Fundamentale Auswahl", body: "Unser Research-Team in Zürich bewertet jedes Projekt anhand von Team, Tokenomics, On-Chain-Aktivität und regulatorischem Umfeld. Nur Projekte, die alle Kriterien erfüllen, werden in Kundenportfolios aufgenommen." },
      { title: "Risikoprofil", body: "Altcoins bieten überdurchschnittliche Renditechancen bei erhöhter Volatilität. Wir empfehlen eine Gewichtung passend zu Ihrem persönlichen Risikoprofil im Rahmen der KI-gesteuerten Portfolio-Allokation." },
    ],
  },
  {
    slug: "defi",
    icon: Coins,
    accent: "from-blue-500/25 to-cyan-500/10",
    title: "DeFi",
    tagline: "Das dezentrale Finanzsystem der nächsten Generation.",
    intro:
      "DeFi-Protokolle ermöglichen Kreditvergabe, Handel und Zinsstrategien vollständig on-chain — transparent, rund um die Uhr und ohne klassische Intermediäre. Wir bieten Zugang zu den etabliertesten Protokollen mit institutioneller Absicherung.",
    assets: ["UNI/EUR", "AAVE/EUR", "MKR/EUR", "LDO/EUR", "CRV/EUR", "PENDLE/EUR", "GMX/EUR", "COMP/EUR"],
    highlights: common,
    sections: [
      { title: "Kuratierte Strategien", body: "Wir bündeln liquide DeFi-Positionen zu geprüften Strategien — von konservativen Stablecoin-Yields bis zu Blue-Chip-DEX-Governance. Alle Kontrakte werden extern auditiert." },
      { title: "Kein Smart-Contract-Risiko für Sie", body: "Die technische Interaktion mit den Protokollen übernimmt unser Custody-Partner. Sie halten eine klassische Portfolio-Position in EUR." },
    ],
  },
  {
    slug: "staking",
    icon: Shield,
    accent: "from-violet-500/25 to-purple-500/10",
    title: "Staking",
    tagline: "Passives Einkommen aus digitalen Vermögenswerten.",
    intro:
      "Verdienen Sie planbare Renditen, indem Sie Proof-of-Stake-Assets über unsere institutionellen Validatoren staken. Zinsen werden täglich abgegrenzt und in EUR ausgewiesen.",
    assets: ["ETH 3–5% p.a.", "SOL 6–8% p.a.", "ADA 3–4% p.a.", "DOT 10–12% p.a.", "ATOM 14–17% p.a.", "NEAR 8–10% p.a.", "SUI 4–6% p.a.", "TIA 10–13% p.a."],
    highlights: common,
    sections: [
      { title: "Institutionelle Validatoren", body: "Wir betreiben Staking ausschließlich über EU-lizenzierte Node-Betreiber mit Slashing-Versicherung. Ihre Rewards laufen automatisch dem Konto zu." },
      { title: "Flexibel oder Fest", body: "Wählen Sie zwischen flexiblen Positionen (jederzeit auflösbar) oder festen Laufzeiten mit erhöhter Rendite — passend zu Ihrer Liquiditätsplanung." },
    ],
  },
  {
    slug: "icos",
    icon: Rocket,
    accent: "from-fuchsia-500/25 to-pink-500/10",
    title: "ICOs & Neue Projekte",
    tagline: "Frühzeitig dabei — mit sorgfältiger Due Diligence.",
    intro:
      "Zugang zu ausgewählten Token-Generierungs-Events, Launchpad-Runden und frühen Projekten. Unser Investment-Komitee prüft jedes Angebot vor der Aufnahme in das Angebot für unsere Kunden.",
    assets: ["Seed Rounds", "Private Sales", "Launchpad IDOs", "TGE Access", "IEO Angebote", "Airdrops", "Testnet Rewards", "OTC Deals"],
    highlights: common,
    sections: [
      { title: "Streng kuratiert", body: "Von tausenden neuen Projekten pro Jahr schaffen es weniger als 1% in unser Angebot. Wir bewerten Team, Investoren, Tokenomics und rechtliche Struktur." },
      { title: "Hohes Chance-Risiko-Verhältnis", body: "Frühe Investments bieten überdurchschnittliche Renditepotenziale — und ein entsprechend erhöhtes Risiko. Nur für Anleger mit passendem Profil." },
    ],
  },
  {
    slug: "daos",
    icon: Users,
    accent: "from-sky-500/25 to-indigo-500/10",
    title: "DAOs & Governance",
    tagline: "Stimmrechte in den Protokollen von morgen.",
    intro:
      "Governance-Token führender dezentraler Organisationen wie MakerDAO, Uniswap, Aave, Optimism und Arbitrum. Kombinieren Sie Kapitalanlage mit Mitspracherecht in der Weiterentwicklung dieser Protokolle.",
    assets: ["MKR/EUR", "UNI/EUR", "AAVE/EUR", "OP/EUR", "ARB/EUR", "ENS/EUR", "COMP/EUR", "GNO/EUR"],
    highlights: common,
    sections: [
      { title: "Kapitalwert plus Einfluss", body: "DAO-Token repräsentieren sowohl wirtschaftliches Interesse am Protokoll als auch aktive Stimmrechte. Auf Wunsch stimmen wir in Ihrem Namen nach klar definierten Richtlinien ab." },
      { title: "Langfristige Perspektive", body: "DAOs verwalten Treasuries in Milliardenhöhe und werden immer relevanter für die Zukunft der Finanzinfrastruktur." },
    ],
  },
  {
    slug: "memecoins",
    icon: PartyPopper,
    accent: "from-yellow-500/25 to-amber-500/10",
    title: "Memecoins",
    tagline: "Kontrolliertes Momentum-Investing.",
    intro:
      "Memecoins sind hoch volatil und rein sentimentgetrieben — bieten aber überdurchschnittliche kurzfristige Chancen. Unsere KI überwacht Social-Signals, Whale-Wallets und Liquidität, um Ein- und Ausstiegspunkte präzise zu erkennen.",
    assets: ["DOGE/EUR", "SHIB/EUR", "PEPE/EUR", "WIF/EUR", "BONK/EUR", "FLOKI/EUR", "MOG/EUR", "MEW/EUR"],
    highlights: common,
    sections: [
      { title: "Diszipliniertes Trading", body: "Wir empfehlen Memecoin-Positionen ausschließlich als kleinen Anteil (max. 5%) im Rahmen einer breiteren Portfolio-Struktur. Klare Stop-Loss-Regeln sind Pflicht." },
      { title: "Automatisierter Ausstieg", body: "Unsere KI-Signale definieren mehrstufige Take-Profit-Level. So sichern Sie Gewinne rechtzeitig, bevor das Momentum dreht." },
    ],
  },
  {
    slug: "nfts",
    icon: ImageIcon,
    accent: "from-rose-500/25 to-red-500/10",
    title: "NFTs & Digital Collectibles",
    tagline: "Blue-Chip-Sammlungen als alternative Anlage.",
    intro:
      "Selektiver Zugang zu etablierten NFT-Sammlungen und tokenisierten Kunstwerken. Ideal zur Diversifikation von digitalen Portfolios über liquide Coins hinaus.",
    assets: ["CryptoPunks", "BAYC", "Azuki", "Pudgy Penguins", "Milady", "Chromie Squiggle", "Fidenza", "Ringers"],
    highlights: common,
    sections: [
      { title: "Verwahrt in EU-Custody", body: "Alle NFTs werden über unseren regulierten Custody-Partner in Multi-Sig-Wallets gehalten. Sie erhalten Nachweise über Herkunft und Authentizität." },
      { title: "Bewertung durch Experten", body: "Unser Research kombiniert Floor-Price-Analysen, Rarity-Scoring und Community-Signale, um faire Marktwerte zu bestimmen." },
    ],
  },
];

export const CryptoCategoryPage = () => {
  const { slug } = useParams();
  const category = CRYPTO_CATEGORIES.find((c) => c.slug === slug);
  if (!category) return <Navigate to="/investments" replace />;
  const Icon = category.icon;

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <PageHero
        kicker={category.tagline}
        icon={Icon}
        title={category.title}
        description={category.intro}
        compact
      />
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/investments"><ArrowLeft className="h-4 w-4 mr-2" /> Alle Anlageprodukte</Link>
        </Button>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {category.highlights.map((h) => (
            <div key={h.title} className="p-6 rounded-xl border border-border bg-card text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <h.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{h.title}</h3>
              <p className="text-sm text-muted-foreground">{h.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {category.sections.map((s) => (
            <div key={s.title} className="p-8 rounded-2xl border border-border bg-card">
              <h3 className="text-xl font-display font-bold mb-3">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-display font-bold text-center mb-6">
          {category.slug === "staking" ? "Aktuelle Rewards" : category.slug === "icos" ? "Zugangsformate" : category.slug === "nfts" ? "Verfügbare Sammlungen" : "Ausgewählte Handelspaare"}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-16">
          {category.assets.map((a) => (
            <div key={a} className="bg-card border border-border rounded-lg p-4 text-center font-semibold text-sm hover:border-primary/50 transition-colors tabular-nums">
              {a}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center mb-4">
          <h2 className="text-2xl font-display font-bold mb-3">Jetzt in {category.title} investieren</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">Eröffnen Sie Ihr Konto in wenigen Minuten und erhalten Sie persönliche Beratung durch einen deutschsprachigen Portfolio-Manager.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild><Link to="/signup">Kostenloses Konto eröffnen</Link></Button>
            <Button variant="outline" asChild><Link to="/account-types">Kontotypen ansehen</Link></Button>
          </div>
          <div className="flex items-center justify-center flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> EU-reguliert</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Institutionelle Verwahrung</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Persönliche Betreuung</span>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
};

export default CryptoCategoryPage;