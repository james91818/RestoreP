import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  userId: string;
}

interface Visit {
  id: string;
  path: string;
  title: string | null;
  visited_at: string;
}

const PAGE_LABELS: Record<string, string> = {
  "/account-types": "Account Types",
  "/investments": "Investment Products",
  "/investments/crypto": "Cryptocurrencies",
  "/investments/stocks": "Stocks & Securities",
  "/investments/indices": "Global Indices",
  "/investments/commodities": "Commodities",
  "/crypto-pension": "Crypto Pension",
  "/about-us": "About Us",
  "/contact-us": "Contact",
  "/instruments": "Instruments",
  "/trading-hours": "Trading Hours",
};

export default function ClientPageVisits({ userId }: Props) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("client_page_visits" as any)
        .select("id, path, title, visited_at")
        .eq("user_id", userId)
        .order("visited_at", { ascending: false })
        .limit(25);
      if (!cancelled) {
        setVisits((data as any) ?? []);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`page-visits-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "client_page_visits", filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4" /> Page Visits
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : visits.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tracked page visits yet.</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {visits.map((v) => {
              const label = v.title || PAGE_LABELS[v.path] || v.path;
              return (
                <li key={v.id} className="flex items-start justify-between gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{label}</div>
                    <div className="text-xs text-muted-foreground truncate">{v.path}</div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0" title={new Date(v.visited_at).toLocaleString("de-DE")}>
                    {formatDistanceToNow(new Date(v.visited_at), { addSuffix: true })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
