import { useState, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, Info, X } from "lucide-react";
import iconAsset from "@/assets/crypto-boerse-card-emblem.png.asset.json";
const iconUrl = iconAsset.url;

const LogoLockup = ({ iconClass = "h-12 w-auto", textClass = "text-2xl" }: { iconClass?: string; textClass?: string }) => (
  <span className="inline-flex items-center gap-3">
    <img src={iconUrl} alt="" className={iconClass} />
    <span className="flex flex-col leading-none">
      <span className={`font-display font-bold text-white tracking-tight ${textClass}`}>Crypto-Börse</span>
      <span className="text-[10px] tracking-[0.3em] text-white/70 uppercase mt-1">Handelsplattform</span>
    </span>
  </span>
);

const Login = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showExistingClientNotice, setShowExistingClientNotice] = useState(true);
  const [loginFailed, setLoginFailed] = useState(false);

  // Once auth state hydrates a user (e.g. after sign-in), redirect to dashboard.
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Persist or use session-only storage based on remember me
    if (!rememberMe) {
      // Clear persisted session on sign out by marking session-only
      localStorage.setItem("crypto-boerse-session-only", "true");
    } else {
      localStorage.removeItem("crypto-boerse-session-only");
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoginFailed(true);
      toast.error(error.message);
      setLoading(false);
    } else {
      setLoginFailed(false);
      toast.success("Welcome back!");
      // Don't navigate manually — the useEffect above will redirect once
      // the auth context has hydrated the new session, preventing a race
      // where AppLayout renders before `user` is set and bounces back here.
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset link sent! Check your email.");
      setForgotMode(false);
    }
    setResetLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <a href="/" aria-label="Crypto-Börse">
          <LogoLockup iconClass="h-14 w-auto" textClass="text-3xl" />
        </a>
        <div className="space-y-6">
          <h1 className="text-4xl font-display font-bold text-sidebar-primary-foreground leading-tight">
            Willkommen<br />zurück.
          </h1>
          <p className="text-sidebar-foreground text-lg max-w-md">
            Greifen Sie auf globale Märkte zu — mit Echtzeit-Daten, fortschrittlichen Ordertypen und bis zu 100× Hebel.
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
             <h2 className="text-2xl font-display font-bold">
               {forgotMode ? "Passwort zurücksetzen" : "Willkommen zurück"}
             </h2>
             <p className="text-muted-foreground text-sm">
               {forgotMode
                 ? "Geben Sie Ihre E-Mail ein und wir senden Ihnen einen Link zum Zurücksetzen"
                 : "Melden Sie sich an, um fortzufahren"}
            </p>
          </CardHeader>
          <CardContent>
            {forgotMode ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@beispiel.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                 <Button type="submit" className="w-full" disabled={resetLoading}>
                   {resetLoading ? "Wird gesendet..." : "Link senden"}
                 </Button>
                 <button
                   type="button"
                   onClick={() => setForgotMode(false)}
                   className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                 >
                   Zurück zur Anmeldung
                </button>
              </form>
            ) : (
              <>
                {showExistingClientNotice && (
                  <div className="relative mb-4 rounded-md border border-primary/30 bg-primary/5 p-4 pr-9 text-sm">
                    <button
                      type="button"
                      onClick={() => setShowExistingClientNotice(false)}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                      aria-label="Hinweis schließen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <div className="space-y-1">
                        <p className="font-medium">Wichtiger Hinweis für Bestandskunden</p>
                        <p className="text-muted-foreground">
                          Ihr bisheriges Passwort ist aus Sicherheitsgründen nicht mehr gültig (zu schwach).
                          Bitte legen Sie ein neues Passwort fest:
                        </p>
                        <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
                          <li>Klicken Sie unten auf <span className="font-medium text-foreground">„Passwort vergessen?"</span></li>
                          <li>Geben Sie Ihre E-Mail-Adresse ein</li>
                          <li>Öffnen Sie den Link in der E-Mail und wählen Sie ein neues, sicheres Passwort</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}
                {loginFailed && (
                  <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground">
                    Anmeldung fehlgeschlagen. Falls Sie ein Bestandskunde sind, setzen Sie bitte Ihr Passwort über{" "}
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-primary font-medium hover:underline"
                    >
                      „Passwort vergessen?"
                    </button>{" "}
                    zurück und versuchen Sie es erneut.
                  </div>
                )}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@beispiel.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <Label htmlFor="password">Passwort</Label>
                       <button
                         type="button"
                         onClick={() => setForgotMode(true)}
                         className="text-xs text-primary hover:underline"
                       >
                         Passwort vergessen?
                       </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(v) => setRememberMe(v === true)}
                    />
                     <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                       Angemeldet bleiben auf diesem Gerät
                    </Label>
                  </div>
                   <Button type="submit" className="w-full" disabled={loading}>
                     {loading ? "Anmeldung..." : "Anmelden"}
                   </Button>
                </form>
                 <p className="text-center text-sm text-muted-foreground mt-6">
                   Noch kein Konto?{" "}
                   <Link to="/signup" className="text-primary font-medium hover:underline">
                     Jetzt erstellen
                   </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
