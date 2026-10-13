import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { checkBackofficeIpAllowed } from "@/lib/ipWhitelist";

interface ProtectedRouteProps {
  allowedRoles?: string[];
  requireStaff?: boolean;
}

const ProtectedRoute = ({ allowedRoles, requireStaff }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isStaff, roleName, loading: roleLoading } = useRole();
  const [ipChecking, setIpChecking] = useState(requireStaff === true);
  const [ipBlocked, setIpBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!requireStaff || !user || !isStaff) {
      setIpChecking(false);
      return;
    }
    setIpChecking(true);
    void checkBackofficeIpAllowed().then(async (allowed) => {
      if (cancelled) return;
      if (!allowed) {
        // Force sign-out so a blocked IP can't keep an existing session active
        try { await supabase.auth.signOut(); } catch {}
        setIpBlocked(true);
      }
      setIpChecking(false);
    });
    return () => { cancelled = true; };
  }, [requireStaff, user, isStaff]);

  // Website sign-ups must be approved by an admin before using the platform
  const [approved, setApproved] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!user || roleLoading || isStaff) { setApproved(true); return; }
    setApproved(null);
    supabase.from("profiles").select("access_approved").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setApproved(data ? data.access_approved !== false : true); });
    return () => { cancelled = true; };
  }, [user, isStaff, roleLoading]);

  if (authLoading || roleLoading || ipChecking || (user && approved === null)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requireStaff && !isStaff) return <Navigate to="/dashboard" replace />;

  if (!isStaff && approved === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Konto wird geprüft</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          Vielen Dank für Ihre Registrierung. Ihr Konto wird derzeit von unserem Team geprüft.
          Sie erhalten Zugang, sobald es freigegeben wurde.
        </p>
        <button
          className="text-primary underline"
          onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
        >
          Abmelden
        </button>
      </div>
    );
  }

  if (ipBlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Access denied</h1>
        <p className="text-muted-foreground max-w-md">
          Your IP address is not whitelisted for the backoffice. Please connect from an approved
          network or contact an administrator to add your IP.
        </p>
      </div>
    );
  }

  if (allowedRoles && roleName && !allowedRoles.includes(roleName)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && !roleName) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
