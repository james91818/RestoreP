import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert } from "lucide-react";

const RESTRICTED = [
  "USA (Vereinigte Staaten)",
  "Russland",
  "China",
  "Belarus",
  "Iran",
  "Nordkorea",
  "Syrien",
  "Kuba",
];

const storageKey = (userId?: string) => `trading-terms-accepted:${userId ?? "anon"}`;

interface Props {
  userId?: string;
  children: React.ReactNode;
}

const TradingTermsGate = ({ userId, children }: Props) => {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      setAccepted(localStorage.getItem(storageKey(userId)) === "true");
    } catch {
      setAccepted(false);
    }
  }, [userId]);

  if (accepted === null) return null;
  if (accepted) return <>{children}</>;

  const confirm = () => {
    try { localStorage.setItem(storageKey(userId), "true"); } catch {}
    setAccepted(true);
  };

  return (
    <div className="flex justify-center py-6">
      <Card className="w-full max-w-2xl border-primary/30">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-display font-bold">Handelsbedingungen bestätigen</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Bevor Sie mit dem Handel beginnen können, müssen Sie die folgende Erklärung bestätigen.
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
            <p className="text-sm">
              Aufgrund internationaler Sanktions- und Regulierungsvorgaben dürfen wir keine Handelsdienstleistungen
              für Staatsbürger oder Ansässige der folgenden Länder erbringen:
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-medium">
              {RESTRICTED.map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {c}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Falsche Angaben können zur sofortigen Sperrung des Kontos führen.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
            <span className="text-sm">
              Ich bestätige, dass ich weder Staatsbürger noch steuerlich ansässig in einem der oben genannten
              Länder bin, und ich akzeptiere die Handelsbedingungen sowie die Risikohinweise.
            </span>
          </label>

          <Button onClick={confirm} disabled={!checked} className="w-full">
            Bestätigen und mit dem Handel beginnen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingTermsGate;
