import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bitcoin, Layers, PiggyBank, Sparkles, Globe, Zap, Shield, LineChart, Coins } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PageHero from "@/components/layout/PageHero";

const investmentCategories = [
  {
    icon: Bitcoin,
    title: "Major Coins",
    description: "Handeln Sie die etablierten Marktführer wie Bitcoin, Ethereum, Solana, XRP und BNB — tiefe Liquidität, enge Spreads und 24/7 Marktzugang.",
    assets: ["BTC/EUR", "ETH/EUR", "SOL/EUR", "XRP/EUR", "BNB/EUR", "TON/EUR"],
    color: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500",
  },
  {
    icon: Layers,
    title: "Altcoins & DeFi",
    description: "Zugriff auf über 100 Altcoins und die führenden DeFi-Protokolle wie Uniswap, Aave, Curve, Lido und Chainlink — das Rückgrat der dezentralen Finanzwelt.",
    assets: ["ADA/EUR", "DOT/EUR", "AVAX/EUR", "UNI/EUR", "AAVE/EUR", "LINK/EUR"],
    color: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-500",
  },
  {
    icon: PiggyBank,
    title: "Staking & ICOs",
    description: "Verdienen Sie passives Einkommen durch Staking von ETH, SOL, ADA und weiteren PoS-Assets — plus exklusiver Zugang zu ausgewählten Token-Launches.",
    assets: ["ETH Staking", "SOL Staking", "ADA Staking", "DOT Staking", "ATOM Staking", "ICO Access"],
    color: "from-blue-500/20 to-indigo-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: Sparkles,
    title: "Memecoins & DAOs",
    description: "Handeln Sie die volatilsten Memecoins wie DOGE, SHIB, PEPE und WIF — und investieren Sie in Governance-Token führender DAOs wie MakerDAO und Uniswap.",
    assets: ["DOGE/EUR", "SHIB/EUR", "PEPE/EUR", "WIF/EUR", "MKR/EUR", "UNI/EUR"],
    color: "from-yellow-500/20 to-amber-500/20",
    iconColor: "text-yellow-500",
  },
];

const features = [
  { icon: Zap, title: "Blitzschnelle Ausführung", desc: "Orders werden in unter 30ms ohne Re-Quotes ausgeführt." },
  { icon: Shield, title: "Reguliert & Sicher", desc: "Ihre Gelder werden in getrennten Konten bei erstklassigen Banken verwahrt." },
  { icon: LineChart, title: "Fortschrittliche Charts", desc: "Professionelle Tools mit über 100 technischen Indikatoren." },
  { icon: Globe, title: "24/5 Support", desc: "Persönliche Kundenbetreuer, die rund um die Uhr erreichbar sind." },
];

const Investments = () => {
  return (
    <div className="min-h-screen bg-[hsl(var(--l-bg))] text-[hsl(var(--l-fg))]">
      <PublicNav />
      <PageHero
        kicker="Anlageprodukte"
        icon={Coins}
        title="Unsere"
        highlight="Anlageprodukte"
        description="100% Krypto-fokussiert. Zugang zu Major Coins, Altcoins, DeFi, Staking, ICOs, DAOs und Memecoins — alles auf einer leistungsstarken Plattform."
      />

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 space-y-12">
          {investmentCategories.map((cat, i) => (
            <Card key={cat.title} className="overflow-hidden border-border/50 bg-card">
              <CardContent className="p-0">
                <div className={`grid md:grid-cols-2 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
                  <div className={`p-8 md:p-12 flex flex-col justify-center ${i % 2 === 1 ? "md:order-2" : ""}`}>
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${cat.color} mb-6`}>
                      <cat.icon className={`h-7 w-7 ${cat.iconColor}`} />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                      {cat.title}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {cat.description}
                    </p>
                    <Button asChild className="rounded-full w-fit px-6">
                      <Link to="/signup">{cat.title} handeln</Link>
                    </Button>
                  </div>
                  <div className={`bg-muted/30 p-8 md:p-12 flex items-center ${i % 2 === 1 ? "md:order-1" : ""}`}>
                    <div className="grid grid-cols-3 gap-3 w-full">
                      {cat.assets.map((asset) => (
                        <div
                          key={asset}
                          className="bg-card border border-border/50 rounded-lg p-4 text-center font-display font-semibold text-sm text-foreground hover:border-primary/50 transition-colors"
                        >
                          {asset}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
            Warum mit Crypto-Börse handeln?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-card border rounded-xl p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-display font-bold mb-4">
            Bereit zu investieren?
          </h2>
          <p className="text-muted-foreground mb-8">
            Eröffnen Sie Ihr Konto in wenigen Minuten und erhalten Sie Zugang zu allen unseren Anlageprodukten ab einer Mindesteinlage von €250.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="rounded-full px-8">
              <Link to="/signup">Kostenloses Konto eröffnen</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full px-8">
              <Link to="/account-types">Kontotypen ansehen</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} Crypto-Börse. Alle Rechte vorbehalten.
        </div>
      </footer>
    </div>
  );
};

export default Investments;
