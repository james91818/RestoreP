import { memo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shuffle } from "lucide-react";

export type NewUserForm = {
  email: string; password: string; first_name: string; last_name: string;
  phone: string; country: string; date_of_birth: string; address: string;
  city: string; postal_code: string; funnel: string;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: NewUserForm;
  onSubmit: (form: NewUserForm) => Promise<void> | void;
}

const COUNTRIES = ["Germany", "Austria", "Switzerland", "United Kingdom", "France", "Netherlands", "Belgium", "Italy", "Spain", "Portugal", "Sweden", "Norway", "Denmark", "Finland", "Poland", "Czech Republic", "Ireland", "Luxembourg", "Greece", "Cyprus", "Malta", "Romania", "Bulgaria", "Croatia", "Hungary", "Slovakia", "Slovenia", "Estonia", "Latvia", "Lithuania", "United States", "Canada", "Australia", "New Zealand", "United Arab Emirates", "Saudi Arabia", "Turkey", "South Africa", "Brazil", "Mexico", "Japan", "South Korea", "Singapore", "Hong Kong", "India", "China"];

function CreateUserDialogInner({ open, onOpenChange, initial, onSubmit }: Props) {
  // Local state — isolated from parent re-renders so inputs never lose focus
  const [form, setForm] = useState<NewUserForm>(initial);
  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever the dialog reopens
  const handleOpenChange = (v: boolean) => {
    if (v) setForm(initial);
    onOpenChange(v);
  };

  const update = (patch: Partial<NewUserForm>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const randomize = () => {
    const firstNames = ["James","Emma","Liam","Sophia","Noah","Olivia","Lucas","Mia","Alexander","Isabella","Maximilian","Charlotte","Elias","Amelia","Felix","Hannah","Leon","Laura","Matteo","Anna","Oscar","Lea","Erik","Marie","Sebastian","Julia","David","Sarah","Daniel","Elena"];
    const lastNames = ["Müller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Schulz","Hoffmann","Schäfer","Koch","Bauer","Richter","Klein","Wolf","Schröder","Neumann","Schwarz","Zimmermann","Braun","Krüger","Hofmann","Hartmann","Lange"];
    const countries = ["Germany","Austria","Switzerland","United Kingdom","France","Netherlands","Belgium","Italy","Spain","Sweden","Norway","Denmark","Poland","Ireland","Luxembourg"];
    const citiesByCountry: Record<string, string[]> = {
      Germany: ["Berlin","Munich","Hamburg","Frankfurt","Cologne","Stuttgart","Düsseldorf","Leipzig"],
      Austria: ["Vienna","Salzburg","Graz","Innsbruck","Linz"],
      Switzerland: ["Zurich","Geneva","Basel","Bern","Lausanne"],
      "United Kingdom": ["London","Manchester","Birmingham","Edinburgh","Bristol"],
      France: ["Paris","Lyon","Marseille","Toulouse","Nice"],
      Netherlands: ["Amsterdam","Rotterdam","Utrecht","The Hague"],
      Belgium: ["Brussels","Antwerp","Ghent","Bruges"],
      Italy: ["Rome","Milan","Florence","Naples","Turin"],
      Spain: ["Madrid","Barcelona","Valencia","Seville"],
      Sweden: ["Stockholm","Gothenburg","Malmö"],
      Norway: ["Oslo","Bergen","Trondheim"],
      Denmark: ["Copenhagen","Aarhus","Odense"],
      Poland: ["Warsaw","Krakow","Wroclaw","Gdansk"],
      Ireland: ["Dublin","Cork","Galway"],
      Luxembourg: ["Luxembourg City","Esch-sur-Alzette"],
    };
    const streets = ["Hauptstraße","Bahnhofstraße","Kirchstraße","Gartenstraße","Schulstraße","Ringstraße","Bergstraße","Lindenstraße","Waldstraße","Rosenstraße"];
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const cities = citiesByCountry[country] || ["Capital"];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const year = 1970 + Math.floor(Math.random() * 30);
    const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
    const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
    const rand4 = Math.floor(1000 + Math.random() * 9000);
    setForm({
      first_name: fn,
      last_name: ln,
      email: `${fn.toLowerCase()}.${ln.toLowerCase().replace(/[äöüß]/g, c => ({ä:"ae",ö:"oe",ü:"ue",ß:"ss"}[c] || c))}${rand4}@gmail.com`,
      password: `Pass${rand4}!x`,
      phone: `+49 ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000000 + Math.random() * 9000000)}`,
      country,
      city,
      date_of_birth: `${year}-${month}-${day}`,
      address: `${streets[Math.floor(Math.random() * streets.length)]} ${Math.floor(1 + Math.random() * 120)}`,
      postal_code: String(10000 + Math.floor(Math.random() * 90000)),
      funnel: ["Google Ads", "Facebook", "Referral", "Direct", "Instagram", "TikTok", "Affiliate"][Math.floor(Math.random() * 7)],
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={(e) => update({ first_name: e.target.value })} placeholder="John" />
            </div>
            <div className="space-y-1">
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={(e) => update({ last_name: e.target.value })} placeholder="Doe" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" autoComplete="off" value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="john@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Password *</Label>
              <Input type="text" autoComplete="off" className="font-mono tracking-widest" value={form.password} onChange={(e) => update({ password: e.target.value })} placeholder="Any password" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => update({ phone: e.target.value })} placeholder="+49 123 456 7890" />
            </div>
            <div className="space-y-1">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => update({ date_of_birth: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Country</Label>
              <Select value={form.country} onValueChange={(v) => update({ country: v })}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => update({ city: e.target.value })} placeholder="Berlin" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => update({ address: e.target.value })} placeholder="Street, Number" />
            </div>
            <div className="space-y-1">
              <Label>Postal Code</Label>
              <Input value={form.postal_code} onChange={(e) => update({ postal_code: e.target.value })} placeholder="10115" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Funnel / Source</Label>
            <Input value={form.funnel} onChange={(e) => update({ funnel: e.target.value })} placeholder="e.g. Google Ads, Referral, Direct" />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="secondary" onClick={randomize}>
            <Shuffle className="h-4 w-4 mr-1" /> Random
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating..." : "Create User"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Memoized so realtime updates in the parent don't re-render the dialog and steal input focus
export const CreateUserDialog = memo(CreateUserDialogInner);
