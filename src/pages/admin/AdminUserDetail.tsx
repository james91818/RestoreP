import { useEffect, useState, useCallback, useRef } from "react";
import { fetchCryptoPricesEur } from "@/lib/fetchCryptoPrices";
import { fetchLivePrices, computeLivePnl } from "@/lib/tradePnl";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getStaffTz, getClientTz, zonedDateTimeToUTC, formatTimeInTz, tzLabel } from "@/lib/timezone";
import { ArrowLeft, ArrowRightCircle, ChevronLeft, ChevronRight, LogIn, Save, Ban, CheckCircle, DollarSign, TrendingUp, Wallet, Shield, MessageSquare, Send, Plus, Eye, EyeOff, KeyRound, Landmark, Lock, Clock, TrendingDown, CalendarDays, FileText, Download, Paperclip, X, File, Users, Activity, ShieldCheck, Home, ExternalLink, Mail, CreditCard, Scissors, CalendarIcon, Tag, Target, Layers, ArrowRight, CheckCircle2, Trash2, Copy, Gift, Languages, Loader2, Zap, Check, CheckCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useRole, isAgentRole } from "@/hooks/useRole";
import StatusChanger from "@/components/admin/StatusChanger";
import CallPrefixMenu from "@/components/admin/CallPrefixMenu";
import PaymentLinkDialog from "@/components/admin/PaymentLinkDialog";
import PaymentProviderPickerDialog from "@/components/admin/PaymentProviderPickerDialog";
import AdminKycDocs from "@/components/admin/AdminKycDocs";
import ClientActivityLog from "@/components/admin/ClientActivityLog";
import PhoneCallLog from "@/components/admin/PhoneCallLog";
import EmailLog from "@/components/admin/EmailLog";
import PageDuration from "@/components/admin/PageDuration";
import StripeIntentsPanel from "@/components/admin/StripeIntentsPanel";
import AppointmentRequestsPanel from "@/components/admin/AppointmentRequestsPanel";
import ClientActivityFeed from "@/components/admin/ClientActivityFeed";
import ClientPageVisits from "@/components/admin/ClientPageVisits";
import { COUNTRIES, normalizeCountry, findCountry } from "@/lib/countries";
import GlobalClientSearch from "@/components/admin/GlobalClientSearch";
import { checkCrgForProfile, type CrgCheckRow } from "@/hooks/useCrgGuard";
import CrgWarningDialog from "@/components/admin/CrgWarningDialog";
import { getNavPosition } from "@/lib/clientNavList";
import Time24Input from "@/components/ui/time-24-input";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  suspended: "bg-destructive/10 text-destructive",
  pending: "bg-yellow-500/10 text-yellow-600",
};

const APPT_COLORS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#06b6d4", label: "Cyan" },
];

type QuickEmailFrom = "agent" | "support" | "noreply";
type QuickEmailTemplate = "no-answer-followup" | "p2p-link" | "account-update-24h" | "account-update-weekly";
const QUICK_EMAIL_LABELS: Record<QuickEmailTemplate, string> = {
  "no-answer-followup": "NA Email",
  "p2p-link": "P2P Link",
  "account-update-24h": "24h Account Update",
  "account-update-weekly": "Weekly Account Update",
};

const SUPPORT_EMAIL = "support@crypto-borse.com";
const NOREPLY_EMAIL = "noreply@crypto-borse.com";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const AdminUserDetail = () => {
  const { user: currentUser } = useAuth();
  const { roleName: currentRoleName } = useRole();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);

  // Scroll to a section if URL hash is present (e.g. #stripe-intents from notifications)
  useEffect(() => {
    if (!location.hash || !profile) return;
    const id = location.hash.replace("#", "");
    const tryScroll = (attempt = 0) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("ring-2", "ring-primary", "rounded-lg");
        window.setTimeout(() => el.classList.remove("ring-2", "ring-primary", "rounded-lg"), 2500);
      } else if (attempt < 10) {
        window.setTimeout(() => tryScroll(attempt + 1), 200);
      }
    };
    tryScroll();
  }, [location.hash, profile]);
  const [roles, setRoles] = useState<any[]>([]);
  const [userRoleId, setUserRoleId] = useState<string>("none");
  const [teams, setTeams] = useState<any[]>([]);
  const [userTeamId, setUserTeamId] = useState<string>("none");
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [copiedTradeIds, setCopiedTradeIds] = useState<Set<string>>(new Set());
  const [wallets, setWallets] = useState<any[]>([]);
  
  const [paymentLinkRequests, setPaymentLinkRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editProfile, setEditProfile] = useState({ full_name: "", phone: "", secondary_phone: "", country: "", kyc_status: "", email: "" });
  const [adminNotes, setAdminNotes] = useState<any[]>([]);
  const [kycDocsCount, setKycDocsCount] = useState<number>(0);
  const [latestIp, setLatestIp] = useState<{ ip: string | null; at: string | null }>({ ip: null, at: null });
  const noteDraftKey = userId ? `admin-note-draft-${userId}` : "";
  const [newNote, setNewNote] = useState("");
  // Hydrate draft from localStorage whenever the viewed user changes
  useEffect(() => {
    if (typeof window === "undefined" || !noteDraftKey) return;
    const saved = localStorage.getItem(noteDraftKey) || "";
    setNewNote(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteDraftKey]);
  // Persist draft so it survives accidental page reloads (ErrorBoundary, etc.)
  useEffect(() => {
    if (!noteDraftKey) return;
    if (newNote) localStorage.setItem(noteDraftKey, newNote);
    else localStorage.removeItem(noteDraftKey);
  }, [newNote, noteDraftKey]);
  // Save draft on tab close / navigation as a safety net
  useEffect(() => {
    if (!noteDraftKey) return;
    const handler = () => {
      if (newNote) localStorage.setItem(noteDraftKey, newNote);
    };
    window.addEventListener("beforeunload", handler);
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("pagehide", handler);
    };
  }, [newNote, noteDraftKey]);

  // Fetch latest known IP from activity log
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("ip, created_at")
        .eq("user_id", userId)
        .not("ip", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setLatestIp({ ip: (data as any)?.ip ?? null, at: (data as any)?.created_at ?? null });
    })();
    return () => { cancelled = true; };
  }, [userId]);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [uploadingComment, setUploadingComment] = useState(false);
  // Note translations: { [noteId]: { text?: string, loading?: boolean } }
  const [translations, setTranslations] = useState<Record<string, { text?: string; loading?: boolean }>>({});

  const translateNote = async (noteId: string, content: string) => {
    const existing = translations[noteId];
    if (existing?.text) {
      // Toggle off — hide translation
      setTranslations((p) => { const n = { ...p }; delete n[noteId]; return n; });
      return;
    }
    setTranslations((p) => ({ ...p, [noteId]: { loading: true } }));
    try {
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { text: content, target: "English" },
      });
      if (error) throw error;
      const translation = (data as any)?.translation;
      if (!translation) throw new Error("Empty translation");
      setTranslations((p) => ({ ...p, [noteId]: { text: translation } }));
    } catch (e: any) {
      setTranslations((p) => { const n = { ...p }; delete n[noteId]; return n; });
      toast.error("Translation failed: " + (e?.message || "Unknown error"));
    }
  };
  const [manualDepositOpen, setManualDepositOpen] = useState(false);
  const [depCrgCheck, setDepCrgCheck] = useState<CrgCheckRow | null>(null);
  const [depForm, setDepForm] = useState({ amount: "", currency: "EUR", method: "", notes: "", crypto_asset: "BTC", psp_provider: "", ftd_agent: "" });
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusForm, setBonusForm] = useState({ amount: "", currency: "EUR", notes: "" });
  const [bonusLoading, setBonusLoading] = useState(false);
  const [editBonusOpen, setEditBonusOpen] = useState(false);
  const [editBonusForm, setEditBonusForm] = useState<{ id: string; amount: string; currency: string; notes: string; originalAmount: number }>({ id: "", amount: "", currency: "EUR", notes: "", originalAmount: 0 });
  const [editBonusLoading, setEditBonusLoading] = useState(false);
  const [editDepositOpen, setEditDepositOpen] = useState(false);
  const [editDepositForm, setEditDepositForm] = useState<any>({ id: "", amount: "", currency: "EUR", method: "", status: "approved", psp_provider: "", notes: "", created_at: "" });
  const [manualWithdrawOpen, setManualWithdrawOpen] = useState(false);
  const [wdForm, setWdForm] = useState({ amount: "", currency: "EUR", method: "manual", notes: "" });
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [revealingPassword, setRevealingPassword] = useState(false);
  const [cryptoPricesEur, setCryptoPricesEur] = useState<Record<string, number>>({});
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentEmail, setAgentEmail] = useState<string | null>(null);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  // Stakes
  const [stakes, setStakes] = useState<any[]>([]);
  const [stakingPlans, setStakingPlans] = useState<any[]>([]);
  const [editStake, setEditStake] = useState<any>(null);
  const [rewardsInput, setRewardsInput] = useState("");
  const [claimedInput, setClaimedInput] = useState("false");
  // Bank details
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [bankForm, setBankForm] = useState({ bank_name: "", account_holder: "", iban: "", swift_bic: "", reference: "", notes: "" });
  const [savingBank, setSavingBank] = useState(false);
  // Crypto addresses
  const [cryptoAddresses, setCryptoAddresses] = useState<any[]>([]);
  const [cryptoForm, setCryptoForm] = useState({ currency: "BTC", address: "", network: "", label: "" });
  const [pnlMode, setPnlMode] = useState<"total" | "today" | "monthly">("total");
  const [tradesCountMode, setTradesCountMode] = useState<"open" | "closed">("open");
  const [savingCrypto, setSavingCrypto] = useState(false);
  // Crypto wallet request (PSP via Telegram)
  // Report settings
  const [reportType, setReportType] = useState("custom");
  const [reportDateRange, setReportDateRange] = useState("all");
  const [reportSections, setReportSections] = useState<Record<string, boolean>>({ wallets: true, trades: true, deposits: true, withdrawals: true, staking: true, pnl: true });
  const [reportFrequency, setReportFrequency] = useState("manual");
  const [reportEnabled, setReportEnabled] = useState(false);
  const [reportLastSent, setReportLastSent] = useState<string | null>(null);
  const [savingReport, setSavingReport] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isOnWelcomePage, setIsOnWelcomePage] = useState(false);
  const [welcomeLandedAt, setWelcomeLandedAt] = useState<string | null>(null);
  const [welcomeTimeLeft, setWelcomeTimeLeft] = useState<number | null>(null);
  const [forceLinkOpen, setForceLinkOpen] = useState(false);
  const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [quickEmailsOpen, setQuickEmailsOpen] = useState(false);
  const [naEmailStep, setNaEmailStep] = useState<"menu" | "preview" | "sending" | "custom" | "trade-updates" | "custom-range">("menu");
  const [naEmailTemplate, setNaEmailTemplate] = useState<QuickEmailTemplate>("no-answer-followup");
  const [naEmailData, setNaEmailData] = useState<Record<string, any> | null>(null);
  const [naRangeFrom, setNaRangeFrom] = useState("");
  const [naRangeTo, setNaRangeTo] = useState("");

  const [naEmailBody, setNaEmailBody] = useState("");
  const [naEmailSubject, setNaEmailSubject] = useState("");
  const [naEmailEditing, setNaEmailEditing] = useState(false);
  const [naEmailHtml, setNaEmailHtml] = useState("");
  const [naEmailPreviewError, setNaEmailPreviewError] = useState<string | null>(null);
  const [naEmailFrom, setNaEmailFrom] = useState<QuickEmailFrom>("support");
  const [customEmailSubject, setCustomEmailSubject] = useState("");
  const [customEmailBody, setCustomEmailBody] = useState("");
  const [customEmailFrom, setCustomEmailFrom] = useState<QuickEmailFrom>("agent");
  const [customEmailSending, setCustomEmailSending] = useState(false);
  const [forceLinkUrl, setForceLinkUrl] = useState("");
  const [affFeedbackOpen, setAffFeedbackOpen] = useState(false);
  const [affFeedbackLoading, setAffFeedbackLoading] = useState(false);
  const [affFeedbackText, setAffFeedbackText] = useState("");
  const [affFeedbackHasTelegram, setAffFeedbackHasTelegram] = useState(false);
  const [affFeedbackAffiliate, setAffFeedbackAffiliate] = useState("");
  const [affFeedbackError, setAffFeedbackError] = useState<string | null>(null);
  const [affFeedbackSending, setAffFeedbackSending] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const [currentPageSince, setCurrentPageSince] = useState<string | null>(null);
  const [pageTick, setPageTick] = useState(0);
  const [shaveDialogOpen, setShaveDialogOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [shaveLoading, setShaveLoading] = useState(false);
  // Inline appointment creation
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [apptForm, setApptForm] = useState({ title: "", description: "", date: "", startTime: "10:00", color: "#3b82f6", client_id: "" });
  const [savingAppt, setSavingAppt] = useState(false);
  const [apptNotifyClient, setApptNotifyClient] = useState(true);
  const [apptNotifyAgent, setApptNotifyAgent] = useState(true);
  const [apptClients, setApptClients] = useState<any[]>([]);
  const [apptClientType, setApptClientType] = useState<"leads" | "depositors" | "all">("all");
  const [apptClientPickerOpen, setApptClientPickerOpen] = useState(false);

  const fetchAppointmentClients = async () => {
    const pageSize = 1000;
    const all: any[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, first_deposit_at")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error || !data?.length) break;
      all.push(...data);
      if (data.length < pageSize) break;
    }
    const { data: urData } = await supabase.from("user_roles").select("user_id");
    const staffIds = new Set((urData ?? []).map((ur: any) => ur.user_id));
    return all.filter(p => !staffIds.has(p.id));
  };

  const openAppointmentDialog = async () => {
    setAppointmentOpen(true);
    if (!apptClients.length) {
      const clients = await fetchAppointmentClients();
      setApptClients(clients);
      const current = clients.find(c => c.id === userId) || profile;
      if (current) {
        const isDepositor = !!current.first_deposit_at;
        setApptClientType(isDepositor ? "depositors" : "leads");
        setApptForm(f => ({ ...f, client_id: userId || "" }));
      }
    }
  };
  // Inline trade creation
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeAssets, setTradeAssets] = useState<any[]>([]);
  type BulkTradeRow = { asset_id: string; direction: string; size: string; leverage: string; pnl: string; closedAt: Date; entryPrice: string };
  const [bulkStep, setBulkStep] = useState<"trade" | "review">("trade");
  const [bulkRows, setBulkRows] = useState<BulkTradeRow[]>([]);
  const [bulkCurrentRow, setBulkCurrentRow] = useState<BulkTradeRow>({ asset_id: "", direction: "buy", size: "1000", leverage: "1", pnl: "50", closedAt: new Date(), entryPrice: "" });
  const [savingTrade, setSavingTrade] = useState(false);
  // Inline chat panel
  const [inlineChatOpen, setInlineChatOpen] = useState(false);
  const [inlineChatRoom, setInlineChatRoom] = useState<any>(null);
  const [inlineChatMessages, setInlineChatMessages] = useState<any[]>([]);
  const [inlineChatReply, setInlineChatReply] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const AI_SENDER = "00000000-0000-0000-0000-000000000000";

  const reportTemplates: Record<string, { label: string; description: string; sections: Record<string, boolean> }> = {
    custom: { label: "Custom Report", description: "Select sections manually", sections: { wallets: true, trades: true, deposits: true, withdrawals: true, staking: true, pnl: true } },
    pnl_report: { label: "Profit & Loss Report", description: "Portfolio performance, trades and P&L summary", sections: { wallets: true, trades: true, deposits: false, withdrawals: false, staking: false, pnl: true } },
    account_summary: { label: "Account Summary", description: "Full overview of all account activity", sections: { wallets: true, trades: true, deposits: true, withdrawals: true, staking: true, pnl: true } },
    deposit_banking: { label: "Deposit & Banking Details", description: "Deposit history and bank information", sections: { wallets: true, trades: false, deposits: true, withdrawals: true, staking: false, pnl: false } },
    staking_report: { label: "Staking Report", description: "Active stakes, rewards earned and plan details", sections: { wallets: false, trades: false, deposits: false, withdrawals: false, staking: true, pnl: false } },
    trading_activity: { label: "Trading Activity Report", description: "Detailed trading history with entry/exit prices", sections: { wallets: false, trades: true, deposits: false, withdrawals: false, staking: false, pnl: true } },
  };

  const resolveQuickEmailSender = useCallback((from: QuickEmailFrom) => {
    if (from === "agent" && agentEmail) {
      return {
        name: agentName || agentEmail,
        email: agentEmail,
        fromAddress: agentEmail,
        fromName: agentName || agentEmail,
      };
    }

    if (from === "noreply") {
      return {
        name: "Crypto-Börse",
        email: NOREPLY_EMAIL,
        fromAddress: NOREPLY_EMAIL,
        fromName: "Crypto-Börse",
      };
    }

    return {
      name: "Crypto-Börse Support",
      email: SUPPORT_EMAIL,
      fromAddress: SUPPORT_EMAIL,
      fromName: "Crypto-Börse Support",
    };
  }, [agentEmail, agentName]);

  const buildNoAnswerBody = useCallback((clientName: string, funnel: string, senderName: string, senderEmail: string) =>
`Sehr geehrte/r ${clientName || "Kunde/Kundin"},

mein Name ist ${senderName} und ich bin Ihr persönlicher Ansprechpartner bei Crypto-Börse.

Wir kontaktieren Sie, da Sie sich kürzlich für unsere Investment-Kampagne${funnel ? ` „${funnel}"` : ""} registriert haben. Wir haben mehrfach versucht, Sie per E-Mail und Live-Chat zu erreichen, um den Registrierungsprozess gemeinsam mit Ihnen abzuschließen und Sie umfassend zu beraten.

Leider konnten wir Sie bisher nicht erreichen. Wir möchten sicherstellen, dass Sie alle Informationen erhalten, die Sie benötigen, und Ihnen bei den nächsten Schritten behilflich sind.

So erreichen Sie uns:
E-Mail: ${senderEmail}
Ihr Berater: ${senderName}
Berater E-Mail: ${senderEmail}

Bitte teilen Sie uns mit, wann es Ihnen am besten passt, damit wir uns zurückmelden und den Prozess gemeinsam abschließen können. Sie können uns jederzeit per E-Mail an ${senderEmail} kontaktieren oder im Live-Chat auf crypto-borse.com.

Wir freuen uns darauf, Sie persönlich zu beraten und gemeinsam die besten Investmentmöglichkeiten für Sie zu finden.

Mit freundlichen Grüßen,
${senderName}
Crypto-Börse — Premium Investment Solutions`, []);

  const replaceSenderInBody = useCallback((body: string, previousName: string, previousEmail: string, nextName: string, nextEmail: string) => {
    let nextBody = body;
    if (previousName && previousName !== nextName) {
      nextBody = nextBody.replace(new RegExp(escapeRegExp(previousName), "g"), nextName);
    }
    if (previousEmail && previousEmail !== nextEmail) {
      nextBody = nextBody.replace(new RegExp(escapeRegExp(previousEmail), "g"), nextEmail);
    }
    return nextBody;
  }, []);

  const renderQuickEmailPreview = useCallback(async (
    templateName: QuickEmailTemplate,
    from: QuickEmailFrom,
    extraData?: Record<string, any> | null,
  ) => {
    const sender = resolveQuickEmailSender(from);
    const { data, error } = await supabase.functions.invoke("preview-transactional-email", {
      body: {
        templateName,
        templateData: {
          clientName: profile?.full_name || undefined,
          agentName: sender.name,
          agentEmail: sender.email,
          funnelName: profile?.funnel || undefined,
          ...(extraData || {}),
        },
      },
    });
    if (error) throw error;
    const html = data?.html || data?.templates?.find((t: any) => t.templateName === templateName)?.html;
    if (!html) throw new Error("Preview template could not be rendered.");
    setNaEmailHtml(html);
    setNaEmailPreviewError(null);
  }, [profile?.full_name, profile?.funnel, resolveQuickEmailSender]);

  // Aggregate the client's trading performance for a period (used by trade-update emails)
  const buildAccountUpdateData = useCallback(async (fromDate: Date, toDate: Date, label: string) => {
    if (!userId) return {};
    const since = fromDate.toISOString();
    const until = toDate.toISOString();

    const [{ data: closed }, { data: open }, { data: wals }] = await Promise.all([
      supabase
        .from("trades")
        .select("pnl, direction, closed_at, assets(symbol)")
        .eq("user_id", userId)
        .eq("status", "closed")
        .gte("closed_at", since)
        .lte("closed_at", until)
        .order("closed_at", { ascending: false })
        .limit(500),
      supabase
        .from("trades")
        .select("pnl, direction, assets(symbol)")
        .eq("user_id", userId)
        .eq("status", "open")
        .limit(500),
      supabase.from("wallets").select("balance").eq("user_id", userId),
    ]);

    const closedRows = (closed as any[]) ?? [];
    const openRows = (open as any[]) ?? [];
    const trades = closedRows.map((t) => ({
      symbol: t.assets?.symbol || "—",
      direction: t.direction,
      pnl: Number(t.pnl ?? 0),
    }));
    const realizedPnl = trades.reduce((a, t) => a + t.pnl, 0);
    const unrealizedPnl = openRows.reduce((a, t) => a + Number(t.pnl ?? 0), 0);
    const wins = trades.filter((t) => t.pnl > 0).length;
    const losses = trades.filter((t) => t.pnl < 0).length;
    const best = trades.slice().sort((a, b) => b.pnl - a.pnl)[0];
    const portfolioValue = ((wals as any[]) ?? []).reduce((a, w) => a + Number(w.balance ?? 0), 0);

    const fmtDate = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

    return {
      periodLabel: label,
      periodRange: `${fmtDate(fromDate)} – ${fmtDate(toDate)}`,
      realizedPnl,
      unrealizedPnl,
      totalPnl: realizedPnl + unrealizedPnl,
      closedCount: trades.length,
      wins,
      losses,
      winRate: trades.length ? (wins / trades.length) * 100 : 0,
      openCount: openRows.length,
      bestSymbol: best?.symbol,
      bestPnl: best?.pnl ?? 0,
      portfolioValue,
      trades,
    };
  }, [userId]);

  // Previous calendar week (Monday 00:00 – Sunday 23:59:59)
  const getLastCalendarWeek = useCallback(() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 0 = Monday
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    const from = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7, 0, 0, 0);
    const to = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 1, 23, 59, 59);
    return { from, to };
  }, []);

  const openTradeUpdateEmail = useCallback(async (
    templateName: QuickEmailTemplate,
    period: "24h" | "rolling-week" | "last-week" | "custom",
    custom?: { from: string; to: string },
  ) => {
    if (!profile?.email) {
      toast.error("Client has no email address");
      return;
    }
    const now = new Date();
    let fromDate = new Date(now.getTime() - 24 * 3600 * 1000);
    let toDate = now;
    let label = "der letzten 24 Stunden";
    let subject = "Ihr Konto-Update der letzten 24 Stunden — Crypto-Börse";
    const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

    if (period === "rolling-week") {
      fromDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      label = "der letzten 7 Tage";
      subject = "Ihr Wochen-Update — Crypto-Börse";
    } else if (period === "last-week") {
      const wk = getLastCalendarWeek();
      fromDate = wk.from;
      toDate = wk.to;
      label = `der Vorwoche (${fmt(wk.from)} – ${fmt(wk.to)})`;
      subject = "Ihr Wochen-Update der Vorwoche — Crypto-Börse";
    } else if (period === "custom") {
      if (!custom?.from || !custom?.to) {
        toast.error("Please select both dates");
        return;
      }
      const [fy, fm, fd] = custom.from.split("-").map(Number);
      const [ty, tm, td] = custom.to.split("-").map(Number);
      fromDate = new Date(fy, fm - 1, fd, 0, 0, 0);
      toDate = new Date(ty, tm - 1, td, 23, 59, 59);
      if (fromDate > toDate) {
        toast.error("Start date must be before end date");
        return;
      }
      label = `vom ${fmt(fromDate)} bis ${fmt(toDate)}`;
      subject = `Ihr Konto-Update ${fmt(fromDate)} – ${fmt(toDate)} — Crypto-Börse`;
    }

    const defaultFrom: QuickEmailFrom = agentEmail ? "agent" : "support";
    setNaEmailTemplate(templateName);
    setNaEmailHtml("");
    setNaEmailPreviewError(null);
    setNaEmailEditing(false);
    setNaEmailBody("");
    setNaEmailFrom(defaultFrom);
    setNaEmailSubject(subject);
    setNaEmailStep("preview");
    try {
      const data = await buildAccountUpdateData(fromDate, toDate, label);
      setNaEmailData(data);
      await renderQuickEmailPreview(templateName, defaultFrom, data);
    } catch (err: any) {
      setNaEmailPreviewError(err?.message || "Preview failed to load.");
      toast.error("Preview failed to load");
    }
  }, [agentEmail, buildAccountUpdateData, getLastCalendarWeek, profile?.email, renderQuickEmailPreview]);



  const handleQuickEmailFromChange = useCallback((nextFrom: QuickEmailFrom) => {
    const previousSender = resolveQuickEmailSender(naEmailFrom);
    const nextSender = resolveQuickEmailSender(nextFrom);
    setNaEmailFrom(nextFrom);
    setNaEmailBody((prev) => replaceSenderInBody(prev, previousSender.name, previousSender.email, nextSender.name, nextSender.email));

    if (!naEmailEditing) {
      setNaEmailHtml("");
      setNaEmailPreviewError(null);
      renderQuickEmailPreview(naEmailTemplate, nextFrom, naEmailData).catch((err: any) => {
        setNaEmailPreviewError(err?.message || "Preview failed to load.");
        toast.error("Preview failed to load");
      });
    }
  }, [naEmailData, naEmailEditing, naEmailFrom, naEmailTemplate, renderQuickEmailPreview, replaceSenderInBody, resolveQuickEmailSender]);

  const handleCustomEmailFromChange = useCallback((nextFrom: QuickEmailFrom) => {
    const previousSender = resolveQuickEmailSender(customEmailFrom);
    const nextSender = resolveQuickEmailSender(nextFrom);
    setCustomEmailFrom(nextFrom);
    setCustomEmailBody((prev) => replaceSenderInBody(prev, previousSender.name, previousSender.email, nextSender.name, nextSender.email));
  }, [customEmailFrom, replaceSenderInBody, resolveQuickEmailSender]);

  // Resolve attachment URL - handles both legacy public URLs and new storage paths
  const [signedUrlCache, setSignedUrlCache] = useState<Record<string, string>>({});
  const getAttachmentUrl = useCallback(async (urlOrPath: string): Promise<string> => {
    // If it's already a full URL (legacy), return as-is
    if (urlOrPath.startsWith("http")) return urlOrPath;
    // Check cache
    if (signedUrlCache[urlOrPath]) return signedUrlCache[urlOrPath];
    // Generate signed URL (1 hour)
    const { data } = await supabase.storage.from("comment-attachments").createSignedUrl(urlOrPath, 3600);
    const signedUrl = data?.signedUrl || urlOrPath;
    setSignedUrlCache(prev => ({ ...prev, [urlOrPath]: signedUrl }));
    return signedUrl;
  }, [signedUrlCache]);

  // Component to render an attachment with signed URL resolution
  const AttachmentLink = ({ url, index }: { url: string; index: number }) => {
    const [resolvedUrl, setResolvedUrl] = useState(url.startsWith("http") ? url : "");
    useEffect(() => {
      getAttachmentUrl(url).then(setResolvedUrl);
    }, [url]);
    if (!resolvedUrl) return null;
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
    const filename = url.split("/").pop() || "file";
    return isImage ? (
      <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img src={resolvedUrl} alt="" className="h-16 w-16 rounded object-cover border hover:opacity-80 transition-opacity" />
      </a>
    ) : (
      <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80">
        <File className="h-3.5 w-3.5" /> <span className="max-w-[120px] truncate">{filename}</span>
      </a>
    );
  };

  const fetchAll = async () => {
    if (!userId) return;
    const [
      { data: prof },
      { data: rolesData },
      { data: urData },
      { data: deps },
      { data: wds },
      { data: trs },
      { data: wals },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("roles").select("*"),
      supabase.from("user_roles").select("user_id, role_id, roles(name)").eq("user_id", userId),
      supabase.from("deposits").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      // Fetch ALL open trades (no cap) + recent closed trades so staff can see
      // every position the client has open, whether self-opened or copy-traded.
      Promise.all([
        supabase.from("trades").select("*, assets(symbol, name)").eq("user_id", userId).eq("status", "open").order("opened_at", { ascending: false }),
        supabase.from("trades").select("*, assets(symbol, name)").eq("user_id", userId).neq("status", "open").order("opened_at", { ascending: false }).limit(100),
      ]).then(([o, c]) => ({ data: [...(o.data ?? []), ...(c.data ?? [])], error: o.error || c.error })),
      supabase.from("wallets").select("*").eq("user_id", userId),
    ]);

    // Fetch admin notes, stakes, and bank details
    const [{ data: notes }, { data: userStakes }, { data: plans }, { data: bankData }, { data: teamsData }, { data: userTeamData }] = await Promise.all([
      (supabase as any).from("admin_notes").select("*, profiles!admin_notes_author_id_fkey(full_name, email)").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("user_stakes").select("*, staking_plans(name, asset, apy)").eq("user_id", userId).order("started_at", { ascending: false }),
      supabase.from("staking_plans").select("*").order("apy"),
      (supabase as any).from("client_bank_details").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("teams").select("*").order("name"),
      supabase.from("team_members").select("team_id").eq("user_id", userId),
    ]);

    setProfile(prof);
    setRoles(rolesData ?? []);
    setUserRoleId((urData && urData.length > 0) ? urData[0].role_id : "none");
    setTeams(teamsData ?? []);
    setUserTeamId((userTeamData && userTeamData.length > 0) ? userTeamData[0].team_id : "none");
    setDeposits(deps ?? []);
    setWithdrawals(wds ?? []);
    setTrades(trs ?? []);
    setWallets(wals ?? []);
    setAdminNotes(notes ?? []);
    supabase.from("kyc_documents").select("id", { count: "exact", head: true }).eq("user_id", userId!).then(({ count }) => setKycDocsCount(count ?? 0));
    setStakes(userStakes ?? []);
    setStakingPlans(plans ?? []);
    setBankDetails(bankData);
    if (bankData) {
      setBankForm({
        bank_name: bankData.bank_name ?? "",
        account_holder: bankData.account_holder ?? "",
        iban: bankData.iban ?? "",
        swift_bic: bankData.swift_bic ?? "",
        reference: bankData.reference ?? "",
        notes: bankData.notes ?? "",
      });
    }

    // Fetch crypto addresses
    const { data: cryptoData } = await (supabase as any).from("client_crypto_addresses").select("*").eq("user_id", userId).order("currency");
    setCryptoAddresses(cryptoData ?? []);

    // Fetch payment link requests for this client
    const { data: plReqs } = await (supabase as any).from("payment_link_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    setPaymentLinkRequests(plReqs ?? []);

    // Fetch copy-trade links so we can mark trades opened via copy trading
    const { data: copiedRows } = await (supabase as any).from("copied_trades").select("trade_id").eq("user_id", userId);
    setCopiedTradeIds(new Set((copiedRows ?? []).map((r: any) => r.trade_id).filter(Boolean)));

    // Fetch report settings
    const { data: reportData } = await (supabase as any).from("report_settings").select("*").eq("user_id", userId).maybeSingle();
    if (reportData) {
      setReportSections(reportData.sections ?? { wallets: true, trades: true, deposits: true, withdrawals: true, staking: true, pnl: true });
      setReportFrequency(reportData.frequency ?? "manual");
      setReportEnabled(reportData.enabled ?? false);
      setReportLastSent(reportData.last_sent_at ?? null);
    }

    // Fetch agents (staff with roles)
    const { data: allUserRoles } = await supabase.from("user_roles").select("user_id, roles(name)");
    const staffUserIds = (allUserRoles ?? []).filter((ur: any) => ur.roles?.name).map((ur: any) => ur.user_id);
    if (staffUserIds.length > 0) {
      const { data: staffProfiles } = await supabase.from("profiles").select("id, full_name, email").in("id", staffUserIds);
      setAgentsList(staffProfiles ?? []);
    }

    if (prof) {
      setEditProfile({
        full_name: prof.full_name ?? "",
        phone: prof.phone ?? "",
        secondary_phone: prof.secondary_phone ?? "",
        country: prof.country ?? "",
        kyc_status: prof.kyc_status ?? "not_submitted",
        email: prof.email ?? "",
      });
      if (prof.assigned_agent) {
        const { data: agentProf } = await supabase.from("profiles").select("full_name, email").eq("id", prof.assigned_agent).single();
        setAgentName(agentProf?.full_name || agentProf?.email || null);
        setAgentEmail(agentProf?.email || null);
      } else {
        setAgentName(null);
        setAgentEmail(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [userId]);

  // Realtime: keep the client detail page in sync when another agent changes status
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`admin-user-detail-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const newRow = payload.new as any;
          setProfile((prev) => (prev ? { ...prev, ...newRow } : newRow));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Check if client is currently on the welcome page (active visit with no left_at)
  useEffect(() => {
    if (!userId) return;
    const checkWelcome = async () => {
      const { data } = await supabase
        .from("welcome_page_visits")
        .select("id, landed_at, left_at")
        .eq("user_id", userId)
        .order("landed_at", { ascending: false })
        .limit(1);
      // Active if no left_at AND landed less than 15 min ago
      let active = false;
      if (data && data.length > 0) {
        const row = data[0];
        if (!row.left_at) {
          const age = (Date.now() - new Date(row.landed_at).getTime()) / 1000;
          active = age < 900;
        }
      }
      // Fallback: also check last_seen_at — if client was seen within 30s, they're likely still on the page
      if (!active && data && data.length > 0 && !data[0].left_at) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("last_seen_at")
          .eq("id", userId)
          .single();
        if (prof?.last_seen_at) {
          const seenAge = (Date.now() - new Date(prof.last_seen_at).getTime()) / 1000;
          if (seenAge < 30) {
            active = true;
          }
        }
      }
      setIsOnWelcomePage(active);
      setWelcomeLandedAt(active && data ? data[0].landed_at : null);
    };
    checkWelcome();
    // Poll every 10s as fallback (realtime may not be enabled for this table)
    const interval = setInterval(() => {
      if (!document.hidden) checkWelcome();
    }, 10000);
    const channel = supabase
      .channel(`welcome-check-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "welcome_page_visits", filter: `user_id=eq.${userId}` }, () => {
        checkWelcome();
      })
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Poll client online status via last_seen_at
  useEffect(() => {
    if (!userId) return;
    const checkOnline = async () => {
      const { data } = await supabase.from("profiles").select("last_seen_at, current_page, current_page_since").eq("id", userId).single();
      setLastSeenAt((data as any)?.last_seen_at ?? null);
      setCurrentPage((data as any)?.current_page ?? null);
      setCurrentPageSince((data as any)?.current_page_since ?? null);
    };
    checkOnline();
    const interval = setInterval(() => {
      if (!document.hidden) checkOnline();
    }, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  // NOTE: the live "time on page" counter has been moved into the isolated
  // <PageDuration /> component so it can tick once per second WITHOUT
  // re-rendering this entire (very large) page every second — which used to
  // make every Select / dropdown / form feel like the CRM was constantly
  // refreshing while agents were mid-task.
  const isClientOnline = lastSeenAt ? (Date.now() - new Date(lastSeenAt).getTime()) < 60000 : false;

  useEffect(() => {
    if (!isOnWelcomePage || !welcomeLandedAt) {
      setWelcomeTimeLeft(null);
      return;
    }
    const calc = () => {
      const elapsed = Math.floor((Date.now() - new Date(welcomeLandedAt).getTime()) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setWelcomeTimeLeft(remaining);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [isOnWelcomePage, welcomeLandedAt]);

  const handleForceToHome = async () => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ force_home_redirect: true } as any).eq("id", userId);
    if (error) { toast.error("Failed to force redirect"); return; }
    await logActivity("force_home_redirect", {});
    toast.success("Client will be redirected to Home page");
  };

  const handleShaveLead = async () => {
    if (!userId) return;
    setShaveLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "shave_lead", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await logActivity("lead_shaved", { new_user_id: data.new_user_id });
      toast.success(`Lead shaved successfully. Temp password: ${data.temp_password}`, { duration: 15000 });
      setShaveDialogOpen(false);
      navigate(`/backoffice/users/${data.new_user_id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to shave lead");
    } finally {
      setShaveLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!userId || !currentUser) return;
    try {
      // Find or create an escalated chat room assigned to this agent
      let roomId: string;
      const { data: existing } = await supabase
        .from("chat_rooms")
        .select("id, status, mode")
        .eq("user_id", userId)
        .in("status", ["open", "escalated"])
        .maybeSingle();

      if (existing) {
        roomId = existing.id;
        if (existing.mode !== "agent" || existing.status !== "escalated") {
          await supabase.from("chat_rooms").update({
            mode: "agent",
            status: "escalated",
            agent_id: currentUser.id,
          }).eq("id", existing.id);
        }
      } else {
        const { data: newRoom } = await supabase.from("chat_rooms").insert({
          user_id: userId,
          agent_id: currentUser.id,
          mode: "agent",
          status: "escalated",
        }).select("id").single();
        roomId = newRoom!.id;
      }

      // Force the client's chat widget to open
      await supabase.from("profiles").update({ force_chat_open: true } as any).eq("id", userId);

      // Open inline chat panel
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at");
      setInlineChatRoom({ id: roomId, user_id: userId });
      setInlineChatMessages(msgs || []);
      setInlineChatOpen(true);
      setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight }), 150);

      toast.success("Chat forced open on client's screen — they will see it within seconds");
    } catch {
      toast.error("Failed to start chat");
    }
  };

  // Realtime for inline chat messages
  useEffect(() => {
    if (!inlineChatRoom) return;
    const channel = supabase
      .channel(`inline-chat-${inlineChatRoom.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${inlineChatRoom.id}`,
      }, (payload) => {
        setInlineChatMessages((prev) => {
          if (prev.some((m: any) => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight }), 100);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "chat_rooms",
        filter: `id=eq.${inlineChatRoom.id}`,
      }, (payload: any) => {
        setInlineChatRoom((prev: any) => (prev ? { ...prev, ...payload.new } : prev));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [inlineChatRoom?.id]);

  const sendInlineChatReply = async () => {
    if (!currentUser || !inlineChatRoom || !inlineChatReply.trim()) return;
    const text = inlineChatReply.trim();
    const { data: inserted, error } = await supabase.from("chat_messages").insert({
      room_id: inlineChatRoom.id,
      sender_id: currentUser.id,
      content: text,
      type: "text",
    }).select("*").single();
    if (error) {
      toast.error(`Message not sent: ${error.message}`);
      return;
    }
    if (inserted) {
      setInlineChatMessages((prev) => (prev.some((m: any) => m.id === (inserted as any).id) ? prev : [...prev, inserted]));
      setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current!.scrollHeight }), 100);
    }
    await supabase.from("chat_rooms").update({ mode: "agent", agent_id: currentUser.id }).eq("id", inlineChatRoom.id);
    setInlineChatReply("");
  };


  const closeInlineChat = async () => {
    if (inlineChatRoom) {
      await supabase.from("chat_rooms").update({ status: "closed" }).eq("id", inlineChatRoom.id);
    }
    setInlineChatOpen(false);
    setInlineChatRoom(null);
    setInlineChatMessages([]);
  };


  const handleForceLink = async () => {
    if (!userId || !forceLinkUrl.trim()) return;
    const url = forceLinkUrl.trim();
    // Basic URL validation
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/")) {
      toast.error("Please enter a valid URL (starting with http://, https://, or /)");
      return;
    }
    const { error } = await supabase.from("profiles").update({ force_redirect_url: url } as any).eq("id", userId);
    if (error) { toast.error("Failed to send force link"); return; }
    await logActivity("force_link_sent", { url });
    toast.success("Link sent — client will be redirected shortly");
    setForceLinkOpen(false);
    setForceLinkUrl("");
  };

  const handleOpenAffFeedback = async () => {
    if (!userId || !profile?.affiliate) return;
    setAffFeedbackOpen(true);
    setAffFeedbackLoading(true);
    setAffFeedbackError(null);
    setAffFeedbackText("");
    setAffFeedbackAffiliate(profile.affiliate);
    setAffFeedbackHasTelegram(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/affiliate-feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ lead_ids: [userId], mode: "preview" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate feedback");
      const preview = data?.previews?.[0];
      if (!preview) throw new Error("No preview returned");
      setAffFeedbackText(preview.text || "");
      setAffFeedbackHasTelegram(!!preview.hasTelegram);
      setAffFeedbackAffiliate(preview.affiliate || profile.affiliate);
      if (preview.error && !preview.hasTelegram) setAffFeedbackError(preview.error);
    } catch (e: any) {
      setAffFeedbackError(e.message || "Failed to generate feedback");
    } finally {
      setAffFeedbackLoading(false);
    }
  };

  const handleSendAffFeedback = async () => {
    if (!affFeedbackText.trim() || !affFeedbackAffiliate) return;
    setAffFeedbackSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/affiliate-feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
            mode: "send_edited",
            messages: [{ affiliate: affFeedbackAffiliate, text: affFeedbackText }],
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send");
      const result = data?.results?.[0];
      if (result?.sent) {
        toast.success(`Feedback sent to ${affFeedbackAffiliate}`);
        await logActivity("affiliate_feedback_sent", { affiliate: affFeedbackAffiliate });
        setAffFeedbackOpen(false);
      } else {
        toast.error(result?.error || "Failed to send feedback");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send feedback");
    } finally {
      setAffFeedbackSending(false);
    }
  };

  const submitAppointment = async () => {
    const clientId = apptForm.client_id || userId;
    if (!currentUser || !clientId || !apptForm.title.trim() || !apptForm.date || !apptForm.startTime) {
      toast.error("Please fill in title, date and start time");
      return;
    }
    setSavingAppt(true);
    try {
      const start_at = zonedDateTimeToUTC(apptForm.date, apptForm.startTime, getStaffTz());
      const end_at = new Date(new Date(start_at).getTime() + 60 * 60 * 1000).toISOString();
      const appointmentId = crypto.randomUUID();
      const { error } = await supabase.from("appointments").insert({
        id: appointmentId,
        agent_id: currentUser.id,
        client_id: clientId,
        title: apptForm.title.trim(),
        description: apptForm.description.trim() || null,
        start_at,
        end_at,
        color: apptForm.color,
        notifications_enabled: apptNotifyClient || apptNotifyAgent,
        notify_client: apptNotifyClient,
        notify_agent: apptNotifyAgent,
      });
      if (error) throw error;

      // Notify the client about the appointment
      if (apptNotifyClient) {
        const client = apptClients.find(c => c.id === clientId) || profile;
        const clientEmail = client?.email;
        const clientName = client?.full_name || client?.email || undefined;
        const startFormatted = new Date(start_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: getClientTz() });
        await supabase.from("notifications").insert({
          user_id: clientId,
          title: "Neuer Termin / New Appointment",
          message: `${apptForm.title.trim()} – ${startFormatted}`,
          type: "appointment",
        });

        if (clientEmail) {
          const meetingDate = new Date(start_at).toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: getClientTz() });
          const clientStart = formatTimeInTz(start_at, getClientTz());
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "meeting-invitation",
              recipientEmail: clientEmail,
              idempotencyKey: `meeting-invite-${appointmentId}`,
              templateData: {
                clientName,
                meetingTitle: apptForm.title.trim(),
                meetingDate,
                meetingTime: clientStart,
                description: apptForm.description.trim() || undefined,
                agentName: agentName || currentUser.email || undefined,
              },
            },
          });
          toast.success("Meeting email sent to client");
        }
      }

      toast.success("Appointment scheduled");
      setAppointmentOpen(false);
      setApptForm({ title: "", description: "", date: "", startTime: "10:00", color: "#3b82f6", client_id: "" });
      setApptNotifyClient(true);
      setApptNotifyAgent(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to create appointment");
    } finally {
      setSavingAppt(false);
    }
  };

  const openTradeDialog = async () => {
    if (tradeAssets.length === 0) {
      const { data } = await supabase.from("assets").select("id, symbol, name, type").eq("enabled", true).order("type").order("name");
      setTradeAssets(data || []);
    }
    setBulkRows([]);
    setBulkCurrentRow({ asset_id: "", direction: "buy", size: "1000", leverage: "1", pnl: "50", closedAt: new Date(), entryPrice: "" });
    setBulkStep("trade");
    setTradeOpen(true);
  };

  const addBulkTradeAndContinue = () => {
    if (!bulkCurrentRow.asset_id) { toast.error("Select an asset"); return; }
    if (!bulkCurrentRow.size) { toast.error("Enter a size"); return; }
    setBulkRows(prev => [...prev, { ...bulkCurrentRow }]);
    setBulkCurrentRow({ asset_id: "", direction: "buy", size: "1000", leverage: "1", pnl: "50", closedAt: bulkCurrentRow.closedAt, entryPrice: "" });
  };

  const finishAndReviewTrades = () => {
    if (bulkCurrentRow.asset_id && bulkCurrentRow.size) {
      setBulkRows(prev => [...prev, { ...bulkCurrentRow }]);
    }
    setBulkStep("review");
  };

  const submitBulkTrades = async () => {
    if (!userId) return;
    const validRows = bulkRows.filter(r => r.asset_id && r.size && r.pnl);
    if (!validRows.length) { toast.error("Add at least one valid trade"); return; }

    setSavingTrade(true);
    let totalPnlDelta = 0;

    for (const row of validRows) {
      const entryPrice = row.entryPrice ? Number(row.entryPrice) : 0;
      const size = Number(row.size);
      const pnl = Number(row.pnl);
      const leverage = Number(row.leverage) || 1;

      const { error } = await supabase.from("trades").insert({
        user_id: userId,
        asset_id: row.asset_id,
        direction: row.direction,
        size,
        leverage,
        entry_price: entryPrice,
        current_price: entryPrice,
        pnl,
        status: "closed",
        opened_at: row.closedAt.toISOString(),
        closed_at: row.closedAt.toISOString(),
      });

      if (error) {
        toast.error(`Failed to create trade: ${error.message}`);
        setSavingTrade(false);
        return;
      }

      // Closed trade created from back-office: only the P&L impacts the wallet
      // (size was never deducted in this flow, so we must NOT add it back).
      totalPnlDelta += pnl;
    }

    // Credit wallet (P&L only)
    if (totalPnlDelta !== 0) {
      const { data: wallet } = await supabase.from("wallets").select("id, balance").eq("user_id", userId).eq("currency", "EUR").maybeSingle();
      if (wallet) {
        await supabase.from("wallets").update({ balance: Number(wallet.balance) + totalPnlDelta }).eq("id", wallet.id);
      }
    }

    toast.success(`${validRows.length} trade(s) created`);
    setSavingTrade(false);
    setTradeOpen(false);
    fetchAll();
  };

  const saveStakeOverride = async () => {
    if (!editStake) return;
    const { error } = await supabase.from("user_stakes").update({
      rewards_earned: Number(rewardsInput),
      claimed: claimedInput === "true",
    }).eq("id", editStake.id);
    if (error) { toast.error("Failed to update"); return; }
    if (claimedInput === "true" && !editStake.claimed) {
      const reward = Number(rewardsInput) || 0;
      const totalReturn = Number(editStake.amount) + reward;
      const { data: wallet } = await supabase.from("wallets").select("id, balance").eq("user_id", editStake.user_id).eq("currency", "EUR").maybeSingle();
      if (wallet) {
        await supabase.from("wallets").update({ balance: Number(wallet.balance) + totalReturn }).eq("id", wallet.id);
      }
    }
    toast.success("Stake updated");
    setEditStake(null);
    fetchAll();
  };

  // Fetch crypto prices on load for EUR conversion
  useEffect(() => {
    fetchCryptoPricesEur().then(setCryptoPricesEur).catch(() => {});
  }, []);

  // Fetch live asset prices for trade P&L
  const refreshLivePrices = useCallback(async () => {
    if (!trades.length) return;
    const symbols = [...new Set(trades.map((t: any) => t.assets?.symbol).filter(Boolean))] as string[];
    if (symbols.length) {
      const prices = await fetchLivePrices(symbols);
      if (Object.keys(prices).length) setLivePrices(prices);
    }
  }, [trades]);

  useEffect(() => { refreshLivePrices(); }, [refreshLivePrices]);
  useEffect(() => {
    if (!trades.length) return;
    const interval = setInterval(() => {
      if (!document.hidden) refreshLivePrices();
    }, 60000);
    return () => clearInterval(interval);
  }, [trades, refreshLivePrices]);

  const logActivity = async (action: string, details: Record<string, any> = {}) => {
    if (!currentUser?.id || !userId) return;
    try {
      await supabase.from("activity_log").insert({
        user_id: currentUser.id,
        action,
        details: { target_user_id: userId, ...details },
      });
    } catch {
      // best-effort logging only
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const dataToSave = isAgentRole(currentRoleName)
      ? { full_name: editProfile.full_name, phone: editProfile.phone, secondary_phone: editProfile.secondary_phone, country: editProfile.country, kyc_status: editProfile.kyc_status }
      : editProfile;
    // Compute changed fields for audit log
    const changes: Record<string, { from: any; to: any }> = {};
    if (profile) {
      Object.entries(dataToSave).forEach(([k, v]) => {
        const prev = (profile as any)[k] ?? "";
        if ((prev ?? "") !== (v ?? "")) {
          changes[k] = { from: prev, to: v };
        }
      });
    }
    await supabase.from("profiles").update(dataToSave).eq("id", userId);
    if (Object.keys(changes).length > 0) {
      await logActivity("profile_updated", { changes });
    }
    toast.success("Profile updated");
    setSaving(false);
    fetchAll();
  };

  const [sendingResetLink, setSendingResetLink] = useState(false);
  const handleSendResetLink = async () => {
    if (!profile?.email) {
      toast.error("No email address on file for this client");
      return;
    }
    setSendingResetLink(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      await logActivity("password_reset_link_sent", { email: profile.email });
      toast.success(`Password reset link sent to ${profile.email}`);
    } catch (err: any) {
      toast.error(`Failed to send reset link: ${err.message}`);
    }
    setSendingResetLink(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const {
        data: { session: refreshedSession },
      } = await supabase.auth.refreshSession();
      const accessToken = refreshedSession?.access_token ?? session?.access_token;

      if (!accessToken) {
        throw new Error("Your backoffice session expired. Please sign in again.");
      }

      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { action: "change_password", user_id: userId, password: newPassword },
      });
      let serverMsg: string | null = null;
      if (error) {
        // supabase-js hides the response body on non-2xx; read it from context
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const parsed = await ctx.json();
            serverMsg = parsed?.error ?? null;
          } else if (ctx && typeof ctx.text === "function") {
            const raw = await ctx.text();
            try { serverMsg = JSON.parse(raw)?.error ?? raw; } catch { serverMsg = raw; }
          }
        } catch { /* ignore */ }
        throw new Error(serverMsg || error.message);
      }
      if (data?.error) throw new Error(data.error);
      await logActivity("password_changed", {});
      toast.success("Password updated successfully");
      setNewPassword("");
    } catch (err: any) {
      toast.error(`Failed to change password: ${err.message}`);
    }
    setChangingPassword(false);
  };

  const handleRevealPassword = async (force = false) => {
    setRevealingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "reveal_password", user_id: userId, force },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRevealedPassword(data.password);
      await logActivity(force ? "password_regenerated_revealed" : "password_revealed", {});
    } catch (err: any) {
      toast.error(`Failed to reveal password: ${err.message}`);
    }
    setRevealingPassword(false);
  };

  const updateStatus = async (status: string) => {
    const prev = profile?.status;
    await supabase.from("profiles").update({ status }).eq("id", userId);
    await logActivity("account_status_changed", { from: prev, to: status });
    toast.success(`User ${status === "suspended" ? "suspended" : "activated"}`);
    fetchAll();
  };

  const assignRole = async (roleId: string) => {
    const prevRole = roles.find(r => r.id === userRoleId)?.name || null;
    const newRole = roleId === "none" ? null : (roles.find(r => r.id === roleId)?.name || null);
    await supabase.from("user_roles").delete().eq("user_id", userId!);
    if (roleId !== "none") {
      await supabase.from("user_roles").insert({ user_id: userId!, role_id: roleId });
    }
    setUserRoleId(roleId);
    await logActivity("role_assigned", { from: prevRole, to: newRole });
    toast.success("Role updated");
  };

  const assignTeam = async (teamId: string) => {
    if (!userId) return;
    const prevTeam = teams.find(t => t.id === userTeamId)?.name || null;
    const newTeam = teamId === "none" ? null : (teams.find(t => t.id === teamId)?.name || null);
    await supabase.from("team_members").delete().eq("user_id", userId);
    if (teamId !== "none") {
      await supabase.from("team_members").insert({ user_id: userId, team_id: teamId });
    }
    setUserTeamId(teamId);
    await logActivity("team_assigned", { from: prevTeam, to: newTeam });
    toast.success("Team updated");
  };

  const updateWalletBalance = async (walletId: string, newBalance: number) => {
    const w = wallets.find((x: any) => x.id === walletId);
    const prevBalance = w ? Number(w.balance) : null;
    await supabase.from("wallets").update({ balance: newBalance }).eq("id", walletId);
    await logActivity("wallet_balance_updated", {
      currency: w?.currency,
      from: prevBalance,
      to: newBalance,
    });
    toast.success("Wallet balance updated");
    fetchAll();
  };

  const saveBankDetails = async () => {
    if (!userId) return;
    setSavingBank(true);
    if (bankDetails) {
      await (supabase as any).from("client_bank_details").update(bankForm).eq("user_id", userId);
      await logActivity("bank_details_updated", { bank_name: bankForm.bank_name });
    } else {
      await (supabase as any).from("client_bank_details").insert({ ...bankForm, user_id: userId });
      await logActivity("bank_details_added", { bank_name: bankForm.bank_name });
    }
    toast.success("Bank details saved");
    setSavingBank(false);
    fetchAll();
  };

  const saveCryptoAddress = async () => {
    if (!userId || !cryptoForm.address.trim()) { toast.error("Enter wallet address"); return; }
    setSavingCrypto(true);
    await (supabase as any).from("client_crypto_addresses").insert({ ...cryptoForm, user_id: userId });
    await logActivity("crypto_address_added", { currency: cryptoForm.currency, label: cryptoForm.label });
    toast.success(`${cryptoForm.currency} address added`);
    setCryptoForm({ currency: "BTC", address: "", network: "", label: "" });
    setSavingCrypto(false);
    fetchAll();
  };

  const deleteCryptoAddress = async (id: string) => {
    await (supabase as any).from("client_crypto_addresses").delete().eq("id", id);
    await logActivity("crypto_address_deleted", { address_id: id });
    toast.success("Address removed");
    fetchAll();
  };

  const submitNote = async () => {
    if (!currentUser || !userId || (!newNote.trim() && commentFiles.length === 0)) return;
    setUploadingComment(true);

    // Upload files first
    const uploadedUrls: string[] = [];
    for (const file of commentFiles) {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("comment-attachments").upload(path, file);
      if (!uploadErr) {
        // Store the path, not a public URL - we'll generate signed URLs when displaying
        uploadedUrls.push(path);
      }
    }

    await (supabase as any).from("admin_notes").insert({
      user_id: userId,
      author_id: currentUser.id,
      content: newNote.trim(),
      attachments: uploadedUrls,
    });
    await logActivity("comment_added", {
      preview: newNote.trim().slice(0, 120),
      attachments_count: uploadedUrls.length,
    });
    setNewNote("");
    setCommentFiles([]);
    if (noteDraftKey) localStorage.removeItem(noteDraftKey);
    setUploadingComment(false);
    toast.success("Comment added");
    fetchAll();
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this comment? This cannot be undone.")) return;
    const { error } = await supabase.from("admin_notes").delete().eq("id", noteId);
    if (error) {
      toast.error("Failed to delete comment: " + error.message);
      return;
    }
    await logActivity("comment_deleted", { note_id: noteId });
    toast.success("Comment deleted");
    fetchAll();
  };

  const submitManualDeposit = async (skipCrgCheck = false) => {
    if (!depForm.method) {
      toast.error("Please select a payment method");
      return;
    }
    if (depForm.method === "credit_card" && !depForm.psp_provider) {
      toast.error("Please select a PSP provider");
      return;
    }
    if (!depForm.amount || Number(depForm.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const amount = Number(depForm.amount);
    const isCrypto = depForm.method === "crypto";
    const creditCurrency = isCrypto ? depForm.crypto_asset : depForm.currency;

    // Warn before booking an FTD that pushes the affiliate past its CRG guarantee
    if (!skipCrgCheck && !profile?.first_deposit_at && amount >= 1) {
      const check = await checkCrgForProfile(userId!);
      if (check?.would_exceed) {
        setDepCrgCheck(check);
        return;
      }
    }
    setDepCrgCheck(null);

    const pspTag = depForm.method === "credit_card" && depForm.psp_provider
      ? `[PSP: ${depForm.psp_provider}] `
      : "";
    const combinedNotes = pspTag + (depForm.notes || "Manual deposit by admin");

    const { error: depError } = await supabase.from("deposits").insert({
      user_id: userId!,
      amount,
      currency: creditCurrency,
      method: depForm.method,
      status: "approved",
      admin_notes: combinedNotes,
      processed_by: currentUser?.id,
    });

    if (depError) {
      toast.error("Failed to create deposit: " + depError.message);
      return;
    }

    // Wallet crediting is handled automatically by the credit_wallet_on_deposit_approval trigger
    // No manual wallet update needed here

    // If this is the FTD (client was still a lead), record the FTD agent
    const isFtd = !profile?.first_deposit_at;
    const profileUpdate: any = {};
    if (amount >= 1) profileUpdate.is_lead = false;
    if (isFtd && depForm.ftd_agent) profileUpdate.ftd_agent = depForm.ftd_agent;
    if (Object.keys(profileUpdate).length > 0) {
      await supabase.from("profiles").update(profileUpdate).eq("id", userId!);
    }

    // Notify client about the deposit
    await supabase.from("notifications").insert({
      user_id: userId!,
      title: "Deposit Received",
      message: `Your deposit of ${creditCurrency} ${amount.toLocaleString()} has been credited to your account.`,
      type: "deposit",
    });

    await logActivity("manual_deposit_created", {
      amount,
      currency: creditCurrency,
      method: depForm.method,
      psp_provider: depForm.psp_provider || null,
      ftd_agent: isFtd ? (depForm.ftd_agent || null) : null,
    });
    toast.success("Manual deposit created and credited");
    setManualDepositOpen(false);
    setDepForm({ amount: "", currency: "EUR", method: "", notes: "", crypto_asset: "BTC", psp_provider: "", ftd_agent: "" });
    fetchAll();
  };

  const submitBonus = async () => {
    const amount = Number(bonusForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid bonus amount");
      return;
    }
    setBonusLoading(true);
    try {
      // Find or create wallet for this currency
      const { data: existingWallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", userId!)
        .eq("currency", bonusForm.currency)
        .maybeSingle();

      if (existingWallet) {
        const newBalance = Number(existingWallet.balance) + amount;
        const { error: upErr } = await supabase
          .from("wallets")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("id", existingWallet.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase
          .from("wallets")
          .insert({ user_id: userId!, currency: bonusForm.currency, balance: amount });
        if (insErr) throw insErr;
      }

      // Log as admin note for traceability
      if (currentUser?.id) {
        await supabase.from("admin_notes").insert({
          user_id: userId!,
          author_id: currentUser.id,
          content: `🎁 Bonus credited: ${bonusForm.currency} ${amount.toLocaleString()}${bonusForm.notes ? ` — ${bonusForm.notes}` : ""}`,
        });
      }

      // Notify the client
      await supabase.from("notifications").insert({
        user_id: userId!,
        title: "Bonus Credited",
        message: `A bonus of ${bonusForm.currency} ${amount.toLocaleString()} has been added to your account.${bonusForm.notes ? ` Note: ${bonusForm.notes}` : ""}`,
        type: "deposit",
      });

      await logActivity("bonus_credited", { amount, currency: bonusForm.currency, notes: bonusForm.notes || null });
      toast.success("Bonus credited successfully");
      setBonusOpen(false);
      setBonusForm({ amount: "", currency: "EUR", notes: "" });
      fetchAll();
    } catch (err: any) {
      toast.error("Failed to add bonus: " + (err.message || "Unknown error"));
    } finally {
      setBonusLoading(false);
    }
  };

  const parseBonusContent = (content: string) => {
    const match = (content || "").match(/🎁 Bonus credited:\s*([A-Z]{3,5})\s*([\d.,]+)(?:\s*—\s*(.+))?/);
    if (!match) return null;
    const currency = match[1];
    // Strip thousands separators (locale-tolerant): treat , and . as separators except last as decimal
    const raw = match[2];
    const normalized = raw.includes(",") && !raw.includes(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");
    const amount = Number(normalized) || 0;
    const note = match[3] || "";
    return { currency, amount, note };
  };

  const openEditBonus = (b: any) => {
    const parsed = parseBonusContent(b.content || "");
    if (!parsed) {
      toast.error("Could not parse bonus");
      return;
    }
    setEditBonusForm({
      id: b.id,
      amount: String(parsed.amount),
      currency: parsed.currency,
      notes: parsed.note,
      originalAmount: parsed.amount,
    });
    setEditBonusOpen(true);
  };

  const submitEditBonus = async () => {
    const newAmount = Number(editBonusForm.amount);
    if (!newAmount || newAmount <= 0) {
      toast.error("Enter a valid bonus amount");
      return;
    }
    setEditBonusLoading(true);
    try {
      // Wallet is adjusted automatically by the trg_adjust_wallet_on_bonus_change DB trigger.
      const newContent = `🎁 Bonus credited: ${editBonusForm.currency} ${newAmount.toLocaleString()}${editBonusForm.notes ? ` — ${editBonusForm.notes}` : ""}`;
      const { error: nErr } = await supabase
        .from("admin_notes")
        .update({ content: newContent })
        .eq("id", editBonusForm.id);
      if (nErr) throw nErr;

      await logActivity("bonus_updated", { from: editBonusForm.originalAmount, to: newAmount, currency: editBonusForm.currency });
      toast.success("Bonus updated");
      setEditBonusOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error("Failed to update bonus: " + (err.message || "Unknown error"));
    } finally {
      setEditBonusLoading(false);
    }
  };

  const deleteBonus = async (b: any) => {
    const parsed = parseBonusContent(b.content || "");
    if (!parsed) {
      toast.error("Could not parse bonus");
      return;
    }
    if (!confirm(`Delete this bonus and deduct ${parsed.currency} ${parsed.amount.toLocaleString()} from the wallet?`)) return;
    try {
      // Wallet is debited automatically by the trg_adjust_wallet_on_bonus_change DB trigger on delete.
      const { error: dErr } = await supabase.from("admin_notes").delete().eq("id", b.id);
      if (dErr) throw dErr;
      await logActivity("bonus_deleted", { amount: parsed.amount, currency: parsed.currency });
      toast.success("Bonus deleted");
      fetchAll();
    } catch (err: any) {
      toast.error("Failed to delete bonus: " + (err.message || "Unknown error"));
    }
  };

  const submitEditDeposit = async () => {
    if (!editDepositForm.id) return;
    if (!editDepositForm.amount || Number(editDepositForm.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (editDepositForm.method === "credit_card" && !editDepositForm.psp_provider) {
      toast.error("Please select a PSP provider");
      return;
    }
    const pspTag = editDepositForm.method === "credit_card" && editDepositForm.psp_provider
      ? `[PSP: ${editDepositForm.psp_provider}] `
      : "";
    const combinedNotes = pspTag + (editDepositForm.notes || "");

    const { error } = await supabase
      .from("deposits")
      .update({
        amount: Number(editDepositForm.amount),
        currency: editDepositForm.currency,
        method: editDepositForm.method,
        status: editDepositForm.status,
        admin_notes: combinedNotes,
        created_at: editDepositForm.created_at,
      })
      .eq("id", editDepositForm.id);

    if (error) {
      toast.error("Failed to update deposit: " + error.message);
      return;
    }
    await logActivity("deposit_edited", {
      deposit_id: editDepositForm.id,
      amount: Number(editDepositForm.amount),
      currency: editDepositForm.currency,
      method: editDepositForm.method,
      status: editDepositForm.status,
    });
    toast.success("Deposit updated");
    setEditDepositOpen(false);
    fetchAll();
  };

  const submitManualWithdraw = async () => {
    if (!wdForm.amount || Number(wdForm.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const amount = Number(wdForm.amount);

    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", userId!)
      .eq("currency", wdForm.currency)
      .maybeSingle();

    if (wallet && Number(wallet.balance) < amount) {
      toast.error("Insufficient wallet balance");
      return;
    }

    const { error: wdError } = await supabase.from("withdrawals").insert({
      user_id: userId!,
      amount,
      currency: wdForm.currency,
      method: wdForm.method,
      status: "approved",
      admin_notes: wdForm.notes || "Manual withdrawal by admin",
      processed_by: currentUser?.id,
    });

    if (wdError) {
      toast.error("Failed to create withdrawal: " + wdError.message);
      return;
    }

    // Wallet debiting is handled automatically by the debit_wallet_on_withdrawal_approval trigger
    // No manual wallet update needed here

    await logActivity("manual_withdrawal_created", { amount, currency: wdForm.currency, method: wdForm.method });
    toast.success("Manual withdrawal created and deducted");
    setManualWithdrawOpen(false);
    setWdForm({ amount: "", currency: "EUR", method: "manual", notes: "" });
    fetchAll();
  };

  const FIAT_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD"];
  const totalDeposited = deposits.filter(d => d.status === "approved").reduce((s, d) => {
    const amt = Number(d.amount);
    if (FIAT_CURRENCIES.includes(d.currency)) return s + amt;
    // Crypto: convert to EUR using live price
    const eurPrice = cryptoPricesEur[d.currency];
    return s + (eurPrice ? amt * eurPrice : amt);
  }, 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === "approved").reduce((s, w) => {
    const amt = Number(w.amount);
    if (FIAT_CURRENCIES.includes(w.currency)) return s + amt;
    const eurPrice = cryptoPricesEur[w.currency];
    return s + (eurPrice ? amt * eurPrice : amt);
  }, 0);
  const closedTrades = trades.filter(t => t.status === "closed");
  const totalPnl = closedTrades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayPnl = closedTrades.filter(t => t.closed_at && new Date(t.closed_at) >= todayStart).reduce((s, t) => s + Number(t.pnl ?? 0), 0);
  const monthlyPnl = closedTrades.filter(t => t.closed_at && new Date(t.closed_at) >= monthStart).reduce((s, t) => s + Number(t.pnl ?? 0), 0);
  const openTradesCount = trades.filter(t => t.status === "open").length;
  const totalWalletEur = wallets.reduce((s, w) => {
    const amt = Number(w.balance);
    if (FIAT_CURRENCIES.includes(w.currency)) return s + amt;
    const eurPrice = cryptoPricesEur[w.currency];
    return s + (eurPrice ? amt * eurPrice : amt);
  }, 0);
  const openPnl = trades.filter(t => t.status === "open").reduce((s, t) => {
    const sym = t.assets?.symbol;
    const live = sym ? livePrices[sym] : undefined;
    return s + computeLivePnl(t, live);
  }, 0);
  const totalAccountBalance = totalWalletEur + openPnl;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading user...</div>;
  }

  if (!profile) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">User not found</div>;
  }

  const isStaff = userRoleId !== "none";
  const staffRoleName = isStaff ? (roles.find(r => r.id === userRoleId)?.name ?? "Staff") : "";

  // ─── STAFF MEMBER VIEW ────────────────────────────────────────
  if (isStaff) {
    return (
      <div className="space-y-6">
        {/* Staff Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold">{profile.full_name || profile.email}</h1>
              {profile.display_id && (
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(profile.display_id.toString()); toast.success(`Copied client ID #${profile.display_id}`); }}
                  className="text-xs font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
                  title="Copy client ID"
                >
                  #{profile.display_id}
                </button>
              )}
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                <ShieldCheck className="h-3 w-3 mr-1" /> {staffRoleName}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${statusColors[profile.status] ?? "bg-muted text-muted-foreground"}`}>
            {profile.status}
          </span>
        </div>

        {/* Staff Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-lg font-display font-bold">{staffRoleName}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-lg font-display font-bold capitalize">{profile.status}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-lg font-display font-bold">{new Date(profile.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">2FA</p>
                <p className="text-lg font-display font-bold">{profile.two_factor_enabled ? "Enabled" : "Disabled"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="role">Role & Permissions</TabsTrigger>
            <TabsTrigger value="notes">Notes ({adminNotes.length})</TabsTrigger>
          </TabsList>

          {/* Staff Profile Tab */}
          <TabsContent value="profile">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Edit Staff Profile</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      value={editProfile.email}
                      onChange={e => setEditProfile({ ...editProfile, email: e.target.value })}
                      readOnly={isAgentRole(currentRoleName)}
                      className={isAgentRole(currentRoleName) ? "bg-muted cursor-not-allowed" : ""}
                    />
                    {isAgentRole(currentRoleName) && (
                      <p className="text-xs text-muted-foreground">Only Admin and Manager can edit email</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Full Name</Label>
                    <Input value={editProfile.full_name} onChange={e => setEditProfile({ ...editProfile, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Mobile Phone</Label>
                    <Input value={editProfile.phone} onChange={e => setEditProfile({ ...editProfile, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Landline / Secondary Phone</Label>
                    <Input value={editProfile.secondary_phone} onChange={e => setEditProfile({ ...editProfile, secondary_phone: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="space-y-1">
                    <Label>Country</Label>
                    <Select value={normalizeCountry(editProfile.country) || ""} onValueChange={v => setEditProfile({ ...editProfile, country: v })}>
                      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                       {COUNTRIES.map(c => (
                          <SelectItem key={c.code} value={c.name}>
                            <span className="inline-flex items-center gap-2">
                              <span className="text-base leading-none">{c.flag}</span>
                              <span>{c.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" /> Save Changes
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Security</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Reset Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="New password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} variant="outline" className="w-full">
                        <KeyRound className="h-4 w-4 mr-2" /> {changingPassword ? "Updating..." : "Update Password"}
                      </Button>
                    </div>

                    {currentRoleName === "Admin" && (
                      <div className="space-y-2 pt-4 border-t">
                        <Label className="flex items-center gap-2">
                          <Lock className="h-4 w-4" /> Login Password (Admin only)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Reveal a login password the agent can use to sign in as this client.
                          Real passwords are hashed and cannot be recovered — clicking generates
                          and sets a new one the first time, then re-shows the same value on later clicks.
                        </p>
                        {revealedPassword ? (
                          <div className="flex items-center gap-2">
                            <Input readOnly value={revealedPassword} className="font-mono" />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(revealedPassword);
                                toast.success("Password copied");
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleRevealPassword(false)}
                            disabled={revealingPassword}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {revealingPassword ? "Working..." : revealedPassword ? "Hide" : "Reveal Login Password"}
                          </Button>
                          {revealedPassword && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRevealedPassword(null)}
                              >
                                <EyeOff className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleRevealPassword(true)}
                                disabled={revealingPassword}
                                title="Generate a new password and overwrite the current one"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Account Actions</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 text-success border-success/30 hover:bg-success/10" onClick={() => updateStatus("active")}>
                        <CheckCircle className="h-4 w-4 mr-2" /> Activate
                      </Button>
                      <Button variant="outline" className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => updateStatus("suspended")}>
                        <Ban className="h-4 w-4 mr-2" /> Suspend
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Role & Permissions Tab */}
          <TabsContent value="role">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Role Assignment</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Assigned Role</Label>
                  <Select value={userRoleId} onValueChange={assignRole}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Role (Remove Staff Access)</SelectItem>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} {r.is_system && "(System)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {roles.find(r => r.id === userRoleId)?.description && (
                    <p className="text-xs text-muted-foreground">{roles.find(r => r.id === userRoleId)?.description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Team</Label>
                  <Select value={userTeamId} onValueChange={assignTeam}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Assign this staff member to a team.</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-2">About Roles</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong>Admin</strong> — Full access to all platform features</li>
                    <li><strong>Manager</strong> — Can manage team leads and agents</li>
                    <li><strong>Agent</strong> — Can manage own leads and clients</li>
                  </ul>
                  <p className="mt-2 text-xs">Changing the role takes effect immediately. The staff member's permissions will update on their next page load.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Notes Tab */}
          <TabsContent value="notes">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Internal Notes</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Add a note about this staff member..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={e => {
                            if (e.target.files) setCommentFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                          }}
                        />
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <Paperclip className="h-3.5 w-3.5" /> Attach files
                        </span>
                      </label>
                      {commentFiles.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {commentFiles.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                              {f.name}
                              <button onClick={() => setCommentFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button onClick={submitNote} disabled={uploadingComment || (!newNote.trim() && commentFiles.length === 0)} size="icon" className="self-end">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {adminNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                  ) : adminNotes.map(n => {
                    const tr = translations[n.id];
                    return (
                    <div key={n.id} className="border rounded-lg p-3 text-sm group relative">
                      <p className="text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-foreground/70">{(() => { const a = agentsList.find((ag: any) => ag.id === n.author_id); return a?.full_name || a?.email || "Staff"; })()}</span>
                        {" · "}{new Date(n.created_at).toLocaleString("de-DE")}
                      </p>
                      <p className="whitespace-pre-wrap pr-16">{n.content}</p>
                      {tr?.text && (
                        <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-primary mb-1">English translation</p>
                          <p className="whitespace-pre-wrap">{tr.text}</p>
                        </div>
                      )}
                      {n.attachments?.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {n.attachments.map((url: string, i: number) => (
                            <AttachmentLink key={i} url={url} index={i} />
                          ))}
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => translateNote(n.id, n.content)}
                          disabled={tr?.loading}
                          title={tr?.text ? "Hide translation" : "Translate to English"}
                        >
                          {tr?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                        </Button>
                        {currentRoleName === "Admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteNote(n.id)}
                            title="Delete comment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ─── CLIENT / LEAD VIEW ────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {(() => {
              const pos = getNavPosition(profile.id);
              if (!pos) return null;
              return (
                <div className="flex items-center gap-1 rounded-md border bg-muted/30 px-1.5 py-1" title={pos.source ? `Navigating ${pos.source} list` : "Browse clients"}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!pos.prevId}
                    onClick={() => pos.prevId && navigate(`/backoffice/users/${pos.prevId}`)}
                    title="Previous client"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-mono tabular-nums text-muted-foreground px-1 min-w-[44px] text-center">
                    {pos.index + 1}/{pos.total}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!pos.nextId}
                    onClick={() => pos.nextId && navigate(`/backoffice/users/${pos.nextId}`)}
                    title="Next client"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              );
            })()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold">{profile.full_name || profile.email}</h1>
              <span
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  isClientOnline
                    ? "bg-green-500/10 text-green-500"
                    : "bg-muted text-muted-foreground"
                }`}
                title={lastSeenAt ? `Last seen: ${new Date(lastSeenAt).toLocaleString("de-DE")}` : "Never seen"}
              >
                <span className={`h-2 w-2 rounded-full ${isClientOnline ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50"}`} />
                {isClientOnline ? "Online" : lastSeenAt ? (() => {
                  const seen = new Date(lastSeenAt);
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const yesterday = new Date(today.getTime() - 86400000);
                  const seenDay = new Date(seen.getFullYear(), seen.getMonth(), seen.getDate());
                  const time = seen.toLocaleString("de-DE", { timeStyle: "short" });
                  if (seenDay.getTime() === today.getTime()) return `Last seen today ${time}`;
                  if (seenDay.getTime() === yesterday.getTime()) return `Last seen yesterday ${time}`;
                  return `Last seen ${seen.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}`;
                })() : "Offline"}
              </span>
              {isClientOnline && currentPage && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-500"
                  title={currentPageSince ? `On this page since ${new Date(currentPageSince).toLocaleString("de-DE")}` : ""}
                >
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="font-mono">{currentPage}</span>
                  <PageDuration sinceIso={currentPageSince} />
                </span>
              )}
              <Badge variant={profile.is_lead ? "secondary" : "default"} className="text-xs">
                {profile.is_lead ? "Lead" : "Depositor"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{profile.email}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(profile.email);
                  toast.success("Email copied to clipboard");
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
              {profile.phone && (
                <>
                  <span>•</span>
                  <span>{profile.phone}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(profile.phone);
                      toast.success("Phone copied to clipboard");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </>
              )}
              {profile.secondary_phone && (
                <>
                  <span>•</span>
                  <span className="text-muted-foreground">☎</span>
                  <span>{profile.secondary_phone}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(profile.secondary_phone);
                      toast.success("Secondary phone copied to clipboard");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="hidden lg:block w-[260px]">
            <GlobalClientSearch />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusChanger userId={profile.id} currentStatus={profile.status} onStatusChanged={fetchAll} size="lg" />
            {profile.phone && (
              <CallPrefixMenu
                clientPhone={profile.phone}
                secondaryPhone={profile.secondary_phone}
                profileId={profile.id}
                clientCountry={profile.country}
                size="lg"
              />
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke("admin-user-actions", {
                    body: { action: "login_as_client", user_id: profile.id, site_url: window.location.origin },
                  });
                  if (error) throw error;
                  if ((data as any)?.error) throw new Error((data as any).error);
                  if ((data as any)?.url) {
                    window.open((data as any).url, "_blank");
                    toast.success("Opening client session in new tab");
                  } else {
                    toast.error("No session URL returned");
                  }
                } catch (err: any) {
                  toast.error(err?.message ?? "Failed to login as client");
                }
              }}
              title="Open a logged-in client session in a new tab"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Login as Client
            </Button>
          </div>

        </div>
        {/* Info badges row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground ml-14">
          {currentRoleName !== "Manager Conversion" && currentRoleName !== "Agent Conversion" && (
            <span className="bg-muted px-2 py-0.5 rounded inline-flex items-center gap-1.5">
              ID: <strong className="text-foreground">#{profile.display_id}</strong>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(profile.display_id.toString());
                  toast.success("ID copied to clipboard");
                }}
              >
                <Copy className="h-2.5 w-2.5" />
              </Button>
            </span>
          )}
          {profile.country && (() => {
            const c = findCountry(profile.country);
            return (
              <span className="bg-muted px-2 py-0.5 rounded inline-flex items-center gap-1.5">
                Country:
                {c && <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} alt={c.name} className="h-3 w-4 rounded-sm object-cover" />}
                <strong className="text-foreground">{c?.name ?? profile.country}</strong>
              </span>
            );
          })()}
          <span className="bg-muted px-2 py-0.5 rounded">Affiliate: <strong className="text-foreground">{profile.affiliate || "—"}</strong></span>
          <span className="bg-muted px-2 py-0.5 rounded">Funnel: <strong className="text-foreground">{profile.funnel || "—"}</strong></span>
          <span className="bg-muted px-2 py-0.5 rounded">Registered: <strong className="text-foreground">{new Date(profile.created_at).toLocaleDateString("de-DE", { timeZone: getStaffTz() })} {new Date(profile.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: getStaffTz() })}</strong></span>
          {profile.verification_code && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono inline-flex items-center gap-1.5">
              Code: <strong>{profile.verification_code}</strong>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 text-primary hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(profile.verification_code);
                  toast.success("Verification code copied to clipboard");
                }}
              >
                <Copy className="h-2.5 w-2.5" />
              </Button>
            </span>
          )}
          {profile.first_deposit_at && (
            <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded">FTD: <strong>{new Date(profile.first_deposit_at).toLocaleDateString("de-DE")}</strong></span>
          )}
          <span className={`px-2 py-0.5 rounded ${
            profile.kyc_status === "approved" ? "bg-green-500/10 text-green-600" :
            profile.kyc_status === "pending" ? "bg-yellow-500/10 text-yellow-600" :
            "bg-muted text-muted-foreground"
          }`}>KYC: <strong>{profile.kyc_status || "Not submitted"}</strong></span>
          <Select
            value={profile.assigned_agent || "none"}
            onValueChange={async (v) => {
              const newAgent = v === "none" ? null : v;
              const prevAgent = profile?.assigned_agent || null;
              const { error } = await supabase.from("profiles").update({ assigned_agent: newAgent }).eq("id", userId);
              if (error) { toast.error("Failed to assign agent"); return; }
              const agent = agentsList.find(a => a.id === newAgent);
              const prevAgentObj = agentsList.find(a => a.id === prevAgent);
              setAgentName(agent ? (agent.full_name || agent.email) : null);
              setAgentEmail(agent?.email || null);
              setProfile((p: any) => ({ ...p, assigned_agent: newAgent }));
              await logActivity("agent_assigned", {
                from: prevAgentObj ? (prevAgentObj.full_name || prevAgentObj.email) : null,
                to: agent ? (agent.full_name || agent.email) : null,
              });
              toast.success("Agent updated");
            }}
          >
            <SelectTrigger className="h-6 text-xs bg-muted border-0 px-2 py-0.5 w-auto min-w-[140px] gap-1">
              <span>Agent: <strong className="text-foreground">{agentName || "Unassigned"}</strong></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {agentsList.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Force Link Dialog */}
      <Dialog open={forceLinkOpen} onOpenChange={setForceLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Client to Open Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Enter the URL you want <strong>{profile.full_name || profile.email}</strong> to be redirected to. This works when the client is logged in.
            </p>
            <Input
              placeholder="https://example.com or /dashboard"
              value={forceLinkUrl}
              onChange={(e) => setForceLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleForceLink()}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setForceLinkUrl("/dashboard")}>Dashboard</Button>
              <Button variant="outline" size="sm" onClick={() => setForceLinkUrl("/wallet")}>Wallet</Button>
              <Button variant="outline" size="sm" onClick={() => setForceLinkUrl("/trading")}>Trading</Button>
              <Button variant="outline" size="sm" onClick={() => setForceLinkUrl("/staking")}>Staking</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForceLinkOpen(false)}>Cancel</Button>
            <Button onClick={handleForceLink} disabled={!forceLinkUrl.trim()}>
              <ExternalLink className="h-4 w-4 mr-1" /> Send Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Affiliate Feedback Dialog */}
      <Dialog open={affFeedbackOpen} onOpenChange={setAffFeedbackOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-sky-400" />
              Send Feedback to Affiliate {affFeedbackAffiliate ? `— ${affFeedbackAffiliate}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {affFeedbackLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Generating feedback with AI…
              </div>
            ) : (
              <>
                {affFeedbackError && (
                  <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded p-2">
                    {affFeedbackError}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Review and edit the message before sending. It will be posted to the affiliate's Telegram group.
                </p>
                <Textarea
                  value={affFeedbackText}
                  onChange={(e) => setAffFeedbackText(e.target.value)}
                  rows={14}
                  className="font-mono text-xs"
                  placeholder="Feedback message…"
                />
                {!affFeedbackHasTelegram && !affFeedbackLoading && (
                  <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                    ⚠️ This affiliate has no Telegram group configured. The message cannot be sent.
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAffFeedbackOpen(false)} disabled={affFeedbackSending}>
              Cancel
            </Button>
            <Button
              onClick={handleSendAffFeedback}
              disabled={affFeedbackLoading || affFeedbackSending || !affFeedbackText.trim() || !affFeedbackHasTelegram}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Send className="h-4 w-4 mr-1" />
              {affFeedbackSending ? "Sending…" : "Send to Telegram"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shave Lead Confirmation Dialog */}
      <Dialog open={shaveDialogOpen} onOpenChange={setShaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">Shave Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Are you sure you want to shave <strong>{profile?.full_name || profile?.email}</strong>?</p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-muted-foreground">
              <p>• A duplicate account will be created with the same details</p>
              <p>• The duplicate becomes the real working account for the client</p>
              <p>• The original lead stays visible to the affiliate (unchanged)</p>
              <p>• The client will only be able to log in to the new account</p>
              <p>• Wallet balances and notes will be copied to the new account</p>
            </div>
            <p className="text-destructive text-xs font-medium">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleShaveLead} disabled={shaveLoading} variant="destructive">
              {shaveLoading ? "Shaving..." : "Shave Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Appointment Dialog */}
      <Dialog open={appointmentOpen} onOpenChange={setAppointmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground">
              <p className="font-semibold mb-1">⏰ Timezone notice</p>
              <p className="text-muted-foreground leading-relaxed">
                You (the agent) enter and see the time in <span className="font-medium text-foreground">{tzLabel(getStaffTz())} time</span>.
                {" "}The client will automatically see it in <span className="font-medium text-foreground">their own local timezone</span> (based on their device / country).
                {" "}The appointment is stored as an absolute moment in time, so each side sees the correct local time.
              </p>
            </div>

            {/* Client selection — pre-selected from user detail, category detected automatically */}
            <div className="space-y-2">
              <Label>Client</Label>
              <div className="flex gap-2 pb-1">
                {([
                  { key: "leads", label: "Leads" },
                  { key: "depositors", label: "Depositors" },
                  { key: "all", label: "All" },
                ] as const).map(opt => (
                  <Button
                    key={opt.key}
                    type="button"
                    size="sm"
                    variant={apptClientType === opt.key ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => { setApptClientType(opt.key); setApptForm(f => ({ ...f, client_id: "" })); }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              <Popover open={apptClientPickerOpen} onOpenChange={setApptClientPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    <span className="truncate">
                      {apptForm.client_id
                        ? (apptClients.find(c => c.id === apptForm.client_id)?.full_name
                          || apptClients.find(c => c.id === apptForm.client_id)?.email
                          || profile?.full_name
                          || profile?.email
                          || "Selected client")
                        : (profile?.full_name || profile?.email || "Select client")}
                    </span>
                    <Search className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or email..." />
                    <CommandList>
                      <CommandEmpty>No client found.</CommandEmpty>
                      <CommandGroup>
                        {apptClients
                          .filter(c =>
                            apptClientType === "all" ? true : apptClientType === "depositors" ? !!c.first_deposit_at : !c.first_deposit_at
                          )
                          .map(c => (
                            <CommandItem
                              key={c.id}
                              value={`${c.full_name ?? ""} ${c.email ?? ""}`}
                              onSelect={() => { setApptForm(f => ({ ...f, client_id: c.id })); setApptClientPickerOpen(false); }}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm">{c.full_name || c.email}</p>
                                {c.full_name && c.email && (
                                  <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                                )}
                              </div>
                              {c.first_deposit_at && (
                                <Badge variant="secondary" className="ml-auto text-[10px]">Depositor</Badge>
                              )}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label>Title *</Label>
              <Input value={apptForm.title} onChange={(e) => setApptForm({ ...apptForm, title: e.target.value })} placeholder="e.g. Portfolio Review" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={apptForm.description} onChange={(e) => setApptForm({ ...apptForm, description: e.target.value })} placeholder="Notes..." rows={1} />
            </div>
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input type="date" value={apptForm.date} onChange={(e) => setApptForm({ ...apptForm, date: e.target.value })} />
            </div>
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Your time ({tzLabel(getStaffTz())})
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start time *</Label>
                <Time24Input value={apptForm.startTime} onChange={(v) => setApptForm({ ...apptForm, startTime: v })} />
              </div>
              {apptForm.date && apptForm.startTime && (() => {
                try {
                  const startUtc = zonedDateTimeToUTC(apptForm.date, apptForm.startTime, getStaffTz());
                  return (
                    <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground border-t border-border/50">
                      <span className="font-medium">Client sees ({tzLabel(getClientTz())})</span>
                      <span className="font-mono tabular-nums text-foreground">
                        {formatTimeInTz(startUtc, getClientTz())}
                      </span>
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>

            {/* Notifications toggles */}
            <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="appt-notify-client"
                  checked={apptNotifyClient}
                  onCheckedChange={(checked) => setApptNotifyClient(checked === true)}
                />
                <Label htmlFor="appt-notify-client" className="text-sm cursor-pointer">
                  Notify client (confirmation email + dashboard notification now, and 1h before)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="appt-notify-agent"
                  checked={apptNotifyAgent}
                  onCheckedChange={(checked) => setApptNotifyAgent(checked === true)}
                />
                <Label htmlFor="appt-notify-agent" className="text-sm cursor-pointer">
                  Notify agent (backoffice 1h reminder)
                </Label>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex gap-2">
                {APPT_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      apptForm.color === c.value ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setApptForm({ ...apptForm, color: c.value })}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAppointmentOpen(false)}>Cancel</Button>
            <Button onClick={submitAppointment} disabled={savingAppt}>
              {savingAppt ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Trade Dialog — Bulk Wizard */}
      <Dialog open={tradeOpen} onOpenChange={setTradeOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {bulkStep === "trade"
                ? `Create Trade #${bulkRows.length + 1} for ${profile?.full_name || profile?.email}`
                : `Review & Create — ${profile?.full_name || profile?.email}`}
            </DialogTitle>
          </DialogHeader>

          {/* STEP 1: Add Trade */}
          {bulkStep === "trade" && (
            <div className="space-y-5">
              {bulkRows.length > 0 && (
                <div className="rounded-xl bg-success/5 border border-success/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <p className="text-sm font-semibold text-success">{bulkRows.length} trade(s) ready</p>
                  </div>
                  {bulkRows.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <span className="text-muted-foreground">{tradeAssets.find(a => a.id === r.asset_id)?.symbol} · {r.direction.toUpperCase()} · €{r.size} · P&L €{r.pnl}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10" onClick={() => setBulkRows(prev => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {/* Asset & Direction */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Tag className="h-4 w-4 text-primary" /> Asset
                    </Label>
                    <Select value={bulkCurrentRow.asset_id} onValueChange={v => setBulkCurrentRow(r => ({ ...r, asset_id: v }))}>
                      <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Pick asset..." /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {["crypto", "stock", "index", "commodity"].map(type => {
                          const group = tradeAssets.filter(a => a.type === type);
                          if (!group.length) return null;
                          const labels: Record<string, string> = { crypto: "Crypto", stock: "Stocks", index: "Indices", commodity: "Commodities" };
                          return (
                            <SelectGroup key={type}>
                              <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">{labels[type] ?? type}</SelectLabel>
                              {group.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.symbol} — {a.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-primary" /> Direction
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={bulkCurrentRow.direction === "buy" ? "default" : "outline"}
                        className={cn("h-12 text-base font-semibold", bulkCurrentRow.direction === "buy" && "bg-success hover:bg-success/90 text-success-foreground")}
                        onClick={() => setBulkCurrentRow(r => ({ ...r, direction: "buy" }))}
                      >
                        <TrendingUp className="h-5 w-5 mr-2" /> BUY
                      </Button>
                      <Button
                        type="button"
                        variant={bulkCurrentRow.direction === "sell" ? "default" : "outline"}
                        className={cn("h-12 text-base font-semibold", bulkCurrentRow.direction === "sell" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground")}
                        onClick={() => setBulkCurrentRow(r => ({ ...r, direction: "sell" }))}
                      >
                        <TrendingDown className="h-5 w-5 mr-2" /> SELL
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Size, Leverage, P&L */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-primary" /> Size (€)
                    </Label>
                    <Input className="h-12 text-base font-medium" type="number" value={bulkCurrentRow.size} onChange={e => setBulkCurrentRow(r => ({ ...r, size: e.target.value }))} placeholder="1000" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-primary" /> Leverage
                    </Label>
                    <Input className="h-12 text-base font-medium" type="number" value={bulkCurrentRow.leverage} onChange={e => setBulkCurrentRow(r => ({ ...r, leverage: e.target.value }))} min="1" placeholder="1" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-primary" /> P&L (€)
                    </Label>
                    <Input className="h-12 text-base font-medium" type="number" value={bulkCurrentRow.pnl} onChange={e => setBulkCurrentRow(r => ({ ...r, pnl: e.target.value }))} placeholder="+50 or -100" />
                  </div>
                </div>

                {/* Entry Price & Close Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-muted-foreground" /> Entry Price
                      <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
                    </Label>
                    <Input className="h-12 text-base" type="number" value={bulkCurrentRow.entryPrice} onChange={e => setBulkCurrentRow(r => ({ ...r, entryPrice: e.target.value }))} placeholder="Auto from market" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <CalendarIcon className="h-4 w-4 text-primary" /> Close Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("h-12 w-full justify-start text-left text-base font-normal", !bulkCurrentRow.closedAt && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {bulkCurrentRow.closedAt ? format(bulkCurrentRow.closedAt, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={bulkCurrentRow.closedAt} onSelect={d => d && setBulkCurrentRow(r => ({ ...r, closedAt: d }))} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="outline" onClick={() => setTradeOpen(false)} className="h-11">
                  Cancel
                </Button>
                <div className="flex-1" />
                <Button variant="secondary" onClick={addBulkTradeAndContinue} className="h-11 text-sm font-semibold">
                  <Plus className="h-4 w-4 mr-1.5" /> Add & Next Trade
                </Button>
                <Button onClick={finishAndReviewTrades} className="h-11 text-sm font-semibold">
                  Done <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Review */}
          {bulkStep === "review" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Creating <span className="font-semibold text-foreground">{bulkRows.length}</span> trade(s) for <span className="font-semibold text-foreground">{profile?.full_name || profile?.email}</span>
              </p>
              <div className="rounded-lg border divide-y">
                {bulkRows.map((r, i) => {
                  const assetSymbol = tradeAssets.find(a => a.id === r.asset_id)?.symbol ?? "—";
                  const pnlNum = Number(r.pnl);
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">#{i + 1}</span>
                        <span className="font-medium">{assetSymbol}</span>
                        <Badge variant={r.direction === "buy" ? "default" : "destructive"} className="text-xs capitalize">{r.direction}</Badge>
                        <span className="text-muted-foreground">€{r.size} · {r.leverage}×</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${pnlNum >= 0 ? "text-success" : "text-destructive"}`}>
                          {pnlNum >= 0 ? "+" : ""}€{r.pnl}
                        </span>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => {
                          setBulkRows(prev => prev.filter((_, j) => j !== i));
                          if (bulkRows.length <= 1) setBulkStep("trade");
                        }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-md bg-muted/50 p-2 text-sm">
                <span className="text-muted-foreground">Total wallet impact: </span>
                <span className="font-semibold">
                  €{bulkRows.reduce((s, r) => s + Number(r.size) + Number(r.pnl), 0).toLocaleString()}
                </span>
              </div>
              <DialogFooter className="flex gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setBulkStep("trade")} size="sm">← Add More</Button>
                <div className="flex-1" />
                <Button variant="outline" onClick={() => setTradeOpen(false)} size="sm">Cancel</Button>
                <Button onClick={submitBulkTrades} disabled={savingTrade || bulkRows.length === 0} size="sm">
                  {savingTrade ? "Creating..." : `Create ${bulkRows.length} Trade(s)`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PaymentLinkDialog
        open={paymentLinkOpen}
        onOpenChange={setPaymentLinkOpen}
        clientId={profile.id}
        clientName={profile.full_name || profile.email || "Unknown"}
        clientCountry={profile.country}
      />

      <PaymentProviderPickerDialog
        open={providerPickerOpen}
        onOpenChange={setProviderPickerOpen}
        clientId={profile.id}
        clientName={profile.full_name || profile.email || "Unknown"}
        clientCountry={profile.country}
        onPickRjPsp={() => setPaymentLinkOpen(true)}
      />

      {/* Quick Emails Dialog */}
       <Dialog open={quickEmailsOpen} onOpenChange={(open) => {
          setQuickEmailsOpen(open);
          if (!open) { setNaEmailStep("menu"); setNaEmailEditing(false); setNaEmailHtml(""); setNaEmailPreviewError(null); setNaEmailData(null); }
        }}>
        <DialogContent className={cn("sm:max-w-lg", ((naEmailStep === "preview" && !naEmailEditing) || naEmailStep === "custom") && "sm:max-w-2xl")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-violet-400" />
              {naEmailStep === "menu" ? "Quick Emails" : naEmailStep === "trade-updates" ? "Trade Updates" : naEmailStep === "custom-range" ? "Custom Date Range" : naEmailStep === "preview" ? `${QUICK_EMAIL_LABELS[naEmailTemplate]} — Preview` : naEmailStep === "custom" ? "Custom Email" : "Sending..."}
            </DialogTitle>
          </DialogHeader>

          {naEmailStep === "menu" && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border-border/60"
                onClick={async () => {
                  const clientName = profile?.full_name || "";
                  const funnel = profile?.funnel || "";
                  const defaultFrom: QuickEmailFrom = agentEmail ? "agent" : "support";
                  const sender = resolveQuickEmailSender(defaultFrom);
                  setNaEmailHtml("");
                  setNaEmailPreviewError(null);
                  setNaEmailTemplate("no-answer-followup");
                  setNaEmailData(null);
                  setNaEmailFrom(defaultFrom);
                  setNaEmailSubject(funnel ? `${funnel} — Wir möchten Ihre Registrierung abschließen` : "Wir möchten Ihre Registrierung abschließen — Crypto-Börse");
                  setNaEmailBody(buildNoAnswerBody(clientName, funnel, sender.name, sender.email));
                  // Fetch rendered HTML preview
                  try {
                    await renderQuickEmailPreview("no-answer-followup", defaultFrom);
                  } catch (err: any) {
                    setNaEmailPreviewError(err?.message || "Preview failed to load.");
                    toast.error("Preview failed to load");
                  }
                  setNaEmailStep("preview");
                }}
              >
                <Mail className="h-5 w-5 text-violet-400" />
                NA Email
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border-border/60 hover:border-violet-400/60 hover:bg-violet-500/5"
                onClick={() => {
                  setCustomEmailSubject("");
                  const defaultFrom: QuickEmailFrom = agentEmail ? "agent" : "support";
                  const sender = resolveQuickEmailSender(defaultFrom);
                  setCustomEmailBody(`Sehr geehrte/r ${profile?.full_name || "Kunde/Kundin"},\n\n\n\nMit freundlichen Grüßen,\n${sender.name}`);
                  setCustomEmailFrom(defaultFrom);
                  setNaEmailStep("custom");
                }}
              >
                <Mail className="h-5 w-5 text-violet-400" />
                Custom Email
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border-border/60 hover:border-blue-500/60 hover:bg-blue-500/5"
                onClick={async () => {
                  if (!profile?.email) {
                    toast.error("Client has no email address");
                    return;
                  }
                  const defaultFrom: QuickEmailFrom = agentEmail ? "agent" : "support";
                  setNaEmailTemplate("p2p-link");
                  setNaEmailData(null);
                  setNaEmailHtml("");
                  setNaEmailPreviewError(null);
                  setNaEmailEditing(false);
                  setNaEmailFrom(defaultFrom);
                  setNaEmailSubject("Ihr persönlicher P2P Zahlungs-Link — Crypto-Börse");
                  setNaEmailBody("");
                  setNaEmailStep("preview");
                  try {
                    await renderQuickEmailPreview("p2p-link", defaultFrom);
                  } catch (err: any) {
                    setNaEmailPreviewError(err?.message || "Preview failed to load.");
                    toast.error("Preview failed to load");
                  }
                }}
              >
                <Mail className="h-5 w-5 text-blue-500" />
                P2P Link
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border-border/60 hover:border-emerald-500/60 hover:bg-emerald-500/5"
                onClick={() => setNaEmailStep("trade-updates")}
              >
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Trade Updates
              </Button>
            </div>
          )}

          {naEmailStep === "trade-updates" && (
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">
                Performance reports generated from this client's real trades.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border-border/60 hover:border-emerald-500/60 hover:bg-emerald-500/5"
                  onClick={() => void openTradeUpdateEmail("account-update-24h", "24h")}
                >
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  24h Account Update
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border-border/60 hover:border-emerald-500/60 hover:bg-emerald-500/5"
                  onClick={() => void openTradeUpdateEmail("account-update-weekly", "rolling-week")}
                >
                  <CalendarDays className="h-5 w-5 text-emerald-500" />
                  Weekly Update
                  <span className="text-[10px] font-normal text-muted-foreground">last 7 days</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border-border/60 hover:border-emerald-500/60 hover:bg-emerald-500/5"
                  onClick={() => void openTradeUpdateEmail("account-update-weekly", "last-week")}
                >
                  <CalendarDays className="h-5 w-5 text-emerald-500" />
                  Last Week
                  <span className="text-[10px] font-normal text-muted-foreground">Mon–Sun</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border-border/60 hover:border-emerald-500/60 hover:bg-emerald-500/5"
                  onClick={() => setNaEmailStep("custom-range")}
                >
                  <CalendarDays className="h-5 w-5 text-emerald-500" />
                  Custom Dates
                  <span className="text-[10px] font-normal text-muted-foreground">pick a range</span>
                </Button>

              </div>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setNaEmailStep("menu")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </DialogFooter>
            </div>
          )}

          {naEmailStep === "custom-range" && (
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">
                Choose the period the report should cover.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">From</Label>
                  <Input type="date" value={naRangeFrom} onChange={(e) => setNaRangeFrom(e.target.value)} className="text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">To</Label>
                  <Input type="date" value={naRangeTo} onChange={(e) => setNaRangeTo(e.target.value)} className="text-sm mt-1" />
                </div>
              </div>
              <DialogFooter className="flex gap-2 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => setNaEmailStep("trade-updates")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  size="sm"
                  disabled={!naRangeFrom || !naRangeTo}
                  onClick={() => void openTradeUpdateEmail("account-update-weekly", "custom", { from: naRangeFrom, to: naRangeTo })}
                >
                  Generate preview
                </Button>
              </DialogFooter>
            </div>
          )}



          {naEmailStep === "preview" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">To</Label>
                <Input value={profile?.email || ""} disabled className="text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">From</Label>
                <Select value={naEmailFrom} onValueChange={(v) => handleQuickEmailFromChange(v as QuickEmailFrom)}>
                  <SelectTrigger className="text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agentEmail && (
                      <SelectItem value="agent">Agent — {agentEmail}</SelectItem>
                    )}
                    <SelectItem value="support">Support — support@crypto-borse.com</SelectItem>
                    <SelectItem value="noreply">No-Reply — noreply@crypto-borse.com</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
                <Input
                  value={naEmailSubject}
                  onChange={(e) => setNaEmailSubject(e.target.value)}
                  disabled={!naEmailEditing}
                  className="text-sm mt-1"
                />
              </div>

              {naEmailEditing ? (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Body</Label>
                  <Textarea
                    value={naEmailBody}
                    onChange={(e) => setNaEmailBody(e.target.value)}
                    className="text-sm mt-1 min-h-[200px] font-mono text-xs"
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">Email Preview</Label>
                  <div className="border rounded-lg overflow-hidden bg-muted/30">
                    {naEmailHtml ? (
                      <iframe
                        srcDoc={naEmailHtml}
                        className="w-full border-0"
                        style={{ height: '480px' }}
                        title="Email Preview"
                        sandbox="allow-same-origin"
                      />
                    ) : naEmailPreviewError ? (
                      <div className="flex items-center justify-center h-48 px-6 text-center text-sm text-destructive">
                        {naEmailPreviewError}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                        Loading preview...
                      </div>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="flex gap-2 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setNaEmailStep(naEmailTemplate.startsWith("account-update") ? "trade-updates" : "menu"); setNaEmailHtml(""); setNaEmailPreviewError(null); }}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                {!naEmailTemplate.startsWith("account-update") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNaEmailEditing(!naEmailEditing)}
                  >
                    {naEmailEditing ? <Eye className="h-4 w-4 mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                    {naEmailEditing ? "Preview" : "Edit"}
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={async () => {
                    setNaEmailStep("sending");
                    try {
                      const sender = resolveQuickEmailSender(naEmailFrom);
                      const { error } = await supabase.functions.invoke("send-transactional-email", {
                        body: {
                          templateName: naEmailTemplate,
                          recipientEmail: profile?.email,
                          idempotencyKey: `${naEmailTemplate}-${userId}-${(naEmailData?.periodRange as string) || ""}-${new Date().toISOString().slice(0, 10)}`,
                          fromAddress: sender.fromAddress,
                          fromName: sender.fromName,
                          templateData: {
                            clientName: profile?.full_name || undefined,
                            agentName: sender.name,
                            agentEmail: sender.email,
                            funnelName: profile?.funnel || undefined,
                            ...(naEmailData || {}),
                            ...(naEmailTemplate.startsWith("account-update") && naEmailSubject
                              ? { subjectOverride: naEmailSubject }
                              : {}),
                          },
                        },
                      });
                      if (error) throw error;
                      toast.success(`${QUICK_EMAIL_LABELS[naEmailTemplate]} sent successfully`);
                      setQuickEmailsOpen(false);
                      setNaEmailStep("menu");
                      setNaEmailEditing(false);
                      setNaEmailHtml("");
                    } catch (err: any) {
                      toast.error("Failed to send email: " + (err.message || "Unknown error"));
                      setNaEmailStep("preview");
                    }
                  }}
                >
                  <Send className="h-4 w-4 mr-1" /> Send Email
                </Button>
              </DialogFooter>
            </div>
          )}

          {naEmailStep === "custom" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">To</Label>
                <Input value={profile?.email || ""} disabled className="text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">From</Label>
                <Select value={customEmailFrom} onValueChange={(v) => handleCustomEmailFromChange(v as QuickEmailFrom)}>
                  <SelectTrigger className="text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agentEmail && (
                      <SelectItem value="agent">Agent — {agentEmail}</SelectItem>
                    )}
                    <SelectItem value="support">Support — support@crypto-borse.com</SelectItem>
                    <SelectItem value="noreply">No-Reply — noreply@crypto-borse.com</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
                <Input
                  value={customEmailSubject}
                  onChange={(e) => setCustomEmailSubject(e.target.value)}
                  placeholder="Subject of your email"
                  className="text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Message</Label>
                <Textarea
                  value={customEmailBody}
                  onChange={(e) => setCustomEmailBody(e.target.value)}
                  placeholder="Write your message here. Leave a blank line between paragraphs."
                  className="text-sm mt-1 min-h-[260px]"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  The email is automatically wrapped in branded Crypto-Börse styling. Use blank lines to separate paragraphs.
                </p>
              </div>

              <DialogFooter className="flex gap-2 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => setNaEmailStep("menu")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  disabled={customEmailSending || !customEmailSubject.trim() || !customEmailBody.trim() || !profile?.email}
                  onClick={async () => {
                    if (!profile?.email) return;
                    setCustomEmailSending(true);
                    try {
                      const sender = resolveQuickEmailSender(customEmailFrom);

                      // 1. Create thread row first to obtain reply token
                      const { data: thread, error: threadErr } = await (supabase as any)
                        .from("client_email_threads")
                        .insert({
                          client_user_id: userId,
                          client_email: profile.email,
                          client_name: profile?.full_name || null,
                          agent_user_id: currentUser?.id || null,
                          agent_name: sender.name || null,
                          agent_email: sender.email || null,
                          from_address: sender.fromAddress || null,
                          from_label: customEmailFrom,
                          subject: customEmailSubject,
                          body_text: customEmailBody,
                        })
                        .select("id, reply_token")
                        .single();
                      if (threadErr) throw threadErr;

                      const replyUrl = `${window.location.origin}/reply/${thread.reply_token}`;

                      const { error } = await supabase.functions.invoke("send-transactional-email", {
                        body: {
                          templateName: "custom-message",
                          recipientEmail: profile.email,
                          idempotencyKey: `custom-${userId}-${thread.id}`,
                          fromAddress: sender.fromAddress,
                          fromName: sender.fromName,
                          templateData: {
                            subject: customEmailSubject,
                            bodyText: customEmailBody,
                            clientName: profile?.full_name || undefined,
                            agentName: sender.name,
                            agentEmail: sender.email,
                            replyUrl,
                          },
                        },
                      });
                      if (error) throw error;
                      toast.success("Email sent — replies will appear in Email Replies");
                      setCustomEmailSubject("");
                      setCustomEmailBody("");
                      setQuickEmailsOpen(false);
                      setNaEmailStep("menu");
                    } catch (err: any) {
                      toast.error("Failed to send email: " + (err.message || "Unknown error"));
                    } finally {
                      setCustomEmailSending(false);
                    }
                  }}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {customEmailSending ? "Sending..." : "Send Email"}
                </Button>
              </DialogFooter>
            </div>
          )}
          {naEmailStep === "sending" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="h-12 w-12 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              <p className="text-sm font-medium">Sending email...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md">
        <CardContent className="p-5 flex items-center gap-5 flex-wrap">
          <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Wallet className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Account Balance</p>
            <p className="text-3xl md:text-4xl font-display font-bold tabular-nums text-primary">
              €{totalAccountBalance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Wallets + Bonuses + Live P&L from open trades</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-base">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Wallets</p>
              <p className="text-2xl font-display font-bold tabular-nums">€{totalWalletEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Open P&L</p>
              {openTradesCount === 0 ? (
                <p className="text-2xl font-display font-bold tabular-nums text-muted-foreground" title="No open trades">—</p>
              ) : (
                <p className={`text-2xl font-display font-bold tabular-nums ${openPnl >= 0 ? "text-success" : "text-destructive"}`}>
                  {openPnl >= 0 ? "+" : ""}€{openPnl.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">{openTradesCount} open {openTradesCount === 1 ? "trade" : "trades"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Total Deposited</p>
              <p className="text-lg font-display font-bold mt-auto">€{totalDeposited.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Total Withdrawn</p>
              <p className="text-lg font-display font-bold mt-auto">€{totalWithdrawn.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Profit & Loss</p>
              <div className="flex items-center gap-1 mb-0.5">
                {(["total", "today", "monthly"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPnlMode(mode)}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                      pnlMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {mode === "total" ? "Total" : mode === "today" ? "Today" : "Monthly"}
                  </button>
                ))}
              </div>
              <p className={`text-lg font-display font-bold ${(pnlMode === "total" ? totalPnl : pnlMode === "today" ? todayPnl : monthlyPnl) >= 0 ? "text-success" : "text-destructive"}`}>
                €{(pnlMode === "total" ? totalPnl : pnlMode === "today" ? todayPnl : monthlyPnl).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Trades</p>
              <div className="flex items-center gap-1 mb-0.5">
                {(["open", "closed"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTradesCountMode(mode)}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                      tradesCountMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {mode === "open" ? "Open" : "Closed"}
                  </button>
                ))}
              </div>
              <p className="text-lg font-display font-bold">
                {tradesCountMode === "open" ? openTradesCount : closedTrades.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <div className="overflow-x-auto -mx-2 px-2">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="wallets">Assets</TabsTrigger>
            <TabsTrigger value="deposits">Deposits ({deposits.length})</TabsTrigger>
            <TabsTrigger value="bonuses">Bonuses ({adminNotes.filter(n => (n.content || "").startsWith("🎁 Bonus credited:")).length})</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals ({withdrawals.length})</TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Requests ({paymentLinkRequests.length})
              {(() => {
                const pendingCount =
                  paymentLinkRequests.filter((r: any) => r.status === "pending").length;
                if (pendingCount === 0) return null;
                return (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-pulse">
                    {pendingCount}
                  </span>
                );
              })()}
            </TabsTrigger>
            <TabsTrigger value="trades">
              Trades ({trades.length})
              {openTradesCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-success/20 text-success text-[10px] font-bold">
                  {openTradesCount} open
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="stakes">Stakes ({stakes.length})</TabsTrigger>
            <TabsTrigger value="bank">Bank</TabsTrigger>
            <TabsTrigger value="crypto">Crypto Wallets</TabsTrigger>
            <TabsTrigger value="report">Reports</TabsTrigger>
            <TabsTrigger value="kyc">KYC Docs{kycDocsCount > 0 ? ` (${kycDocsCount})` : ""}</TabsTrigger>
            <TabsTrigger value="notes">Comments ({adminNotes.length})</TabsTrigger>
            <TabsTrigger value="phone-log">Phone Log</TabsTrigger>
            <TabsTrigger value="email-log">Email Log</TabsTrigger>
            {currentRoleName === "Admin" && (
              <TabsTrigger value="client-log">Client Log</TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="phone-log">
          <PhoneCallLog userId={userId!} />
        </TabsContent>

        <TabsContent value="email-log">
          <EmailLog userId={userId!} />
        </TabsContent>

        {currentRoleName === "Admin" && (
          <TabsContent value="client-log">
            <ClientActivityLog userId={userId!} />
          </TabsContent>
        )}

        <TabsContent value="kyc">
          <AdminKycDocs userId={userId!} />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Quick Actions — primary CTA, full width on top */}
          <Button
            size="lg"
            onClick={() => setQuickActionsOpen(true)}
            className="w-full h-14 gap-2 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg hover:opacity-95"
          >
            <Zap className="!h-5 !w-5" />
            Quick Actions
            {isOnWelcomePage && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> on Welcome
              </span>
            )}
          </Button>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <Card>
              <CardHeader><CardTitle className="text-base">Edit Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    value={editProfile.email}
                    onChange={e => setEditProfile({ ...editProfile, email: e.target.value })}
                    readOnly={isAgentRole(currentRoleName)}
                    className={isAgentRole(currentRoleName) ? "bg-muted cursor-not-allowed" : ""}
                  />
                  {isAgentRole(currentRoleName) && (
                    <p className="text-xs text-muted-foreground">Only Admin and Manager can edit email</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <Input value={editProfile.full_name} onChange={e => setEditProfile({ ...editProfile, full_name: e.target.value })} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Mobile Phone</Label>
                    <Input value={editProfile.phone} onChange={e => setEditProfile({ ...editProfile, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Landline / Home Phone</Label>
                    <Input value={editProfile.secondary_phone} onChange={e => setEditProfile({ ...editProfile, secondary_phone: e.target.value })} placeholder="Optional" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Country</Label>
                  <Select value={normalizeCountry(editProfile.country) || ""} onValueChange={v => setEditProfile({ ...editProfile, country: v })}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.name}>
                          <span className="inline-flex items-center gap-2">
                            <span className="text-base leading-none">{c.flag}</span>
                            <span>{c.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>KYC Status</Label>
                  <Select value={editProfile.kyc_status} onValueChange={v => setEditProfile({ ...editProfile, kyc_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_submitted">Not Submitted</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    Latest IP Address
                    {latestIp.at && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        (seen {new Date(latestIp.at).toLocaleString("de-DE")})
                      </span>
                    )}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={latestIp.ip || "—"}
                      readOnly
                      className="bg-muted cursor-not-allowed font-mono text-sm"
                    />
                    {latestIp.ip && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(latestIp.ip!);
                          toast.success("IP copied");
                        }}
                      >
                        Copy
                      </Button>
                    )}
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </Button>
                <div className="border-t pt-4 mt-4 space-y-2">
                  <Label className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change Password</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="New password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} variant="outline" className="w-full">
                    <KeyRound className="h-4 w-4 mr-2" /> {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                  <Button
                    onClick={handleSendResetLink}
                    disabled={sendingResetLink || !profile?.email}
                    variant="secondary"
                    className="w-full"
                    title="Email a password reset link to the client. They only need to choose a new password."
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingResetLink ? "Sending..." : "Send Password Reset Link"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right column: Activity + Quick Comments stack alongside Edit Profile */}
            <div className="space-y-6">
              {/* Client Activity — recent Stripe checkouts, deposits, withdrawals & appointment requests */}
              <ClientActivityFeed userId={userId!} />

              {/* Page visits — when client browsed marketing pages like Account Types */}
              <ClientPageVisits userId={userId!} />

              {/* Quick Comments */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Quick Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 items-start">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a quick comment..."
                    rows={1}
                    className="flex-1 min-h-[38px]"
                  />
                  <label className="cursor-pointer shrink-0 mt-1">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setCommentFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                        }
                        e.target.value = "";
                      }}
                    />
                    <div className="inline-flex items-center gap-1 px-2 py-1.5 border rounded-md text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                      <Paperclip className="h-3.5 w-3.5" />
                    </div>
                  </label>
                  <Button
                    onClick={submitNote}
                    disabled={(!newNote.trim() && commentFiles.length === 0) || uploadingComment}
                    size="sm"
                    className="shrink-0 mt-0.5"
                  >
                    {uploadingComment ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {commentFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {commentFiles.map((file, idx) => {
                      const isImage = file.type.startsWith("image/");
                      return (
                        <div key={idx} className="relative group border rounded-lg p-1.5 flex items-center gap-2 bg-muted/30 text-xs">
                          {isImage ? (
                            <img src={URL.createObjectURL(file)} alt="" className="h-8 w-8 object-cover rounded" />
                          ) : (
                            <File className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="max-w-[80px] truncate">{file.name}</span>
                          <button onClick={() => setCommentFiles(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {adminNotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {adminNotes.slice(0, 5).map((note) => (
                      <div key={note.id} className="border rounded-lg p-2.5 space-y-1.5 group relative">
                        <p className="text-sm whitespace-pre-wrap pr-7">{note.content}</p>
                        {note.attachments && note.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {note.attachments.map((url: string, i: number) => (
                              <AttachmentLink key={i} url={url} index={i} />
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
<span className="font-medium">{(() => { const a = agentsList.find((ag: any) => ag.id === note.author_id); return a?.full_name || a?.email || "Staff"; })()}</span>
                          <span>{new Date(note.created_at).toLocaleString("de-DE")}</span>
                        </div>
                        {currentRoleName === "Admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteNote(note.id)}
                            title="Delete comment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {adminNotes.length > 5 && (
                      <p className="text-xs text-center text-muted-foreground">+ {adminNotes.length - 5} more — see Comments tab</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
            {/* end right column */}


            <Dialog open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" /> Quick Actions
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className={`col-span-3 h-24 flex flex-col items-center justify-center gap-2 text-base font-semibold ${isOnWelcomePage
                      ? "border-green-500/40 bg-green-500/5 text-green-500 hover:bg-green-500/10"
                      : "border-border/60 text-muted-foreground hover:bg-accent opacity-70"}`}
                    onClick={() => { setQuickActionsOpen(false); handleForceToHome(); }}
                    title={isOnWelcomePage ? "Client is on Welcome page — click to redirect" : "Client is not on Welcome page"}
                  >
                    <Home className="!h-7 !w-7" />
                    {isOnWelcomePage && welcomeTimeLeft !== null
                      ? `Force to Home (${Math.floor(welcomeTimeLeft / 60)}:${(welcomeTimeLeft % 60).toString().padStart(2, "0")})`
                      : "Force to Home"}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-28 flex flex-col items-center justify-center gap-2 text-xs leading-tight font-semibold border-border/60 hover:bg-accent text-center px-1"
                    onClick={() => { setQuickActionsOpen(false); openAppointmentDialog(); }}
                  >
                    <CalendarDays className="!h-7 !w-7 text-primary" />
                    Schedule<br />Appointment
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-28 flex flex-col items-center justify-center gap-2 text-xs leading-tight font-semibold border-border/60 text-blue-400 hover:bg-blue-500/10 text-center px-1"
                    onClick={() => { setQuickActionsOpen(false); setForceLinkOpen(true); }}
                    title="Force client to open a specific link"
                  >
                    <ExternalLink className="!h-7 !w-7" />
                    Force Link
                  </Button>
                  {profile.is_lead && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-28 flex flex-col items-center justify-center gap-2 text-xs leading-tight font-semibold border-border/60 text-amber-400 hover:bg-amber-500/10 text-center px-1"
                      onClick={() => { setQuickActionsOpen(false); setProviderPickerOpen(true); }}
                      title="Choose payment provider and get a checkout link"
                    >
                      <CreditCard className="!h-7 !w-7" />
                      Payment<br />Link
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-28 flex flex-col items-center justify-center gap-2 text-xs leading-tight font-semibold border-border/60 text-emerald-400 hover:bg-emerald-500/10 text-center px-1"
                    onClick={() => { setQuickActionsOpen(false); openTradeDialog(); }}
                    title="Create a new trade for this client"
                  >
                    <Plus className="!h-7 !w-7" />
                    Create<br />Trades
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-28 flex flex-col items-center justify-center gap-2 text-xs leading-tight font-semibold border-border/60 text-violet-400 hover:bg-violet-500/10 text-center px-1"
                    onClick={() => { setQuickActionsOpen(false); setQuickEmailsOpen(true); }}
                    title="Send quick emails to this client"
                  >
                    <Mail className="!h-7 !w-7" />
                    Quick<br />Emails
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-28 flex flex-col items-center justify-center gap-2 text-xs leading-tight font-semibold border-border/60 text-emerald-400 hover:bg-emerald-500/10 text-center px-1"
                    onClick={() => {
                      setQuickActionsOpen(false);
                      fetchCryptoPricesEur().then(setCryptoPricesEur);
                      setManualDepositOpen(true);
                    }}
                    title="Add a manual deposit for this client"
                  >
                    <DollarSign className="!h-7 !w-7" />
                    Quick<br />Deposit
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className={`h-28 flex flex-col items-center justify-center gap-2 text-xs leading-tight font-semibold border-border/60 text-center px-1 ${profile.force_chat_open ? "text-success border-success/40 bg-success/5" : "text-cyan-400 hover:bg-cyan-500/10"}`}
                    onClick={() => { setQuickActionsOpen(false); handleStartChat(); }}
                    title="Start or open live chat with this client"
                  >
                    <div className="relative">
                      <MessageSquare className="!h-7 !w-7" />
                      {profile.force_chat_open && (
                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
                      )}
                    </div>
                    {profile.force_chat_open ? "Chat Active" : <>Force<br />Live Chat</>}
                  </Button>
                  {profile.is_lead && profile.affiliate && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-28 flex flex-col items-center justify-center gap-2 text-xs leading-tight font-semibold border-border/60 text-sky-400 hover:bg-sky-500/10 text-center px-1"
                      onClick={() => { setQuickActionsOpen(false); handleOpenAffFeedback(); }}
                      title={`Send feedback about this lead to affiliate "${profile.affiliate}" Telegram group`}
                    >
                      <Send className="!h-7 !w-7" />
                      Affiliate<br />Feedback
                    </Button>
                  )}
                  {profile.is_lead && !profile.shaved_to && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-28 flex flex-col items-center justify-center gap-2 text-xs leading-tight font-semibold border-red-500/40 text-red-400 hover:bg-red-500/10 text-center px-1 [&_svg]:!size-7"
                      onClick={() => { setQuickActionsOpen(false); setShaveDialogOpen(true); }}
                      title="Shave this lead — create a clean copy for internal use"
                    >
                      <Scissors className="!h-7 !w-7" />
                      Shave<br />Lead
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <AppointmentRequestsPanel clientId={userId!} clientName={profile?.full_name} />

            <div id="stripe-intents" className="scroll-mt-20">
              <StripeIntentsPanel userId={userId!} />
            </div>

          </div>
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Fiat Wallets */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Fiat Currencies
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Currency</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Balance</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.filter(w => FIAT_LIST.includes(w.currency)).map(w => (
                      <WalletRow key={w.id} wallet={w} onUpdate={updateWalletBalance} cryptoPricesEur={cryptoPricesEur} />
                    ))}
                  </tbody>
                </table>
                {wallets.filter(w => FIAT_LIST.includes(w.currency)).length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">No fiat wallets</p>
                )}
              </CardContent>
            </Card>

            {/* Crypto Wallets */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Crypto Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Asset</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Balance</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.filter(w => !FIAT_LIST.includes(w.currency)).map(w => (
                      <WalletRow key={w.id} wallet={w} onUpdate={updateWalletBalance} cryptoPricesEur={cryptoPricesEur} />
                    ))}
                  </tbody>
                </table>
                {wallets.filter(w => !FIAT_LIST.includes(w.currency)).length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">No crypto assets</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deposits Tab */}
        <TabsContent value="deposits">
          <div className="flex justify-end gap-2 mb-3">
            <Button size="sm" onClick={() => {
              setManualDepositOpen(true);
              fetchCryptoPricesEur().then(setCryptoPricesEur).catch(() => {});
            }}>
              <Plus className="h-4 w-4 mr-1" /> Manual Deposit
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Method</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">PSP</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Agent</th>
                    {currentRoleName === "Admin" && (
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {deposits.length === 0 ? (
                    <tr><td colSpan={currentRoleName === "Admin" ? 7 : 6} className="p-6 text-center text-muted-foreground">No deposits</td></tr>
                  ) : deposits.map(d => {
                    const pspMatch = d.admin_notes?.match(/\[PSP:\s*([^\]]+)\]/);
                    const psp = pspMatch ? pspMatch[1].trim() : "";
                    const agent = d.processed_by ? agentsList.find((a: any) => a.id === d.processed_by) : null;
                    const agentLabel = agent ? (agent.full_name?.trim() || agent.email || "Staff") : (d.processed_by ? "Staff" : "—");
                    return (
                      <tr key={d.id} className="border-b last:border-0">
                        <td className="p-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold">{d.currency} {Number(d.amount).toLocaleString()}</td>
                        <td className="p-3 text-muted-foreground capitalize">{d.method}</td>
                        <td className="p-3 text-muted-foreground text-xs">{psp || "—"}</td>
                        <td className="p-3"><Badge variant="outline" className="capitalize text-xs">{d.status}</Badge></td>
                        <td className="p-3 text-muted-foreground text-xs">{agentLabel}</td>
                        {currentRoleName === "Admin" && (
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const cleanNotes = (d.admin_notes || "").replace(/\[PSP:\s*[^\]]+\]\s*/, "");
                                setEditDepositForm({
                                  id: d.id,
                                  amount: String(d.amount),
                                  currency: d.currency,
                                  method: d.method,
                                  status: d.status,
                                  psp_provider: psp,
                                  notes: cleanNotes,
                                  created_at: d.created_at,
                                });
                                setEditDepositOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

        </TabsContent>

        {/* Bonuses Tab */}
        <TabsContent value="bonuses">
          <div className="flex justify-end gap-2 mb-3">
            <Button size="sm" onClick={() => setBonusOpen(true)}>
              <Gift className="h-4 w-4 mr-1" /> Add Bonus
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Currency</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Note</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const bonuses = adminNotes.filter(n => (n.content || "").startsWith("🎁 Bonus credited:"));
                    if (bonuses.length === 0) {
                      return <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No bonuses</td></tr>;
                    }
                    return bonuses.map(b => {
                      const parsed = parseBonusContent(b.content || "");
                      const currency = parsed?.currency || "—";
                      const amount = parsed ? parsed.amount.toLocaleString() : "—";
                      const note = parsed?.note || "";
                      return (
                        <tr key={b.id} className="border-b last:border-0">
                          <td className="p-3 text-muted-foreground">{new Date(b.created_at).toLocaleString("de-DE")}</td>
                          <td className="p-3 font-semibold text-success">+{amount}</td>
                          <td className="p-3 text-muted-foreground">{currency}</td>
                          <td className="p-3 text-muted-foreground">{note || "—"}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditBonus(b)}>Edit</Button>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteBonus(b)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="withdrawals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-display">Withdrawals</CardTitle>
              <Button size="sm" onClick={() => { setWdForm({ amount: "", currency: "EUR", method: "manual", notes: "" }); setManualWithdrawOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Manual Withdraw
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Method</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No withdrawals</td></tr>
                  ) : withdrawals.map(w => (
                    <tr key={w.id} className="border-b last:border-0">
                      <td className="p-3 text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="p-3 font-semibold">€{Number(w.amount).toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground capitalize">{w.method}</td>
                      <td className="p-3"><Badge variant="outline" className="capitalize text-xs">{w.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests Tab — Payment link requests */}
        <TabsContent value="requests" className="space-y-4">

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">Payment Link Requests ({paymentLinkRequests.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Country</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Link</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentLinkRequests.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No payment link requests</td></tr>
                  ) : paymentLinkRequests.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString("de-DE")}</td>
                      <td className="p-3 font-semibold">{r.currency} {Number(r.amount).toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground">{r.country || "—"}</td>
                      <td className="p-3 text-xs max-w-[280px] truncate">
                        {r.payment_link ? (
                          <a href={r.payment_link} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{r.payment_link}</a>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-xs capitalize ${r.status === "fulfilled" ? "text-success border-success/30" : r.status === "pending" ? "text-amber-500 border-amber-500/30" : ""}`}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Asset</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Direction</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Size</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Qty</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Entry</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">P&L</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.length === 0 ? (
                      <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No trades</td></tr>
                    ) : [...trades].sort((a, b) => {
                      if (a.status === "open" && b.status !== "open") return -1;
                      if (a.status !== "open" && b.status === "open") return 1;
                      return new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime();
                    }).map(t => {
                      const symbol = (t.assets as any)?.symbol;
                      const pnl = computeLivePnl(t, livePrices[symbol]);
                      const entryPrice = Number(t.entry_price);
                      const size = Number(t.size);
                      const qty = entryPrice > 0 ? size / entryPrice : 0;
                      const assetBase = symbol?.replace(/\/.*$/, "").replace("EUR", "").replace("USD", "").replace("USDT", "") || "";
                      const isCopy = copiedTradeIds.has(t.id);
                      const isOpen = t.status === "open";
                      return (
                        <tr key={t.id} className={`border-b last:border-0 ${isOpen ? "bg-success/5" : ""}`}>
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-1.5">
                              {symbol ?? "—"}
                              {isCopy && <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/40 text-primary">Copy</Badge>}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-xs capitalize ${t.direction === "buy" ? "text-success" : "text-destructive"}`}>
                              {t.direction}
                            </Badge>
                          </td>
                          <td className="p-3">€{size.toLocaleString()}</td>
                          <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                            {qty < 1 ? qty.toFixed(6) : qty.toFixed(4)} {assetBase}
                          </td>
                          <td className="p-3">{entryPrice.toLocaleString()}</td>
                          <td className={`p-3 font-semibold tabular-nums ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {pnl >= 0 ? "+" : ""}€{pnl.toFixed(2)}
                          </td>
                          <td className="p-3">
                            <Badge variant={isOpen ? "default" : "outline"} className="text-xs capitalize">{t.status}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">{new Date(t.opened_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stakes Tab */}
        <TabsContent value="stakes">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Landmark className="h-4 w-4" /> Stakes ({stakes.length})
                </h3>
              </div>
              {stakes.length === 0 ? (
                <p className="p-8 text-center text-muted-foreground">No stakes</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">APY</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Rewards</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Unlocks</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stakes.map((s) => {
                        const unlocked = new Date(s.unlocks_at) <= new Date();
                        const reward = Number(s.rewards_earned ?? 0);
                        return (
                          <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3 font-medium">{(s as any).staking_plans?.name}</td>
                            <td className="p-3 font-semibold">€{Number(s.amount).toLocaleString()}</td>
                            <td className="p-3 text-success font-semibold">{(s as any).staking_plans?.apy}%</td>
                            <td className="p-3">
                              <span className={reward >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                                {reward >= 0 ? "+" : ""}€{reward.toFixed(2)}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{new Date(s.unlocks_at).toLocaleDateString()}</td>
                            <td className="p-3">
                              {s.claimed ? (
                                <Badge variant="outline">Claimed</Badge>
                              ) : unlocked ? (
                                <Badge className="bg-success/10 text-success border-success/30">Ready</Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Locked</Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <Button size="sm" variant="outline" onClick={() => {
                                setEditStake(s);
                                setRewardsInput(String(s.rewards_earned ?? 0));
                                setClaimedInput(s.claimed ? "true" : "false");
                              }}>
                                <DollarSign className="h-3.5 w-3.5 mr-1" /> Manage
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Tab */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="h-4 w-4" /> Bank Details for Deposits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <p className="text-sm text-muted-foreground">
                These bank details will be shown to the client when they choose to deposit via bank wire.
              </p>
              <div className="space-y-1">
                <Label>Bank Name</Label>
                <Input value={bankForm.bank_name} onChange={e => setBankForm({ ...bankForm, bank_name: e.target.value })} placeholder="Deutsche Bank AG" />
              </div>
              <div className="space-y-1">
                <Label>Account Holder</Label>
                <Input value={bankForm.account_holder} onChange={e => setBankForm({ ...bankForm, account_holder: e.target.value })} placeholder="Crypto-Börse GmbH" />
              </div>
              <div className="space-y-1">
                <Label>IBAN</Label>
                <Input value={bankForm.iban} onChange={e => setBankForm({ ...bankForm, iban: e.target.value })} placeholder="DE89 3704 0044 0532 0130 00" />
              </div>
              <div className="space-y-1">
                <Label>SWIFT / BIC</Label>
                <Input value={bankForm.swift_bic} onChange={e => setBankForm({ ...bankForm, swift_bic: e.target.value })} placeholder="COBADEFFXXX" />
              </div>
              <div className="space-y-1">
                <Label>Reference / Note for Client</Label>
                <Input value={bankForm.reference} onChange={e => setBankForm({ ...bankForm, reference: e.target.value })} placeholder="Use your account ID as reference" />
              </div>
              <div className="space-y-1">
                <Label>Internal Notes (not shown to client)</Label>
                <Textarea value={bankForm.notes} onChange={e => setBankForm({ ...bankForm, notes: e.target.value })} placeholder="Internal notes..." rows={2} />
              </div>
              <Button onClick={saveBankDetails} disabled={savingBank} className="w-full">
                <Save className="h-4 w-4 mr-2" /> {savingBank ? "Saving..." : bankDetails ? "Update Bank Details" : "Save Bank Details"}
              </Button>
              {bankDetails && (
                <p className="text-xs text-muted-foreground">Last updated: {new Date(bankDetails.updated_at).toLocaleString("de-DE")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Crypto Addresses Tab */}
        <TabsContent value="crypto">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Crypto Deposit Addresses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Add multiple wallet addresses per cryptocurrency. Clients will see these when making crypto deposits.
              </p>

              {/* Existing addresses */}
              {cryptoAddresses.length > 0 && (
                <div className="space-y-2">
                  {cryptoAddresses.map(a => (
                    <div key={a.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">{a.currency}</Badge>
                          {a.network && <span className="text-xs text-muted-foreground">({a.network})</span>}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mt-1 break-all">{a.address}</p>
                        {a.label && <p className="text-xs text-muted-foreground mt-0.5">{a.label}</p>}
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteCryptoAddress(a.id)}>
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new address */}
              <div className="border-t pt-4 space-y-3 max-w-lg">
                <Label className="font-semibold">Add New Address</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Currency</Label>
                    <Select value={cryptoForm.currency} onValueChange={v => setCryptoForm({ ...cryptoForm, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "DOT", "LINK", "AVAX", "USDT", "USDC"].map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Network (optional)</Label>
                    <Input value={cryptoForm.network} onChange={e => setCryptoForm({ ...cryptoForm, network: e.target.value })} placeholder="ERC-20, TRC-20, etc." />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Wallet Address</Label>
                  <Input value={cryptoForm.address} onChange={e => setCryptoForm({ ...cryptoForm, address: e.target.value })} placeholder="0x..." className="font-mono text-sm" />
                </div>
                <div className="space-y-1">
                  <Label>Label / Note for Client (optional)</Label>
                  <Input value={cryptoForm.label} onChange={e => setCryptoForm({ ...cryptoForm, label: e.target.value })} placeholder="Main deposit address" />
                </div>
                <Button onClick={saveCryptoAddress} disabled={savingCrypto} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> {savingCrypto ? "Saving..." : "Add Address"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Client Report Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Type Selector */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Report Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(reportTemplates).map(([key, tpl]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setReportType(key);
                        if (key !== "custom") {
                          setReportSections(tpl.sections);
                        }
                      }}
                      className={`text-left p-3 rounded-lg border-2 transition-colors ${reportType === key ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                    >
                      <p className="text-sm font-semibold">{tpl.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section toggles */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Report Sections {reportType !== "custom" && <span className="text-xs text-muted-foreground font-normal ml-1">(preset by template — switch to Custom to edit)</span>}</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: "wallets", label: "Wallets / Portfolio" },
                    { key: "pnl", label: "Profit & Loss" },
                    { key: "trades", label: "Trades" },
                    { key: "deposits", label: "Deposits" },
                    { key: "withdrawals", label: "Withdrawals" },
                    { key: "staking", label: "Staking" },
                  ].map((s) => (
                    <label key={s.key} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${reportType !== "custom" ? "opacity-60" : "hover:bg-muted/50"}`}>
                      <input
                        type="checkbox"
                        checked={reportSections[s.key] ?? true}
                        onChange={() => {
                          if (reportType !== "custom") {
                            setReportType("custom");
                          }
                          setReportSections(prev => ({ ...prev, [s.key]: !prev[s.key] }));
                        }}
                        className="rounded border-input"
                      />
                      <span className="text-sm font-medium">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              {/* Date Range & Frequency */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select value={reportDateRange} onValueChange={setReportDateRange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="last_week">Last Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Auto-Send Frequency</Label>
                  <Select value={reportFrequency} onValueChange={setReportFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Only</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Auto-Send Enabled</Label>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="checkbox"
                      checked={reportEnabled}
                      onChange={() => setReportEnabled(!reportEnabled)}
                      className="rounded border-input h-4 w-4"
                    />
                    <span className="text-sm text-muted-foreground">{reportEnabled ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              </div>

              {reportLastSent && (
                <p className="text-xs text-muted-foreground">Last sent: {new Date(reportLastSent).toLocaleString("de-DE")}</p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  disabled={savingReport}
                  variant="outline"
                  onClick={async () => {
                    setSavingReport(true);
                    const { error } = await (supabase as any).from("report_settings").upsert({
                      user_id: userId,
                      sections: reportSections,
                      frequency: reportFrequency,
                      enabled: reportEnabled,
                    }, { onConflict: "user_id" });
                    setSavingReport(false);
                    if (error) { toast.error("Failed to save settings"); return; }
                    toast.success("Report settings saved");
                  }}
                >
                  <Save className="h-4 w-4 mr-1" /> Save Settings
                </Button>

                <Button
                  disabled={sendingReport}
                  variant="outline"
                  onClick={async () => {
                    setSendingReport(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("generate-client-report", {
                        body: { user_id: userId, sections: reportSections, action: "download", date_range: reportDateRange },
                      });
                      if (error) throw error;
                      // data is the HTML string
                      const blob = new Blob([data], { type: "text/html" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `report-${profile.full_name || "client"}-${new Date().toISOString().slice(0, 10)}.html`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Report downloaded");
                    } catch (err: any) {
                      toast.error(err.message || "Failed to generate report");
                    }
                    setSendingReport(false);
                  }}
                >
                  <Download className="h-4 w-4 mr-1" /> Download Report
                </Button>

                <Button
                  disabled={sendingReport || !profile.email}
                  onClick={async () => {
                    setSendingReport(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("generate-client-report", {
                        body: { user_id: userId, sections: reportSections, action: "email", date_range: reportDateRange },
                      });
                      if (error) throw error;
                      const result = typeof data === "string" ? JSON.parse(data) : data;
                      if (result.success) {
                        setReportLastSent(new Date().toISOString());
                        toast.success(`Report generated for ${profile.email}`);
                      }
                    } catch (err: any) {
                      toast.error(err.message || "Failed to send report");
                    }
                    setSendingReport(false);
                  }}
                >
                  <Send className="h-4 w-4 mr-1" /> Send to Client Email
                </Button>

                <Button
                  disabled={sendingReport}
                  variant="outline"
                  onClick={async () => {
                    setSendingReport(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("generate-client-report", {
                        body: { user_id: userId, sections: reportSections, action: "download", date_range: reportDateRange },
                      });
                      if (error) throw error;
                      setPreviewHtml(typeof data === "string" ? data : JSON.stringify(data));
                    } catch (err: any) {
                      toast.error(err.message || "Failed to generate preview");
                    }
                    setSendingReport(false);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" /> Preview Report
                </Button>
              </div>
              {!profile.email && <p className="text-xs text-destructive">No email address on file.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Internal Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add comment */}
              <div className="space-y-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add an internal comment about this user..."
                  rows={2}
                />
                {/* File previews */}
                {commentFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {commentFiles.map((file, idx) => {
                      const isImage = file.type.startsWith("image/");
                      return (
                        <div key={idx} className="relative group border rounded-lg p-1.5 flex items-center gap-2 bg-muted/30 text-xs">
                          {isImage ? (
                            <img src={URL.createObjectURL(file)} alt="" className="h-10 w-10 object-cover rounded" />
                          ) : (
                            <File className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="max-w-[100px] truncate">{file.name}</span>
                          <button
                            onClick={() => setCommentFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="ml-1 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setCommentFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                        }
                        e.target.value = "";
                      }}
                    />
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                      <Paperclip className="h-3.5 w-3.5" /> Attach
                    </div>
                  </label>
                  <div className="flex-1" />
                  <Button
                    onClick={submitNote}
                    disabled={(!newNote.trim() && commentFiles.length === 0) || uploadingComment}
                    size="sm"
                  >
                    {uploadingComment ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="ml-1">Send</span>
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              {adminNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {adminNotes.map((note) => {
                    const tr = translations[note.id];
                    return (
                    <div key={note.id} className="border rounded-lg p-3 space-y-2 group relative">
                      <p className="text-sm whitespace-pre-wrap pr-16">{note.content}</p>
                      {tr?.text && (
                        <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-primary mb-1">English translation</p>
                          <p className="whitespace-pre-wrap">{tr.text}</p>
                        </div>
                      )}
                      {/* Attachments */}
                      {note.attachments && note.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {note.attachments.map((url: string, i: number) => (
                            <AttachmentLink key={i} url={url} index={i} />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                        <span className="font-medium">{(() => { const a = agentsList.find((ag: any) => ag.id === note.author_id); return a?.full_name || a?.email || "Staff"; })()}</span>
                        <span>{new Date(note.created_at).toLocaleString("de-DE")}</span>
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => translateNote(note.id, note.content)}
                          disabled={tr?.loading}
                          title={tr?.text ? "Hide translation" : "Translate to English"}
                        >
                          {tr?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                        </Button>
                        {currentRoleName === "Admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteNote(note.id)}
                            title="Delete comment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Bonus Dialog */}
      <Dialog open={bonusOpen} onOpenChange={setBonusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bonus to {profile?.full_name || profile?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              This credits the client's wallet directly as a bonus. It will not appear in the deposits list.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bonusForm.amount}
                  onChange={(e) => setBonusForm({ ...bonusForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select
                  value={bonusForm.currency}
                  onValueChange={(v) => setBonusForm({ ...bonusForm, currency: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["EUR", "USD", "GBP", "CHF", "AUD", "CAD"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason / Note (optional)</Label>
              <Textarea
                value={bonusForm.notes}
                onChange={(e) => setBonusForm({ ...bonusForm, notes: e.target.value })}
                placeholder="E.g. Welcome bonus, loyalty reward..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBonusOpen(false)} disabled={bonusLoading}>Cancel</Button>
            <Button onClick={submitBonus} disabled={bonusLoading}>
              {bonusLoading ? "Crediting..." : "Credit Bonus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bonus Dialog */}
      <Dialog open={editBonusOpen} onOpenChange={setEditBonusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bonus</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Adjusting the amount will add or subtract the difference from the client's wallet balance.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editBonusForm.amount}
                  onChange={(e) => setEditBonusForm({ ...editBonusForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Input value={editBonusForm.currency} disabled />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason / Note (optional)</Label>
              <Textarea
                value={editBonusForm.notes}
                onChange={(e) => setEditBonusForm({ ...editBonusForm, notes: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Original amount: {editBonusForm.currency} {editBonusForm.originalAmount.toLocaleString()}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBonusOpen(false)} disabled={editBonusLoading}>Cancel</Button>
            <Button onClick={submitEditBonus} disabled={editBonusLoading}>
              {editBonusLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <Dialog open={manualDepositOpen} onOpenChange={setManualDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Deposit for {profile?.full_name || profile?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Method</Label>
              <Select value={depForm.method} onValueChange={(v) => setDepForm({ ...depForm, method: v })}>
                <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="bank_wire">Bank Wire</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {depForm.method === "credit_card" && (
              <div className="space-y-1">
                <Label>PSP Provider</Label>
                <Select value={depForm.psp_provider} onValueChange={(v) => setDepForm({ ...depForm, psp_provider: v })}>
                  <SelectTrigger><SelectValue placeholder="Select PSP..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Max - Stripe">Max - Stripe</SelectItem>
                    <SelectItem value="RJ - PSP">RJ - PSP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input type="number" value={depForm.amount} onChange={(e) => setDepForm({ ...depForm, amount: e.target.value })} placeholder="1000" />
              </div>
              {depForm.method === "crypto" ? (
                <div className="space-y-1">
                  <Label>Crypto Asset</Label>
                  <Select value={depForm.crypto_asset} onValueChange={(v) => setDepForm({ ...depForm, crypto_asset: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "DOT", "LINK", "AVAX"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select value={depForm.currency} onValueChange={(v) => setDepForm({ ...depForm, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["EUR", "USD", "GBP", "CHF", "AUD", "CAD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {depForm.method === "crypto" && depForm.amount && cryptoPricesEur[depForm.crypto_asset] ? (
              <p className="text-sm text-muted-foreground">
                ≈ €{(Number(depForm.amount) * cryptoPricesEur[depForm.crypto_asset]).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                <span className="text-xs ml-1">(1 {depForm.crypto_asset} = €{cryptoPricesEur[depForm.crypto_asset].toLocaleString()})</span>
              </p>
            ) : null}
            {!profile?.first_deposit_at && (
              <div className="space-y-1">
                <Label>FTD Agent (who converted this lead)</Label>
                <Select value={depForm.ftd_agent} onValueChange={(v) => setDepForm({ ...depForm, ftd_agent: v })}>
                  <SelectTrigger><SelectValue placeholder="Select the agent who made the conversion..." /></SelectTrigger>
                  <SelectContent>
                    {agentsList.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">This will be recorded as the FTD agent for this depositor.</p>
              </div>
            )}
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea value={depForm.notes} onChange={(e) => setDepForm({ ...depForm, notes: e.target.value })} placeholder="Reason for manual deposit..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDepositOpen(false)}>Cancel</Button>
            <Button onClick={() => submitManualDeposit()}>Create & Credit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CrgWarningDialog
        open={!!depCrgCheck}
        check={depCrgCheck}
        onCancel={() => setDepCrgCheck(null)}
        onApprove={() => { setDepCrgCheck(null); void submitManualDeposit(true); }}
      />

      {/* Edit Deposit Dialog (Admin only) */}
      <Dialog open={editDepositOpen} onOpenChange={setEditDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="datetime-local"
                value={editDepositForm.created_at ? new Date(editDepositForm.created_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEditDepositForm({ ...editDepositForm, created_at: new Date(e.target.value).toISOString() })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input type="number" value={editDepositForm.amount} onChange={(e) => setEditDepositForm({ ...editDepositForm, amount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select value={editDepositForm.currency} onValueChange={(v) => setEditDepositForm({ ...editDepositForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["EUR", "USD", "GBP", "CHF", "AUD", "CAD", "BTC", "ETH", "SOL", "XRP", "BNB", "USDT"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Method</Label>
                <Select value={editDepositForm.method} onValueChange={(v) => setEditDepositForm({ ...editDepositForm, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="bank_wire">Bank Wire</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={editDepositForm.status} onValueChange={(v) => setEditDepositForm({ ...editDepositForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editDepositForm.method === "credit_card" && (
              <div className="space-y-1">
                <Label>PSP Provider</Label>
                <Select value={editDepositForm.psp_provider} onValueChange={(v) => setEditDepositForm({ ...editDepositForm, psp_provider: v })}>
                  <SelectTrigger><SelectValue placeholder="Select PSP..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Max - Stripe">Max - Stripe</SelectItem>
                    <SelectItem value="RJ - PSP">RJ - PSP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={editDepositForm.notes} onChange={(e) => setEditDepositForm({ ...editDepositForm, notes: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">
              Note: Editing a deposit does not adjust the wallet balance. Use manual deposit/withdraw to correct balances.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDepositOpen(false)}>Cancel</Button>
            <Button onClick={submitEditDeposit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Withdraw Dialog */}
      <Dialog open={manualWithdrawOpen} onOpenChange={setManualWithdrawOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manual Withdrawal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" value={wdForm.amount} onChange={e => setWdForm({ ...wdForm, amount: e.target.value })} placeholder="500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select value={wdForm.currency} onValueChange={v => setWdForm({ ...wdForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["EUR", "USD", "GBP", "CHF", "AUD", "CAD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Method</Label>
                <Select value={wdForm.method} onValueChange={v => setWdForm({ ...wdForm, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="bank_wire">Bank Wire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Admin Notes</Label>
              <Textarea value={wdForm.notes} onChange={e => setWdForm({ ...wdForm, notes: e.target.value })} placeholder="Reason for manual withdrawal..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualWithdrawOpen(false)}>Cancel</Button>
            <Button onClick={submitManualWithdraw}>Submit Withdrawal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Stake Dialog */}
      <Dialog open={!!editStake} onOpenChange={() => setEditStake(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" /> Manage Stake
            </DialogTitle>
          </DialogHeader>
          {editStake && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Plan:</span> {(editStake as any).staking_plans?.name}</p>
                <p><span className="text-muted-foreground">Staked:</span> €{Number(editStake.amount).toLocaleString()}</p>
                <p><span className="text-muted-foreground">APY:</span> {(editStake as any).staking_plans?.apy}%</p>
                <p><span className="text-muted-foreground">Unlocks:</span> {new Date(editStake.unlocks_at).toLocaleString("de-DE")}</p>
              </div>
              <div className="space-y-1">
                <Label>Rewards Earned (€)</Label>
                <p className="text-xs text-muted-foreground">Set positive for profit, negative for loss</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-success" onClick={() => setRewardsInput(String(Math.abs(Number(rewardsInput) || 0)))}>
                    <TrendingUp className="h-3.5 w-3.5 mr-1" /> Profit
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setRewardsInput(String(-Math.abs(Number(rewardsInput) || 0)))}>
                    <TrendingDown className="h-3.5 w-3.5 mr-1" /> Loss
                  </Button>
                </div>
                <Input type="number" value={rewardsInput} onChange={(e) => setRewardsInput(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={claimedInput} onValueChange={setClaimedInput}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Active (not claimed)</SelectItem>
                    <SelectItem value="true">Claimed (return funds + rewards to wallet)</SelectItem>
                  </SelectContent>
                </Select>
                {claimedInput === "true" && !editStake.claimed && (
                  <p className="text-xs text-success">Will credit €{(Number(editStake.amount) + Number(rewardsInput || 0)).toFixed(2)} to user's EUR wallet</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStake(null)}>Cancel</Button>
            <Button onClick={saveStakeOverride}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Report Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-2 pb-2" style={{ maxHeight: "calc(90vh - 80px)" }}>
            <iframe
              srcDoc={previewHtml || ""}
              className="w-full border rounded-lg"
              style={{ minHeight: "600px", height: "100%" }}
              title="Report Preview"
              sandbox=""
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Chat Panel */}
      <Dialog open={inlineChatOpen} onOpenChange={(open) => { if (!open) { setInlineChatOpen(false); } }}>
        <DialogContent className="max-w-lg flex flex-col h-[70vh]">
          <DialogHeader className="pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-display">
                Chat with {profile?.full_name || profile?.email || "Client"}
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={closeInlineChat} className="text-destructive hover:text-destructive">
                <X className="h-4 w-4 mr-1" /> Close Chat
              </Button>
            </div>
          </DialogHeader>
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
            {inlineChatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-40" />
                No messages yet — send the first message
              </div>
            ) : (
              inlineChatMessages.map((m: any) => {
                const isClient = m.sender_id === userId;
                const isAI = m.sender_id === AI_SENDER;
                const isSystem = m.type === "system";

                if (isSystem) {
                  return (
                    <div key={m.id} className="text-center">
                      <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground">{m.content}</span>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className={`flex ${isClient ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isClient
                        ? "bg-muted"
                        : isAI
                          ? "bg-accent text-accent-foreground"
                          : "bg-primary text-primary-foreground"
                    }`}>
                      {isAI && <p className="text-[9px] font-semibold mb-0.5 opacity-60">AI</p>}
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      {(() => {
                        const sentAt = new Date(m.created_at);
                        const fmt = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
                        const readRaw = (inlineChatRoom as any)?.client_last_read_at;
                        const readAt = readRaw ? new Date(readRaw) : null;
                        const isRead = !isClient && !!readAt && readAt.getTime() >= sentAt.getTime();
                        return (
                          <p className="text-[9px] mt-1 opacity-60 flex items-center gap-1">
                            <span>{isClient ? fmt(sentAt) : `Sent ${fmt(sentAt)}`}</span>
                            {!isClient && !isAI && (
                              <span className="flex items-center gap-0.5">
                                {isRead ? <><CheckCheck className="h-2.5 w-2.5" /> Read {fmt(readAt!)}</> : <><Check className="h-2.5 w-2.5" /> Not read yet</>}
                              </span>
                            )}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="border-t p-3 flex gap-2 flex-shrink-0">
            <Input
              placeholder="Type a message..."
              value={inlineChatReply}
              onChange={(e) => setInlineChatReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendInlineChatReply()}
            />
            <Button onClick={sendInlineChatReply} disabled={!inlineChatReply.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* Inline wallet row with editable balance */
const FIAT_LIST = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD"];
const WalletRow = ({ wallet, onUpdate, cryptoPricesEur }: { wallet: any; onUpdate: (id: string, bal: number) => void; cryptoPricesEur: Record<string, number> }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(wallet.balance));
  const isCrypto = !FIAT_LIST.includes(wallet.currency);
  const eurValue = isCrypto && cryptoPricesEur[wallet.currency] ? Number(wallet.balance) * cryptoPricesEur[wallet.currency] : null;

  return (
    <tr className="border-b last:border-0">
      <td className="p-3 font-medium">{wallet.currency}</td>
      <td className="p-3">
        {editing ? (
          <Input type="number" value={val} onChange={e => setVal(e.target.value)} className="w-32 h-8 text-sm" autoFocus />
        ) : (
          <div>
            <span className="font-semibold">{Number(wallet.balance).toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
            {eurValue !== null && Number(wallet.balance) > 0 && (
              <span className="text-xs text-muted-foreground ml-2">≈ €{eurValue.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            )}
          </div>
        )}
      </td>
      <td className="p-3 text-right">
        {editing ? (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { onUpdate(wallet.id, Number(val)); setEditing(false); }}>Save</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => { setVal(String(wallet.balance)); setEditing(true); }}>Edit</Button>
        )}
      </td>
    </tr>
  );
};

export default AdminUserDetail;
