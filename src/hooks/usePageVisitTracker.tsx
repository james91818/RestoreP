import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { isImpersonatedSession } from "@/lib/impersonation";

/**
 * Logs an entry into client_page_visits when an authenticated client (non-staff)
 * lands on a tracked marketing/public page. Used so the CRM can see when leads
 * browse pages like /account-types.
 */
export function usePageVisitTracker(path: string, title: string) {
  const { user } = useAuth();
  const { isStaff, loading: roleLoading } = useRole();

  useEffect(() => {
    if (!user || roleLoading || isStaff || isImpersonatedSession()) return;
    let cancelled = false;
    (async () => {
      try {
        if (cancelled) return;
        await supabase.from("client_page_visits").insert({
          user_id: user.id,
          path,
          title,
        } as any);
      } catch (_) {
        // silently ignore — tracking should never break UX
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, roleLoading, isStaff, path]);
}
