import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Wallet, RefreshCw, ExternalLink, Undo2, Pencil, Check, X } from "lucide-react";

type AttachedRow = {
  id: string;
  address: string;
  external_id: string | null;
  currency: string;
  network: string;
  assigned_to: string;
  assigned_at: string | null;
};

const networkLabel = (currency: string, network: string) => {
  if (currency === "BTC") return "BTC (Bitcoin)";
  if (currency === "LTC") return "LTC (Litecoin)";
  if (currency === "USDT" && network === "TRC20") return "USDT (TRC20)";
  if (currency === "USDT" && network === "ERC20") return "USDT (ERC20)";
  return `${currency} (${network})`;
};

const networkBadgeClass = (currency: string, network: string) => {
  if (currency === "BTC") return "bg-orange-500/10 text-orange-500 border-orange-500/30";
  if (currency === "LTC") return "bg-slate-400/10 text-slate-300 border-slate-400/30";
  if (network === "TRC20") return "bg-red-500/10 text-red-500 border-red-500/30";
  if (network === "ERC20") return "bg-blue-500/10 text-blue-500 border-blue-500/30";
  return "";
};

export default function AdminAttachedWallets() {
  const [rows, setRows] = useState<AttachedRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, { full_name: string | null; email: string | null; display_id: number | null }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "BTC_BTC" | "USDT_TRC20" | "USDT_ERC20" | "LTC_LTC">("ALL");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (userId: string, currentName: string | null) => {
    setEditingId(userId);
    setEditValue(currentName ?? "");
  };
  const cancelEdit = () => { setEditingId(null); setEditValue(""); };
  const saveEdit = async (userId: string) => {
    const newName = editValue.trim();
    if (!newName) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: newName })
      .eq("id", userId);
    setSaving(false);
    if (error) { toast.error("Failed to update name: " + error.message); return; }
    setProfilesById((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? { email: null, display_id: null }), full_name: newName },
    }));
    toast.success("Client name updated");
    cancelEdit();
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("btc_address_pool" as any)
      .select("id,address,external_id,currency,network,assigned_to,assigned_at")
      .not("assigned_to", "is", null)
      .order("assigned_at", { ascending: false })
      .limit(2000);
    if (error) {
      toast.error("Failed to load attached wallets: " + error.message);
      setRows([]);
    } else {
      const list = (data ?? []) as unknown as AttachedRow[];
      setRows(list);
      const ids = Array.from(new Set(list.map((r) => r.assigned_to).filter(Boolean)));
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email, display_id")
          .in("id", ids);
        const map: Record<string, any> = {};
        (profs ?? []).forEach((p) => (map[p.id] = p));
        setProfilesById(map);
      } else {
        setProfilesById({});
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (filter === "BTC_BTC" && !(r.currency === "BTC")) return false;
    if (filter === "USDT_TRC20" && !(r.currency === "USDT" && r.network === "TRC20")) return false;
    if (filter === "USDT_ERC20" && !(r.currency === "USDT" && r.network === "ERC20")) return false;
    if (filter === "LTC_LTC" && !(r.currency === "LTC")) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const p = profilesById[r.assigned_to];
      const hay = `${r.address} ${r.external_id ?? ""} ${p?.full_name ?? ""} ${p?.email ?? ""} ${p?.display_id ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const release = async (row: AttachedRow) => {
    const p = profilesById[row.assigned_to];
    const who = p?.full_name ?? p?.email ?? row.assigned_to.slice(0, 8) + "…";
    if (!confirm(
      `Release this ${networkLabel(row.currency, row.network)} wallet from ${who}?\n\n` +
      `• The address will be removed from the client's dashboard\n` +
      `• It will return to the available pool for re-assignment`
    )) return;

    // 1) Remove from client's wallet list
    const { error: delErr } = await supabase
      .from("client_crypto_addresses")
      .delete()
      .eq("user_id", row.assigned_to)
      .eq("address", row.address)
      .eq("currency", row.currency);
    if (delErr) {
      toast.error("Failed to remove from client: " + delErr.message);
      return;
    }

    // 2) Return pool entry to available
    const { error: poolErr } = await supabase
      .from("btc_address_pool" as any)
      .update({ is_used: false, assigned_to: null, assigned_at: null })
      .eq("id", row.id);
    if (poolErr) {
      toast.error("Removed from client but failed to release pool entry: " + poolErr.message);
      return;
    }

    toast.success("Wallet released back to pool");
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Attached Wallets
          </h1>
          <p className="text-sm text-muted-foreground">
            All pool wallets currently assigned to clients across BTC, USDT (TRC20) and USDT (ERC20).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned addresses ({rows.length})</CardTitle>
          <CardDescription>Filter by network or search by address, wallet ID or client name.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="ALL">All ({rows.length})</TabsTrigger>
                <TabsTrigger value="BTC_BTC">BTC ({rows.filter((r) => r.currency === "BTC").length})</TabsTrigger>
                <TabsTrigger value="USDT_TRC20">USDT TRC20 ({rows.filter((r) => r.currency === "USDT" && r.network === "TRC20").length})</TabsTrigger>
                <TabsTrigger value="USDT_ERC20">USDT ERC20 ({rows.filter((r) => r.currency === "USDT" && r.network === "ERC20").length})</TabsTrigger>
                <TabsTrigger value="LTC_LTC">LTC ({rows.filter((r) => r.currency === "LTC").length})</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              placeholder="Search address, wallet ID, client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs ml-auto"
            />
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No attached wallets found.</div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[140px]">Type</TableHead>
                    <TableHead>Wallet address</TableHead>
                    <TableHead className="w-[160px]">Client ID</TableHead>
                    <TableHead className="w-[280px]">Attached to client</TableHead>
                    <TableHead className="w-[180px]">Assigned at</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const p = profilesById[r.assigned_to];
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Badge variant="outline" className={networkBadgeClass(r.currency, r.network)}>
                            {networkLabel(r.currency, r.network)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs break-all max-w-[380px]">
                          {r.address}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {r.external_id ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {editingId === r.assigned_to ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(r.assigned_to);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                autoFocus
                                className="h-7 text-xs"
                                disabled={saving}
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => saveEdit(r.assigned_to)} disabled={saving} title="Save">
                                <Check className="h-3.5 w-3.5 text-success" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={cancelEdit} disabled={saving} title="Cancel">
                                <X className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          ) : p ? (
                            <div className="flex items-center gap-1 group">
                              <Link
                                to={`/backoffice/users/${r.assigned_to}`}
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {p.full_name ?? p.email ?? r.assigned_to}
                                {p.display_id != null && (
                                  <span className="text-muted-foreground"> #{p.display_id}</span>
                                )}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => startEdit(r.assigned_to, p.full_name)}
                                title="Edit client name"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground font-mono">{r.assigned_to.slice(0, 8)}…</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {r.assigned_at ? new Date(r.assigned_at).toLocaleString("de-DE") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => release(r)}
                            title="Detach from client and return address to pool"
                          >
                            <Undo2 className="h-3.5 w-3.5" /> Release
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
