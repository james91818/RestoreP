import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import iconAsset from "@/assets/crypto-boerse-card-emblem.png.asset.json";
const iconUrl = iconAsset.url;

const COUNTRIES = [
  "United States", "United Kingdom", "Germany", "France", "Switzerland",
  "Australia", "Canada", "Netherlands", "Spain", "Italy", "Japan",
  "Singapore", "United Arab Emirates", "Brazil", "India", "Other",
];

const SIGNUP_ATTEMPTS_KEY = "cb_signup_attempts";

const DISPOSABLE_DOMAINS = [
  "hi2.in", "mailinator.com", "yopmail.com", "guerrillamail.com", "sharklasers.com",
  "10minutemail.com", "tempmail.com", "temp-mail.org", "trashmail.com", "getnada.com",
  "dispostable.com", "maildrop.cc", "fakeinbox.com", "mohmal.com", "emailondeck.com",
  "throwawaymail.com", "mintemail.com", "spam4.me", "grr.la", "inboxbear.com",
];


const Signup = () => {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.password) {
      toast.error("Bitte geben Sie ein Passwort ein");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Das Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!form.country) {
      toast.error("Please select your country");
      return;
    }

    const domain = form.email.trim().toLowerCase().split("@")[1] || "";
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      toast.error("Bitte verwenden Sie eine echte E-Mail-Adresse (keine Wegwerf-Adresse).");
      return;
    }

    // Simple client-side throttle: max 2 sign-ups per browser per 10 minutes
    try {
      const raw = localStorage.getItem(SIGNUP_ATTEMPTS_KEY);
      const attempts: number[] = raw ? JSON.parse(raw) : [];
      const recent = attempts.filter((t) => Date.now() - t < 10 * 60 * 1000);
      if (recent.length >= 2) {
        toast.error("Zu viele Registrierungsversuche. Bitte versuchen Sie es später erneut.");
        return;
      }
      recent.push(Date.now());
      localStorage.setItem(SIGNUP_ATTEMPTS_KEY, JSON.stringify(recent));
    } catch {
      // ignore storage errors
    }

    setLoading(true);

    // Server-side check: only one registration per internet address
    try {
      const { data: guard } = await supabase.functions.invoke("signup-ip-guard", {
        body: { email: form.email.trim().toLowerCase() },
      });
      if (guard && guard.allowed === false) {
        toast.error(guard.message || "Registrierung von dieser Internetverbindung nicht möglich.");
        setLoading(false);
        return;
      }
    } catch {
      // if the check is unavailable, continue
    }

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: form.fullName,
          phone: form.phone,
          country: form.country,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Record the internet address so it cannot be used to register again
    try {
      await supabase.functions.invoke("signup-ip-guard", {
        body: { email: form.email.trim().toLowerCase(), commit: true },
      });
    } catch {
      // ignore
    }


    // If auto-confirm is on, session is returned immediately
    if (data.session) {
      toast.success("Konto erfolgreich erstellt!");
      // Small delay to let AuthProvider pick up the new session via onAuthStateChange
      setTimeout(() => navigate("/dashboard"), 150);
    } else {
      // Email confirmation required
      toast.success("Bitte bestätigen Sie Ihre E-Mail-Adresse.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <a href="/" aria-label="Crypto-Börse" className="inline-flex items-center gap-3">
          <img src={iconUrl} alt="" className="h-14 w-auto" />
          <span className="flex flex-col leading-none">
            <span className="font-display font-bold text-white text-3xl tracking-tight">Crypto-Börse</span>
            <span className="text-[10px] tracking-[0.3em] text-white/70 uppercase mt-1">Handelsplattform</span>
          </span>
        </a>
        <div className="space-y-6">
          <h1 className="text-4xl font-display font-bold text-sidebar-primary-foreground leading-tight">
            Starten Sie Ihre<br />Anlagereise.
          </h1>
          <p className="text-sidebar-foreground text-lg max-w-md">
            Schließen Sie sich tausenden Anlegern an, die auf Krypto, Aktien und Rohstoffe mit professionellen Werkzeugen zugreifen.
          </p>
        </div>
        <p className="text-sidebar-foreground/50 text-sm">
          © {new Date().getFullYear()} Crypto-Börse. Alle Rechte vorbehalten.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <CardHeader className="text-center space-y-2 pb-2">
            <a href="/" aria-label="Crypto-Börse" className="flex items-center justify-center lg:hidden mb-4">
              <span className="inline-flex items-center gap-2">
                <img src={iconUrl} alt="" className="h-10 w-auto" />
                <span className="flex flex-col leading-none">
                  <span className="font-display font-bold text-foreground text-lg tracking-tight">Crypto-Börse</span>
                  <span className="text-[9px] tracking-[0.3em] text-muted-foreground uppercase mt-0.5">Handelsplattform</span>
                </span>
              </span>
            </a>
             <h2 className="text-2xl font-display font-bold">Konto erstellen</h2>
             <p className="text-muted-foreground text-sm">
               Füllen Sie Ihre Daten aus, um loszulegen
             </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                 <Label htmlFor="fullName">Vollständiger Name</Label>
                 <Input
                   id="fullName"
                   placeholder="Max Mustermann"
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@beispiel.de"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 890"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                   <Label>Land</Label>
                   <Select value={form.country} onValueChange={(v) => updateField("country", v)}>
                     <SelectTrigger>
                       <SelectValue placeholder="Auswählen" />
                     </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                 <Label htmlFor="password">Passwort</Label>
                 <div className="relative">
                   <Input
                     id="password"
                     type={showPassword ? "text" : "password"}
                     placeholder="Passwort eingeben"
                     value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                 <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                 <Input
                   id="confirmPassword"
                   type="password"
                   placeholder="Passwort wiederholen"
                   value={form.confirmPassword}
                   onChange={(e) => updateField("confirmPassword", e.target.value)}
                  required
                  
                />
              </div>
               <Button type="submit" className="w-full" disabled={loading}>
                 {loading ? "Konto wird erstellt..." : "Konto erstellen"}
               </Button>
            </form>
             <p className="text-center text-sm text-muted-foreground mt-6">
               Bereits ein Konto?{" "}
               <Link to="/login" className="text-primary font-medium hover:underline">
                 Anmelden
               </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
