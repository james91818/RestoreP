import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface Props {
  userId: string;
}

const ACTION_LABELS: Record<string, string> = {
  profile_updated: "Profile updated",
  password_changed: "Password changed",
  account_status_changed: "Account status changed",
  status_changed: "Lead status changed",
  role_assigned: "Role changed",
  team_assigned: "Team changed",
  agent_assigned: "Agent assigned",
  wallet_balance_updated: "Wallet balance updated",
  bank_details_added: "Bank details added",
  bank_details_updated: "Bank details updated",
  crypto_address_added: "Crypto address added",
  crypto_address_deleted: "Crypto address deleted",
  comment_added: "Comment added",
  comment_deleted: "Comment deleted",
  manual_deposit_created: "Manual deposit created",
  deposit_edited: "Deposit edited",
  bonus_credited: "Bonus credited",
  bonus_updated: "Bonus updated",
  bonus_deleted: "Bonus deleted",
  manual_withdrawal_created: "Manual withdrawal created",
  lead_shaved: "Lead shaved",
  force_home_redirect: "Forced home redirect",
  force_link_sent: "Forced link sent",
};

const ClientActivityLog = ({ userId }: Props) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [authors, setAuthors] = useState<Record<string, { name: string; email: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      // Fetch all activity_log rows whose details.target_user_id = userId
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .filter("details->>target_user_id", "eq", userId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      const rows = data || [];
      setEntries(rows);

      // Fetch author profiles in one batch
      const authorIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
      if (authorIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", authorIds);
        if (cancelled) return;
        const map: Record<string, { name: string; email: string }> = {};
        (profs || []).forEach((p: any) => {
          map[p.id] = { name: p.full_name || "", email: p.email || "" };
        });
        setAuthors(map);
      }
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [userId]);

  const renderDetails = (action: string, details: any) => {
    if (!details) return null;
    const { target_user_id: _t, ...rest } = details;
    if (Object.keys(rest).length === 0) return null;

    if (action === "profile_updated" && rest.changes) {
      return (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {Object.entries(rest.changes).map(([field, change]: any) => (
            <div key={field}>
              <span className="font-medium text-foreground">{field}:</span>{" "}
              <span className="line-through opacity-60">{String(change.from || "—")}</span>
              {" → "}
              <span>{String(change.to || "—")}</span>
            </div>
          ))}
        </div>
      );
    }
    if (rest.from !== undefined && rest.to !== undefined) {
      return (
        <div className="text-xs text-muted-foreground">
          <span className="line-through opacity-60">{String(rest.from ?? "—")}</span>
          {" → "}
          <span>{String(rest.to ?? "—")}</span>
          {Object.entries(rest)
            .filter(([k]) => !["from", "to"].includes(k))
            .map(([k, v]) => (
              <span key={k} className="ml-2">
                <span className="font-medium text-foreground">{k}:</span> {String(v)}
              </span>
            ))}
        </div>
      );
    }
    return (
      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
        {Object.entries(rest).map(([k, v]) => (
          <span key={k}>
            <span className="font-medium text-foreground">{k}:</span>{" "}
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" /> Client Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet for this client.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => {
              const author = authors[e.user_id] || { name: "", email: "" };
              const label = ACTION_LABELS[e.action] || e.action;
              return (
                <div key={e.id} className="border border-border rounded-lg p-3 bg-card">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="shrink-0">{label}</Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        by {author.name || author.email || "Unknown"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(e.created_at).toLocaleString("de-DE")}
                    </span>
                  </div>
                  {renderDetails(e.action, e.details)}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientActivityLog;
