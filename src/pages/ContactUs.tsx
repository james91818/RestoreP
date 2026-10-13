import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Send, Clock, CheckCircle2, Building2, Shield, MessageSquare, Phone } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import PageHero from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/hooks/useTheme";
import logoLightAsset from "@/assets/crypto-boerse-logo.png.asset.json";
import logoDarkAsset from "@/assets/crypto-boerse-logo-dark-3.png.asset.json";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich").max(100),
  email: z.string().trim().email("Ungültige E-Mail-Adresse").max(255),
  subject: z.string().trim().min(1, "Betreff ist erforderlich").max(200),
  message: z.string().trim().min(1, "Nachricht ist erforderlich").max(2000),
});

const ContactUs = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { theme } = useTheme();
  const logo = theme === "dark" ? logoDarkAsset.url : logoLightAsset.url;

  const handleSubmit = async () => {
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: `[Kontaktformular] ${form.subject}`,
        priority: "medium",
      });
    }

    toast.success("Nachricht gesendet! Wir melden uns innerhalb von 24 Stunden bei Ihnen.");
    setForm({ name: "", email: "", subject: "", message: "" });
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <PageHero
        kicker="Persönlicher Service"
        icon={MessageSquare}
        title="Sprechen Sie"
        highlight="mit uns"
        description="Unser deutschsprachiges Team hilft Ihnen gerne weiter — verständlich, freundlich und ohne Fachchinesisch."
      />

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Kontaktwege */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="text-center p-8 rounded-2xl border border-border bg-card hover:border-[#3b82f6]/30 transition-colors">
            <div className="h-14 w-14 rounded-2xl bg-[#3b82f6]/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-[#3b82f6]" />
            </div>
            <h3 className="font-semibold text-lg mb-2">E-Mail schreiben</h3>
            <p className="text-sm font-medium text-foreground mb-1">support@crypto-borse.com</p>
            <p className="text-xs text-muted-foreground">Antwort innerhalb von 24 Stunden</p>
          </div>
          <div className="text-center p-8 rounded-2xl border border-border bg-card hover:border-[#3b82f6]/30 transition-colors">
            <div className="h-14 w-14 rounded-2xl bg-[#3b82f6]/10 flex items-center justify-center mx-auto mb-4">
              <Phone className="h-6 w-6 text-[#3b82f6]" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Telefonischer Support</h3>
            <a href="tel:+41319002336" className="text-sm font-medium text-foreground mb-1 hover:text-[#3b82f6]">+41 31 900 23 36</a>
            <p className="text-xs text-muted-foreground">Schweiz · Mo–Do 9–18 Uhr, Fr 9–13 Uhr</p>
          </div>
          <div className="text-center p-8 rounded-2xl border border-border bg-card hover:border-[#3b82f6]/30 transition-colors">
            <div className="h-14 w-14 rounded-2xl bg-[#3b82f6]/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-6 w-6 text-[#3b82f6]" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Live-Chat & Ticket</h3>
            <p className="text-sm font-medium text-foreground mb-1">Schnelle Hilfe auf Deutsch</p>
            <p className="text-xs text-muted-foreground mb-4">Eröffnen Sie ein Support-Ticket oder nutzen Sie den Live-Chat.</p>
            <div className="space-y-2">
              <a href="mailto:support@crypto-borse.com" className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/5 transition-colors group">
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-[#3b82f6]" />
                  <span className="text-xs font-semibold text-muted-foreground">E-Mail</span>
                </div>
                <span className="text-sm font-semibold text-foreground group-hover:text-[#3b82f6]">support@crypto-borse.com</span>
              </a>
              <a href="#ticket-form" className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/5 transition-colors group">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="h-4 w-4 text-[#3b82f6]" />
                  <span className="text-xs font-semibold text-muted-foreground">Ticket</span>
                </div>
                <span className="text-sm font-semibold text-foreground group-hover:text-[#3b82f6]">Formular öffnen</span>
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Antwort innerhalb von 24 Stunden</p>
          </div>
          <div className="text-center p-8 rounded-2xl border border-border bg-card hover:border-[#3b82f6]/30 transition-colors">
            <div className="h-14 w-14 rounded-2xl bg-[#3b82f6]/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-[#3b82f6]" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Erreichbarkeit</h3>
            <p className="text-sm font-medium text-foreground mb-1">Mo–Do 9–18 Uhr, Fr 9–13 Uhr</p>
            <p className="text-xs text-muted-foreground">Auf Deutsch, per E-Mail, Live-Chat und Schweizer Telefon</p>
          </div>
        </div>

        {/* Formular + Standorte */}
        <div className="grid lg:grid-cols-5 gap-8 mb-16">
          {/* Formular */}
          <div className="lg:col-span-3">
            <Card id="ticket-form" className="border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center">
                    <Send className="h-5 w-5 text-[#3b82f6]" />
                  </div>
                  <div>
                    <CardTitle className="font-display text-xl">Nachricht senden</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">Wir antworten innerhalb eines Werktages.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Ihr Name</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Max Mustermann" className="h-11" />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Ihre E-Mail</Label>
                    <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@beispiel.de" className="h-11" />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Betreff</Label>
                  <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Wie können wir Ihnen helfen?" className="h-11" />
                  {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Ihre Nachricht</Label>
                  <Textarea rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Beschreiben Sie Ihr Anliegen..." />
                  {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                </div>
                <Button onClick={handleSubmit} disabled={sending} className="w-full h-12 bg-[#3b82f6] hover:bg-[#C4A030] text-black font-semibold text-base">
                  <Send className="h-4 w-4 mr-2" /> {sending ? "Wird gesendet..." : "Nachricht senden"}
                </Button>
                <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Verschlüsselt</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Keine Spam-Mails</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Standorte */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-[#3b82f6]" />
              <h3 className="text-lg font-display font-bold">Unsere Standorte</h3>
            </div>

            {[
              { city: "Wien", address: "Straßergasse 25, 1190 Wien", country: "Österreich", type: "Hauptsitz", flagCode: "at", description: "Unser Hauptsitz und Zentrale. Hier werden alle strategischen Entscheidungen getroffen, das Portfoliomanagement gesteuert und unsere KI-Handelssysteme entwickelt und überwacht." },
              { city: "Berlin", address: "Hausvogteiplatz 12, 10117 Berlin", country: "Deutschland", type: "Investoren-Niederlassung", flagCode: "de", description: "Unsere deutsche Niederlassung für Investorenbetreuung. Hier betreuen wir institutionelle und private Anleger aus dem deutschen Markt — persönlich, kompetent und vor Ort." },
              { city: "Zürich", address: "Badenerstrasse 47, 8004 Zürich", country: "Schweiz", type: "Finanz- & Compliance-Büro", flagCode: "ch", description: "Unser Schweizer Büro verantwortet die Finanzabwicklung, regulatorische Compliance und die Betreuung institutioneller Kunden und vermögender Privatanleger." },
            ].map((o) => (
              <div key={o.city} className="p-5 rounded-xl border border-border bg-card">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg overflow-hidden mt-0.5 shrink-0">
                    <img src={`https://flagcdn.com/w80/${o.flagCode}.png`} alt={o.country} className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{o.city}</h4>
                      <span className="text-[10px] font-semibold text-[#3b82f6] uppercase tracking-wider bg-[#3b82f6]/10 px-2 py-0.5 rounded-full">{o.type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{o.address || `${o.city}, ${o.country}`}</p>
                    <p className="text-xs text-muted-foreground/60">{o.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Banner */}
        <div className="rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/5 p-8 text-center">
          <h3 className="text-xl font-display font-bold mb-2">Häufige Fragen?</h3>
          <p className="text-muted-foreground mb-4 max-w-lg mx-auto text-sm">
            Viele Antworten finden Sie bereits in unserem Hilfecenter — einfach erklärt und sofort verfügbar.
          </p>
          <Button variant="outline" asChild>
            <Link to="/support-center">Zum Hilfecenter →</Link>
          </Button>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
};

export default ContactUs;
