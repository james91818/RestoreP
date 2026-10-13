import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  CalendarIcon,
  Users,
  DollarSign,
  Repeat,
  TrendingUp,
  Crown,
  Search,
} from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, subMonths, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface DepositRow {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  created_at: string;
  status: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  display_id: number;
  affiliate: string | null;
  funnel: string | null;
  country: string | null;
  first_deposit_at: string | null;
  ftd_agent: string | null;
  assigned_agent: string | null;
}

interface PlayerStat {
  profile: ProfileRow;
  agentName: string | null;
  ftdAt: string;
  retentionDeposits: number; // count of post-FTD deposits
  retentionVolume: number; // sum of post-FTD deposit amounts
  lastDepositAt: string | null;
  daysSinceFtd: number;
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtEur2 = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const AdminRetentionStats = () => {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const [affiliateFilter, setAffiliateFilter] = useState("all");
  const [funnelFilter, setFunnelFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfDay(new Date()));

  useEffect(() => {
    fetchAll();
    // Silent background refresh — don't reload on tab focus, don't show full-page spinner
    const interval = setInterval(() => {
      if (!document.hidden) fetchAll({ silent: true });
    }, 60000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchAll = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    // Exclude staff
    const { data: staffRoles } = await supabase.from("user_roles").select("user_id");
    const staffIds = new Set((staffRoles ?? []).map((r) => r.user_id));

    // 1) Fetch ALL depositor profiles (first_deposit_at not null) — paginated
    let allProfiles: ProfileRow[] = [];
    let from = 0;
    const batch = 1000;
    while (true) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, display_id, affiliate, funnel, country, first_deposit_at, ftd_agent, assigned_agent")
        .not("first_deposit_at", "is", null)
        .order("first_deposit_at", { ascending: false })
        .range(from, from + batch - 1);
      if (!data || data.length === 0) break;
      allProfiles = allProfiles.concat(data as ProfileRow[]);
      if (data.length < batch) break;
      from += batch;
    }
    const depositorProfiles = allProfiles.filter((p) => !staffIds.has(p.id));
    setProfiles(depositorProfiles);

    // 2) Fetch all approved deposits — paginated
    let allDeps: DepositRow[] = [];
    let dfrom = 0;
    while (true) {
      const { data } = await supabase
        .from("deposits")
        .select("id, user_id, amount, currency, created_at, status")
        .eq("status", "approved")
        .order("created_at", { ascending: true })
        .range(dfrom, dfrom + batch - 1);
      if (!data || data.length === 0) break;
      allDeps = allDeps.concat(data as DepositRow[]);
      if (data.length < batch) break;
      dfrom += batch;
    }
    setDeposits(allDeps);

    // 3) Resolve agent names
    const agentIdSet = new Set<string>();
    depositorProfiles.forEach((p) => {
      if (p.ftd_agent) agentIdSet.add(p.ftd_agent);
      if (p.assigned_agent) agentIdSet.add(p.assigned_agent);
    });
    if (agentIdSet.size) {
      const { data: agents } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", Array.from(agentIdSet));
      const map: Record<string, string> = {};
      (agents ?? []).forEach((a: any) => {
        map[a.id] = a.full_name || a.email || "—";
      });
      setAgentNames(map);
    }

    setLastFetchedAt(new Date());
    setLoading(false);
  };

  const affiliates = useMemo(() => {
    const set = new Set(profiles.map((p) => p.affiliate).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [profiles]);

  const funnels = useMemo(() => {
    const set = new Set(profiles.map((p) => p.funnel).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [profiles]);

  const agentOptions = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => {
      if (p.ftd_agent) set.add(p.ftd_agent);
    });
    return Array.from(set)
      .map((id) => ({ id, name: agentNames[id] || "—" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, agentNames]);

  // Build per-player stats — strictly POST-FTD deposits only (FTD itself excluded)
  const players = useMemo<PlayerStat[]>(() => {
    // Group deposits by user
    const byUser = new Map<string, DepositRow[]>();
    deposits.forEach((d) => {
      if (!byUser.has(d.user_id)) byUser.set(d.user_id, []);
      byUser.get(d.user_id)!.push(d);
    });

    const result: PlayerStat[] = [];
    profiles.forEach((p) => {
      if (!p.first_deposit_at) return;
      const ftdTime = new Date(p.first_deposit_at).getTime();
      const userDeps = byUser.get(p.id) ?? [];

      // Identify FTD deposit row: earliest approved deposit (or closest match to first_deposit_at)
      const sorted = [...userDeps].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      // The first deposit is excluded — everything strictly after it counts as retention
      const retentionDeps = sorted.slice(1);

      const retentionVolume = retentionDeps.reduce((s, d) => s + Number(d.amount || 0), 0);
      const lastDepositAt =
        retentionDeps.length > 0 ? retentionDeps[retentionDeps.length - 1].created_at : null;

      result.push({
        profile: p,
        agentName: p.ftd_agent ? agentNames[p.ftd_agent] ?? null : null,
        ftdAt: p.first_deposit_at,
        retentionDeposits: retentionDeps.length,
        retentionVolume,
        lastDepositAt,
        daysSinceFtd: Math.floor((Date.now() - ftdTime) / (1000 * 60 * 60 * 24)),
      });
    });
    return result;
  }, [profiles, deposits, agentNames]);

  // Apply filters (affiliate / funnel / agent / search) to player base
  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((pl) => {
      const p = pl.profile;
      if (affiliateFilter !== "all" && p.affiliate !== affiliateFilter) return false;
      if (funnelFilter !== "all" && p.funnel !== funnelFilter) return false;
      if (agentFilter !== "all" && p.ftd_agent !== agentFilter) return false;
      if (q) {
        const hay = `${p.full_name ?? ""} ${p.email ?? ""} #${p.display_id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [players, affiliateFilter, funnelFilter, agentFilter, search]);

  // Period-scoped retention deposits (volume & count) — only deposits whose timestamp falls in [from, to]
  // AND that are NOT a player's FTD deposit
  const periodStats = useMemo(() => {
    const from = startOfDay(dateFrom).getTime();
    const to = endOfDay(dateTo).getTime();
    const includedUserIds = new Set(filteredPlayers.map((pl) => pl.profile.id));
    const ftdByUser = new Map(filteredPlayers.map((pl) => [pl.profile.id, new Date(pl.ftdAt).getTime()]));

    let volume = 0;
    let count = 0;
    const activeUsers = new Set<string>();

    deposits.forEach((d) => {
      if (!includedUserIds.has(d.user_id)) return;
      const t = new Date(d.created_at).getTime();
      if (t < from || t > to) return;
      // Strictly exclude the user's first deposit
      const ftdT = ftdByUser.get(d.user_id);
      if (ftdT !== undefined && t <= ftdT) return;
      volume += Number(d.amount || 0);
      count += 1;
      activeUsers.add(d.user_id);
    });
    return { volume, count, activeUsers: activeUsers.size };
  }, [deposits, filteredPlayers, dateFrom, dateTo]);

  // Total / lifetime aggregates (across all time, excluding FTDs)
  const totalRetentionVolume = useMemo(
    () => filteredPlayers.reduce((s, p) => s + p.retentionVolume, 0),
    [filteredPlayers]
  );
  const totalRetentionDeposits = useMemo(
    () => filteredPlayers.reduce((s, p) => s + p.retentionDeposits, 0),
    [filteredPlayers]
  );
  const repeatDepositors = useMemo(
    () => filteredPlayers.filter((p) => p.retentionDeposits > 0).length,
    [filteredPlayers]
  );
  const totalDepositors = filteredPlayers.length;
  const repeatRate = totalDepositors > 0 ? (repeatDepositors / totalDepositors) * 100 : 0;
  const avgPlayerValue = totalDepositors > 0 ? totalRetentionVolume / totalDepositors : 0;
  const avgRetentionDeposit =
    totalRetentionDeposits > 0 ? totalRetentionVolume / totalRetentionDeposits : 0;

  // Top players by post-FTD volume
  const topPlayers = useMemo(() => {
    return [...filteredPlayers]
      .filter((p) => p.retentionDeposits > 0)
      .sort((a, b) => b.retentionVolume - a.retentionVolume)
      .slice(0, 50);
  }, [filteredPlayers]);

  const DatePicker = ({
    date,
    onChange,
    label,
  }: {
    date: Date;
    onChange: (d: Date) => void;
    label: string;
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start text-left font-normal w-[170px]", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onChange(d)}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Retention Stats</h1>
          <p className="text-muted-foreground text-sm">
            Player values & depositor activity <span className="font-medium">after the first payment</span> (FTD excluded)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastFetchedAt && (
            <span className="text-xs text-muted-foreground">
              Updated {format(lastFetchedAt, "HH:mm:ss")}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={() => fetchAll()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <DatePicker date={dateFrom} onChange={setDateFrom} label="Start date" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <DatePicker date={dateTo} onChange={setDateTo} label="End date" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Affiliate</label>
          <Select value={affiliateFilter} onValueChange={setAffiliateFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Affiliates</SelectItem>
              {affiliates.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Funnel</label>
          <Select value={funnelFilter} onValueChange={setFunnelFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Funnels</SelectItem>
              {funnels.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">FTD Agent</label>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agentOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(() => {
          const today = startOfDay(new Date());
          const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          const monthStart = startOfMonth(new Date());
          const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
          const lastMonthEnd = endOfDay(new Date(startOfMonth(new Date()).getTime() - 1));
          return (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setDateFrom(today); setDateTo(endOfDay(new Date())); }}>Today</Button>
              <Button size="sm" variant="outline" onClick={() => { setDateFrom(weekStart); setDateTo(endOfDay(new Date())); }}>Week</Button>
              <Button size="sm" variant="outline" onClick={() => { setDateFrom(monthStart); setDateTo(endOfDay(new Date())); }}>Month</Button>
              <Button size="sm" variant="outline" onClick={() => { setDateFrom(lastMonthStart); setDateTo(lastMonthEnd); }}>Last Month</Button>
            </div>
          );
        })()}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm py-8">Loading…</p>
      ) : (
        <>
          {/* PERIOD KPIs (post-FTD deposits in selected window) */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              In Selected Period
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Retention Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold tabular-nums">{fmtEur(periodStats.volume)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Sum of all deposits after FTD</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Retention Deposits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Repeat className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold tabular-nums">{periodStats.count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Approved post-FTD payments</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Depositors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold tabular-nums">{periodStats.activeUsers}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Players who deposited again</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* LIFETIME KPIs (all-time post-FTD across filtered base) */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Lifetime (All-Time, Post-FTD)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Retention Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold tabular-nums">{fmtEur(totalRetentionVolume)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{totalRetentionDeposits} deposits</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Repeat Depositors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Repeat className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold tabular-nums">{repeatDepositors}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {repeatRate.toFixed(1)}% of {totalDepositors} depositors
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Player Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold tabular-nums">{fmtEur(avgPlayerValue)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Per depositor (all)</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Retention Deposit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold tabular-nums">{fmtEur(avgRetentionDeposit)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Per post-FTD payment</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* TOP PLAYERS TABLE */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base">Top Players by Post-FTD Volume</CardTitle>
              <div className="relative w-72 max-w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email or #ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {topPlayers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No repeat depositors match the current filters.
                </p>
              ) : (
                <div className="max-h-[560px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>FTD Agent</TableHead>
                        <TableHead>FTD Date</TableHead>
                        <TableHead className="text-right">Retention Deposits</TableHead>
                        <TableHead className="text-right">Retention Volume</TableHead>
                        <TableHead>Last Deposit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPlayers.map((pl) => (
                        <TableRow key={pl.profile.id}>
                          <TableCell className="text-muted-foreground tabular-nums">
                            {pl.profile.display_id}
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/backoffice/users/${pl.profile.id}`}
                              className="font-medium hover:underline"
                            >
                              {pl.profile.full_name || pl.profile.email || "—"}
                            </Link>
                            <div className="text-xs text-muted-foreground">{pl.profile.email}</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {pl.profile.country || "—"}
                          </TableCell>
                          <TableCell className="text-sm">{pl.agentName || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(pl.ftdAt), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{pl.retentionDeposits}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {fmtEur2(pl.retentionVolume)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {pl.lastDepositAt ? format(new Date(pl.lastDepositAt), "dd MMM yyyy") : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminRetentionStats;
