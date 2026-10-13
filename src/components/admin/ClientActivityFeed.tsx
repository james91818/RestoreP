import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CreditCard,
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarClock,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wallet,
  Link as LinkIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  userId: string;
}

type ActivityItem = {
  id: string;
  kind: "stripe" | "deposit" | "withdrawal" | "appointment" | "crypto_request" | "payment_link_request";
  title: string;
  subtitle?: string;
  status: string;
  statusCls: string;
  created_at: string;
  Icon: typeof Clock;
  isPending?: boolean;
};

const STRIPE_STATUS: Record<string, { label: string; cls: string }> = {
  initiated: { label: "Started checkout", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  redirected: { label: "On Stripe page", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  paid: { label: "Paid — awaiting approval", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  cancelled: { label: "Cancelled by client", cls: "bg-muted text-muted-foreground border-border" },
  expired: { label: "Expired", cls: "bg-muted text-muted-foreground border-border" },
};

const TX_STATUS: Record<string, { cls: string; Icon: typeof Clock }> = {
  pending: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", Icon: Clock },
  approved: { cls: "bg-green-500/15 text-green-400 border-green-500/30", Icon: CheckCircle2 },
  rejected: { cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
};

const APPT_STATUS: Record<string, { cls: string; Icon: typeof Clock }> = {
  pending: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", Icon: Clock },
  accepted: { cls: "bg-green-500/15 text-green-400 border-green-500/30", Icon: CheckCircle2 },
  declined: { cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
  cancelled: { cls: "bg-muted text-muted-foreground border-border", Icon: XCircle },
};

const REQ_STATUS: Record<string, { cls: string }> = {
  pending: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  fulfilled: { cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  rejected: { cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function ClientActivityFeed({ userId }: Props) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [intents, deps, wds, appts, payReqs] = await Promise.all([
      supabase
        .from("stripe_checkout_intents")
        .select("id, amount_eur, status, source, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("deposits")
        .select("id, amount, currency, status, method, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("withdrawals")
        .select("id, amount, currency, status, method, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("appointment_requests")
        .select("id, topic, status, preferred_at, created_at")
        .eq("client_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("payment_link_requests" as any)
        .select("id, amount, currency, full_name, country, status, created_at")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const list: ActivityItem[] = [];

    (intents.data || []).forEach((i: any) => {
      const meta = STRIPE_STATUS[i.status] || { label: i.status, cls: "bg-muted text-muted-foreground border-border" };
      list.push({
        id: `stripe-${i.id}`,
        kind: "stripe",
        title: `Stripe €${Number(i.amount_eur).toFixed(2)}`,
        subtitle: i.source ? `via ${i.source.replace(/_/g, " ")}` : undefined,
        status: meta.label,
        statusCls: meta.cls,
        created_at: i.created_at,
        Icon: CreditCard,
      });
    });

    (deps.data || []).forEach((d: any) => {
      const meta = TX_STATUS[d.status] || { cls: "bg-muted text-muted-foreground border-border", Icon: AlertCircle };
      list.push({
        id: `dep-${d.id}`,
        kind: "deposit",
        title: `Deposit ${d.currency} ${Number(d.amount).toFixed(2)}`,
        subtitle: d.method ? `via ${d.method}` : undefined,
        status: d.status,
        statusCls: meta.cls,
        created_at: d.created_at,
        Icon: ArrowDownToLine,
      });
    });

    (wds.data || []).forEach((w: any) => {
      const meta = TX_STATUS[w.status] || { cls: "bg-muted text-muted-foreground border-border", Icon: AlertCircle };
      list.push({
        id: `wd-${w.id}`,
        kind: "withdrawal",
        title: `Withdrawal ${w.currency} ${Number(w.amount).toFixed(2)}`,
        subtitle: w.method ? `via ${w.method}` : undefined,
        status: w.status,
        statusCls: meta.cls,
        created_at: w.created_at,
        Icon: ArrowUpFromLine,
      });
    });

    (appts.data || []).forEach((a: any) => {
      const meta = APPT_STATUS[a.status] || { cls: "bg-muted text-muted-foreground border-border", Icon: AlertCircle };
      const when = a.preferred_at ? new Date(a.preferred_at).toLocaleString("de-DE") : "";
      list.push({
        id: `appt-${a.id}`,
        kind: "appointment",
        title: `Appointment: ${a.topic || "Request"}`,
        subtitle: when ? `Preferred: ${when}` : undefined,
        status: a.status,
        statusCls: meta.cls,
        created_at: a.created_at,
        Icon: CalendarClock,
      });
    });

    const pending: ActivityItem[] = [];
    (payReqs.data as any[] || []).forEach((r: any) => {
      pending.push({
        id: `plr-${r.id}`,
        kind: "payment_link_request",
        title: `Payment link: ${r.currency} ${Number(r.amount).toFixed(2)}`,
        subtitle: [r.full_name, r.country].filter(Boolean).join(" — ") || undefined,
        status: "pending",
        statusCls: REQ_STATUS.pending.cls,
        created_at: r.created_at,
        Icon: LinkIcon,
        isPending: true,
      });
    });
    pending.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setItems(list.slice(0, 12));
    setPendingRequests(pending);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    load();

    const channel = supabase
      .channel(`activity-feed-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stripe_checkout_intents", filter: `user_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals", filter: `user_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointment_requests", filter: `client_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_link_requests", filter: `user_id=eq.${userId}` }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) return null;

  const renderItem = (item: ActivityItem) => {
    const Icon = item.Icon;
    return (
      <div key={item.id} className="border rounded-lg p-2.5 space-y-1">
        <div className="flex items-start gap-2">
          <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{item.title}</p>
            {item.subtitle && (
              <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${item.statusCls}`}>
            {item.status}
          </Badge>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {pendingRequests.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" /> Pending Requests
              <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30 ml-auto">
                {pendingRequests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {pendingRequests.map(renderItem)}
            </div>
          </CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Client Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {items.map(renderItem)}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
