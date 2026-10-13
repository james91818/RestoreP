import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Check, X, RefreshCw, ExternalLink, Trash2, CalendarDays, History } from "lucide-react";
import { checkCrgForProfile, type CrgCheckRow } from "@/hooks/useCrgGuard";
import CrgWarningDialog from "@/components/admin/CrgWarningDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { startOfWeek, formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle } from "lucide-react";

type ProfileLite = { id: string; full_name: string | null; email: string | null };

const fmtEur = (n: number) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const ClientCell = ({ profile }: { profile?: ProfileLite }) => {
  if (!profile) return <span className="text-muted-foreground">—</span>;
  const label = profile.full_name?.trim() || profile.email || "Unknown";
  return (
    <Link
      to={`/backoffice/users/${profile.id}`}
      className="text-primary hover:underline inline-flex items-center gap-1"
    >
      {label} <ExternalLink className="h-3 w-3" />
    </Link>
  );
};

export default function AdminPendingRequests() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [crgCheck, setCrgCheck] = useState<CrgCheckRow | null>(null);
  const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);
  const [oldLead, setOldLead] = useState<{ name: string; registeredAt: string } | null>(null);
  const [oldLeadApproved, setOldLeadApproved] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const results = await Promise.allSettled([
      supabase.from("deposits").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      (supabase as any).from("appointment_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("deposits").select("*").neq("status", "pending").order("created_at", { ascending: false }).limit(100),
      supabase.from("withdrawals").select("*").neq("status", "pending").order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("appointment_requests").select("*").neq("status", "pending").order("created_at", { ascending: false }).limit(100),
    ]);

    const pick = (i: number): any[] => {
      const r = results[i];
      if (r.status === "fulfilled") {
        if ((r.value as any).error) {
          console.error("[AdminPendingRequests] query", i, "error:", (r.value as any).error);
          return [];
        }
        return (r.value as any).data ?? [];
      }
      console.error("[AdminPendingRequests] query", i, "rejected:", r.reason);
      return [];
    };

    const deps = pick(0);
    const wds = pick(1);
    const appts = pick(2);

    setDeposits(deps);
    setWithdrawals(wds);
    setAppointments(appts);

    const hDeps = pick(3);
    const hWds = pick(4);
    const hAppts = pick(5);
    const history = [
      ...hDeps.map((d: any) => ({
        kind: "Deposit", id: d.id, created_at: d.created_at, user_id: d.user_id, status: d.status,
        processed_at: d.updated_at,
        details: `${d.currency} ${fmtEur(Number(d.amount))} · ${d.method}${d.network ? ` · ${d.network}` : ""}`,
      })),
      ...hWds.map((w: any) => ({
        kind: "Withdrawal", id: w.id, created_at: w.created_at, user_id: w.user_id, status: w.status,
        processed_at: w.updated_at,
        details: `${w.currency} ${fmtEur(Number(w.amount))} · ${w.method}${w.destination ? ` · ${w.destination}` : ""}`,
      })),
      ...hAppts.map((a: any) => ({
        kind: "Appointment", id: a.id, created_at: a.created_at, user_id: a.client_id, status: a.status,
        processed_at: a.updated_at,
        details: `${a.topic} · ${new Date(a.preferred_at).toLocaleString("de-DE")}`,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setHistoryItems(history);

    // Fetch related profiles
    const userIds = new Set<string>();
    [...(deps ?? []), ...(wds ?? []), ...history].forEach((r: any) => {
      if (r.user_id) userIds.add(r.user_id);
    });
    (appts ?? []).forEach((r: any) => { if (r.client_id) userIds.add(r.client_id); });
    (hAppts ?? []).forEach((r: any) => { if (r.client_id) userIds.add(r.client_id); });
    if (userIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", Array.from(userIds));
      const map: Record<string, ProfileLite> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
    if (!opts?.silent) setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Background refresh — silent (keeps table visible) and skipped while tab is hidden
    const interval = setInterval(() => {
      if (!document.hidden) load({ silent: true });
    }, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const updateStatus = async (
    table: "deposits" | "withdrawals" | "payment_link_requests",
    id: string,
    status: "approved" | "rejected" | "fulfilled",
  ) => {
    setBusyId(id);
    const { data: { user } } = await supabase.auth.getUser();
    const patch: any = { status };
    if (table === "deposits" || table === "withdrawals") {
      patch.processed_by = user?.id;
    }
    if (table === "payment_link_requests" && status === "fulfilled") {
      patch.fulfilled_at = new Date().toISOString();
    }
    const { error } = await (supabase as any).from(table).update(patch).eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }
    toast.success(`Request ${status}`);
    load();
  };

  // Approve a deposit with CRG guard: if this would be the client's first deposit
  // and approving it would push the affiliate/funnel past the weekly CRG guarantee,
  // surface a shave-suggestion dialog first.
  const approveDeposit = async (deposit: any) => {
    const userId = deposit.user_id;
    const { data: prof } = await supabase
      .from("profiles")
      .select("first_deposit_at, created_at, full_name, email")
      .eq("id", userId)
      .maybeSingle();
    const isFirstDeposit = !prof?.first_deposit_at;
    if (isFirstDeposit && Number(deposit.amount) >= 1) {
      // Warn if the lead was not registered this week (Mon–Sun, local)
      if (!oldLeadApproved && prof?.created_at) {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const regDate = new Date(prof.created_at);
        if (regDate < weekStart) {
          setOldLead({
            name: prof.full_name?.trim() || prof.email || "this lead",
            registeredAt: prof.created_at,
          });
          setPendingApproveId(deposit.id);
          return;
        }
      }
      const check = await checkCrgForProfile(userId);
      if (check && check.would_exceed) {
        setCrgCheck(check);
        setPendingApproveId(deposit.id);
        return;
      }
    }
    setOldLeadApproved(false);
    updateStatus("deposits", deposit.id, "approved");
  };

  const deleteRequest = async (table: "deposits" | "withdrawals" | "appointment_requests", id: string) => {
    if (!confirm("Delete this request permanently? This cannot be undone.")) return;
    setBusyId(id);
    const { error, data } = await (supabase as any).from(table).delete().eq("id", id).select("id");
    setBusyId(null);
    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      toast.error("Delete blocked — you don't have permission to remove this request.");
      return;
    }
    toast.success("Request deleted");
    load();
  };

  const updateAppointment = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    const { data: { user } } = await supabase.auth.getUser();
    const patch: any = { status };
    if (status === "approved") patch.agent_id = user?.id;
    const { error } = await (supabase as any).from("appointment_requests").update(patch).eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }
    toast.success(`Appointment ${status}`);
    load();
  };

  const [signups, setSignups] = useState<any[]>([]);
  const loadSignups = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, country, created_at, status")
      .eq("access_approved", false)
      .eq("created_via_affiliate_api", false)
      .neq("status", "Rejected")
      .order("created_at", { ascending: false });
    setSignups(data ?? []);
  }, []);
  useEffect(() => {
    loadSignups();
    const iv = setInterval(() => { if (!document.hidden) loadSignups(); }, 15000);
    return () => clearInterval(iv);
  }, [loadSignups]);

  const decideSignup = async (id: string, approve: boolean) => {
    setBusyId(id);
    const patch: any = approve ? { access_approved: true } : { status: "Rejected" };
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    setBusyId(null);
    if (error) return toast.error(`Failed: ${error.message}`);
    toast.success(approve ? "Sign-up approved" : "Sign-up rejected");
    loadSignups();
  };

  const totalPending = deposits.length + withdrawals.length + appointments.length + signups.length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Pending Requests</h1>
          <p className="text-sm text-muted-foreground">
            {totalPending} request{totalPending === 1 ? "" : "s"} awaiting agent action
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Requests
            <Badge variant={totalPending > 0 ? "destructive" : "secondary"} className="ml-2 tabular-nums">
              {totalPending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="deposits">
            Deposits
            <Badge variant={deposits.length > 0 ? "destructive" : "secondary"} className="ml-2 tabular-nums">
              {deposits.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            Withdrawals
            <Badge variant={withdrawals.length > 0 ? "destructive" : "secondary"} className="ml-2 tabular-nums">
              {withdrawals.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="appointments">
            Appointments
            <Badge variant={appointments.length > 0 ? "destructive" : "secondary"} className="ml-2 tabular-nums">
              {appointments.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="signups">
            Sign-ups
            <Badge variant={signups.length > 0 ? "destructive" : "secondary"} className="ml-2 tabular-nums">
              {signups.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-3.5 w-3.5 mr-1.5" />
            History
            <Badge variant="secondary" className="ml-2 tabular-nums">{historyItems.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signups">
          <Card>
            <CardHeader><CardTitle className="text-base">Website sign-ups awaiting approval</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Client</th>
                    <th className="p-3 font-medium">Phone</th>
                    <th className="p-3 font-medium">Country</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {signups.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No sign-ups waiting</td></tr>
                  ) : signups.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleString("de-DE")}</td>
                      <td className="p-3">
                        <ClientCell profile={s} />
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </td>
                      <td className="p-3">{s.phone || "—"}</td>
                      <td className="p-3">{s.country || "—"}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button size="sm" className="mr-1" disabled={busyId === s.id} onClick={() => decideSignup(s.id, true)}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" disabled={busyId === s.id} onClick={() => decideSignup(s.id, false)}>
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALL REQUESTS */}
        <TabsContent value="all">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Pending Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Details</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {totalPending === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No pending requests</td></tr>
                  ) : (
                    [
                      ...deposits.map((d: any) => ({
                        kind: "Deposit", table: "deposits" as const, id: d.id, created_at: d.created_at, user_id: d.user_id,
                        details: `${d.currency} ${fmtEur(Number(d.amount))} · ${d.method}${d.network ? ` · ${d.network}` : ""}`,
                      })),
                      ...withdrawals.map((w: any) => ({
                        kind: "Withdrawal", table: "withdrawals" as const, id: w.id, created_at: w.created_at, user_id: w.user_id,
                        details: `${w.currency} ${fmtEur(Number(w.amount))} · ${w.method}${w.destination ? ` · ${w.destination}` : ""}`,
                      })),
                      ...appointments.map((a: any) => ({
                        kind: "Appointment", table: "appointment_requests" as const, id: a.id, created_at: a.created_at, user_id: a.client_id,
                        details: `${a.topic} · ${new Date(a.preferred_at).toLocaleString("de-DE")}${a.notes ? ` · ${a.notes}` : ""}`,
                      })),
                    ]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((r) => (
                        <tr key={`${r.table}-${r.id}`} className="border-b last:border-0 align-top">
                          <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString("de-DE")}</td>
                          <td className="p-3"><Badge variant="outline">{r.kind}</Badge></td>
                          <td className="p-3"><ClientCell profile={profiles[r.user_id]} /></td>
                          <td className="p-3 text-muted-foreground max-w-[320px] break-words">{r.details}</td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <Button size="sm" className="mr-1" disabled={busyId === r.id}
                              onClick={() => r.table === "appointment_requests" ? updateAppointment(r.id, "approved") : updateStatus(r.table, r.id, "approved")}>
                              <Check className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="mr-1" disabled={busyId === r.id}
                              onClick={() => r.table === "appointment_requests" ? updateAppointment(r.id, "rejected") : updateStatus(r.table, r.id, "rejected")}>
                              <X className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                            <Button size="sm" variant="outline" disabled={busyId === r.id}
                              onClick={() => deleteRequest(r.table, r.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEPOSITS */}
        <TabsContent value="deposits">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pending Deposits</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Method</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Tx / Notes</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No pending deposits</td></tr>
                  ) : deposits.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 align-top">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(d.created_at).toLocaleString("de-DE")}</td>
                      <td className="p-3"><ClientCell profile={profiles[d.user_id]} /></td>
                      <td className="p-3 font-semibold tabular-nums">{d.currency} {fmtEur(Number(d.amount))}</td>
                      <td className="p-3 capitalize text-muted-foreground">{d.method}{d.network ? ` · ${d.network}` : ""}</td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[280px] break-words">
                        {d.tx_hash && <div className="font-mono">{d.tx_hash.slice(0, 16)}…</div>}
                        {d.admin_notes && <div className="line-clamp-2">{d.admin_notes}</div>}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button size="sm" className="mr-1" disabled={busyId === d.id}
                          onClick={() => approveDeposit(d)}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="mr-1" disabled={busyId === d.id}
                          onClick={() => updateStatus("deposits", d.id, "rejected")}>
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === d.id}
                          onClick={() => deleteRequest("deposits", d.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WITHDRAWALS */}
        <TabsContent value="withdrawals">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pending Withdrawals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Method</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Bank / Destination</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No pending withdrawals</td></tr>
                  ) : withdrawals.map((w) => (
                    <tr key={w.id} className="border-b last:border-0 align-top">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(w.created_at).toLocaleString("de-DE")}</td>
                      <td className="p-3"><ClientCell profile={profiles[w.user_id]} /></td>
                      <td className="p-3 font-semibold tabular-nums">{w.currency} {fmtEur(Number(w.amount))}</td>
                      <td className="p-3 capitalize text-muted-foreground">{w.method}</td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[320px] break-words font-mono">
                        {w.destination || <span className="text-muted-foreground/60 italic font-sans">—</span>}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button size="sm" className="mr-1" disabled={busyId === w.id}
                          onClick={() => updateStatus("withdrawals", w.id, "approved")}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="mr-1" disabled={busyId === w.id}
                          onClick={() => updateStatus("withdrawals", w.id, "rejected")}>
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === w.id}
                          onClick={() => deleteRequest("withdrawals", w.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPOINTMENTS */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Pending Appointment Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Requested</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Topic</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Preferred Time</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Notes</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No pending appointment requests</td></tr>
                  ) : appointments.map((a) => (
                    <tr key={a.id} className="border-b last:border-0 align-top">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleString("de-DE")}</td>
                      <td className="p-3"><ClientCell profile={profiles[a.client_id]} /></td>
                      <td className="p-3 font-medium">{a.topic}</td>
                      <td className="p-3 whitespace-nowrap">
                        <div>{new Date(a.preferred_at).toLocaleString("de-DE")}</div>
                        {a.alternate_at && (
                          <div className="text-xs text-muted-foreground">Alt: {new Date(a.alternate_at).toLocaleString("de-DE")}</div>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-[280px] break-words">{a.notes || "—"}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button size="sm" className="mr-1" disabled={busyId === a.id}
                          onClick={() => updateAppointment(a.id, "approved")}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="mr-1" disabled={busyId === a.id}
                          onClick={() => updateAppointment(a.id, "rejected")}>
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === a.id}
                          onClick={() => deleteRequest("appointment_requests", a.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Requests History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Details</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No processed requests yet</td></tr>
                  ) : historyItems.map((r) => (
                    <tr key={`h-${r.kind}-${r.id}`} className="border-b last:border-0 align-top">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString("de-DE")}</td>
                      <td className="p-3"><Badge variant="outline">{r.kind}</Badge></td>
                      <td className="p-3"><ClientCell profile={profiles[r.user_id]} /></td>
                      <td className="p-3 text-muted-foreground max-w-[320px] break-words">{r.details}</td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            ["approved", "accepted", "fulfilled"].includes(r.status)
                              ? "bg-green-500/15 text-green-600 border-green-500/30 capitalize"
                              : ["rejected", "declined"].includes(r.status)
                              ? "bg-destructive/15 text-destructive border-destructive/30 capitalize"
                              : "capitalize"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {r.processed_at ? new Date(r.processed_at).toLocaleString("de-DE") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <CrgWarningDialog
        open={!!crgCheck}
        check={crgCheck}
        onCancel={() => { setCrgCheck(null); setPendingApproveId(null); }}
        onApprove={() => {
          const id = pendingApproveId;
          setCrgCheck(null); setPendingApproveId(null);
          if (id) updateStatus("deposits", id, "approved");
        }}
      />
      <AlertDialog open={!!oldLead} onOpenChange={(o) => { if (!o) { setOldLead(null); setPendingApproveId(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Old lead — not from this week
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  <b>{oldLead?.name}</b> registered{" "}
                  <b>
                    {oldLead?.registeredAt
                      ? formatDistanceToNowStrict(new Date(oldLead.registeredAt), { addSuffix: true })
                      : ""}
                  </b>{" "}
                  and is <b>not part of this week's leads</b>.
                </p>
                <div className="rounded-md border bg-muted/40 p-3 text-amber-700 dark:text-amber-400">
                  Suggested: <b>shave this lead</b> instead of converting to FTD. Converting an
                  old lead to FTD won't count toward this week's CRG and will be billed as a real
                  CPA charge to the affiliate.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel onClick={() => { setOldLead(null); setPendingApproveId(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = pendingApproveId;
                const dep = deposits.find((d) => d.id === id);
                setOldLead(null);
                setOldLeadApproved(true);
                // Re-run approval flow so CRG check still applies
                if (dep) {
                  setTimeout(() => approveDeposit(dep), 0);
                }
              }}
            >
              Approve anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
