import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

type Row = {
  tier: string;
  daily_trade_limit: number | null;
  daily_copy_trade_limit: number | null;
  yield_min_pct: number | null;
  yield_max_pct: number | null;
};

const TIER_ORDER = [
  "Starter",
  "Select",
  "Prestige",
  "Elite",
  "Emerald Club",
  "Diamond Club",
  "Sovereign Circle",
];

const AdminTierLimits = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from("tier_trade_limits").select("*");
    if (error) {
      toast.error(error.message);
    } else {
      const sorted = TIER_ORDER.map(
        (t) =>
          (data as Row[]).find((r) => r.tier === t) ?? {
            tier: t,
            daily_trade_limit: null,
            daily_copy_trade_limit: null,
            yield_min_pct: null,
            yield_max_pct: null,
          }
      );
      setRows(sorted);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const updateInt = (tier: string, key: keyof Row, value: string) => {
    const v = value.trim() === "" ? null : Math.max(0, Math.floor(Number(value)));
    setRows((prev) => prev.map((r) => (r.tier === tier ? { ...r, [key]: v } : r)));
  };

  const updateNum = (tier: string, key: keyof Row, value: string) => {
    const v = value.trim() === "" ? null : Math.max(0, Number(value));
    setRows((prev) => prev.map((r) => (r.tier === tier ? { ...r, [key]: v } : r)));
  };

  const save = async (row: Row) => {
    setSaving(row.tier);
    const { error } = await (supabase as any)
      .from("tier_trade_limits")
      .upsert({
        tier: row.tier,
        daily_trade_limit: row.daily_trade_limit,
        daily_copy_trade_limit: row.daily_copy_trade_limit,
        yield_min_pct: row.yield_min_pct,
        yield_max_pct: row.yield_max_pct,
      });
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success(`${row.tier} updated`);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Tier Trade Limits &amp; Yields</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Edit daily trade limits and monthly yield ranges per account tier. Yield values drive both the Account Types
          page and the copy-trading engine — change them here and every copy-trading subscription (including Crypto-Börse
          Strategies) re-targets the new monthly return.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-tier configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead className="w-32">Daily Trades</TableHead>
                  <TableHead className="w-32">Daily Copy Trades</TableHead>
                  <TableHead className="w-32">Yield Min %</TableHead>
                  <TableHead className="w-32">Yield Max %</TableHead>
                  <TableHead className="w-28 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.tier}>
                    <TableCell className="font-medium">{row.tier}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Unlimited"
                        value={row.daily_trade_limit ?? ""}
                        onChange={(e) => updateInt(row.tier, "daily_trade_limit", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Unlimited"
                        value={row.daily_copy_trade_limit ?? ""}
                        onChange={(e) => updateInt(row.tier, "daily_copy_trade_limit", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        placeholder="e.g. 10"
                        value={row.yield_min_pct ?? ""}
                        onChange={(e) => updateNum(row.tier, "yield_min_pct", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        placeholder="e.g. 12"
                        value={row.yield_max_pct ?? ""}
                        onChange={(e) => updateNum(row.tier, "yield_max_pct", e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => save(row)}
                        disabled={saving === row.tier}
                      >
                        {saving === row.tier ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Save className="h-4 w-4 mr-1" />Save</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Trade limits blank = <strong>unlimited</strong>. Yield values are <strong>monthly percentages</strong>
            (e.g. 12 = 12 % per month). Limits reset daily at 00:00 UTC.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTierLimits;
