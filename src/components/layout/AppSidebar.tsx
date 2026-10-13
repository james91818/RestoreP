import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronsLeft,
  LayoutDashboard,
  TrendingUp,
  Wallet,
  LineChart,
  Landmark,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  Users,
  UserCheck,
  FileText,
  Shield,
  Handshake,
  PiggyBank,
  Copy,
  CalendarDays,
  Trophy,
  MessageCircle,
  BarChart3,
  Repeat,
  Globe,
  Sun,
  Moon,
  Inbox,
  MailQuestion,
  Phone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useLiveChatAlerts } from "@/hooks/useLiveChatAlerts";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import { useBalance } from "@/hooks/useBalance";
import { toast } from "sonner";
import { playChatSound } from "@/lib/notificationSound";
import iconAsset from "@/assets/crypto-boerse-card-emblem.png.asset.json";
const iconUrl = iconAsset.url;
import { supabase } from "@/lib/supabase";
import { useFollowUps } from "@/hooks/useFollowUps";

const clientNavPortfolio = (t: (de: string, en: string) => string) => [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: t("Geldbörse", "Wallet"), icon: Wallet, path: "/wallet" },
  { title: "Watchlist", icon: LineChart, path: "/watchlist" },
  { title: t("G&V Übersicht", "P&L Summary"), icon: LineChart, path: "/pnl" },
  { title: t("Kalender", "Calendar"), icon: CalendarDays, path: "/calendar" },
];

const clientNavInvesting = (t: (de: string, en: string) => string) => [
  { title: t("Handel", "Trading"), icon: TrendingUp, path: "/trading" },
  { title: "Staking", icon: Landmark, path: "/staking" },
  { title: "Copy Trading", icon: Copy, path: "/copy-trading" },
];

// Admin nav organized by category
const adminNavOverview = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Follow-Up Required", icon: Bell, path: "/backoffice/follow-ups" },
  { title: "Pending Requests", icon: Inbox, path: "/backoffice/pending-requests" },
  { title: "Pending Retention", icon: Repeat, path: "/backoffice/pending-retention" },
];

const adminNavCRM = [
  { title: "Leads", icon: Users, path: "/backoffice/users" },
  { title: "Depositors", icon: UserCheck, path: "/backoffice/depositors" },
  { title: "Agents", icon: Shield, path: "/backoffice/agents", adminOnly: true },
  { title: "Affiliates", icon: Handshake, path: "/backoffice/affiliates", adminOnly: true },
  { title: "VoIP", icon: Phone, path: "/backoffice/voip", adminOnly: true },
];


const adminNavTrading = [
  { title: "Trades", icon: TrendingUp, path: "/backoffice/trades" },
  { title: "Staking", icon: Landmark, path: "/backoffice/staking" },
  { title: "Copy Trading", icon: Copy, path: "/backoffice/copy-trading" },
  { title: "Tier Limits", icon: Shield, path: "/backoffice/tier-limits", adminOnly: true },
];

const adminNavContent = [
  { title: "Live Chats", icon: MessageCircle, path: "/backoffice/live-chats" },
  { title: "Email Replies", icon: MailQuestion, path: "/backoffice/email-replies" },
  { title: "Task List", icon: FileText, path: "/backoffice/tasks" },
  { title: "Score Board", icon: Trophy, path: "/backoffice/scoreboard", adminOnly: true },
  { title: "Calendar", icon: CalendarDays, path: "/backoffice/calendar" },
];

const adminNavStatistics = [
  { title: "Welcome Stats", icon: BarChart3, path: "/backoffice/welcome-stats" },
  { title: "Conversion Stats", icon: TrendingUp, path: "/backoffice/conversion-stats" },
  { title: "Retention Stats", icon: Repeat, path: "/backoffice/retention-stats" },
  { title: "Affiliates Balances", icon: PiggyBank, path: "/backoffice/affiliates-balances", adminOnly: true },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isStaff, roleName } = useRole();
  const { toggleSidebar, state, isMobile, setOpenMobile } = useSidebar();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { totalBalanceEur, inTradesEur, projectedBalanceEur } = useBalance();
  const balance = projectedBalanceEur ?? totalBalanceEur;
  const collapsed = state === "collapsed";
  // Unread live-chat client messages — same logic as LiveChatsFab so counts agree
  const { totalUnread: unreadChats } = useLiveChatAlerts();
  const [isDepositor, setIsDepositor] = useState(false);
  const [pnlToday, setPnlToday] = useState<number>(0);
  const [pnlAllTime, setPnlAllTime] = useState<number>(0);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [openTickets, setOpenTickets] = useState<number>(0);
  const [newLeads, setNewLeads] = useState<number>(0);
  const [emailReplies, setEmailReplies] = useState<number>(0);
  const [taskUnread, setTaskUnread] = useState<number>(0);
  const { overdue: followUpOverdue } = useFollowUps("mine", isStaff);

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    const fetchPending = async () => {
      // Get IDs of all staff (anyone with a role) so we can exclude them from "New leads" count
      const { data: staffRows } = await supabase.from("user_roles").select("user_id");
      const staffIds = Array.from(new Set((staffRows ?? []).map((r: any) => r.user_id).filter(Boolean)));

      let leadsQuery = supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_lead", true)
        .eq("status", "New");
      if (staffIds.length > 0) {
        leadsQuery = leadsQuery.not("id", "in", `(${staffIds.join(",")})`);
      }

      const isAdminMgr = roleName === "Admin" || roleName === "Manager" || roleName === "Manager Conversion" || roleName === "Manager Retention";
      const taskQuery = isAdminMgr
        ? (supabase as any).from("staff_tasks").select("id", { count: "exact", head: true }).eq("admin_unread", true)
        : user
          ? (supabase as any).from("staff_tasks").select("id", { count: "exact", head: true }).eq("created_by", user.id).eq("creator_unread", true)
          : Promise.resolve({ count: 0 });

      const [a, b, t, n, ap, er, tk] = await Promise.all([
        supabase.from("deposits").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
        leadsQuery,
        (supabase as any).from("appointment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("client_email_threads").select("id", { count: "exact", head: true }).gt("agent_unread_count", 0),
        taskQuery,
      ]);
      if (cancelled) return;
      const total = (a.count ?? 0) + (b.count ?? 0) + (ap.count ?? 0);
      setPendingRequests(total);
      setOpenTickets(t.count ?? 0);
      setNewLeads(n.count ?? 0);
      setEmailReplies(er.count ?? 0);
      setTaskUnread((tk as any)?.count ?? 0);
    };
    fetchPending();
    const interval = setInterval(() => { if (!document.hidden) fetchPending(); }, 20000);

    // Realtime: notify agents when a client replies in the email portal
    const replyChannel = supabase
      .channel("sidebar-email-reply-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "client_email_replies", filter: "sender=eq.client" },
        async (payload: any) => {
          const reply = payload.new;
          // Lookup client name for the toast
          let clientLabel = "a client";
          try {
            const { data: thread } = await (supabase as any)
              .from("client_email_threads")
              .select("client_name, client_email, subject")
              .eq("id", reply.thread_id)
              .maybeSingle();
            if (thread) clientLabel = thread.client_name || thread.client_email || clientLabel;
            playChatSound();
            toast.success(`New email reply from ${clientLabel}`, {
              description: (reply.body || "").slice(0, 120),
              action: {
                label: "Open",
                onClick: () => navigate("/backoffice/email-replies"),
              },
            });
          } catch {}
          fetchPending();
        }
      )
      .subscribe();

    // Realtime: refresh task unread badge + notify on relevant changes
    const tasksChannel = supabase
      .channel("sidebar-staff-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "staff_tasks" },
        async (payload: any) => {
          const isAdminMgr = roleName === "Admin" || roleName === "Manager" || roleName === "Manager Conversion" || roleName === "Manager Retention";
          const row = payload.new || payload.old;
          if (!row) { fetchPending(); return; }
          // Notify admins on new agent submissions
          if (isAdminMgr && payload.eventType === "INSERT" && row.created_by !== user?.id) {
            playChatSound();
            toast.info("New task request", {
              description: row.title,
              action: { label: "Open", onClick: () => navigate("/backoffice/tasks") },
            });
          }
          // Notify creator when admin updates their task
          if (payload.eventType === "UPDATE" && row.created_by === user?.id && payload.new?.creator_unread && !payload.old?.creator_unread) {
            playChatSound();
            toast.info("Admin updated your task", {
              description: row.title,
              action: { label: "Open", onClick: () => navigate("/backoffice/tasks") },
            });
          }
          fetchPending();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      void supabase.removeChannel(replyChannel);
      void supabase.removeChannel(tasksChannel);
    };
  }, [isStaff, navigate, user, roleName]);

  useEffect(() => {
    if (!user || isStaff) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("is_lead")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setIsDepositor(data?.is_lead === false); });
    return () => { cancelled = true; };
  }, [user, isStaff]);

  useEffect(() => {
    if (!user || isStaff) return;
    let cancelled = false;
    const fetchPnl = async () => {
      const { data } = await supabase
        .from("trades")
        .select("pnl, closed_at")
        .eq("user_id", user.id)
        .eq("status", "closed")
        .not("pnl", "is", null);
      if (cancelled || !data) return;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      let today = 0;
      let all = 0;
      for (const r of data as any[]) {
        const v = Number(r.pnl) || 0;
        all += v;
        if (r.closed_at && new Date(r.closed_at) >= startOfDay) today += v;
      }
      setPnlToday(today);
      setPnlAllTime(all);
    };
    fetchPnl();
    const channel = supabase
      .channel("sidebar-pnl")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` },
        () => fetchPnl()
      )
      .subscribe();
    const interval = setInterval(() => { if (!document.hidden) fetchPnl(); }, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, isStaff]);

  const filterAdmin = (items: typeof adminNavCRM) =>
    items.filter(item => !(item as any).adminOnly || roleName === "Admin");

  const bottomNav = isStaff
    ? [
        { title: "Notifications", icon: Bell, path: "/notifications" },
        { title: "Support", icon: HelpCircle, path: "/support" },
        ...(roleName === "Admin" ? [{ title: "Attached Wallets", icon: Wallet, path: "/backoffice/attached-wallets" }] : []),
        { title: "Settings", icon: Settings, path: "/settings" },
      ]
    : [
        { title: t("Benachrichtigungen", "Notifications"), icon: Bell, path: "/notifications" },
        { title: t("Hilfe & Support", "Help & Support"), icon: HelpCircle, path: "/support" },
        { title: t("Einstellungen", "Settings"), icon: Settings, path: "/settings" },
      ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) setOpenMobile(false);
  };

  const renderNavGroup = (label: string, items: typeof adminNavCRM) => {
    const filtered = filterAdmin(items);
    if (filtered.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filtered.map((item) => {
              const isLiveChats = item.path === "/backoffice/live-chats";
              const isPendingReqs = item.path === "/backoffice/pending-requests";
              const isLeads = item.path === "/backoffice/users";
              const isEmailReplies = item.path === "/backoffice/email-replies";
              const isTasks = item.path === "/backoffice/tasks";
              const isFollowUps = item.path === "/backoffice/follow-ups";
              const badgeCount = isLiveChats ? unreadChats : isPendingReqs ? pendingRequests : isLeads ? newLeads : isEmailReplies ? emailReplies : isTasks ? taskUnread : isFollowUps ? followUpOverdue.length : 0;
              const showBadge = badgeCount > 0;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => handleNavigate(item.path)}
                    tooltip={item.title}
                  >
                    <div className="relative">
                      <item.icon className="h-4 w-4" />
                      {showBadge && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground animate-pulse">
                          {badgeCount > 9 ? "9+" : badgeCount}
                        </span>
                      )}
                    </div>
                    <span className={isEmailReplies && showBadge ? "text-red-500 font-semibold" : ""}>
                      {item.title}
                      {isEmailReplies && showBadge && (
                        <span className="ml-1 text-red-500 font-bold tabular-nums">({badgeCount})</span>
                      )}
                    </span>
                    {showBadge && !collapsed && !isEmailReplies && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                        {badgeCount}
                      </span>
                    )}
                    {isEmailReplies && showBadge && !collapsed && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse tabular-nums">
                        {badgeCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div
            className="flex flex-col items-start cursor-pointer min-w-0"
            onClick={() => handleNavigate("/dashboard")}
          >
            {!collapsed && (
              <span className="inline-flex items-center gap-2">
                <img src={iconUrl} alt="" className="h-10 w-auto shrink-0" />
                <span className="flex flex-col leading-none">
                  <span className="font-display font-bold text-white text-lg tracking-tight">Crypto-Börse</span>
                  <span className="text-[9px] tracking-[0.3em] text-white/70 uppercase mt-0.5">Handelsplattform</span>
                </span>
              </span>
            )}
            {isStaff && !collapsed && (
              <p className="text-[10px] font-semibold text-sidebar-foreground uppercase tracking-wider whitespace-nowrap mt-1">Backoffice</p>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="md:hidden p-1.5 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <ChevronsLeft className="h-5 w-5" />
          </button>
        </div>
        {!isStaff && balance !== null && !collapsed && (
          <div className="mt-3 rounded-lg bg-sidebar-accent px-3 py-2.5 space-y-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-medium">{t("Gesamtsaldo", "Total Balance")}</p>
              <p className="text-lg font-display font-bold text-sidebar-primary-foreground tabular-nums">
                €{balance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {inTradesEur > 0 && (
                <p className="text-[10px] text-sidebar-foreground/60 mt-0.5 tabular-nums">
                  {t("In Trades", "In Trades")}: €{inTradesEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-sidebar-border/50">
              <div>
                <p className="text-[8px] uppercase tracking-wider text-sidebar-foreground/50 font-medium leading-tight">{t("Heute", "Today")}</p>
                <p className={`text-[11px] font-display font-semibold tabular-nums leading-tight ${pnlToday > 0 ? "text-emerald-400" : pnlToday < 0 ? "text-red-400" : "text-sidebar-foreground/70"}`}>
                  {pnlToday > 0 ? "+" : ""}€{pnlToday.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-wider text-sidebar-foreground/50 font-medium leading-tight">{t("Gesamt G&V", "All-Time P&L")}</p>
                <p className={`text-[11px] font-display font-semibold tabular-nums leading-tight ${pnlAllTime > 0 ? "text-emerald-400" : pnlAllTime < 0 ? "text-red-400" : "text-sidebar-foreground/70"}`}>
                  {pnlAllTime > 0 ? "+" : ""}€{pnlAllTime.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>

      {/* Collapse toggle button */}
      <div className="hidden md:flex px-3 pb-1">
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <ChevronsLeft className={`h-4 w-4 shrink-0 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
          {!collapsed && <span>{isStaff ? "Collapse" : t("Einklappen", "Collapse")}</span>}
        </button>
      </div>

      <SidebarSeparator />

      <SidebarContent>
        {isStaff ? (
          <>
            {renderNavGroup("Overview", adminNavOverview)}
            {renderNavGroup("CRM", adminNavCRM)}
            {renderNavGroup("Trading", adminNavTrading)}
            <SidebarSeparator />
            {renderNavGroup("Content & Tools", adminNavContent)}
            <SidebarSeparator />
            {renderNavGroup("Statistics", adminNavStatistics)}
          </>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Portfolio</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {clientNavPortfolio(t).filter(i => i.path !== "/calendar" || isDepositor).map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={location.pathname === item.path}
                        onClick={() => handleNavigate(item.path)}
                        tooltip={item.title}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel>{t("Investieren", "Invest")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {clientNavInvesting(t).map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={location.pathname === item.path}
                        onClick={() => handleNavigate(item.path)}
                        tooltip={item.title}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNav.map((item) => {
                const isSupport = item.path === "/support";
                const supportBadge = isStaff && isSupport ? openTickets : 0;
                const showBadge = supportBadge > 0;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      onClick={() => handleNavigate(item.path)}
                      tooltip={showBadge ? `${item.title} (${supportBadge} open)` : item.title}
                    >
                      <div className="relative">
                        <item.icon className="h-4 w-4" />
                        {showBadge && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground animate-pulse">
                            {supportBadge > 9 ? "9+" : supportBadge}
                          </span>
                        )}
                      </div>
                      <span>{item.title}</span>
                      {showBadge && !collapsed && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                          {supportBadge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Language switcher - client only */}
              {!isStaff && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLang(lang === "de" ? "en" : "de")}
                    tooltip={lang === "de" ? "Sprache wechseln" : "Switch language"}
                  >
                    <Globe className="h-4 w-4" />
                    <span>{lang === "de" ? "Deutsch" : "English"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Theme toggle */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleTheme}
                  tooltip={theme === "dark"
                    ? (isStaff ? "Switch to Light" : t("Zum hellen Modus", "Switch to Light"))
                    : (isStaff ? "Switch to Dark" : t("Zum dunklen Modus", "Switch to Dark"))
                  }
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{theme === "dark"
                    ? (isStaff ? "Light Mode" : t("Heller Modus", "Light Mode"))
                    : (isStaff ? "Dark Mode" : t("Dunkler Modus", "Dark Mode"))
                  }</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {!isStaff && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => window.location.href = "/"}
                    tooltip={t("Zurück zur Webseite", "Back to Website")}
                  >
                    <Globe className="h-4 w-4" />
                    <span>{t("Zurück zur Webseite", "Back to Website")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} tooltip={isStaff ? "Sign Out" : t("Abmelden", "Sign Out")}>
                  <LogOut className="h-4 w-4" />
                  <span>{isStaff ? "Sign Out" : t("Abmelden", "Sign Out")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
