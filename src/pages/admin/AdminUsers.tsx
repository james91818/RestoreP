import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { playNewLeadSound } from "@/lib/notificationSound";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, MoreHorizontal, Plus, Phone, Shuffle, Eye, Mail, KeyRound, Send, Ban, LogIn, Download, Upload, FileSpreadsheet, CheckSquare, MessageSquare, Loader2, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import StatusChanger, { useLeadStatuses } from "@/components/admin/StatusChanger";
import { useColumnOrder } from "@/hooks/useColumnOrder";
import ReorderableHeader from "@/components/admin/ReorderableHeader";
import LeadsTable from "@/components/admin/LeadsTable";
import TablePagination from "@/components/admin/TablePagination";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useRole, isAgentRole, isAdminOrManager } from "@/hooks/useRole";
import { isCompanyEmail } from "@/lib/isCompanyEmail";
import { checkCrgForProfile, type CrgCheckRow } from "@/hooks/useCrgGuard";
import CrgWarningDialog from "@/components/admin/CrgWarningDialog";

const AdminUsers = () => {
  const { user: authUser } = useAuth();
  const { roleName } = useRole();
  const canAssignAgent = isAdminOrManager(roleName);
  const isStaffRole = roleName === "Admin" || isAdminOrManager(roleName) || isAgentRole(roleName);
  const leadStatuses = useLeadStatuses();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [staffUserIds, setStaffUserIds] = useState<Set<string>>(new Set());
  const [agents, setAgents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [multiStatusFilter, setMultiStatusFilter] = useState<Set<string>>(new Set());
  const [countryFilter, setCountryFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [affiliateFilter, setAffiliateFilter] = useState("all");
  const [funnelFilter, setFunnelFilter] = useState("all");
  const [ipFilter, setIpFilter] = useState("all");
  const [emailTypeFilter, setEmailTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateField, setDateField] = useState<"registered" | "last_note">("registered");
  const [quickRange, setQuickRange] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const emptyNewUser = { email: "", password: "", first_name: "", last_name: "", phone: "", country: "Germany", date_of_birth: "", address: "", city: "", postal_code: "", funnel: "" };
  const [depositOpen, setDepositOpen] = useState(false);
  const [depCrgCheck, setDepCrgCheck] = useState<CrgCheckRow | null>(null);
  const [depositForm, setDepositForm] = useState({ user_id: "", amount: "", currency: "EUR", method: "manual", notes: "" });
  const [notesMap, setNotesMap] = useState<Record<string, { content: string; created_at: string; count: number }>>({});
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwUserId, setPwUserId] = useState("");
  const [pwUserName, setPwUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [shaveDialogOpen, setShaveDialogOpen] = useState(false);
  const [shaveUserId, setShaveUserId] = useState("");
  const [shaveUserName, setShaveUserName] = useState("");
  const [shaveLoading, setShaveLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkStatusTarget, setBulkStatusTarget] = useState("");
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkEmailSending, setBulkEmailSending] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [bulkEmailConfirm, setBulkEmailConfirm] = useState<string | null>(null);
  const [bulkEmailFrom, setBulkEmailFrom] = useState<"agent" | "support" | "noreply">("agent");
  const [feedbackPreviewOpen, setFeedbackPreviewOpen] = useState(false);
  const [feedbackGenerating, setFeedbackGenerating] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackPreviews, setFeedbackPreviews] = useState<{ affiliate: string; text: string; error?: string; hasTelegram: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    const [{ data: profiles }, { data: urData }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role_id, roles(name)"),
    ]);
    const staffIds = new Set((urData ?? []).map((ur: any) => ur.user_id));
    setStaffUserIds(staffIds);

    const agentProfiles = (profiles ?? []).filter(p => staffIds.has(p.id));
    setAgents(agentProfiles);

    const clientProfiles = (profiles ?? []).filter(p => !staffIds.has(p.id) && p.is_lead !== false);
    setUsers(clientProfiles);

    // Render the table immediately — notes & IPs fill in asynchronously.
    if (!silent) setLoading(false);

    if (clientProfiles.length > 0) {
      const ids = clientProfiles.map(p => p.id);

      // Notes (lightweight) load in background
      supabase
        .from("admin_notes")
        .select("user_id, content, created_at")
        .in("user_id", ids)
        .order("created_at", { ascending: false })
        .then(({ data: notes }) => {
          const map: Record<string, { content: string; created_at: string; count: number }> = {};
          (notes ?? []).forEach((n: any) => {
            if (!map[n.user_id]) {
              map[n.user_id] = { content: n.content, created_at: n.created_at, count: 0 };
            }
            map[n.user_id].count += 1;
          });
          setNotesMap(map);
        });

      // IPs (heavier) load in background
      supabase
        .from("welcome_page_visits")
        .select("user_id, ip_address, landed_at")
        .in("user_id", ids)
        .not("ip_address", "is", null)
        .order("landed_at", { ascending: false })
        .limit(5000)
        .then(({ data: ipLogs }) => {
          const ipMap: Record<string, string> = {};
          (ipLogs ?? []).forEach((l: any) => {
            if (l.user_id && l.ip_address && !ipMap[l.user_id]) ipMap[l.user_id] = l.ip_address;
          });
          setUsers((curr) => curr.map((u) => ({ ...u, last_ip: ipMap[u.id] ?? u.last_ip ?? null })));
        });
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Realtime: auto-refresh when new leads arrive or profiles change
  // IMPORTANT: avoid full refetches on noisy UPDATE events (heartbeats, page tracking).
  // Patch rows in-place instead, and only refetch on INSERT (new leads).
  useEffect(() => {
    const isAgent = isAgentRole(roleName);

    // Fields whose changes should NOT cause any visible refresh (pure noise)
    const NOISE_FIELDS = new Set([
      "last_seen_at",
      "current_page",
      "current_page_since",
      "updated_at",
      "being_called",
      "force_chat_open",
    ]);

    const channel = supabase
      .channel('admin-leads-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          const newLead = payload.new as any;
          if (isAgent) playNewLeadSound();
          toast.info(`🔔 New Lead Arrived!`, {
            description: `${newLead.full_name || newLead.email || 'Unknown'}${newLead.country ? ` — ${newLead.country}` : ''}${newLead.affiliate ? ` (${newLead.affiliate})` : ''}`,
            duration: 10000,
          });
          // Silent background refresh — keeps the existing table rendered
          // (no loading flicker) while merging the newly-arrived lead.
          fetchData({ silent: true });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = (payload.old ?? {}) as any;
          if (!newRow?.id) return;

          // Determine which fields actually changed
          const changedKeys = Object.keys(newRow).filter(
            (k) => JSON.stringify(newRow[k]) !== JSON.stringify(oldRow[k])
          );
          // If every changed field is noise, ignore completely
          if (changedKeys.length > 0 && changedKeys.every((k) => NOISE_FIELDS.has(k))) {
            return;
          }

          // Patch the matching row in-place — no network round-trip
          setUsers((curr) => {
            const idx = curr.findIndex((u) => u.id === newRow.id);
            if (idx === -1) return curr;
            const next = curr.slice();
            next[idx] = { ...next[idx], ...newRow };
            return next;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roleName]);

  useEffect(() => {
    if (users.length === 0) return;

    const refreshOnlineStatus = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, last_seen_at")
        .in("id", users.map((u) => u.id));
      if (!data) return;

      const lastSeenMap = new Map(data.map((p: any) => [p.id, p.last_seen_at]));
      setUsers((current) => {
        let changed = false;
        const next = current.map((user) => {
          const ls = lastSeenMap.get(user.id) ?? user.last_seen_at ?? null;
          if (ls === user.last_seen_at) return user;
          changed = true;
          return { ...user, last_seen_at: ls };
        });
        return changed ? next : current;
      });
    };

    refreshOnlineStatus();
    const interval = setInterval(() => {
      if (!document.hidden) {
        refreshOnlineStatus();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [users.length]);

  const assignAgent = async (userId: string, agentId: string | null) => {
    await supabase.from("profiles").update({ assigned_agent: agentId }).eq("id", userId);
    setUsers((curr) => curr.map((u) => (u.id === userId ? { ...u, assigned_agent: agentId } : u)));
    toast.success("Agent assigned");
  };

  const updateStatus = async (userId: string, status: string) => {
    await supabase.from("profiles").update({ status }).eq("id", userId);
    setUsers((curr) => curr.map((u) => (u.id === userId ? { ...u, status } : u)));
    toast.success(`User status updated to ${status}`);
  };

  const openPasswordDialog = (userId: string, name: string) => {
    setPwUserId(userId);
    setPwUserName(name);
    setNewPassword("");
    setPwDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPwLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "change_password", user_id: pwUserId, password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Password changed successfully");
      setPwDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  const handleSendResetLink = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "send_reset_link", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Password reset link sent to ${email}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    }
  };

  const handleLoginAsClient = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "login_as_client", user_id: userId, site_url: window.location.origin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Opening client session in new tab");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to login as client");
    }
  };

  const openShaveDialog = (userId: string, name: string) => {
    setShaveUserId(userId);
    setShaveUserName(name);
    setShaveDialogOpen(true);
  };

  const handleShaveLead = async () => {
    setShaveLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "shave_lead", user_id: shaveUserId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Lead shaved successfully. New account created. Temp password: ${data.temp_password}`, { duration: 15000 });
      setShaveDialogOpen(false);
      setTimeout(fetchData, 1000);
    } catch (err: any) {
      toast.error(err.message || "Failed to shave lead");
    } finally {
      setShaveLoading(false);
    }
  };

  const handleCreateUser = async (form: typeof emptyNewUser) => {
    const fullName = `${form.first_name} ${form.last_name}`.trim();
    if (!form.email || !form.password || !fullName) {
      toast.error("Email, password, and name are required");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: {
          action: "create_client",
          email: form.email,
          password: form.password,
          full_name: fullName,
          phone: form.phone,
          country: form.country,
          funnel: form.funnel || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // The function returns reused:true when an account with this email
      // already exists — nothing new was created, so say so instead of
      // pretending the lead was added.
      if (data?.reused) {
        toast.error(`An account with ${form.email} already exists — no new lead was created.`, { duration: 8000 });
        return;
      }

      toast.success("Lead created successfully");
      setCreateOpen(false);
      // Clear filters/search so the brand new lead is never hidden by them
      setSearch(""); setStatusFilter("all"); setCountryFilter("all");
      setAgentFilter("all"); setAffiliateFilter("all"); setFunnelFilter("all");
      setIpFilter("all"); setEmailTypeFilter("all"); setMultiStatusFilter(new Set());
      setDateFrom(""); setDateTo(""); setQuickRange("");
      setPage(1);
      await fetchData({ silent: true });
      // Second pass in case the profile row lands right after the first read
      setTimeout(() => fetchData({ silent: true }), 1500);

    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    }

  };

  const submitManualDeposit = async (skipCrgCheck = false) => {
    if (!depositForm.user_id || !depositForm.amount || Number(depositForm.amount) <= 0) {
      toast.error("Select a user and enter a valid amount");
      return;
    }
    const amount = Number(depositForm.amount);

    if (!skipCrgCheck && amount >= 1) {
      const { data: prof } = await supabase
        .from("profiles").select("first_deposit_at").eq("id", depositForm.user_id).maybeSingle();
      if (!prof?.first_deposit_at) {
        const check = await checkCrgForProfile(depositForm.user_id);
        if (check?.would_exceed) {
          setDepCrgCheck(check);
          return;
        }
      }
    }
    setDepCrgCheck(null);

    const { error: depError } = await supabase.from("deposits").insert({
      user_id: depositForm.user_id,
      amount,
      currency: depositForm.currency,
      method: depositForm.method,
      status: "approved",
      admin_notes: depositForm.notes || "Manual deposit by admin",
      processed_by: authUser?.id,
    });

    if (depError) {
      toast.error("Failed to create deposit: " + depError.message);
      return;
    }

    // Wallet crediting is handled automatically by the credit_wallet_on_deposit_approval trigger
    // No manual wallet update needed here

    if (amount >= 1) {
      await supabase.from("profiles").update({ is_lead: false }).eq("id", depositForm.user_id);
    }

    toast.success("Manual deposit created and credited");
    setDepositOpen(false);
    setDepositForm({ user_id: "", amount: "", currency: "EUR", method: "manual", notes: "" });
    fetchData();
  };

  const uniqueCountries = [...new Set(users.map(u => u.country).filter(Boolean))].sort();
  const uniqueAffiliates = [...new Set(users.map(u => u.affiliate).filter(Boolean))].sort();
  const uniqueFunnels = [...new Set(users.map(u => u.funnel).filter(Boolean))].sort();

  // Accent-insensitive lowercase for name matching ("Müller" ↔ "muller")
  const norm = (s: string) =>
    (s ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const searchTerms = search.trim()
    ? search.split("\n").map(s => norm(s)).filter(Boolean)
    : [];

  // Strip non-digits for phone matching (so "+49 152" matches "491521526...")
  const normalizePhone = (s: string) => s.replace(/\D+/g, "");

  const filtered = users.filter((u) => {
    const phoneDigits = normalizePhone(`${u.phone ?? ""} ${u.secondary_phone ?? ""}`);
    const nameN = norm(u.full_name);
    const emailN = norm(u.email);
    const matchesSearch = searchTerms.length === 0 || searchTerms.some(term => {
      const termDigits = normalizePhone(term);
      return (
        nameN.includes(term) ||
        emailN.includes(term) ||
        norm(u.phone).includes(term) ||
        norm(u.secondary_phone).includes(term) ||
        (termDigits.length >= 3 && phoneDigits.includes(termDigits))
      );
    });
    const invalidStatusNames = leadStatuses.filter((s: any) => (s.color || "").includes("destructive")).map((s: any) => s.name);
    const potentialStatusNames = leadStatuses.filter((s: any) => (s.color || "").includes("yellow")).map((s: any) => s.name);
    const matchesStatus = (() => {
      if (multiStatusFilter.size === 0) return true;
      if (multiStatusFilter.has("__shaved__") && u.shaved_from) return true;
      if (multiStatusFilter.has("__invalids__") && invalidStatusNames.includes(u.status)) return true;
      if (multiStatusFilter.has("__potential__") && potentialStatusNames.includes(u.status)) return true;
      return multiStatusFilter.has(u.status);
    })();
    const matchesMultiStatus = true;
    const matchesCountry = countryFilter === "all" || u.country === countryFilter;
    const matchesAgent = agentFilter === "all" || (agentFilter === "none" ? !u.assigned_agent : u.assigned_agent === agentFilter);
    const matchesAffiliate = affiliateFilter === "all" || (affiliateFilter === "none" ? !u.affiliate : u.affiliate === affiliateFilter);
    const matchesFunnel = funnelFilter === "all" || (funnelFilter === "none" ? !u.funnel : u.funnel === funnelFilter);
    const matchesIp = ipFilter === "all" || (ipFilter === "with" ? !!u.last_ip : !u.last_ip);
    const matchesEmailType = emailTypeFilter === "all" || (emailTypeFilter === "company" ? isCompanyEmail(u.email) : !isCompanyEmail(u.email));
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const sourceIso = dateField === "last_note"
        ? notesMap[u.id]?.created_at
        : u.created_at;
      if (!sourceIso) {
        matchesDate = false;
      } else {
        const t = new Date(sourceIso).getTime();
        // Parse "YYYY-MM-DD" as local-time day boundaries for consistency
        const parseLocalDay = (s: string, endOfDay: boolean) => {
          const [y, m, d] = s.split("-").map(Number);
          return endOfDay
            ? new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999).getTime()
            : new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0).getTime();
        };
        if (dateFrom && t < parseLocalDay(dateFrom, false)) matchesDate = false;
        if (dateTo && t > parseLocalDay(dateTo, true)) matchesDate = false;
      }
    }
    return matchesSearch && matchesStatus && matchesMultiStatus && matchesCountry && matchesAgent && matchesAffiliate && matchesFunnel && matchesIp && matchesEmailType && matchesDate;
  });

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, multiStatusFilter, countryFilter, agentFilter, affiliateFilter, funnelFilter, ipFilter, emailTypeFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── Export leads to CSV ───
  const handleExportCSV = () => {
    const rows = selectedForBulk.size > 0 ? filtered.filter(u => selectedForBulk.has(u.id)) : filtered;
    if (rows.length === 0) { toast.error("No leads to export"); return; }
    const headers = ["ID","Display ID","Full Name","Email","Phone","Country","Status","Affiliate","Funnel","Created At"];
    const csvRows = [headers.join(",")];
    rows.forEach(u => {
      csvRows.push([u.id, u.display_id, `"${(u.full_name||"").replace(/"/g,'""')}"`, u.email, u.phone||"", u.country||"", u.status||"", u.affiliate||"", u.funnel||"", u.created_at].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} leads`);
  };

  // ─── Import CSV ───
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error("CSV must have a header and at least one row"); return; }
      const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g,""));
      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g,""));
        const obj: any = {};
        header.forEach((h, idx) => { obj[h] = vals[idx] || ""; });
        if (obj.email) rows.push(obj);
      }
      setImportPreview(rows);
      setImportOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportLeads = async () => {
    if (importPreview.length === 0) return;
    setImportLoading(true);
    let success = 0, failed = 0;
    for (const row of importPreview) {
      try {
        const { data, error } = await supabase.functions.invoke("admin-user-actions", {
          body: {
            action: "create_client",
            email: row.email,
            password: row.password || `Import${Math.floor(1000+Math.random()*9000)}!x`,
            full_name: row.full_name || row.name || `${row.first_name||""} ${row.last_name||""}`.trim(),
            phone: row.phone || null,
            country: row.country || null,
            funnel: row.funnel || null,
          },
        });
        if (error || data?.error) { failed++; } else { success++; }
      } catch { failed++; }
    }
    toast.success(`Imported ${success} leads${failed > 0 ? `, ${failed} failed` : ""}`);
    setImportOpen(false);
    setImportPreview([]);
    setImportLoading(false);
    setTimeout(fetchData, 1500);
  };

  // ─── Bulk actions ───
  const toggleBulkSelect = (id: string) => {
    setSelectedForBulk(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = paginated.map(u => u.id);
    const allVisibleSelected = visibleIds.every(id => selectedForBulk.has(id));
    if (allVisibleSelected) {
      const next = new Set(selectedForBulk);
      visibleIds.forEach(id => next.delete(id));
      setSelectedForBulk(next);
    } else {
      const next = new Set(selectedForBulk);
      visibleIds.forEach(id => next.add(id));
      setSelectedForBulk(next);
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatusTarget || selectedForBulk.size === 0) return;
    const ids = [...selectedForBulk];
    for (const id of ids) {
      await supabase.from("profiles").update({ status: bulkStatusTarget }).eq("id", id);
    }
    toast.success(`Updated ${ids.length} leads to "${bulkStatusTarget}"`);
    setSelectedForBulk(new Set());
    setBulkAction(null);
    fetchData();
  };

  const handleBulkDelete = async () => {
    if (selectedForBulk.size === 0) return;
    const ids = [...selectedForBulk];
    let deleted = 0;
    let lastError = "";
    for (const id of ids) {
      try {
        const { data, error } = await supabase.functions.invoke("admin-user-actions", {
          body: { action: "delete_user", user_id: id },
        });
        if (error) { lastError = error.message; continue; }
        if (data?.error) { lastError = data.error; continue; }
        deleted++;
      } catch (e: any) { lastError = e.message; }
    }
    if (deleted > 0) toast.success(`Deleted ${deleted} lead(s)`);
    if (lastError && deleted < ids.length) toast.error(`Some deletes failed: ${lastError}`);
    setSelectedForBulk(new Set());
    setBulkAction(null);
    fetchData();
  };

  const handleSendAffiliateFeedback = async () => {
    if (selectedForBulk.size === 0) return;
    const ids = [...selectedForBulk];
    setFeedbackPreviews([]);
    setFeedbackPreviewOpen(true);
    setFeedbackGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("affiliate-feedback", {
        body: { lead_ids: ids, mode: "preview" },
      });
      if (error) { toast.error("Failed: " + error.message); setFeedbackPreviewOpen(false); return; }
      const previews = data?.previews ?? [];
      if (previews.length === 0) { toast.error("No previews generated"); setFeedbackPreviewOpen(false); return; }
      setFeedbackPreviews(previews);
    } catch (e: any) {
      toast.error("Error: " + e.message);
      setFeedbackPreviewOpen(false);
    } finally {
      setFeedbackGenerating(false);
    }
  };

  const handleConfirmSendFeedback = async () => {
    const sendable = feedbackPreviews.filter((p) => p.hasTelegram && p.text.trim().length > 0);
    if (sendable.length === 0) { toast.error("Nothing to send"); return; }
    setFeedbackSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("affiliate-feedback", {
        body: { mode: "send_edited", messages: sendable.map((p) => ({ affiliate: p.affiliate, text: p.text })) },
      });
      if (error) { toast.error("Failed: " + error.message); return; }
      const results = data?.results ?? [];
      const sent = results.filter((r: any) => r.sent);
      const failed = results.filter((r: any) => !r.sent);
      if (sent.length > 0) toast.success(`Feedback sent to ${sent.map((r: any) => r.affiliate).join(", ")}`);
      for (const f of failed) toast.error(`${f.affiliate}: ${f.error}`);
      if (failed.length === 0) setFeedbackPreviewOpen(false);
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleBulkQuickEmail = async (templateName: string) => {
    const selectedUsers = users.filter(u => selectedForBulk.has(u.id) && u.email);
    if (selectedUsers.length === 0) { toast.error("No selected leads with email addresses"); return; }
    setBulkEmailSending(true);
    setBulkEmailProgress({ sent: 0, failed: 0, total: selectedUsers.length });
    let sent = 0, failed = 0;
    for (const u of selectedUsers) {
      try {
        // Find the agent name for this lead
        const assignedAgent = agents.find(a => a.id === u.assigned_agent);
        const agentNameStr = assignedAgent?.full_name || assignedAgent?.email || authUser?.email || "";
        const agentEmailStr = assignedAgent?.email || authUser?.email || "";

        // Resolve sender based on user choice
        let fromAddress: string | undefined;
        let fromName: string | undefined;
        if (bulkEmailFrom === "agent") {
          fromAddress = agentEmailStr || undefined;
          fromName = agentNameStr || undefined;
        } else if (bulkEmailFrom === "support") {
          fromAddress = "support@crypto-borse.com";
        } else {
          fromAddress = "noreply@crypto-borse.com";
        }

        const { error } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName,
            recipientEmail: u.email,
            idempotencyKey: `bulk-${templateName}-${u.id}-${Date.now()}`,
            fromAddress,
            fromName,
            templateData: {
              clientName: u.full_name || undefined,
              agentName: agentNameStr || undefined,
              agentEmail: agentEmailStr || undefined,
              funnelName: u.funnel || undefined,
            },
          },
        });
        if (error) throw error;
        sent++;
      } catch {
        failed++;
      }
      setBulkEmailProgress({ sent, failed, total: selectedUsers.length });
    }
    setBulkEmailSending(false);
    setBulkEmailOpen(false);
    if (sent > 0) toast.success(`Sent ${sent} email(s) successfully`);
    if (failed > 0) toast.error(`${failed} email(s) failed to send`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Leads</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length === users.length
              ? `${users.length} total leads`
              : `${filtered.length} of ${users.length} leads`}
          </p>
        </div>
        <div className="flex gap-2">
          {roleName === "Admin" && (
            <>
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Import / Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" /> Export {selectedForBulk.size > 0 ? `${selectedForBulk.size} Selected` : "All"} as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" /> Import from CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Create User
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {isStaffRole && selectedForBulk.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedForBulk.size} selected</span>
          <div className="flex-1" />
          <Select value={bulkStatusTarget} onValueChange={setBulkStatusTarget}>
            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Change status..." /></SelectTrigger>
            <SelectContent>
              {leadStatuses.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" disabled={!bulkStatusTarget} onClick={handleBulkStatusChange}>Apply Status</Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          <Button size="sm" variant="outline" onClick={() => setBulkEmailOpen(true)} className="text-violet-500 border-violet-500/30 hover:bg-violet-500/10"><Mail className="h-3.5 w-3.5 mr-1" /> Quick Email</Button>
          <Button size="sm" variant="outline" onClick={handleSendAffiliateFeedback} className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Send Affiliate Feedback</Button>
          {roleName === "Admin" && <Button size="sm" variant="destructive" onClick={() => setBulkAction("delete")}>Delete</Button>}
          <Button size="sm" variant="ghost" onClick={() => setSelectedForBulk(new Set())}>Clear</Button>
        </div>
      )}

      {(() => {
        const activeFilters = [
          false,
          multiStatusFilter.size > 0,
          countryFilter !== "all",
          agentFilter !== "all",
          affiliateFilter !== "all",
          funnelFilter !== "all",
          ipFilter !== "all",
          emailTypeFilter !== "all",
          !!dateFrom || !!dateTo,
          !!search,
        ].filter(Boolean).length;
        const clearAll = () => {
          setSearch(""); setStatusFilter("all"); setCountryFilter("all");
          setAgentFilter("all"); setAffiliateFilter("all"); setFunnelFilter("all");
          setIpFilter("all"); setEmailTypeFilter("all"); setMultiStatusFilter(new Set());
          setDateFrom(""); setDateTo(""); setQuickRange("");
        };
        return (
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-3">
              {/* Row 1: Search + active filters */}
              <div className="flex items-start gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Textarea
                    placeholder={"Search by name, email or phone — one per line for bulk search"}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 min-h-[40px] max-h-[120px] resize-y text-sm py-2"
                    rows={search.includes("\n") ? Math.min(search.split("\n").length, 5) : 1}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  {activeFilters > 0 && (
                    <Badge variant="secondary" className="h-7 px-2.5">
                      {activeFilters} active
                    </Badge>
                  )}
                  {activeFilters > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAll} className="h-9">
                      Clear all
                    </Button>
                  )}
                </div>
              </div>

              {/* Row 2: Date range */}
              <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-border/50">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">
                  <CalendarIcon className="h-3.5 w-3.5" /> Date
                </div>
                <Select value={dateField} onValueChange={(v) => setDateField(v as "registered" | "last_note")}>
                  <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered">Registered</SelectItem>
                    <SelectItem value="last_note">Last note</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={quickRange}
                  onValueChange={(v) => {
                    setQuickRange(v);
                    const today = new Date();
                    const fmt = (d: Date) => format(d, "yyyy-MM-dd");
                    const startOfWeek = (d: Date) => {
                      const x = new Date(d);
                      const day = (x.getDay() + 6) % 7;
                      x.setDate(x.getDate() - day);
                      return x;
                    };
                    if (v === "today") { setDateFrom(fmt(today)); setDateTo(fmt(today)); }
                    else if (v === "yesterday") {
                      const y = new Date(today); y.setDate(y.getDate() - 1);
                      setDateFrom(fmt(y)); setDateTo(fmt(y));
                    }
                    else if (v === "this_week") { const s = startOfWeek(today); setDateFrom(fmt(s)); setDateTo(fmt(today)); }
                    else if (v === "last_week") {
                      const s = startOfWeek(today); const lwStart = new Date(s); lwStart.setDate(lwStart.getDate() - 7);
                      const lwEnd = new Date(s); lwEnd.setDate(lwEnd.getDate() - 1);
                      setDateFrom(fmt(lwStart)); setDateTo(fmt(lwEnd));
                    }
                    else if (v === "this_month") {
                      const s = new Date(today.getFullYear(), today.getMonth(), 1);
                      setDateFrom(fmt(s)); setDateTo(fmt(today));
                    }
                  }}
                >
                  <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Quick range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This week</SelectItem>
                    <SelectItem value="last_week">Last week</SelectItem>
                    <SelectItem value="this_month">This month</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-[160px] h-9 justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(new Date(dateFrom), "dd MMM yyyy") : <span>From</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom ? new Date(dateFrom) : undefined} onSelect={(d) => setDateFrom(d ? format(d, "yyyy-MM-dd") : "")} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-xs">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-[160px] h-9 justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(new Date(dateTo), "dd MMM yyyy") : <span>To</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo ? new Date(dateTo) : undefined} onSelect={(d) => setDateTo(d ? format(d, "yyyy-MM-dd") : "")} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                {dateFrom && dateTo !== dateFrom && (
                  <Button variant="ghost" size="sm" onClick={() => setDateTo(dateFrom)} className="h-9 text-xs" title="Filter a single day">
                    Same date
                  </Button>
                )}
                {(dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setQuickRange(""); }} className="h-9 text-xs">
                    Reset dates
                  </Button>
                )}
              </div>

              {/* Row 3: Dropdown filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">
                  Filters
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("h-9 w-[200px] justify-between", multiStatusFilter.size > 0 && "border-primary/50 bg-primary/5")}
                    >
                      <span className="truncate text-xs">
                        {multiStatusFilter.size === 0
                          ? "All Status"
                          : `${multiStatusFilter.size} status selected`}
                      </span>
                      <CheckSquare className="h-4 w-4 opacity-60 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-medium text-muted-foreground">Filter by status</span>
                      {multiStatusFilter.size > 0 && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setMultiStatusFilter(new Set())}>
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-1">
                      {[
                        { key: "__shaved__", label: "🪒 Shaved" },
                        { key: "__invalids__", label: "🔴 Invalids (all red)" },
                        { key: "__potential__", label: "🟡 Potential (all yellow)" },
                      ].map(s => {
                        const checked = multiStatusFilter.has(s.key);
                        return (
                          <label
                            key={s.key}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                setMultiStatusFilter(prev => {
                                  const next = new Set(prev);
                                  if (v) next.add(s.key); else next.delete(s.key);
                                  return next;
                                });
                              }}
                            />
                            <span>{s.label}</span>
                          </label>
                        );
                      })}
                      <div className="my-1 h-px bg-border" />
                      {leadStatuses.map(s => {
                        const checked = multiStatusFilter.has(s.name);
                        return (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                setMultiStatusFilter(prev => {
                                  const next = new Set(prev);
                                  if (v) next.add(s.name); else next.delete(s.name);
                                  return next;
                                });
                              }}
                            />
                            <span>{s.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className={cn("w-[140px] h-9", countryFilter !== "all" && "border-primary/50 bg-primary/5")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className={cn("w-[150px] h-9", agentFilter !== "all" && "border-primary/50 bg-primary/5")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={affiliateFilter} onValueChange={setAffiliateFilter}>
                  <SelectTrigger className={cn("w-[150px] h-9", affiliateFilter !== "all" && "border-primary/50 bg-primary/5")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Affiliates</SelectItem>
                    <SelectItem value="none">No Affiliate</SelectItem>
                    {uniqueAffiliates.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={funnelFilter} onValueChange={setFunnelFilter}>
                  <SelectTrigger className={cn("w-[140px] h-9", funnelFilter !== "all" && "border-primary/50 bg-primary/5")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funnels</SelectItem>
                    <SelectItem value="none">No Funnel</SelectItem>
                    {uniqueFunnels.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={ipFilter} onValueChange={setIpFilter}>
                  <SelectTrigger className={cn("w-[150px] h-9", ipFilter !== "all" && "border-primary/50 bg-primary/5")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All IPs</SelectItem>
                    <SelectItem value="with">With IP Address</SelectItem>
                    <SelectItem value="without">Without IP Address</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={emailTypeFilter} onValueChange={setEmailTypeFilter}>
                  <SelectTrigger className={cn("w-[170px] h-9", emailTypeFilter !== "all" && "border-primary/50 bg-primary/5")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Emails</SelectItem>
                    <SelectItem value="company">★ Company Email Only</SelectItem>
                    <SelectItem value="personal">Personal Email Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <LeadsTable
        loading={loading}
        filtered={paginated}
        notesMap={notesMap}
        agents={agents}
        navigate={navigate}
        assignAgent={assignAgent}
        fetchData={() => fetchData({ silent: true })}
        openPasswordDialog={openPasswordDialog}
        handleSendResetLink={handleSendResetLink}
        handleLoginAsClient={handleLoginAsClient}
        updateStatus={updateStatus}
        handleShaveLead={openShaveDialog}
        handleForceRedirect={async (userId, name) => {
          const { error } = await supabase.from("profiles").update({ force_home_redirect: true } as any).eq("id", userId);
          if (error) { toast.error("Failed to force redirect"); return; }
          toast.success(`${name || "Client"} will be redirected to Home`);
        }}
        canAssignAgent={canAssignAgent}
        selectedForBulk={isStaffRole ? selectedForBulk : undefined}
        toggleBulkSelect={isStaffRole ? toggleBulkSelect : undefined}
        toggleSelectAll={isStaffRole ? toggleSelectAll : undefined}
      />

      <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} labelSingular="lead" labelPlural="leads" />

      {/* Create User Dialog (isolated component to prevent input focus loss from realtime updates) */}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={emptyNewUser}
        onSubmit={handleCreateUser}
      />

      {/* Manual Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>User</Label>
              <Select value={depositForm.user_id} onValueChange={(v) => setDepositForm({ ...depositForm, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} {u.full_name ? `(${u.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input type="number" value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} placeholder="1000" />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select value={depositForm.currency} onValueChange={(v) => setDepositForm({ ...depositForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["EUR", "USD", "GBP", "CHF", "AUD", "CAD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Method</Label>
              <Select value={depositForm.method} onValueChange={(v) => setDepositForm({ ...depositForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="bank_wire">Bank Wire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea value={depositForm.notes} onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })} placeholder="Reason for manual deposit..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
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

      {/* Change Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password — {pwUserName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={pwLoading}>
              {pwLoading ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shave Lead Confirmation Dialog */}
      <Dialog open={shaveDialogOpen} onOpenChange={setShaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shave Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Are you sure you want to shave <strong>{shaveUserName}</strong>?</p>
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
            <Button variant="outline" onClick={() => setShaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleShaveLead} disabled={shaveLoading} variant="destructive">
              {shaveLoading ? "Shaving..." : "Shave Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Leads from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              CSV should have headers: <code className="text-xs bg-muted px-1 rounded">email, full_name, phone, country, funnel, password</code> (password is optional).
            </p>
            <div className="max-h-60 overflow-auto rounded border">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50 border-b">
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Country</th>
                </tr></thead>
                <tbody>
                  {importPreview.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2">{r.email}</td>
                      <td className="p-2">{r.full_name || r.name || `${r.first_name||""} ${r.last_name||""}`.trim()}</td>
                      <td className="p-2">{r.country || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm font-medium">{importPreview.length} leads ready to import</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportPreview([]); }}>Cancel</Button>
            <Button onClick={handleImportLeads} disabled={importLoading}>
              {importLoading ? "Importing..." : `Import ${importPreview.length} Leads`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <Dialog open={bulkAction === "delete"} onOpenChange={() => setBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedForBulk.size} Leads</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete <strong>{selectedForBulk.size}</strong> selected leads? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Delete All Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Quick Email Dialog */}
      <Dialog open={bulkEmailOpen} onOpenChange={(open) => { if (!bulkEmailSending) setBulkEmailOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-violet-400" />
              Bulk Quick Email — {selectedForBulk.size} leads
            </DialogTitle>
          </DialogHeader>
          {bulkEmailSending ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="h-12 w-12 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              <p className="text-sm font-medium">Sending emails... {bulkEmailProgress.sent + bulkEmailProgress.failed} / {bulkEmailProgress.total}</p>
              <p className="text-xs text-muted-foreground">{bulkEmailProgress.sent} sent · {bulkEmailProgress.failed} failed</p>
            </div>
          ) : bulkEmailConfirm ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                You are about to send <span className="font-semibold text-foreground">{bulkEmailConfirm === "no-answer-followup" ? "NA Email" : bulkEmailConfirm}</span> to <span className="font-semibold text-foreground">{selectedForBulk.size}</span> selected leads. Are you sure?
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" size="sm" onClick={() => setBulkEmailConfirm(null)}>Cancel</Button>
                <Button size="sm" onClick={() => { const t = bulkEmailConfirm; setBulkEmailConfirm(null); handleBulkQuickEmail(t); }}>
                  Confirm & Send
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From (sender)</label>
                <Select value={bulkEmailFrom} onValueChange={(v: any) => setBulkEmailFrom(v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Assigned Agent (per lead)</SelectItem>
                    <SelectItem value="support">Support — support@crypto-borse.com</SelectItem>
                    <SelectItem value="noreply">No-Reply — noreply@crypto-borse.com</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {bulkEmailFrom === "agent"
                    ? "Each email is sent from the lead's assigned agent (falls back to you if unassigned)."
                    : "All emails will be sent from this address."}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Select an email template to send to all {selectedForBulk.size} selected leads.</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border-border/60"
                  onClick={() => setBulkEmailConfirm("no-answer-followup")}
                >
                  <Mail className="h-5 w-5 text-violet-400" />
                  NA Email
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border-border/60 opacity-50" disabled>
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  Coming Soon
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Affiliate Feedback Preview Dialog */}
      <Dialog open={feedbackPreviewOpen} onOpenChange={(open) => { if (!feedbackSending && !feedbackGenerating) setFeedbackPreviewOpen(open); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              Affiliate Feedback Preview
            </DialogTitle>
          </DialogHeader>
          {feedbackGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="h-12 w-12 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Generating feedback for {selectedForBulk.size} leads…</p>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              <p className="text-sm text-muted-foreground">
                Review and edit each message below before sending. The text will be sent to the affiliate's Telegram group exactly as shown.
              </p>
              {feedbackPreviews.map((p, idx) => (
                <div key={p.affiliate} className="border border-border/60 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{p.affiliate}</div>
                    {!p.hasTelegram && (
                      <span className="text-xs text-destructive">No Telegram group configured</span>
                    )}
                  </div>
                  {p.error && !p.text ? (
                    <p className="text-xs text-destructive">{p.error}</p>
                  ) : (
                    <Textarea
                      value={p.text}
                      onChange={(e) => {
                        const next = [...feedbackPreviews];
                        next[idx] = { ...p, text: e.target.value };
                        setFeedbackPreviews(next);
                      }}
                      rows={Math.min(20, Math.max(6, p.text.split("\n").length))}
                      className="font-mono text-xs"
                      disabled={feedbackSending}
                    />
                  )}
                </div>
              ))}
              <DialogFooter>
                <Button variant="outline" onClick={() => setFeedbackPreviewOpen(false)} disabled={feedbackSending}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmSendFeedback} disabled={feedbackSending}>
                  {feedbackSending ? "Sending…" : "Approve & Send to Affiliates"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;