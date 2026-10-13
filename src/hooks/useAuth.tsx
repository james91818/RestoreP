import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionHydratedRef = useRef(false);

  useEffect(() => {
    let isActive = true;
    const sessionOnly = localStorage.getItem("crypto-boerse-session-only");
    const tabActive = sessionStorage.getItem("crypto-boerse-tab-active");

    const applySession = (nextSession: Session | null) => {
      // Only swap state when something meaningful changed. This prevents
      // background TOKEN_REFRESHED events (fired when the tab regains focus)
      // from creating new user/session object refs and triggering a
      // re-render storm that looks like an "auto refresh" to the user.
      setSession((prev) => {
        if (prev?.access_token === nextSession?.access_token) return prev;
        return nextSession;
      });
      setUser((prev) => {
        const nextUser = nextSession?.user ?? null;
        if (prev?.id === nextUser?.id) return prev;
        return nextUser;
      });
    };

    const finishAuthInit = (nextSession: Session | null) => {
      if (!isActive) return;

      sessionHydratedRef.current = true;
      applySession(nextSession);
      setLoading(false);
    };

    // Mark this tab as active immediately so a successful login in this same
    // tab won't be wiped on the next reload by the session-only guard.
    sessionStorage.setItem("crypto-boerse-tab-active", "true");

    if (sessionOnly === "true" && !tabActive) {
      void supabase.auth.signOut().then(() => {
        localStorage.removeItem("crypto-boerse-session-only");
        finishAuthInit(null);
      });
      // Still subscribe to auth changes so a subsequent login in this tab
      // hydrates `user` and unblocks the redirect from /login → /dashboard.
      const {
        data: { subscription: earlySub },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!isActive) return;
        applySession(nextSession);
        if (sessionHydratedRef.current) setLoading(false);
      });
      return () => {
        isActive = false;
        earlySub.unsubscribe();
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) return;

      applySession(nextSession);

      if (sessionHydratedRef.current) {
        setLoading(false);
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session: nextSession } }) => {
        finishAuthInit(nextSession);
      })
      .catch(() => {
        finishAuthInit(null);
      });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, session, loading, signOut }),
    [user, session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
