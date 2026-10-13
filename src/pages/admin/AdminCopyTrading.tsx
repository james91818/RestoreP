import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Users, TrendingUp, Plus, Pencil, Trash2 } from "lucide-react";
import CopyTraderDialog, { type CopyTraderRow } from "@/components/admin/CopyTraderDialog";

type Trader = {
  id: string;
  display_name: string;
  win_rate: number | null;
  total_pnl: number | null;
  total_trades: number | null;
  followers_count: number | null;
  is_visible: boolean;
  allowed_asset_types: string[];
};

type Subscription = {
  id: string;
  user_id: string;
  trader_id: string;
  is_active: boolean;
  invested_capital: number;
  created_at: string;
  last_trade_at: string | null;
  next_trade_at: string | null;
  trader_name?: string;
  user_name?: string;
};

const fmtEur = (n: number) =>
  `€${Number(n || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AdminCopyTrading = () => {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CopyTraderRow | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from("copy_traders").select("*").order("total_pnl", { ascending: false }),
      supabase
        .from("copy_subscriptions")
        .select("*, copy_traders(display_name)")
        .order("created_at", { ascending: false }),
    ]);
    setTraders((t as any) ?? []);
    const rows = ((s as any[]) ?? []);
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    let profileMap = new Map<string, { name: string }>();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      (profs ?? []).forEach((p: any) => profileMap.set(p.id, { name: p.full_name || p.email }));
    }
    const mapped = rows.map((row) => ({
      ...row,
      trader_name: row.copy_traders?.display_name,
      user_name: profileMap.get(row.user_id)?.name,
    }));
    setSubs(mapped);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleVisible = async (id: string, next: boolean) => {
    const { error } = await supabase
      .from("copy_traders")
      .update({ is_visible: next })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) toast.error(error.message);
    else {
      toast.success(next ? "Trader visible" : "Trader hidden");
      void load();
    }
  };

  const toggleActive = async (id: string, next: boolean) => {
    const { error } = await supabase
      .from("copy_subscriptions")
      .update({ is_active: next })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) toast.error(error.message);
    else {
      toast.success(next ? "Subscription resumed" : "Subscription paused");
      void load();
    }
  };

  const activeSubs = subs.filter((s) => s.is_active).length;
  const totalCapital = subs.reduce((acc, s) => acc + Number(s.invested_capital || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Copy className="h-6 w-6" /> Copy Trading</h1>
          <p className="text-sm text-muted-foreground">Manage copy traders and follower subscriptions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>Refresh</Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Trader
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Traders</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold tabular-nums">{traders.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Active Subscriptions</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold tabular-nums">{activeSubs} / {subs.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Invested Capital</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold tabular-nums">{fmtEur(totalCapital)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Copy Traders</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Total P&L</TableHead>
                <TableHead className="text-right">Trades</TableHead>
                <TableHead className="text-right">Followers</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead className="text-right">Visible</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : traders.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No copy traders configured</TableCell></TableRow>
              ) : traders.map((tr) => (
                <TableRow key={tr.id}>
                  <TableCell className="font-medium">{tr.display_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(tr.win_rate ?? 0).toFixed(1)}%</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtEur(Number(tr.total_pnl ?? 0))}</TableCell>
                  <TableCell className="text-right tabular-nums">{tr.total_trades ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{tr.followers_count ?? 0}</TableCell>
                  <TableCell className="flex flex-wrap gap-1">
                    {(tr.allowed_asset_types ?? []).map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch checked={tr.is_visible} onCheckedChange={(v) => toggleVisible(tr.id, v)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(tr as any); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm(`Delete "${tr.display_name}"? This removes all follower subscriptions.`)) return;
                          const { error } = await supabase.from("copy_traders").delete().eq("id", tr.id);
                          if (error) toast.error(error.message);
                          else { toast.success("Trader deleted"); void load(); }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CopyTraderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trader={editing}
        onSaved={() => void load()}
      />

      <Card>
        <CardHeader><CardTitle>Subscriptions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Trader</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead>Last Trade</TableHead>
                <TableHead>Next Trade</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : subs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No subscriptions yet</TableCell></TableRow>
              ) : subs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.user_name || s.user_id.slice(0, 8)}</TableCell>
                  <TableCell>{s.trader_name || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtEur(Number(s.invested_capital))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.last_trade_at ? new Date(s.last_trade_at).toLocaleString("de-DE") : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.next_trade_at ? new Date(s.next_trade_at).toLocaleString("de-DE") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Switch checked={s.is_active} onCheckedChange={(v) => toggleActive(s.id, v)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCopyTrading;
