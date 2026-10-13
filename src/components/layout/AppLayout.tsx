import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import MobileBottomNav from "./MobileBottomNav";
import { useAuth } from "@/hooks/useAuth";
import ThemePickerDialog from "@/components/ThemePickerDialog";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/lib/supabase";
import { Bell, Clock, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LiveChatWidget from "@/components/chat/LiveChatWidget";
import BackofficeAIChat from "@/components/chat/BackofficeAIChat";
import LiveChatsFab from "@/components/chat/LiveChatsFab";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import FollowUpAlerts from "@/components/admin/FollowUpAlerts";
import FtdCelebration from "@/components/admin/FtdCelebration";
import PublicFooter from "@/components/layout/PublicFooter";
import { playNotificationSound } from "@/lib/notificationSound";
import GlobalClientSearch from "@/components/admin/GlobalClientSearch";
import { isBackofficeContext } from "@/lib/hosts";
import { isImpersonatedSession } from "@/lib/impersonation";
const AppLayout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isStaff, loading: roleLoading } = useRole();
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentUnread, setUrgentUnread] = useState(0);
  const prevUnreadRef = useRef<number | null>(null);
  const [clockTime, setClockTime] = useState("");
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [ftdCelebration, setFtdCelebration] = useState<string | null>(null);

  const [tzVersion, setTzVersion] = useState(0);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase.from("profiles").select("full_name, avatar_url, timezone").eq("id", user.id).single()
      .then(({ data }) => {
        if (!data) return;
        setProfile(data);
        // Keep the staff clock in sync with the timezone saved on the account.
        if (data.timezone) {
          localStorage.setItem("staff_timezone", data.timezone);
          setTzVersion(v => v + 1);
        }
      });
  }, [user]);

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "";

  const getTimezone = useCallback(() => {
    if (isStaff) {
      return localStorage.getItem("staff_timezone") || "Asia/Jerusalem";
    }
    // Clients: default to Germany (Europe/Berlin)
    return "Europe/Berlin";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, tzVersion]);

  useEffect(() => {
    const tick = () => {
      const tz = getTimezone();
      setClockTime(new Date().toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [getTimezone]);

  useEffect(() => {
    if (user && !localStorage.getItem(`crypto-boerse-theme-chosen-${user.id}`)) {
      setShowThemePicker(true);
    }
  }, [user]);

  // Persist acknowledged notification IDs across remounts/reloads so a closed
  // toast never re-appears for the same user, even if the backend row stays unread.
  const acknowledgedKey = user ? `notif-acknowledged-${user.id}` : "";
  const legacyShownKey = user ? `notif-shown-${user.id}` : "";
  const loadAcknowledged = (): Set<string> => {
    try {
      const raw = acknowledgedKey ? localStorage.getItem(acknowledgedKey) : null;
      const legacyRaw = legacyShownKey ? sessionStorage.getItem(legacyShownKey) : null;
      return new Set([
        ...(raw ? (JSON.parse(raw) as string[]) : []),
        ...(legacyRaw ? (JSON.parse(legacyRaw) as string[]) : []),
      ]);
    } catch {
      return new Set();
    }
  };
  const saveAcknowledged = (set: Set<string>) => {
    try {
      if (!acknowledgedKey) return;
      const arr = Array.from(set).slice(-1000);
      localStorage.setItem(acknowledgedKey, JSON.stringify(arr));
      if (legacyShownKey) sessionStorage.removeItem(legacyShownKey);
    } catch {}
  };
  const lastSeenIdsRef = useRef<Set<string>>(new Set());
  const acknowledgedToastIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    acknowledgedToastIdsRef.current = loadAcknowledged();

    const fetchUnread = async () => {
      const { data, count } = await supabase
        .from("notifications")
        .select("id, title, message, type, priority", { count: "exact" })
        .eq("user_id", user.id)
        .eq("read", false);

      const newCount = count ?? 0;
      const list = ((data as any[]) ?? []);
      const urgentList = list.filter((n) => (n.priority ?? 0) >= 2);
      setUrgentUnread(urgentList.length);

      // Only trigger a toast for notifications we have never acknowledged/shown before.
      const acknowledged = acknowledgedToastIdsRef.current;
      const newOnes = list.filter((n) => !acknowledged.has(n.id));

      if (newOnes.length > 0) {
        // Pick the highest-priority new notification to drive sound + toast
        const top = [...newOnes].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
        const isDeposit = (top.priority ?? 0) >= 3 || top.type === "deposit";
        const isUrgent = (top.priority ?? 0) >= 2;

        const acknowledgeNotification = (notificationId: string) => {
          const next = acknowledgedToastIdsRef.current;
          next.add(notificationId);
          saveAcknowledged(next);
        };

        if (isUrgent) {
          playNotificationSound(top.type, top.priority);
          const icon =
            top.type === "deposit" ? "💳 " :
            top.type === "wallet_received" ? "💰 " :
            top.type === "lead" ? "🎯 " :
            top.type === "chat" ? "💬 " :
            top.type === "appointment" ? "📅 " :
            top.type === "warning" ? "⚠️ " :
            top.type === "client_online" ? "🟢 " :
            top.type === "payment_link" ? "🔗 " : "🔔 ";

          const markRead = () => {
            acknowledgeNotification(top.id);
            supabase.from("notifications").update({ read: true }).eq("id", top.id).then(() => {});
          };

          toast(icon + (top.title ?? ""), {
            id: top.id,
            description: top.message,
            duration: isDeposit ? 30000 : 15000,
            action: {
              label: isStaff ? "Open" : "Öffnen",
              onClick: () => { markRead(); navigate("/notifications"); },
            },
            onDismiss: markRead,
            onAutoClose: markRead,
          });
        }

        // Mark all newly-seen notifications as acknowledged locally so they cannot re-toast
        newOnes.forEach((n) => acknowledged.add(n.id));
        saveAcknowledged(acknowledged);
      }

      lastSeenIdsRef.current = new Set(list.map((n) => n.id));
      prevUnreadRef.current = newCount;
      setUnreadCount(newCount);
    };
    fetchUnread();
    // Poll faster (10s) so missed realtime events are still caught quickly
    const interval = setInterval(() => {
      if (!document.hidden) fetchUnread();
    }, 10000);

    // Realtime: instant alert when a new notification arrives
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchUnread()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, isStaff, navigate]);

  // Heartbeat + force link polling + current page tracking
  const lastTrackedPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || roleLoading) return;
    // Agent "Login as Client" sessions must not affect client presence data
    if (isImpersonatedSession()) return;
    const heartbeatAndCheck = async () => {
      const currentPath = location.pathname + (location.search || "");
      const pathChanged = lastTrackedPathRef.current !== currentPath;
      const updatePayload: any = { last_seen_at: new Date().toISOString() };
      if (!isStaff) {
        updatePayload.current_page = currentPath;
        if (pathChanged) {
          updatePayload.current_page_since = new Date().toISOString();
          lastTrackedPathRef.current = currentPath;
        }
      }
      await supabase.from("profiles").update(updatePayload).eq("id", user.id);
      // Check for force redirect
      const { data } = await supabase
        .from("profiles")
        .select("force_redirect_url")
        .eq("id", user.id)
        .single();
      const url = (data as any)?.force_redirect_url;
      if (url) {
        await supabase.from("profiles").update({ force_redirect_url: null } as any).eq("id", user.id);
        if (url.startsWith("/")) {
          navigate(url);
        } else {
          window.location.href = url;
        }
      }
    };
    heartbeatAndCheck();
    const interval = setInterval(() => {
      if (!document.hidden) heartbeatAndCheck();
    }, 15000);
    return () => clearInterval(interval);
  }, [user, navigate, location.pathname, location.search, isStaff, roleLoading]);

  // Realtime popups for client: deposits, withdrawals, swaps
  useEffect(() => {
    if (!user || isStaff || roleLoading) return;

    const channel = supabase
      .channel("client-financial-popups")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const d = payload.new as any;
          toast.success("New Deposit", {
            description: `${d.amount} ${d.currency} deposit has been submitted.`,
            duration: 6000,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const d = payload.new as any;
          if (d.status === "approved") {
            toast.success("Deposit Approved ✅", {
              description: `Your ${d.amount} ${d.currency} deposit has been approved.`,
              duration: 8000,
            });
          } else if (d.status === "rejected") {
            toast.error("Deposit Rejected", {
              description: `Your ${d.amount} ${d.currency} deposit was rejected.`,
              duration: 8000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "withdrawals", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const w = payload.new as any;
          toast.info("Withdrawal Requested", {
            description: `${w.amount} ${w.currency} withdrawal is being processed.`,
            duration: 6000,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "withdrawals", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const w = payload.new as any;
          if (w.status === "approved") {
            toast.success("Withdrawal Approved ✅", {
              description: `Your ${w.amount} ${w.currency} withdrawal has been approved.`,
              duration: 8000,
            });
          } else if (w.status === "rejected") {
            toast.error("Withdrawal Rejected", {
              description: `Your ${w.amount} ${w.currency} withdrawal was rejected.`,
              duration: 8000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "swaps", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const s = payload.new as any;
          toast.success("Swap Completed 🔄", {
            description: `Swapped ${s.amount} ${s.from_currency} → ${s.received_amount ?? ""} ${s.to_currency}`,
            duration: 6000,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isStaff, roleLoading]);

  // Realtime FTD celebration + client-online notification for staff
  const onlineNotifiedRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (!user || !isStaff || roleLoading) return;

    const ONLINE_THRESHOLD_MS = 60_000; // considered online if last_seen within 60s
    const RENOTIFY_COOLDOWN_MS = 10 * 60_000; // don't re-notify same client for 10 min

    const channel = supabase
      .channel("staff-profile-events")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        async (payload) => {
          const oldRow = payload.old as any;
          const newRow = payload.new as any;

          // FTD celebration
          if (!oldRow.first_deposit_at && newRow.first_deposit_at) {
            const { data: setting } = await supabase
              .from("platform_settings")
              .select("value")
              .eq("key", "notifications")
              .maybeSingle();
            const ftdEnabled = (setting?.value as any)?.ftd_celebration ?? true;
            if (ftdEnabled) {
              const name = newRow.full_name || newRow.email || "Unknown";
              setFtdCelebration(name);
            }
          }

          // Client-online notification — only for the assigned agent
          // Skip the very first login (no previous last_seen_at) — common for fresh affiliate signups
          if (newRow.assigned_agent === user.id && newRow.last_seen_at && oldRow.last_seen_at) {
            const newSeen = new Date(newRow.last_seen_at).getTime();
            const oldSeen = new Date(oldRow.last_seen_at).getTime();
            const wasOffline = (Date.now() - oldSeen) > ONLINE_THRESHOLD_MS;
            const isNowOnline = (Date.now() - newSeen) <= ONLINE_THRESHOLD_MS;

            if (wasOffline && isNowOnline) {
              const lastNotified = onlineNotifiedRef.current.get(newRow.id) ?? 0;
              if (Date.now() - lastNotified > RENOTIFY_COOLDOWN_MS) {
                onlineNotifiedRef.current.set(newRow.id, Date.now());
                const name = newRow.full_name || newRow.email || "Client";
                toast.success("Client Online 🟢", {
                  description: `${name} is now online.`,
                  duration: 7000,
                  action: {
                    label: "Open",
                    onClick: () => navigate(`/admin/users/${newRow.id}`),
                  },
                });
                // Persist as notification
                supabase.from("notifications").insert({
                  user_id: user.id,
                  title: "Client Online",
                  message: `${name} is now online.`,
                  type: "client_online",
                }).then(() => {});
              }
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isStaff, navigate, roleLoading]);

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={isBackofficeContext() ? "/backoffice" : "/login"} replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-1.5 sm:gap-2 border-b px-3 md:px-6">
          <SidebarTrigger className="md:hidden" />
          {isStaff && !["/backoffice/depositors", "/backoffice/leads"].includes(location.pathname) ? (
            <div className="flex-1 flex items-center justify-start md:pl-4">
              <GlobalClientSearch />
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex items-center gap-2 sm:gap-2.5 sm:mr-2">
            <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium text-foreground">
              {profile?.full_name || "Mein Konto"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground" title={`Timezone: ${getTimezone()}`}>
            <Clock className="h-4 w-4 hidden xs:inline-block sm:inline-block" />
            <span className="text-xs font-mono font-medium tabular-nums">{clockTime}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80 hidden md:inline">
              {getTimezone().split("/").pop()?.replace(/_/g, " ")}
            </span>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className={`relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ${urgentUnread > 0 ? "animate-pulse" : ""}`}
          >
            <Bell className={`h-5 w-5 ${urgentUnread > 0 ? "text-destructive" : ""}`} />
            {unreadCount > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${urgentUnread > 0 ? "bg-destructive text-destructive-foreground ring-2 ring-destructive/30" : "bg-primary text-primary-foreground"}`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </header>
        <main className="flex-1 p-3 pb-24 sm:p-4 sm:pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>
        {!isStaff && <PublicFooter />}
        <MobileBottomNav />
      </SidebarInset>
      <ThemePickerDialog open={showThemePicker} onClose={() => setShowThemePicker(false)} userId={user?.id} />
      <LiveChatWidget />
      <BackofficeAIChat />
      <LiveChatsFab />
      {isStaff && isBackofficeContext() && <FollowUpAlerts />}
      <AnimatePresence>
        {ftdCelebration && (
          <FtdCelebration
            clientName={ftdCelebration}
            onComplete={() => setFtdCelebration(null)}
          />
        )}
      </AnimatePresence>
    </SidebarProvider>
  );
};

export default AppLayout;
