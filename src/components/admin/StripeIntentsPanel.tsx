import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Intent {
  id: string;
  amount_eur: number;
  status: string;
  source: string | null;
  stripe_session_id: string | null;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
}

interface Props {
  userId: string;
}

const STATUS_META: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  initiated: {
    label: "Started — clicked deposit button",
    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    Icon: AlertCircle,
  },
  redirected: {
    label: "On Stripe checkout page",
    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse",
    Icon: Clock,
  },
  paid: {
    label: "Paid — awaiting approval",
    cls: "bg-green-500/15 text-green-400 border-green-500/30",
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled by client",
    cls: "bg-muted text-muted-foreground border-border",
    Icon: XCircle,
  },
  expired: {
    label: "Expired (no action)",
    cls: "bg-muted text-muted-foreground border-border",
    Icon: XCircle,
  },
};

const StripeIntentsPanel = ({ userId }: Props) => {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("stripe_checkout_intents" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    setIntents((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`intents-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stripe_checkout_intents", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) return null;
  if (intents.length === 0) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          Welcome Page — Payment Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {intents.map((it) => {
          const meta = STATUS_META[it.status] || STATUS_META.initiated;
          const Icon = meta.Icon;
          return (
            <div
              key={it.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm tabular-nums">
                    €{Number(it.amount_eur).toLocaleString("de-DE")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(it.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
              <Badge className={`${meta.cls} border text-[11px] whitespace-nowrap`}>
                {meta.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default StripeIntentsPanel;
