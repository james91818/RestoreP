import { useEffect, useState } from "react";
import { fetchCryptoPricesEur } from "@/lib/fetchCryptoPrices";
import { supabase } from "@/lib/supabase";
import { useRole, isAdminOrManager, isAgentRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, DollarSign, CheckSquare, Download, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import DepositorsTable from "@/components/admin/DepositorsTable";
import TablePagination from "@/components/admin/TablePagination";
import { useLeadStatuses } from "@/components/admin/StatusChanger";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";



const FIAT_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD"];

const AdminDepositors = () => {
  const navigate = useNavigate();
  const { roleName } = useRole();
  const { user: authUser } = useAuth();
  const canAssignAgent = isAdminOrManager(roleName);
  const isStaffRole = roleName === "Admin" || isAdminOrManager(roleName) || isAgentRole(roleName);
  const [depositors, setDepositors] = useState<any[]>([]);

  const [agents, setAgents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [affiliateFilter, setAffiliateFilter] = useState("all");
  const [funnelFilter, setFunnelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const leadStatuses = useLeadStatuses();
  const [notesMap, setNotesMap] = useState<Record<string, { content: string; created_at: string; count: number }>>({});
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwUserId, setPwUserId] = useState("");
  const [pwUserName, setPwUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [cryptoPricesEur, setCryptoPricesEur] = useState<Record<string, number>>({});
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkStatusTarget, setBulkStatusTarget] = useState("");
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkEmailSending, setBulkEmailSending] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [bulkEmailConfirm, setBulkEmailConfirm] = useState<string | null>(null);
  const [bulkEmailFrom, setBulkEmailFrom] = useState<"agent" | "support" | "noreply">("agent");


  // Fetch live crypto prices
  useEffect(() => {
    fetchCryptoPricesEur().then(setCryptoPricesEur).catch(() => {});
  }, []);

  const fetchData = async () => {
    const [{ data: profiles }, { data: urData }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id"),
    ]);

    const staffIds = new Set((urData ?? []).map((ur: any) => ur.user_id));
    const agentProfiles = (profiles ?? []).filter(p => staffIds.has(p.id));
    setAgents(agentProfiles);

    const depositorProfiles = (profiles ?? []).filter(p => !staffIds.has(p.id) && p.is_lead === false);

    if (!depositorProfiles || depositorProfiles.length === 0) {
      setDepositors([]);
      setLoading(false);
      return;
    }

    const userIds = depositorProfiles.map(p => p.id);

    const [{ data: deposits }, { data: wallets }, { data: notes }] = await Promise.all([
      supabase.from("deposits").select("user_id, amount, status, currency").eq("status", "approved").in("user_id", userIds),
      supabase.from("wallets").select("user_id, balance, currency").in("user_id", userIds),
      supabase.from("admin_notes").select("user_id, content, created_at").in("user_id", userIds).order("created_at", { ascending: false }),
    ]);

    const depositTotals: Record<string, number> = {};
    const depositCounts: Record<string, number> = {};
    (deposits ?? []).forEach((d: any) => {
      const amt = Number(d.amount);
      let eurValue = amt;
      if (!FIAT_CURRENCIES.includes(d.currency)) {
        const price = cryptoPricesEur[d.currency];
        eurValue = price ? amt * price : amt;
      }
      depositTotals[d.user_id] = (depositTotals[d.user_id] ?? 0) + eurValue;
      depositCounts[d.user_id] = (depositCounts[d.user_id] ?? 0) + 1;
    });

    const balanceMap: Record<string, number> = {};
    (wallets ?? []).forEach((w: any) => {
      const balance = Number(w.balance);
      const eurValue = FIAT_CURRENCIES.includes(w.currency)
        ? balance
        : (cryptoPricesEur[w.currency] ? balance * cryptoPricesEur[w.currency] : balance);
      balanceMap[w.user_id] = (balanceMap[w.user_id] ?? 0) + eurValue;
    });

    const nMap: Record<string, { content: string; created_at: string; count: number }> = {};
    (notes ?? []).forEach((n: any) => {
      if (!nMap[n.user_id]) {
        nMap[n.user_id] = { content: n.content, created_at: n.created_at, count: 0 };
      }
      nMap[n.user_id].count += 1;
    });
    setNotesMap(nMap);

    const enriched = depositorProfiles.map(p => ({
      ...p,
      total_deposited: depositTotals[p.id] ?? 0,
      deposit_count: depositCounts[p.id] ?? 0,
      balance: balanceMap[p.id] ?? 0,
    }));

    setDepositors(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [cryptoPricesEur]);

  // Realtime: keep depositors/agents lists in sync when another agent edits a profile
  useEffect(() => {
    const NOISE_FIELDS = new Set(["last_seen_at", "current_page", "current_page_since", "updated_at", "being_called", "force_chat_open"]);
    const channel = supabase
      .channel("admin-depositors-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = (payload.old ?? {}) as any;
          if (!newRow?.id) return;
          const changedKeys = Object.keys(newRow).filter((k) => JSON.stringify(newRow[k]) !== JSON.stringify(oldRow[k]));
          if (changedKeys.length > 0 && changedKeys.every((k) => NOISE_FIELDS.has(k))) return;

          setDepositors((curr) => {
            const idx = curr.findIndex((u) => u.id === newRow.id);
            if (idx === -1) return curr;
            const next = curr.slice();
            next[idx] = { ...next[idx], ...newRow };
            return next;
          });
          setAgents((curr) => {
            const idx = curr.findIndex((a) => a.id === newRow.id);
            if (idx === -1) return curr;
            const next = curr.slice();
            next[idx] = { ...next[idx], ...newRow };
            return next;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const assignAgent = async (userId: string, agentId: string | null) => {
    await supabase.from("profiles").update({ assigned_agent: agentId }).eq("id", userId);
    toast.success("Agent assigned");
    fetchData();
  };

  const updateStatus = async (userId: string, status: string) => {
    await supabase.from("profiles").update({ status }).eq("id", userId);
    toast.success(`User status updated to ${status}`);
    fetchData();
  };

  const openPasswordDialog = (userId: string, name: string) => {
    setPwUserId(userId);
    setPwUserName(name);
    setNewPassword("");
    setPwDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
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

  // Bulk actions
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
    if (deleted > 0) toast.success(`Deleted ${deleted} depositor(s)`);
    if (lastError && deleted < ids.length) toast.error(`Some deletes failed: ${lastError}`);
    setSelectedForBulk(new Set());
    setBulkAction(null);
    fetchData();
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatusTarget || selectedForBulk.size === 0) return;
    const ids = [...selectedForBulk];
    for (const id of ids) {
      await supabase.from("profiles").update({ status: bulkStatusTarget }).eq("id", id);
    }
    toast.success(`Updated ${ids.length} depositors to "${bulkStatusTarget}"`);
    setSelectedForBulk(new Set());
    setBulkAction(null);
    fetchData();
  };

  const handleExportCSV = () => {
    const rows = selectedForBulk.size > 0 ? filtered.filter(u => selectedForBulk.has(u.id)) : filtered;
    if (rows.length === 0) { toast.error("No depositors to export"); return; }
    const headers = ["ID","Display ID","Full Name","Email","Phone","Country","Status","Affiliate","Funnel","Created At"];
    const csvRows = [headers.join(",")];
    rows.forEach(u => {
      csvRows.push([u.id, u.display_id, `"${(u.full_name||"").replace(/"/g,'""')}"`, u.email, u.phone||"", u.country||"", u.status||"", u.affiliate||"", u.funnel||"", u.created_at].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `depositors-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} depositors`);
  };

  const handleBulkQuickEmail = async (templateName: string) => {
    const selectedUsers = depositors.filter(u => selectedForBulk.has(u.id) && u.email);
    if (selectedUsers.length === 0) { toast.error("No selected depositors with email addresses"); return; }
    setBulkEmailSending(true);
    setBulkEmailProgress({ sent: 0, failed: 0, total: selectedUsers.length });
    let sent = 0, failed = 0;
    for (const u of selectedUsers) {
      try {
        const assignedAgent = agents.find(a => a.id === u.assigned_agent);
        const agentNameStr = assignedAgent?.full_name || assignedAgent?.email || authUser?.email || "";
        const agentEmailStr = assignedAgent?.email || authUser?.email || "";

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



  const uniqueCountries = [...new Set(depositors.map(u => u.country).filter(Boolean))].sort();
  const uniqueAffiliates = [...new Set(depositors.map(u => u.affiliate).filter(Boolean))].sort();
  const uniqueFunnels = [...new Set(depositors.map(u => u.funnel).filter(Boolean))].sort();

  const invalidStatusNames = leadStatuses.filter((s: any) => (s.color || "").includes("destructive")).map((s: any) => s.name);
  const potentialStatusNames = leadStatuses.filter((s: any) => (s.color || "").includes("yellow")).map((s: any) => s.name);

  const norm = (s: any) =>
    (s ?? "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const normalizePhone = (s: any) => (s ?? "").toString().replace(/\D+/g, "");
  const term = norm(search);
  const termDigits = normalizePhone(search);

  const filtered = depositors.filter(u => {
    const phoneDigits = normalizePhone(`${u.phone ?? ""} ${u.secondary_phone ?? ""}`);
    const matchesSearch =
      !term ||
      norm(u.full_name).includes(term) ||
      norm(u.email).includes(term) ||
      norm(u.phone).includes(term) ||
      norm(u.secondary_phone).includes(term) ||
      (termDigits.length >= 3 && phoneDigits.includes(termDigits));
    const matchesCountry = countryFilter === "all" || u.country === countryFilter;
    const matchesAgent = agentFilter === "all" || (agentFilter === "none" ? !u.assigned_agent : u.assigned_agent === agentFilter);
    const matchesAffiliate = affiliateFilter === "all" || (affiliateFilter === "none" ? !u.affiliate : u.affiliate === affiliateFilter);
    const matchesFunnel = funnelFilter === "all" || (funnelFilter === "none" ? !u.funnel : u.funnel === funnelFilter);
    const matchesStatus =
      statusFilter === "all" ? true
      : statusFilter === "__shaved__" ? !!u.shaved_from
      : statusFilter === "__invalids__" ? invalidStatusNames.includes(u.status)
      : statusFilter === "__potential__" ? potentialStatusNames.includes(u.status)
      : u.status === statusFilter;
    const depositDate = u.first_deposit_at ? new Date(u.first_deposit_at) : (u.created_at ? new Date(u.created_at) : null);
    const matchesDateFrom = !dateFrom || (depositDate && depositDate >= new Date(dateFrom));
    const matchesDateTo = !dateTo || (depositDate && depositDate <= new Date(new Date(dateTo).getTime() + 86400000 - 1));
    return matchesSearch && matchesCountry && matchesAgent && matchesAffiliate && matchesFunnel && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, countryFilter, agentFilter, affiliateFilter, funnelFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalDeposited = depositors.reduce((sum, d) => sum + d.total_deposited, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Depositors</h1>
        <p className="text-muted-foreground text-sm">
          {depositors.length} depositors · €{totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total deposited
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Depositors</p>
              <p className="text-xl font-display font-bold">{depositors.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Deposited</p>
              <p className="text-xl font-display font-bold">€{totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Deposit</p>
              <p className="text-xl font-display font-bold">
                €{depositors.length > 0 ? Math.round(totalDeposited / depositors.length).toLocaleString() : 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="__shaved__">🪒 Shaved</SelectItem>
            <SelectItem value="__invalids__">🔴 Invalids (all red)</SelectItem>
            <SelectItem value="__potential__">🟡 Potential (all yellow)</SelectItem>
            {leadStatuses.map((s: any) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            <SelectItem value="none">Unassigned</SelectItem>
            {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={affiliateFilter} onValueChange={setAffiliateFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Affiliates</SelectItem>
            <SelectItem value="none">No Affiliate</SelectItem>
            {uniqueAffiliates.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={funnelFilter} onValueChange={setFunnelFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Funnels</SelectItem>
            <SelectItem value="none">No Funnel</SelectItem>
            {uniqueFunnels.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]"
            title="First deposit from"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]"
            title="First deposit to"
          />
          {(dateFrom || dateTo) && (
            <Button size="sm" variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
          )}
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
              {leadStatuses.map((s: any) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" disabled={!bulkStatusTarget} onClick={handleBulkStatusChange}>Apply Status</Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          <Button size="sm" variant="outline" onClick={() => setBulkEmailOpen(true)} className="text-violet-500 border-violet-500/30 hover:bg-violet-500/10"><Mail className="h-3.5 w-3.5 mr-1" /> Quick Email</Button>
          {roleName === "Admin" && <Button size="sm" variant="destructive" onClick={() => setBulkAction("delete")}>Delete</Button>}
          <Button size="sm" variant="ghost" onClick={() => setSelectedForBulk(new Set())}>Clear</Button>
        </div>
      )}

      <DepositorsTable
        loading={loading}
        filtered={paginated}
        notesMap={notesMap}
        agents={agents}
        navigate={navigate}
        assignAgent={assignAgent}
        fetchData={fetchData}
        openPasswordDialog={openPasswordDialog}
        handleSendResetLink={handleSendResetLink}
        handleLoginAsClient={handleLoginAsClient}
        updateStatus={updateStatus}
        canAssignAgent={canAssignAgent}
        selectedForBulk={isStaffRole ? selectedForBulk : undefined}
        toggleBulkSelect={isStaffRole ? toggleBulkSelect : undefined}
        toggleSelectAll={isStaffRole ? toggleSelectAll : undefined}

      />

      <TablePagination page={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} labelSingular="depositor" labelPlural="depositors" />

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

      {/* Bulk Delete Confirmation */}
      <Dialog open={bulkAction === "delete"} onOpenChange={() => setBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedForBulk.size} Depositor(s)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete <strong>{selectedForBulk.size}</strong> selected depositor(s)? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Delete All Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Quick Email */}
      <Dialog open={bulkEmailOpen} onOpenChange={(open) => { if (!bulkEmailSending) setBulkEmailOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-violet-400" />
              Bulk Quick Email — {selectedForBulk.size} depositors
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
                You are about to send <span className="font-semibold text-foreground">{bulkEmailConfirm === "no-answer-followup" ? "NA Email" : bulkEmailConfirm}</span> to <span className="font-semibold text-foreground">{selectedForBulk.size}</span> selected depositors. Are you sure?
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" size="sm" onClick={() => setBulkEmailConfirm(null)}>Cancel</Button>
                <Button size="sm" onClick={() => { const t = bulkEmailConfirm; setBulkEmailConfirm(null); handleBulkQuickEmail(t); }}>
                  Confirm &amp; Send
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From (sender)</label>
                <Select value={bulkEmailFrom} onValueChange={(v: any) => setBulkEmailFrom(v)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Assigned Agent (per client)</SelectItem>
                    <SelectItem value="support">Support — support@crypto-borse.com</SelectItem>
                    <SelectItem value="noreply">No-Reply — noreply@crypto-borse.com</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {bulkEmailFrom === "agent"
                    ? "Each email is sent from the client's assigned agent (falls back to you if unassigned)."
                    : "All emails will be sent from this address."}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Select an email template to send to all {selectedForBulk.size} selected depositors.</p>
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
    </div>

  );
};

export default AdminDepositors;
