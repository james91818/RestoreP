import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import TablePagination from "@/components/admin/TablePagination";

// Format prices with adaptive precision so tiny coins like SHIB don't show as 0
const fmtPrice = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  if (!isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  let digits = 2;
  if (abs < 0.0001) digits = 8;
  else if (abs < 0.01) digits = 6;
  else if (abs < 1) digits = 4;
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const PnlSummary = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "90d" | "all">("30d");
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [period]);

  useEffect(() => {
    if (!user) return;
    const fetchTrades = async () => {
      const { data } = await supabase
        .from("trades")
        .select("*, assets(symbol, name, type)")
        .eq("user_id", user.id)
        .eq("status", "closed")
        .order("closed_at", { ascending: false });
      setTrades(data ?? []);
      setLoading(false);
    };
    fetchTrades();
  }, [user]);

  const filteredTrades = useMemo(() => {
    if (period === "all") return trades;
    if (period === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return trades.filter(t => new Date(t.closed_at) >= todayStart);
    }
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return trades.filter(t => new Date(t.closed_at) >= cutoff);
  }, [trades, period]);

  const stats = useMemo(() => {
    const totalPnl = filteredTrades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
    const wins = filteredTrades.filter(t => Number(t.pnl ?? 0) > 0);
    const losses = filteredTrades.filter(t => Number(t.pnl ?? 0) < 0);
    const winRate = filteredTrades.length > 0 ? (wins.length / filteredTrades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + Number(t.pnl), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + Number(t.pnl), 0) / losses.length : 0;
    const bestTrade = filteredTrades.length > 0 ? Math.max(...filteredTrades.map(t => Number(t.pnl ?? 0))) : 0;
    const worstTrade = filteredTrades.length > 0 ? Math.min(...filteredTrades.map(t => Number(t.pnl ?? 0))) : 0;
    const totalVolume = filteredTrades.reduce((s, t) => s + Number(t.size ?? 0), 0);
    return { totalPnl, wins: wins.length, losses: losses.length, winRate, avgWin, avgLoss, bestTrade, worstTrade, totalVolume, totalTrades: filteredTrades.length };
  }, [filteredTrades]);

  // Daily P&L chart data
  const dailyPnl = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTrades.forEach(t => {
      const day = new Date(t.closed_at).toLocaleDateString("en-CA");
      map[day] = (map[day] ?? 0) + Number(t.pnl ?? 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pnl]) => ({ date: new Date(date).toLocaleDateString("en-GB", { month: "short", day: "numeric" }), pnl: +pnl.toFixed(2) }));
  }, [filteredTrades]);

  // Cumulative P&L
  const cumulativePnl = useMemo(() => {
    let cumulative = 0;
    return dailyPnl.map(d => {
      cumulative += d.pnl;
      return { ...d, cumulative: +cumulative.toFixed(2) };
    });
  }, [dailyPnl]);

  // By asset type
  const byAssetType = useMemo(() => {
    const map: Record<string, { pnl: number; count: number }> = {};
    filteredTrades.forEach(t => {
      const type = t.assets?.type ?? "unknown";
      if (!map[type]) map[type] = { pnl: 0, count: 0 };
      map[type].pnl += Number(t.pnl ?? 0);
      map[type].count += 1;
    });
    return Object.entries(map).map(([name, val]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), ...val, pnl: +val.pnl.toFixed(2) }));
  }, [filteredTrades]);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--destructive))", "#f59e0b", "#8b5cf6"];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading P&L data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-display font-bold">{t("Gewinne und Verluste", "Profits and Losses")}</h1>
           <p className="text-muted-foreground text-sm">{t("Verfolgen Sie Ihre Handelsperformance", "Track your trading performance")}</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
              <SelectItem value="today">{t("Heute", "Today")}</SelectItem>
              <SelectItem value="7d">{t("Letzte 7 Tage", "Last 7 Days")}</SelectItem>
              <SelectItem value="30d">{t("Letzte 30 Tage", "Last 30 Days")}</SelectItem>
              <SelectItem value="90d">{t("Letzte 90 Tage", "Last 90 Days")}</SelectItem>
              <SelectItem value="all">{t("Gesamt", "All Time")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("Gesamt G&V", "Total P&L")}</span>
            </div>
            <p className={`text-xl font-display font-bold ${stats.totalPnl >= 0 ? "text-success" : "text-destructive"}`}>
              {stats.totalPnl >= 0 ? "+" : ""}€{stats.totalPnl.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("Gewinnrate", "Win Rate")}</span>
            </div>
            <p className="text-xl font-display font-bold">{stats.winRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">{stats.wins}W / {stats.losses}L</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
               <span className="text-xs text-muted-foreground">{t("Trades gesamt", "Total Trades")}</span>
             </div>
             <p className="text-xl font-display font-bold">{stats.totalTrades}</p>
             <p className="text-xs text-muted-foreground">€{stats.totalVolume.toLocaleString()} {t("Volumen", "Volume")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("Bester / Schlechtester", "Best / Worst")}</span>
            </div>
            <p className="text-sm font-bold text-success">+€{stats.bestTrade.toFixed(2)}</p>
            <p className="text-sm font-bold text-destructive">€{stats.worstTrade.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Cumulative P&L Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">{t("Kumulative G&V", "Cumulative P&L")}</CardTitle>
          </CardHeader>
          <CardContent>
            {cumulativePnl.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-12">{t("Keine geschlossenen Trades in diesem Zeitraum", "No closed trades in this period")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={cumulativePnl}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [`€${value.toFixed(2)}`, "Cumulative P&L"]}
                  />
                  <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Daily P&L Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">{t("Tägliche G&V", "Daily P&L")}</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyPnl.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">{t("Keine geschlossenen Trades in diesem Zeitraum", "No closed trades in this period")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyPnl}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [`€${value.toFixed(2)}`, "P&L"]}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dailyPnl.map((entry, index) => (
                      <Cell key={index} fill={entry.pnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* P&L by Asset Type */}
      {byAssetType.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">{t("G&V nach Assettyp", "P&L by Asset Type")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {byAssetType.map((item, i) => (
                <div key={item.name} className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className={`text-lg font-bold ${item.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                    {item.pnl >= 0 ? "+" : ""}€{item.pnl.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.count} Trades</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Closed Trades */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">{t("Letzte geschlossene Trades", "Recent Closed Trades")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Asset</th>
                   <th className="text-left p-3 font-medium text-muted-foreground">{t("Richtung", "Direction")}</th>
                   <th className="text-left p-3 font-medium text-muted-foreground">{t("Größe", "Size")}</th>
                   <th className="text-left p-3 font-medium text-muted-foreground">{t("Einstieg", "Entry")}</th>
                   <th className="text-left p-3 font-medium text-muted-foreground">{t("Ausstieg", "Exit")}</th>
                   <th className="text-left p-3 font-medium text-muted-foreground">{t("G&V", "P&L")}</th>
                   <th className="text-left p-3 font-medium text-muted-foreground">{t("Datum", "Date")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(tr => (
                  <tr key={tr.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{tr.assets?.symbol ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant={tr.direction === "buy" ? "default" : "destructive"} className="text-[10px]">
                        {tr.direction.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3">€{Number(tr.size).toLocaleString()}</td>
                    <td className="p-3">{fmtPrice(tr.entry_price)}</td>
                    <td className="p-3">{tr.current_price ? fmtPrice(tr.current_price) : "—"}</td>
                    <td className={`p-3 font-semibold ${Number(tr.pnl) >= 0 ? "text-success" : "text-destructive"}`}>
                      {Number(tr.pnl) >= 0 ? "+" : ""}€{Number(tr.pnl).toFixed(2)}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(tr.closed_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filteredTrades.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{t("Keine geschlossenen Trades in diesem Zeitraum", "No closed trades in this period")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            totalItems={filteredTrades.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            previousLabel={t("Zurück", "Previous")}
            nextLabel={t("Weiter", "Next")}
            countLabel={(from, to, total) => t(`${from}–${to} von ${total} Trades`, `${from}–${to} of ${total} trades`)}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PnlSummary;
