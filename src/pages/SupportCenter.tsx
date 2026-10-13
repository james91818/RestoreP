import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, ChevronDown, ChevronUp } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PageHero from "@/components/layout/PageHero";
import { LifeBuoy } from "lucide-react";
import PublicFooter from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const faqCategories = [
  {
    title: "Erste Schritte",
    items: [
      { q: "Wie erstelle ich ein Konto?", a: "Klicken Sie auf 'Konto eröffnen' auf der Startseite und füllen Sie Ihre Daten aus. Sie erhalten eine Bestätigungs-E-Mail zur Aktivierung Ihres Kontos." },
      { q: "Welche Dokumente brauche ich für die Verifizierung (KYC)?", a: "Wir benötigen einen amtlichen Lichtbildausweis (Reisepass oder Personalausweis) und einen Adressnachweis (Versorgerrechnung oder Kontoauszug, nicht älter als 3 Monate)." },
      { q: "Gibt es eine Mindesteinzahlung?", a: "Die Mindesteinzahlung beträgt €250, um Zugang zu allen Handelsfunktionen zu erhalten." },
    ],
  },
  {
    title: "Ein- & Auszahlungen",
    items: [
      { q: "Welche Einzahlungsmethoden gibt es?", a: "Wir unterstützen Kryptowährungen, Banküberweisungen, Kreditkarten und weitere Zahlungsmethoden. Wählen Sie Ihre bevorzugte Methode auf der Wallet-Seite." },
      { q: "Wie lange dauern Einzahlungen?", a: "Krypto-Einzahlungen werden in der Regel innerhalb einer Stunde gutgeschrieben. Banküberweisungen können 1–3 Werktage dauern." },
      { q: "Wie kann ich Geld abheben?", a: "Navigieren Sie zu Wallet → Auszahlung, wählen Sie Ihre Währung und Methode, geben Sie die Zieladresse ein und senden Sie den Antrag. Auszahlungen erfordern eine Admin-Genehmigung und KYC-Verifizierung." },
      { q: "Gibt es Auszahlungsgebühren?", a: "Crypto-Börse erhebt keine Auszahlungsgebühren. Es können jedoch Netzwerkgebühren (bei Krypto) oder Banktransfergebühren anfallen." },
    ],
  },
  {
    title: "Handel",
    items: [
      { q: "Welche Vermögenswerte kann ich handeln?", a: "Wir bieten den Handel mit Kryptowährungen (BTC, ETH, SOL usw.), Aktien, Indizes und Rohstoffen an. Besuchen Sie die Instrumente-Seite für eine vollständige Liste." },
      { q: "Was ist Hebelwirkung und wie funktioniert sie?", a: "Hebel ermöglicht es Ihnen, größere Positionen mit weniger Kapital zu eröffnen. Beispiel: 1:100 Hebel bedeutet, dass €100 eine Position von €10.000 kontrollieren. Beachten Sie, dass Hebel sowohl Gewinne als auch Verluste verstärkt." },
      { q: "Was sind die Handelszeiten?", a: "Kryptomärkte sind rund um die Uhr geöffnet. Aktien- und Indexmärkte folgen den regulären Börsenzeiten. Prüfen Sie die Handelszeiten-Seite für genaue Zeiten." },
      { q: "Wie wird der Gewinn/Verlust berechnet?", a: "Der Gewinn und Verlust wird basierend auf der Differenz zwischen Einstiegs- und aktuellem/Ausstiegspreis berechnet, multipliziert mit Ihrer Positionsgröße und dem Hebel." },
    ],
  },
  {
    title: "Staking",
    items: [
      { q: "Was ist Staking?", a: "Staking ermöglicht es Ihnen, passive Renditen zu erzielen, indem Sie Ihre Krypto-Vermögenswerte für einen festen Zeitraum sperren. Längere Sperrfristen bieten in der Regel höhere APY-Raten." },
      { q: "Kann ich vorzeitig entstaken?", a: "Gestakte Vermögenswerte sind bis zum Entsperrdatum gesperrt. Eine vorzeitige Abhebung ist nicht möglich. Bitte überprüfen Sie die Sperrfrist vor dem Staking." },
      { q: "Wie werden Staking-Belohnungen berechnet?", a: "Belohnungen werden basierend auf dem APY-Satz, Ihrem gestakten Betrag und der Sperrfrist berechnet. Belohnungen werden zum Entsperrdatum gutgeschrieben." },
    ],
  },
  {
    title: "Konto & Sicherheit",
    items: [
      { q: "Wie setze ich mein Passwort zurück?", a: "Klicken Sie auf 'Passwort vergessen?' auf der Anmeldeseite und geben Sie Ihre E-Mail ein. Sie erhalten einen Link zum Zurücksetzen des Passworts." },
      { q: "Ist Zwei-Faktor-Authentifizierung (2FA) verfügbar?", a: "Ja, Sie können 2FA in Ihren Kontoeinstellungen für zusätzliche Sicherheit aktivieren." },
      { q: "Wie werden meine Daten geschützt?", a: "Wir verwenden branchenübliche Verschlüsselung, sichere Rechenzentren und strenge Zugriffskontrollen. Lesen Sie unsere Datenschutzrichtlinie für alle Details." },
    ],
  },
];

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left hover:text-primary transition-colors">
        <span className="font-medium text-sm pr-4">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && <p className="text-sm text-muted-foreground pb-4 pr-8">{a}</p>}
    </div>
  );
};

const SupportCenter = () => {
  const [search, setSearch] = useState("");

  const filtered = faqCategories.map(cat => ({
    ...cat,
    items: cat.items.filter(i => !search || i.q.toLowerCase().includes(search.toLowerCase()) || i.a.toLowerCase().includes(search.toLowerCase())),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <PageHero
        kicker="Hilfecenter"
        icon={LifeBuoy}
        title="Wie können wir"
        highlight="helfen?"
        description="Antworten auf häufig gestellte Fragen — auf Deutsch, klar und verständlich."
        compact
      />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suche nach Hilfe..." className="pl-10" />
          </div>
        </div>

        <div className="space-y-6">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Keine Ergebnisse gefunden. Versuchen Sie einen anderen Suchbegriff oder <Link to="/contact" className="text-primary underline">kontaktieren Sie uns</Link> direkt.</p>
          ) : filtered.map((cat) => (
            <Card key={cat.title}>
              <CardContent className="pt-6">
                <h2 className="text-lg font-display font-bold mb-2">{cat.title}</h2>
                {cat.items.map((item) => <FAQItem key={item.q} {...item} />)}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 space-y-3">
          <p className="text-muted-foreground">Konnten Sie nicht finden, was Sie suchen?</p>
          <div className="flex gap-3 justify-center">
            <Button asChild><Link to="/contact">Kontakt aufnehmen</Link></Button>
            <Button variant="outline" asChild><Link to="/login">Anmelden für Support-Tickets</Link></Button>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
};

export default SupportCenter;
