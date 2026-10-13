import { Link } from "react-router-dom";
import { ArrowLeft, Shield, TrendingUp, Users, Globe, Award, Headphones, Building2, BarChart3, Lock, Clock, Landmark, CheckCircle2 } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import PageHero from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useInvestmentVolume, formatVolumeMilliarden } from "@/lib/investmentVolume";
import logoAsset from "@/assets/crypto-boerse-logo.png.asset.json";
const logo = logoAsset.url;
import teamMeeting from "@/assets/team-meeting.jpg";
import platformShowcase from "@/assets/platform-showcase.jpg";
import advisorMeeting from "@/assets/advisor-meeting.jpg";
import dachFinance from "@/assets/dach-finance.jpg";

const values = [
  { icon: Shield, title: "Ihre Sicherheit", description: "Ihre Daten und Ihr Geld werden durch modernste Verschlüsselung geschützt — vergleichbar mit den Standards großer europäischer Banken." },
  { icon: TrendingUp, title: "Faire Konditionen", description: "Keine versteckten Gebühren. Was Sie sehen, ist was Sie zahlen. Transparente Spreads und klare Kostenstruktur." },
  { icon: Users, title: "Persönlicher Service", description: "Unser deutschsprachiges Team kennt Sie beim Namen. Wir nehmen uns Zeit für Ihre Fragen — kein Callcenter, echte Berater." },
  { icon: Globe, title: "Europäisch verankert", description: "Wir sind in ganz Europa aktiv, aber unser Hauptfokus liegt auf dem DACH-Raum — Deutschland, Österreich und die Schweiz." },
  { icon: Award, title: "Volle Transparenz", description: "Alle Gebühren, Risiken und Bedingungen werden offen kommuniziert. Wir haben nichts zu verbergen." },
  { icon: Headphones, title: "Erreichbar für Sie", description: "Mo–Do 9:00–18:00 Uhr, Fr 9:00–13:00 Uhr. Per E-Mail oder Live-Chat — auf Deutsch." },
];

const stats = [
  { value: "15+", label: "Handelbare Märkte" },
  { value: "24/7", label: "Krypto-Handel" },
  { value: "DACH", label: "Fokusregion" },
  { value: "<1s", label: "Ausführungszeit" },
];

const steps = [
  { icon: Lock, step: "1", title: "Konto eröffnen", description: "Registrieren Sie sich in wenigen Minuten. Einfach Name, E-Mail und ein Passwort — fertig." },
  { icon: Landmark, step: "2", title: "Geld einzahlen", description: "Überweisen Sie per Banküberweisung oder Krypto. Ihr Geld ist sofort verfügbar." },
  { icon: BarChart3, step: "3", title: "Handeln oder anlegen", description: "Handeln Sie selbst oder nutzen Sie unsere KI-Strategien. Sie haben die volle Kontrolle." },
  { icon: Clock, step: "4", title: "Gewinne auszahlen", description: "Auszahlungen werden schnell bearbeitet. Kein Warten, keine komplizierten Prozesse." },
];

const AboutUs = () => {
  const volume = useInvestmentVolume(1000);
  const volumeText = formatVolumeMilliarden(volume, "de");
  return (
  <div className="min-h-screen bg-background">
    <PublicNav />
    <PageHero
      kicker="Seit 2016"
      icon={Building2}
      title="Über"
      highlight="Crypto-Börse"
      description="Wir machen das Investieren einfach, sicher und verständlich — für alle, die ihr Geld klug anlegen möchten. Egal ob Anfänger oder erfahrener Anleger."
    />
    <div className="container mx-auto px-4 py-12 max-w-5xl">

      {/* Hero Image */}
      <div className="mb-16 rounded-2xl overflow-hidden border border-border shadow-lg">
        <img src={dachFinance} alt="Frankfurt Skyline — Finanzstandort" className="w-full h-64 md:h-80 object-cover" loading="lazy" width={1280} height={720} />
      </div>

      {/* Über uns Kurzportrait */}
      <div className="mb-16 max-w-3xl mx-auto text-center space-y-4">
        <h2 className="text-2xl md:text-3xl font-display font-bold">Wer wir sind</h2>
        <p className="text-muted-foreground leading-relaxed">
          Crypto-Börse wurde 2016 gegründet und hat sich seither zu einer der führenden Handelsplattformen im DACH-Raum entwickelt. Mit Büros in Wien, Berlin und Zürich betreuen wir Kunden in ganz Europa — mit einem klaren Fokus auf Deutschland, Österreich und die Schweiz.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Unser Team aus erfahrenen Finanzberatern und Technologie-Experten verwaltet ein Anlagevolumen von über <span className="text-foreground font-semibold tabular-nums">{volumeText}</span>. Dank unserer KI-gestützten Strategien erzielen wir eine durchschnittliche Gewinnrate von 94 % — und das bei voller Transparenz und persönlichem Service auf Deutsch.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {stats.map((s) => (
          <div key={s.label} className="text-center p-6 rounded-xl border border-border bg-card">
            <div className="text-3xl font-bold text-[#3b82f6] mb-1">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Was wir tun — with image */}
      <div className="mb-16 rounded-2xl border border-border bg-card overflow-hidden">
        <img src={platformShowcase} alt="Crypto-Börse Plattform" className="w-full h-56 md:h-72 object-cover" loading="lazy" width={1280} height={720} />
        <div className="p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-6 text-center">Was machen wir eigentlich?</h2>
          <div className="max-w-3xl mx-auto space-y-4 text-muted-foreground leading-relaxed">
            <p className="text-lg">
              <strong className="text-foreground">Kurz gesagt:</strong> Wir helfen Ihnen, Ihr Geld in verschiedene Märkte zu investieren — von Kryptowährungen wie Bitcoin bis hin zu klassischen Aktien und Rohstoffen wie Gold.
            </p>
            <p>
              Sie brauchen dafür kein Finanzexperte zu sein. Unsere Plattform ist so gebaut, dass jeder sie bedienen kann. Und wenn Sie möchten, übernimmt unsere intelligente Software (KI) den Handel für Sie — automatisch und mit eingebauter Risikobegrenzung.
            </p>
            <p>
              Dabei setzen wir maximal 10 % Ihres Kapitals pro Handel ein und begrenzen mögliche Verluste ebenfalls auf 10 %. So bleibt Ihr Risiko überschaubar, während die KI rund um die Uhr Chancen für Sie sucht.
            </p>
          </div>
        </div>
      </div>

      {/* Mission & Vision — with team image between */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4 p-8 rounded-2xl border border-border bg-card">
          <div className="h-12 w-12 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center mb-2">
            <TrendingUp className="h-6 w-6 text-[#3b82f6]" />
          </div>
          <h2 className="text-2xl font-display font-bold">Unsere Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            Wir wollen, dass jeder Mensch — unabhängig von Einkommen oder Vorwissen — Zugang zu professionellen Anlagetools hat. Keine komplizierten Formulare, keine Fachsprache, keine Hürden.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Ob Sie 100 € oder 100.000 € anlegen: Bei uns bekommen Sie die gleiche Qualität, den gleichen Service und die gleichen Möglichkeiten.
          </p>
        </div>
        <div className="space-y-4 p-8 rounded-2xl border border-border bg-card">
          <div className="h-12 w-12 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center mb-2">
            <Globe className="h-6 w-6 text-[#3b82f6]" />
          </div>
          <h2 className="text-2xl font-display font-bold">Unsere Vision</h2>
          <p className="text-muted-foreground leading-relaxed">
            Wir arbeiten daran, die vertrauenswürdigste Handelsplattform im deutschsprachigen Raum zu werden. Nicht die größte — sondern die zuverlässigste.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Unser Kernmarkt bleibt der DACH-Raum — hier bieten wir persönlichen Service, lokale Ansprechpartner und ein tiefes Verständnis für die regionalen Finanzmärkte.
          </p>
        </div>
      </div>

      {/* Team image */}
      <div className="mb-16 rounded-2xl overflow-hidden border border-border shadow-lg">
        <img src={teamMeeting} alt="Unser Beraterteam" className="w-full h-56 md:h-72 object-cover" loading="lazy" width={1280} height={720} />
        <div className="bg-card px-6 py-4 text-center">
          <p className="text-sm text-muted-foreground">Unser erfahrenes Beraterteam — persönlich und professionell für Sie da.</p>
        </div>
      </div>

      {/* So funktioniert's */}
      <div className="mb-16">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">So einfach funktioniert es</h2>
        <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">In vier Schritten starten Sie mit dem Investieren — ohne Vorkenntnisse.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s) => (
            <div key={s.step} className="relative p-6 rounded-xl border border-border bg-card text-center">
              <div className="h-12 w-12 rounded-full bg-[#3b82f6]/10 flex items-center justify-center mx-auto mb-4">
                <s.icon className="h-6 w-6 text-[#3b82f6]" />
              </div>
              <div className="text-xs text-[#3b82f6] font-semibold uppercase tracking-wider mb-2">Schritt {s.step}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Werte */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-3">Wofür wir stehen</h2>
      <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">Diese Grundsätze leiten jede Entscheidung, die wir treffen.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
        {values.map((v) => (
          <Card key={v.title} className="border-border">
            <CardContent className="pt-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
                <v.icon className="h-5 w-5 text-[#3b82f6]" />
              </div>
              <h3 className="font-semibold">{v.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Advisor image before locations */}
      <div className="mb-8 rounded-2xl overflow-hidden border border-border shadow-lg">
        <img src={advisorMeeting} alt="Persönliche Beratung" className="w-full h-56 md:h-64 object-cover" loading="lazy" width={1280} height={720} />
      </div>

      {/* Standorte */}
      <div className="mb-16">
        <h2 className="text-2xl font-display font-bold text-center mb-3">Unsere Standorte in der DACH-Region</h2>
        <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">Wir betreuen Kunden in ganz Europa — unsere Büros befinden sich in den drei wichtigsten Finanzzentren der DACH-Region.</p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { city: "Frankfurt am Main", country: "Deutschland", type: "Hauptsitz", flagCode: "de", description: "Unser Hauptsitz und Zentrale. Hier werden alle strategischen Entscheidungen getroffen, das Portfoliomanagement gesteuert und unsere KI-Handelssysteme entwickelt und überwacht." },
            { city: "Wien", country: "Österreich", type: "Kundensupport-Zentrale", flagCode: "at", description: "Unser Kundenservice-Standort für den gesamten DACH-Raum. Hier betreut unser deutschsprachiges Support-Team alle Anfragen — per E-Mail und Live-Chat." },
            { city: "Zürich", country: "Schweiz", type: "Finanz- & Compliance-Büro", flagCode: "ch", description: "Unser Schweizer Büro verantwortet die Finanzabwicklung, regulatorische Compliance und die Betreuung institutioneller Kunden und vermögender Privatanleger." },
          ].map((o) => (
            <div key={o.city} className="p-6 rounded-xl border border-border bg-card text-center">
              <div className="h-10 w-14 rounded overflow-hidden mx-auto mb-3">
                <img src={`https://flagcdn.com/w160/${o.flagCode}.png`} alt={o.country} className="h-full w-full object-cover" />
              </div>
              <span className="text-[10px] font-semibold text-[#3b82f6] uppercase tracking-wider bg-[#3b82f6]/10 px-2 py-0.5 rounded-full">{o.type}</span>
              <h4 className="font-semibold mt-2">{o.city}, {o.country}</h4>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{o.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vertrauens-Banner */}
      <div className="rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/5 p-8 md:p-12 text-center mb-8">
        <img src={logo} alt="Crypto-Börse" className="h-10 mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl font-display font-bold mb-4">Haben Sie Fragen?</h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
          Unser Team beantwortet gerne alle Ihre Fragen — verständlich und ohne Fachchinesisch. Rufen Sie uns an oder schreiben Sie uns.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-[#3b82f6] hover:bg-[#C4A030] text-black">
            <Link to="/contact">Kontakt aufnehmen</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/signup">Kostenloses Konto eröffnen</Link>
          </Button>
        </div>
        <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Keine Mindesteinlage</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> Kostenlose Registrierung</span>
        </div>
      </div>
    </div>
    <PublicFooter />
  </div>
);
};

export default AboutUs;
