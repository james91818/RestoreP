import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Mail, RefreshCw, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type LogRow = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: any;
  created_at: string;
};

const PRESETS = [
  { value: "1", label: "Last 24h", days: 1 },
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
];

const PAGE_SIZE = 50;

const statusColor = (s: string) => {
  switch (s) {
    case "sent": return "bg-success/10 text-success border-success/30";
    case "pending": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    case "suppressed": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
    case "dlq":
    case "failed":
    case "bounced":
    case "complained": return "bg-destructive/10 text-destructive border-destructive/30";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function EmailLogViewer() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState("7");
  const [template, setTemplate] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [templates, setTemplates] = useState<string[]>([]);
  const [detail, setDetail] = useState<LogRow | null>(null);

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(range));
    return d.toISOString();
  }, [range]);

  const fetchLogs = async () => {
    setLoading(true);
    let q = supabase
      .from("email_send_log")
      .select("*")
      .gte("created_at", fromDate)
      .order("created_at", { ascending: false })
      .limit(2000);

    const { data, error } = await q;
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    const all = (data ?? []) as LogRow[];
    const seen = new Set<string>();
    const deduped: LogRow[] = [];
    for (const r of all) {
      const key = r.message_id ?? r.id;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
    }
    setRows(deduped);
    const t = Array.from(new Set(all.map(r => r.template_name).filter(Boolean))).sort();
    setTemplates(t);
  };

  useEffect(() => { fetchLogs(); }, [range]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (template !== "all" && r.template_name !== template) return false;
      if (status !== "all" && r.status !== status) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!r.recipient_email.toLowerCase().includes(s)
          && !r.template_name.toLowerCase().includes(s)
          && !(r.error_message ?? "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [rows, template, status, search]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const sent = filtered.filter(r => r.status === "sent").length;
    const failed = filtered.filter(r => ["dlq", "failed", "bounced", "complained"].includes(r.status)).length;
    const suppressed = filtered.filter(r => r.status === "suppressed").length;
    const pending = filtered.filter(r => r.status === "pending").length;
    return { total, sent, failed, suppressed, pending };
  }, [filtered]);

  useEffect(() => { setPage(0); }, [template, status, search, range]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Email Send Log
            </CardTitle>
            <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Sent" value={stats.sent} className="text-success" />
            <StatCard label="Pending" value={stats.pending} className="text-blue-600" />
            <StatCard label="Suppressed" value={stats.suppressed} className="text-yellow-600" />
            <StatCard label="Failed" value={stats.failed} className="text-destructive" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All templates</SelectItem>
                {templates.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suppressed">Suppressed</SelectItem>
                <SelectItem value="dlq">Failed (dlq)</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="complained">Complained</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search email or template..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {loading ? "Loading..." : "No emails found for this filter."}
                    </TableCell>
                  </TableRow>
                )}
                {paged.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setDetail(r)}>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {new Date(r.created_at).toLocaleString("de-DE")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.template_name}</TableCell>
                    <TableCell className="text-xs">{r.recipient_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(r.status)}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[400px] truncate">
                      {r.error_message ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing {paged.length} of {filtered.length} unique emails
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                Previous
              </Button>
              <span className="tabular-nums">Page {page + 1} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <Field label="Template" value={detail.template_name} />
              <Field label="Recipient" value={detail.recipient_email} />
              <Field label="Status" value={detail.status} />
              <Field label="Sent at" value={new Date(detail.created_at).toLocaleString("de-DE")} />
              <Field label="Message ID" value={detail.message_id ?? "—"} mono />
              {detail.error_message && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Error</div>
                  <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">{detail.error_message}</pre>
                </div>
              )}
              {detail.metadata && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Metadata</div>
                  <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(detail.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const StatCard = ({ label, value, className }: { label: string; value: number; className?: string }) => (
  <div className="border rounded-md p-3 bg-card">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className={`text-2xl font-semibold tabular-nums ${className ?? ""}`}>{value}</div>
  </div>
);

const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex justify-between gap-4">
    <div className="text-muted-foreground text-xs">{label}</div>
    <div className={`text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
  </div>
);
