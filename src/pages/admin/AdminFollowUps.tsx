import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlarmClock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRole, isAdminOrManager } from "@/hooks/useRole";
import { useFollowUps, formatSince, hoursSince, FollowUpRow } from "@/hooks/useFollowUps";
import AddCommentDialog from "@/components/admin/AddCommentDialog";

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const OverdueTable = ({ rows, showAgent, onComment }: { rows: FollowUpRow[]; showAgent: boolean; onComment: (r: FollowUpRow) => void }) => {
  const navigate = useNavigate();
  if (rows.length === 0) return (
    <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
      <CheckCircle2 className="h-8 w-8 text-primary" /> All customers are up to date.
    </div>
  );
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last comment</TableHead>
            <TableHead>Time since update</TableHead>
            {showAgent && <TableHead>Agent</TableHead>}
            <TableHead>Priority</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const h = hoursSince(r.last_activity_at);
            return (
              <TableRow key={r.customer_id}>
                <TableCell className="font-medium whitespace-nowrap">{r.full_name || r.email || "—"}</TableCell>
                <TableCell><Badge variant="outline">{r.status || "—"}</Badge></TableCell>
                <TableCell className="whitespace-nowrap text-sm">{r.has_comment ? fmt(r.last_activity_at) : <span className="text-muted-foreground">Never (assigned {fmt(r.last_activity_at)})</span>}</TableCell>
                <TableCell className="whitespace-nowrap font-semibold text-destructive">{formatSince(r.last_activity_at)}</TableCell>
                {showAgent && <TableCell className="whitespace-nowrap">{r.agent_name || "—"}</TableCell>}
                <TableCell>
                  <Badge variant="destructive">{h >= 96 ? "Critical" : h >= 72 ? "High" : "Needs Update"}</Badge>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap space-x-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/backoffice/users/${r.customer_id}`)}>Open Customer</Button>
                  <Button size="sm" onClick={() => onComment(r)}>Add Comment</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

const AdminFollowUps = () => {
  const { roleName } = useRole();
  const canSeeAll = isAdminOrManager(roleName);
  const mine = useFollowUps("mine");
  const all = useFollowUps("all", canSeeAll);
  const [target, setTarget] = useState<FollowUpRow | null>(null);

  const stats = useMemo(() => {
    const perAgent = new Map<string, number>();
    all.overdue.forEach((r) => perAgent.set(r.agent_name || "Unknown", (perAgent.get(r.agent_name || "Unknown") || 0) + 1));
    const avg = all.rows.length ? all.rows.reduce((s, r) => s + hoursSince(r.last_activity_at), 0) / all.rows.length : 0;
    return { perAgent: [...perAgent.entries()].sort((a, b) => b[1] - a[1]), avg, oldest: all.overdue[0] };
  }, [all.rows, all.overdue]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlarmClock className="h-6 w-6 text-destructive" />
        <div>
          <h1 className="text-2xl font-bold">Follow-Up Required</h1>
          <p className="text-sm text-muted-foreground">Customers without an agent comment for 48 hours or more. Adding a comment resets the timer.</p>
        </div>
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My customers ({mine.overdue.length})</TabsTrigger>
          {canSeeAll && <TabsTrigger value="all">All agents ({all.overdue.length})</TabsTrigger>}
        </TabsList>
        <TabsContent value="mine">
          <Card><CardContent className="p-0 sm:p-2">
            <OverdueTable rows={mine.overdue} showAgent={false} onComment={setTarget} />
          </CardContent></Card>
        </TabsContent>
        {canSeeAll && (
          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Need follow-up</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-destructive">{all.overdue.length}</CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Avg. time since update</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{Math.round(stats.avg)} h</CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Oldest overdue</CardTitle></CardHeader><CardContent className="text-sm font-semibold">{stats.oldest ? `${stats.oldest.full_name || stats.oldest.email} · ${formatSince(stats.oldest.last_activity_at)}` : "—"}</CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Overdue per agent</CardTitle></CardHeader><CardContent className="text-sm space-y-0.5">
                {stats.perAgent.length ? stats.perAgent.map(([n, c]) => <div key={n} className="flex justify-between"><span className="truncate">{n}</span><span className="font-semibold">{c}</span></div>) : "—"}
              </CardContent></Card>
            </div>
            <Card><CardContent className="p-0 sm:p-2">
              <OverdueTable rows={all.overdue} showAgent onComment={setTarget} />
            </CardContent></Card>
          </TabsContent>
        )}
      </Tabs>

      {target && (
        <AddCommentDialog open onOpenChange={(o) => !o && setTarget(null)} userId={target.customer_id}
          userName={target.full_name || target.email || "Customer"} />
      )}
    </div>
  );
};

export default AdminFollowUps;
