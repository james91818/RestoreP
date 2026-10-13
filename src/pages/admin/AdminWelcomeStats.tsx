import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, Clock, Eye, Timer, RefreshCw, Monitor, Smartphone, Tablet,
  Globe, Activity, UserX, ArrowDownToLine, Signal, Search, X, CalendarIcon,
  CreditCard, CheckCircle2, XCircle, Loader2, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type Visit = {
  id: string;
  user_id: string | null;
  visitor_email: string | null;
  visitor_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  landed_at: string;
  left_at: string | null;
  time_spent_seconds: number | null;
  timer_expired: boolean | null;
  country: string | null;
  device_type: string | null;
};

type PaymentIntent = {
  id: string;
  user_id: string;
  amount_eur: number;
  status: string; // initiated | redirected | completed | cancelled
  source: string | null;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  profiles?: { full_name: string | null; email: string | null } | null;
};

const AdminWelcomeStats = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const dateFnsLocale = enUS;

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [referrerFilter, setReferrerFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [ipCountryCache, setIpCountryCache] = useState<Record<string, string>>({});

  const fetchVisits = async () => {
    setLoading(true);
    const [{ data: visitsData }, { data: intentsData }] = await Promise.all([
      supabase
        .from("welcome_page_visits")
        .select("*")
        .order("landed_at", { ascending: false })
        .limit(500),
      supabase
        .from("stripe_checkout_intents")
        .select("*, profiles:user_id(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (visitsData) setVisits(visitsData as Visit[]);
    if (intentsData) setIntents(intentsData as unknown as PaymentIntent[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchVisits();
    const channel = supabase
      .channel("welcome-visits")
      .on("postgres_changes", { event: "*", schema: "public", table: "welcome_page_visits" }, () => {
        fetchVisits();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stripe_checkout_intents" }, () => {
        fetchVisits();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Tick every 10s to update "active" timers
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Resolve country from IP for visits where it's missing/Unknown (uses free ipapi.co)
  useEffect(() => {
    const ipsToLookup = Array.from(new Set(
      visits
        .filter(v => v.ip_address && (!v.country || v.country === "Unknown"))
        .map(v => v.ip_address!)
    )).filter(ip => !ipCountryCache[ip]);

    if (ipsToLookup.length === 0) return;

    let cancelled = false;
    (async () => {
      const batch = ipsToLookup.slice(0, 25);
      const results = await Promise.allSettled(
        batch.map(async (ip) => {
          try {
            const res = await fetch(`https://ipapi.co/${ip}/country_name/`);
            if (!res.ok) return [ip, ""] as const;
            const text = (await res.text()).trim();
            return [ip, text && !text.toLowerCase().includes("error") ? text : ""] as const;
          } catch {
            return [ip, ""] as const;
          }
        })
      );
      if (cancelled) return;
      const updates: Record<string, string> = {};
      results.forEach(r => {
        if (r.status === "fulfilled" && r.value[1]) updates[r.value[0]] = r.value[1];
      });
      if (Object.keys(updates).length > 0) {
        setIpCountryCache(prev => ({ ...prev, ...updates }));
      }
    })();

    return () => { cancelled = true; };
  }, [visits, ipCountryCache]);

  // Computed stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayVisits = visits.filter(v => new Date(v.landed_at).toDateString() === today);

    // Active = no left_at and landed within last 15 minutes
    const activeVisitors = visits.filter(v =>
      !v.left_at && (now - new Date(v.landed_at).getTime()) < 15 * 60 * 1000
    );

    const totalVisits = visits.length;
    const timerExpiredCount = visits.filter(v => v.timer_expired).length;
    const leftEarly = visits.filter(v => v.left_at && !v.timer_expired).length;
    const stillActive = activeVisitors.length;

    const avgTimeSpent = visits.length > 0
      ? Math.round(visits.reduce((sum, v) => sum + (v.time_spent_seconds || 0), 0) / visits.length)
      : 0;

    // Longest session
    const longestSession = visits.reduce((max, v) => Math.max(max, v.time_spent_seconds || 0), 0);

    // Country breakdown
    const countryCounts = visits.reduce((acc, v) => {
      const c = v.country || "Unknown";
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Device breakdown
    const deviceCounts = visits.reduce((acc, v) => {
      const d = v.device_type || "unknown";
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Referrer breakdown
    const referrerCounts = visits.reduce((acc, v) => {
      const r = v.referrer ? new URL(v.referrer).hostname : "Direct";
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Last 7 days breakdown
    const last7Days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const label = format(d, "dd.MM", { locale: dateFnsLocale });
      last7Days.push({ label, count: visits.filter(v => new Date(v.landed_at).toDateString() === dateStr).length });
    }
    const maxDayCount = Math.max(1, ...last7Days.map(d => d.count));

    return {
      totalVisits,
      todayCount: todayVisits.length,
      activeVisitors,
      stillActive,
      timerExpiredCount,
      timerExpiredRate: totalVisits > 0 ? Math.round((timerExpiredCount / totalVisits) * 100) : 0,
      leftEarly,
      leftEarlyRate: totalVisits > 0 ? Math.round((leftEarly / totalVisits) * 100) : 0,
      avgTimeSpent,
      longestSession,
      countryCounts,
      deviceCounts,
      referrerCounts,
      last7Days,
      maxDayCount,
    };
  }, [visits, now, dateFnsLocale]);

  // Unique values for filter dropdowns
  const uniqueCountries = useMemo(
    () => Array.from(new Set(visits.map(v => v.country).filter(Boolean) as string[])).sort(),
    [visits]
  );
  const uniqueDevices = useMemo(
    () => Array.from(new Set(visits.map(v => v.device_type).filter(Boolean) as string[])).sort(),
    [visits]
  );
  const uniqueReferrers = useMemo(() => {
    const refs = new Set<string>();
    visits.forEach(v => {
      if (!v.referrer) { refs.add("__direct__"); return; }
      try { refs.add(new URL(v.referrer).hostname); } catch { refs.add("__direct__"); }
    });
    return Array.from(refs).sort();
  }, [visits]);

  // Filtered visits for the table
  const filteredVisits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visits.filter(v => {
      if (q) {
        const hay = `${v.visitor_name ?? ""} ${v.visitor_email ?? ""} ${v.ip_address ?? ""} ${v.country ?? ""} ${v.referrer ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (deviceFilter !== "all" && (v.device_type || "unknown") !== deviceFilter) return false;
      if (countryFilter !== "all" && (v.country || "") !== countryFilter) return false;
      if (referrerFilter !== "all") {
        let host = "__direct__";
        if (v.referrer) { try { host = new URL(v.referrer).hostname; } catch { /* ignore */ } }
        if (host !== referrerFilter) return false;
      }
      if (statusFilter !== "all") {
        const isActive = !v.left_at && (now - new Date(v.landed_at).getTime()) < 15 * 60 * 1000;
        const status = isActive ? "active" : v.timer_expired ? "expired" : v.left_at ? "left" : "inactive";
        if (status !== statusFilter) return false;
      }
      if (dateFrom) {
        const d = new Date(v.landed_at);
        const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (dateTo) {
        const d = new Date(v.landed_at);
        const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });
  }, [visits, search, statusFilter, deviceFilter, countryFilter, referrerFilter, dateFrom, dateTo, now]);

  const activeFilterCount =
    (search ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (deviceFilter !== "all" ? 1 : 0) +
    (countryFilter !== "all" ? 1 : 0) +
    (referrerFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setDeviceFilter("all");
    setCountryFilter("all"); setReferrerFilter("all");
    setDateFrom(undefined); setDateTo(undefined);
  };

  const formatDuration = (s: number | null) => {
    if (!s) return "–";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const DeviceIcon = ({ type }: { type: string | null }) => {
    if (type === "mobile") return <Smartphone className="h-4 w-4" />;
    if (type === "tablet") return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const liveElapsed = (landedAt: string) => {
    const seconds = Math.floor((now - new Date(landedAt).getTime()) / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Signal className="h-6 w-6 text-primary" />
            {"Welcome Page – Live Monitor"}
          </h1>
          <p className="text-muted-foreground text-sm">{"Real-time overview of all visitors"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchVisits} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {"Refresh"}
        </Button>
      </div>

      {/* Live Active Visitors Banner */}
      {stats.activeVisitors.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <Activity className="h-5 w-5 text-green-500" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <h3 className="font-semibold text-green-400">
                {stats.stillActive} {"visitor(s) currently active"}
              </h3>
            </div>
            <div className="space-y-2">
              {stats.activeVisitors.map(v => (
                <div key={v.id} className="flex items-center justify-between bg-background/60 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-medium">{v.visitor_name || "Anonymous"}</span>
                    {v.visitor_email && <span className="text-muted-foreground text-xs">{v.visitor_email}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <DeviceIcon type={v.device_type} />
                      <span className="capitalize">{v.device_type || "–"}</span>
                    </div>
                    {v.country && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>{v.country}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      <span>{liveElapsed(v.landed_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Process Tracking */}
      {(() => {
        const initiated = intents.filter(i => i.status === "initiated").length;
        const redirected = intents.filter(i => i.status === "redirected").length;
        const completed = intents.filter(i => i.status === "completed").length;
        const cancelled = intents.filter(i => i.status === "cancelled").length;
        const totalIntents = intents.length;
        const conversionRate = totalIntents > 0 ? Math.round((completed / totalIntents) * 100) : 0;
        const inProgress = intents.filter(i => {
          if (i.status !== "initiated" && i.status !== "redirected") return false;
          return (now - new Date(i.updated_at).getTime()) < 30 * 60 * 1000;
        });
        const recent = intents.slice(0, 15);

        const statusBadge = (status: string) => {
          if (status === "completed") return <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />{"Completed"}</Badge>;
          if (status === "cancelled") return <Badge variant="outline" className="text-muted-foreground"><XCircle className="h-3 w-3 mr-1" />{"Cancelled"}</Badge>;
          if (status === "redirected") return <Badge className="bg-warning/15 text-warning border-warning/30 hover:bg-warning/20"><ArrowRight className="h-3 w-3 mr-1" />{"Redirected"}</Badge>;
          return <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" />{"Initiated"}</Badge>;
        };

        return (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-primary" />
                {"Payment Process Tracking"}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  · {"Welcome page Stripe checkouts"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* KPI grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{"Total Attempts"}</span>
                  </div>
                  <p className="text-2xl font-bold">{totalIntents}</p>
                </div>
                <div className="rounded-lg border bg-primary/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{"Initiated"}</span>
                  </div>
                  <p className="text-2xl font-bold">{initiated}</p>
                </div>
                <div className="rounded-lg border bg-warning/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight className="h-4 w-4 text-warning" />
                    <span className="text-xs text-muted-foreground">{"Redirected"}</span>
                  </div>
                  <p className="text-2xl font-bold">{redirected}</p>
                </div>
                <div className="rounded-lg border bg-success/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-xs text-muted-foreground">{"Completed"}</span>
                  </div>
                  <p className="text-2xl font-bold text-success">{completed}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{"Cancelled"}</span>
                  </div>
                  <p className="text-2xl font-bold">{cancelled}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{"Conversion"}</span>
                  </div>
                  <p className="text-2xl font-bold">{conversionRate}%</p>
                </div>
              </div>

              {/* Currently in progress */}
              {inProgress.length > 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
                    </span>
                    <span className="text-sm font-semibold text-warning">
                      {inProgress.length} {"payment(s) currently in progress"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {inProgress.map(i => (
                      <div key={i.id} className="flex items-center justify-between text-xs bg-background/60 rounded px-2 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">
                            {i.profiles?.full_name || i.profiles?.email || "Unknown"}
                          </span>
                          <span className="text-muted-foreground truncate hidden md:inline">
                            {i.profiles?.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-semibold">€{Number(i.amount_eur).toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                          {statusBadge(i.status)}
                          <span className="text-muted-foreground">{formatDistanceToNow(new Date(i.updated_at), { addSuffix: true, locale: dateFnsLocale })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent attempts table */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  {"Recent payment attempts"}
                </div>
                {recent.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    {"No payment attempts yet"}
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{"Visitor"}</TableHead>
                          <TableHead>{"Amount"}</TableHead>
                          <TableHead>{"Status"}</TableHead>
                          <TableHead>{"Started"}</TableHead>
                          <TableHead>{"Last activity"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recent.map(i => (
                          <TableRow key={i.id}>
                            <TableCell>
                              <div className="font-medium text-sm">
                                {i.profiles?.full_name || "Unknown"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {i.profiles?.email || "–"}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-semibold">
                              €{Number(i.amount_eur).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>{statusBadge(i.status)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(i.created_at), "dd.MM.yyyy HH:mm", { locale: dateFnsLocale })}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(i.updated_at), { addSuffix: true, locale: dateFnsLocale })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{"Total"}</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalVisits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">{"Today"}</span>
            </div>
            <p className="text-2xl font-bold">{stats.todayCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">{"Active Now"}</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{stats.stillActive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">{"Avg. Duration"}</span>
            </div>
            <p className="text-2xl font-bold">{formatDuration(stats.avgTimeSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">{"Timer Expired"}</span>
            </div>
            <p className="text-2xl font-bold">{stats.timerExpiredRate}%</p>
            <p className="text-xs text-muted-foreground">{stats.timerExpiredCount} {"of"} {stats.totalVisits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <UserX className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">{"Left Early"}</span>
            </div>
            <p className="text-2xl font-bold">{stats.leftEarlyRate}%</p>
            <p className="text-xs text-muted-foreground">{stats.leftEarly} {"of"} {stats.totalVisits}</p>
          </CardContent>
        </Card>
      </div>

      {/* 7 Day Chart + Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-day mini chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">{"Last 7 Days"}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-24">
              {stats.last7Days.map((day) => (
                <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">{day.count}</span>
                  <div
                    className="w-full bg-primary/80 rounded-t-sm transition-all"
                    style={{ height: `${(day.count / stats.maxDayCount) * 100}%`, minHeight: day.count > 0 ? 4 : 1 }}
                  />
                  <span className="text-[10px] text-muted-foreground">{day.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Device + Country breakdown */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{"Devices"}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.deviceCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  <DeviceIcon type={type} />
                  <span className="capitalize text-sm flex-1">{type}</span>
                  <span className="text-sm font-medium">{count}</span>
                  <Progress value={(count / stats.totalVisits) * 100} className="w-20 h-1.5" />
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{"Countries"}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.countryCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([country, count]) => (
                <div key={country} className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm flex-1">{country}</span>
                  <span className="text-sm font-medium">{count}</span>
                  <Progress value={(count / stats.totalVisits) * 100} className="w-20 h-1.5" />
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Referrer breakdown */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{"Traffic Sources"}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats.referrerCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([source, count]) => (
                <div key={source} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                  <ArrowDownToLine className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{source}</span>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Visit log table */}
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {"Visit Log"}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filteredVisits.length} / {visits.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                  <X className="h-3.5 w-3.5 mr-1" /> {"Clear filters"}
                </Button>
              )}
              <span className="text-xs text-muted-foreground">{"Last 500 entries"}</span>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={"Name, email, IP, referrer..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{"All statuses"}</SelectItem>
                <SelectItem value="active">{"Active"}</SelectItem>
                <SelectItem value="expired">{"Timer Expired"}</SelectItem>
                <SelectItem value="left">{"Left"}</SelectItem>
                <SelectItem value="inactive">{"Inactive"}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="h-9 w-[130px] text-sm"><SelectValue placeholder="Device" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{"All devices"}</SelectItem>
                {uniqueDevices.map(d => (
                  <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">{"All countries"}</SelectItem>
                {uniqueCountries.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={referrerFilter} onValueChange={setReferrerFilter}>
              <SelectTrigger className="h-9 w-[180px] text-sm"><SelectValue placeholder="Referrer" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">{"All sources"}</SelectItem>
                {uniqueReferrers.map(r => (
                  <SelectItem key={r} value={r}>{r === "__direct__" ? "Direct" : r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 text-sm font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                  {dateFrom ? format(dateFrom, "dd.MM.yyyy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 text-sm font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                  {dateTo ? format(dateTo, "dd.MM.yyyy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{"Timestamp"}</TableHead>
                  <TableHead>{"Visitor"}</TableHead>
                  <TableHead>IP / {"Country"}</TableHead>
                  <TableHead>{"Device"}</TableHead>
                  <TableHead>{"Duration"}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Referrer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits.map(v => {
                  const isActive = !v.left_at && (now - new Date(v.landed_at).getTime()) < 15 * 60 * 1000;
                  const resolvedCountry = v.country && v.country !== "Unknown"
                    ? v.country
                    : (v.ip_address ? ipCountryCache[v.ip_address] : null);
                  return (
                    <TableRow key={v.id} className={isActive ? "bg-green-500/5" : ""}>
                      <TableCell className="whitespace-nowrap text-xs">
                        <div>{format(new Date(v.landed_at), "dd.MM.yyyy HH:mm", { locale: dateFnsLocale })}</div>
                        <div className="text-muted-foreground text-[10px]">
                          {formatDistanceToNow(new Date(v.landed_at), { addSuffix: true, locale: dateFnsLocale })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{v.visitor_name || "–"}</div>
                        <div className="text-xs text-muted-foreground">{v.visitor_email || "–"}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono">{v.ip_address || "–"}</div>
                        <div className="flex items-center gap-1 text-muted-foreground text-[11px] mt-0.5">
                          <Globe className="h-3 w-3" />
                          <span>{resolvedCountry || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <DeviceIcon type={v.device_type} />
                          <span className="text-xs capitalize">{v.device_type || "–"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium font-mono">
                        {isActive ? liveElapsed(v.landed_at) : formatDuration(v.time_spent_seconds)}
                      </TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                            {"Active"}
                          </Badge>
                        ) : v.timer_expired ? (
                          <Badge variant="destructive" className="text-xs">{"Timer Expired"}</Badge>
                        ) : v.left_at ? (
                          <Badge variant="secondary" className="text-xs">{"Left"}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">{"Inactive"}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{v.referrer || "direct"}</TableCell>
                    </TableRow>
                  );
                })}
                {filteredVisits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {visits.length === 0
                        ? "No visits recorded yet"
                        : "No results match your filters"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWelcomeStats;
