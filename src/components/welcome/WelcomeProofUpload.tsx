import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, Receipt } from "lucide-react";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const WelcomeProofUpload = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error("Bitte melden Sie sich an, um den Zahlungsbeleg hochzuladen.");
      return;
    }
    if (!file) {
      toast.error("Bitte wählen Sie zuerst eine Datei aus.");
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      toast.error("Nur JPG, PNG, WebP oder PDF erlaubt.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Datei zu groß. Maximal 15 MB.");
      return;
    }
    const value = Number(amount.replace(",", "."));
    if (!value || value <= 0) {
      toast.error("Bitte geben Sie den überwiesenen Betrag in EUR ein.");
      return;
    }

    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/proof_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("deposits").insert({
        user_id: user.id,
        amount: value,
        currency: "EUR",
        method: "bank_wire",
        status: "pending",
        proof_url: path,
      });
      if (dbErr) throw dbErr;

      setDone(true);
      toast.success("Zahlungsbeleg erhalten — unser Team prüft ihn jetzt.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Upload fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-3xl mx-auto mt-8 rounded-2xl border border-primary/30 bg-primary/[0.06] p-6 flex items-start gap-4">
        <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
        <div>
          <p className="font-semibold">Zahlungsbeleg erfolgreich übermittelt</p>
          <p className="text-sm text-[hsl(var(--hero-muted))]">
            Wir haben Ihren Beleg erhalten. Ihr persönlicher Berater bestätigt den Eingang in Kürze.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-8 rounded-2xl border border-primary/30 bg-[hsl(var(--hero-card))] p-5 md:p-6">
      <div className="flex items-center gap-2 mb-2">
        <Receipt className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-base md:text-lg">
          Schritt 3 · Zahlungsbeleg hochladen
        </h3>
      </div>
      <p className="text-sm text-[hsl(var(--hero-muted))] mb-4">
        Bitte laden Sie den Überweisungsbeleg (Screenshot oder PDF Ihrer Bank) hoch. So können wir
        Ihre Einzahlung sofort zuordnen und Ihr Konto schneller aktivieren.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="proof-amount">Überwiesener Betrag (EUR)</Label>
          <Input
            id="proof-amount"
            inputMode="decimal"
            placeholder="z. B. 250"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proof-file">Beleg (JPG, PNG oder PDF)</Label>
          <Input
            id="proof-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <Button onClick={submit} disabled={busy} className="mt-4 gap-2 w-full sm:w-auto">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Beleg absenden
      </Button>
    </div>
  );
};

export default WelcomeProofUpload;
