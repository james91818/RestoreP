import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bitcoin, Upload, Trash2, AlertTriangle, FileUp, CheckCircle2, Coins } from "lucide-react";

type AssetKey = "BTC_BTC" | "USDT_TRC20" | "USDT_ERC20" | "LTC_LTC";

const ASSETS: Record<AssetKey, { currency: string; network: string; label: string; regex: RegExp; placeholder: string }> = {
  BTC_BTC: {
    currency: "BTC",
    network: "Bitcoin",
    label: "BTC (Bitcoin)",
    regex: /^(bc1[a-z0-9]{8,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    placeholder: "bc1q...\nbc1q...\n1A1z...",
  },
  USDT_TRC20: {
    currency: "USDT",
    network: "TRC20",
    label: "USDT (TRC20)",
    regex: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
    placeholder: "TXY...\nTAb...",
  },
  USDT_ERC20: {
    currency: "USDT",
    network: "ERC20",
    label: "USDT (ERC20)",
    regex: /^0x[a-fA-F0-9]{40}$/,
    placeholder: "0xabc...\n0xdef...",
  },
  LTC_LTC: {
    currency: "LTC",
    network: "Litecoin",
    label: "LTC (Litecoin)",
    regex: /^(ltc1[a-z0-9]{8,87}|[LM3][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    placeholder: "ltc1q...\nLXy...\nMxy...",
  },
};

type PoolRow = {
  id: string;
  address: string;
  external_id: string | null;
  label: string | null;
  is_used: boolean;
  assigned_to: string | null;
  assigned_at: string | null;
  created_at: string;
  currency: string;
  network: string;
};

const BtcAddressPoolManager = () => {
  const [activeTab, setActiveTab] = useState<AssetKey>("BTC_BTC");
  const [rows, setRows] = useState<PoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pasteText, setPasteText] = useState("");
  const [importing, setImporting] = useState(false);
  const [profilesById, setProfilesById] = useState<Record<string, { full_name: string | null; email: string | null; display_id: number | null }>>({});
  const fileRef = useRef<HTMLInputElement | null>(null);

  const fetchPool = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("btc_address_pool" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      toast.error("Failed to load pool: " + error.message);
      setRows([]);
    } else {
      const list = (data ?? []) as unknown as PoolRow[];
      setRows(list);
      const ids = Array.from(new Set(list.map((r) => r.assigned_to).filter(Boolean) as string[]));
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email, display_id")
          .in("id", ids);
        const map: Record<string, any> = {};
        (profs ?? []).forEach((p) => (map[p.id] = p));
        setProfilesById(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchPool(); }, []);

  const parseInput = (text: string): { address: string; external_id: string | null }[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out: { address: string; external_id: string | null }[] = [];
    for (const raw of lines) {
      if (/^address/i.test(raw) && raw.length < 20) continue;
      const address = raw.split(/[,;\t\s]/)[0]?.trim();
      if (!address) continue;
      out.push({ address, external_id: null });
    }
    return out;
  };

  const doImport = async (text: string) => {
    const asset = ASSETS[activeTab];
    const parsed = parseInput(text);
    if (parsed.length === 0) {
      toast.error("No addresses found");
      return;
    }
    const valid: typeof parsed = [];
    const invalid: string[] = [];
    for (const p of parsed) {
      if (asset.regex.test(p.address)) valid.push(p);
      else invalid.push(p.address);
    }
    if (valid.length === 0) {
      toast.error(`No valid ${asset.label} addresses found`);
      return;
    }
    setImporting(true);
    const { data: userData } = await supabase.auth.getUser();
    const created_by = userData.user?.id ?? null;

    const payload = valid.map((p) => ({
      address: p.address,
      external_id: p.external_id,
      currency: asset.currency,
      network: asset.network,
      created_by,
    }));

    const { error, count } = await supabase
      .from("btc_address_pool" as any)
      .upsert(payload, { onConflict: "currency,network,address", ignoreDuplicates: true, count: "exact" });

    setImporting(false);
    if (error) {
      toast.error("Import failed: " + error.message);
      return;
    }
    toast.success(
      `Imported ${count ?? valid.length} ${asset.label} address${(count ?? valid.length) === 1 ? "" : "es"}` +
      (invalid.length > 0 ? ` — skipped ${invalid.length} invalid` : "")
    );
    setPasteText("");
    fetchPool();
  };

  const onPickFile = async (file: File) => {
    const text = await file.text();
    await doImport(text);
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = async (id: string, isUsed: boolean) => {
    if (isUsed && !confirm("This address is already assigned to a client. Remove from pool only? (Client wallet stays attached.)")) return;
    if (!isUsed && !confirm("Remove this unused address from the pool?")) return;
    const { error } = await supabase.from("btc_address_pool" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); fetchPool(); }
  };

  const asset = ASSETS[activeTab];
  const filteredRows = rows.filter((r) => r.currency === asset.currency && r.network === asset.network);
  const total = filteredRows.length;
  const used = filteredRows.filter((r) => r.is_used).length;
  const available = total - used;
  const lowPool = available <= 5;

  const renderStat = (key: AssetKey) => {
    const a = ASSETS[key];
    const r = rows.filter((x) => x.currency === a.currency && x.network === a.network);
    const av = r.filter((x) => !x.is_used).length;
    return `${av}/${r.length}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Crypto Address Pools
          </CardTitle>
          <CardDescription>
            Pre-generated wallet addresses for BTC, USDT (TRC20) and USDT (ERC20). When a client's first deposit is approved, one address from each pool is automatically assigned to them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AssetKey)}>
            <TabsList className="w-full justify-start flex-wrap h-auto">
              <TabsTrigger value="BTC_BTC" className="gap-1.5">
                <Bitcoin className="h-3.5 w-3.5" /> BTC <span className="text-xs text-muted-foreground ml-1">({renderStat("BTC_BTC")})</span>
              </TabsTrigger>
              <TabsTrigger value="USDT_TRC20" className="gap-1.5">
                <Coins className="h-3.5 w-3.5" /> USDT TRC20 <span className="text-xs text-muted-foreground ml-1">({renderStat("USDT_TRC20")})</span>
              </TabsTrigger>
              <TabsTrigger value="USDT_ERC20" className="gap-1.5">
                <Coins className="h-3.5 w-3.5" /> USDT ERC20 <span className="text-xs text-muted-foreground ml-1">({renderStat("USDT_ERC20")})</span>
              </TabsTrigger>
              <TabsTrigger value="LTC_LTC" className="gap-1.5">
                <Coins className="h-3.5 w-3.5" /> LTC <span className="text-xs text-muted-foreground ml-1">({renderStat("LTC_LTC")})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-2xl font-semibold tabular-nums">{total}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Used</div>
                  <div className="text-2xl font-semibold tabular-nums">{used}</div>
                </div>
                <div className={`rounded-lg border p-3 ${lowPool ? "border-destructive/50 bg-destructive/5" : ""}`}>
                  <div className="text-xs text-muted-foreground">Available</div>
                  <div className={`text-2xl font-semibold tabular-nums ${lowPool ? "text-destructive" : "text-success"}`}>{available}</div>
                </div>
              </div>

              {lowPool && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Only {available} {asset.label} address{available === 1 ? "" : "es"} left. Import more before the pool runs out.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium">Import {asset.label} addresses</div>
                <p className="text-xs text-muted-foreground">
                  Paste one wallet address per line.
                </p>
                <Textarea
                  placeholder={asset.placeholder}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => doImport(pasteText)} disabled={importing || !pasteText.trim()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import from text
                  </Button>
                  <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
                    <FileUp className="h-4 w-4 mr-2" />
                    Upload CSV file
                  </Button>
                  <Input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{asset.label} wallets ({filteredRows.length})</CardTitle>
          <CardDescription>Showing the {asset.label} pool only. Switch tabs above to see other networks.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No {asset.label} addresses imported yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Wallet</TableHead>
                    <TableHead className="w-[200px]">Client ID</TableHead>
                    <TableHead className="w-[260px]">Client name</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => {
                    const p = r.assigned_to ? profilesById[r.assigned_to] : null;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs break-all max-w-[380px]">
                          {r.address}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {p?.display_id != null ? `#${p.display_id}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {p ? (
                            <span>
                              {p.full_name ?? p.email ?? r.assigned_to}
                              {p.display_id != null && (
                                <span className="text-muted-foreground"> #{p.display_id}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => remove(r.id, r.is_used)}>
                            <Trash2 className="h-4 w-4" />
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
};

export default BtcAddressPoolManager;
