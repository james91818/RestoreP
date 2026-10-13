import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, Shield } from "lucide-react";
import logoAsset from "@/assets/crypto-boerse-logo.png.asset.json";
const logo = logoAsset.url;
import { getStaffRoleName } from "@/hooks/useRole";
import { checkBackofficeIpAllowed } from "@/lib/ipWhitelist";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [checking, setChecking] = useState(true);
  const [ipBlocked, setIpBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finishChecking = () => {
      if (!cancelled) setChecking(false);
    };
    const timeout = window.setTimeout(finishChecking, 5000);

    const checkAccess = async () => {
      try {
        // Enforce IP whitelist before anything else
        const ipAllowed = await checkBackofficeIpAllowed();
        if (cancelled) return;
        if (!ipAllowed) {
          try { await supabase.auth.signOut(); } catch {}
          setIpBlocked(true);
          finishChecking();
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (!session || cancelled) {
          finishChecking();
          return;
        }

        const roleName = await getStaffRoleName(session.user.id);
        if (cancelled) return;

        if (roleName) {
          navigate("/backoffice/users", { replace: true });
          return;
        }

        finishChecking();
      } catch {
        finishChecking();
      }
    };

    void checkAccess();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (ipBlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar p-6 text-center">
        <Shield className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2 text-foreground">Access denied</h1>
        <p className="text-muted-foreground max-w-md">
          Your IP address is not whitelisted for the backoffice. Please connect from an approved
          network or contact an administrator to add your IP.
        </p>
      </div>
    );
  }


  const attemptAuth = async (retries = 3, timeoutMs = 6000): Promise<{ data: any; error: any }> => {
    for (let i = 0; i < retries; i++) {
      try {
        setStatusMsg(i > 0 ? `Retrying… (attempt ${i + 1}/${retries})` : "Connecting…");
        const result = await Promise.race([
          supabase.auth.signInWithPassword({ email, password }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), timeoutMs)
          ),
        ]);
        return result;
      } catch {
        if (i === retries - 1) throw new Error("All auth attempts timed out");
        // brief pause before retry
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw new Error("All auth attempts timed out");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg("Connecting…");

    if (!rememberMe) {
      localStorage.setItem("crypto-boerse-session-only", "true");
    } else {
      localStorage.removeItem("crypto-boerse-session-only");
    }

    try {
      // Enforce backoffice IP whitelist before any auth attempt
      setStatusMsg("Verifying network…");
      const ipAllowed = await checkBackofficeIpAllowed();
      if (!ipAllowed) {
        toast.error("Access denied: your IP is not whitelisted for the backoffice.");
        return;
      }

      const { data, error } = await attemptAuth();

      if (error || !data.user) {
        toast.error(error?.message || "Login failed. Please try again.");
        return;
      }

      setStatusMsg("Checking permissions…");

      // Wait briefly for AuthProvider to pick up the new session
      await new Promise((r) => setTimeout(r, 300));

      // Try role check but don't block login
      const roleName = await getStaffRoleName(data.user.id);

      if (roleName === null) {
        toast.success("Welcome! Redirecting…");
        navigate("/dashboard", { replace: true });
        return;
      }

      toast.success(`Welcome back, ${roleName}!`);
      navigate("/backoffice/users", { replace: true });
    } catch {
      toast.error("Server is not responding. Please wait a moment and try again.");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-6">
      <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-2">
          <img src={logo} alt="Crypto-Börse" className="h-14 w-auto mx-auto" />
          <div>
            <h2 className="text-2xl font-display font-bold">Backoffice</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Staff access only — Admin, Manager &amp; Agent
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="staff@crypto-boerse.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
                Remember me &amp; keep me logged in
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? statusMsg || "Verifying…" : "Sign In to Backoffice"}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} Crypto-Börse — Authorized personnel only
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
