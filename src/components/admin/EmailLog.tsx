import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";
import { format } from "date-fns";

interface EmailLogProps {
  userId: string;
}

interface EmailEntry {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const STATUS_VARIANT: Record<string, { label: string; className: string }> = {
  sent: { label: "Sent", className: "bg-success/15 text-success border-success/30" },
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive border-destructive/30" },
  dlq: { label: "Failed", className: "bg-destructive/15 text-destructive border-destructive/30" },
  bounced: { label: "Bounced", className: "bg-destructive/15 text-destructive border-destructive/30" },
  complained: { label: "Complained", className: "bg-destructive/15 text-destructive border-destructive/30" },
  suppressed: { label: "Suppressed", className: "bg-muted text-muted-foreground border-muted-foreground/30" },
};

const TEMPLATE_LABEL: Record<string, string> = {
  "no-answer-followup": "No Answer Follow-up",
  "meeting-invitation": "Meeting Invitation",
  "deposit-approved": "Deposit Approved",
  "auth_emails": "Auth Email",
};

const EmailLog = ({ userId }: EmailLogProps) => {
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Get the client's email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, original_email")
        .eq("id", userId)
        .single();

      const emailsToMatch: string[] = [];
      if (profile?.email) emailsToMatch.push(profile.email.toLowerCase());
      if (profile?.original_email && profile.original_email.toLowerCase() !== profile.email?.toLowerCase()) {
        emailsToMatch.push(profile.original_email.toLowerCase());
      }

      if (emailsToMatch.length === 0) {
        setEmails([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("email_send_log")
        .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
        .in("recipient_email", emailsToMatch)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error || !data) {
        setEmails([]);
        setLoading(false);
        return;
      }

      // Deduplicate by message_id, keeping the latest status (data is already DESC ordered)
      const seen = new Set<string>();
      const deduped: EmailEntry[] = [];
      for (const row of data as EmailEntry[]) {
        const key = row.message_id ?? row.id;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(row);
      }

      setEmails(deduped);
      setLoading(false);
    };
    load();
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email History ({emails.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">No emails sent to this client yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((e) => {
                const status = STATUS_VARIANT[e.status] ?? {
                  label: e.status,
                  className: "bg-muted text-muted-foreground border-muted-foreground/30",
                };
                return (
                  <TableRow key={e.id}>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {format(new Date(e.created_at), "dd MMM yyyy, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      {TEMPLATE_LABEL[e.template_name] ?? e.template_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.recipient_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[280px] truncate">
                      {e.error_message || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailLog;
