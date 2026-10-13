import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, TrendingUp, Users, DollarSign, Percent, XCircle, Star, UserCheck } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, subDays, subMonths, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  created_at: string;
  is_lead: boolean | null;
  first_deposit_at: string | null;
  affiliate: string | null;
  funnel: string | null;
  status: string | null;
  email: string | null;
  original_email: string | null;
  full_name: string | null;
  shaved_to: string | null;
  shaved_from: string | null;
  country: string | null;
  phone: string | null;
}

interface CanonicalProfile extends Profile {
  effectiveAffiliate: string | null;
  effectiveCreatedAt: string;
  effectiveFirstDepositAt: string | null;
  effectiveFunnel: string | null;
  effectiveStatus: string | null;
  effectiveCountry: string | null;
  isShaved: boolean;
}

const AdminConversionStats = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invalidStatuses, setInvalidStatuses] = useState<Set<string>>(new Set());
  const [potentialStatuses, setPotentialStatuses] = useState<Set<string>>(new Set());
  const [statusColors, setStatusColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [affiliateFilter, setAffiliateFilter] = useState("all");
  const [funnelFilter, setFunnelFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>(startOfDay(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfDay(new Date()));
  const [shavedIncluded, setShavedIncluded] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "depositors">("all");

  useEffect(() => {
    fetchProfiles();
    fetchInvalidStatuses();
    // Silent background refresh — no full-page loading state, no refetch on tab focus
    const interval = setInterval(() => {
      if (!document.hidden) fetchProfiles({ silent: true });
    }, 60000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchInvalidStatuses = async () => {
    const { data } = await supabase
      .from("lead_statuses")
      .select("name, color");
    if (data) {
      const colorMap: Record<string, string> = {};
      data.forEach(s => { colorMap[s.name] = s.color; });
      setStatusColors(colorMap);
      const red = new Set(
        data.filter(s => s.color.includes("destructive") || s.color.includes("red-") || s.color.includes("rose-")).map(s => s.name)
      );
      setInvalidStatuses(red);
      const orange = new Set(
        data
          .filter(s => (s.color.includes("orange-") || s.color.includes("amber-")) && !red.has(s.name))
          .map(s => s.name)
      );
      setPotentialStatuses(orange);
    }
  };

  const fetchProfiles = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    // Fetch staff user IDs to exclude from lead stats
    const { data: staffRoles } = await supabase.from("user_roles").select("user_id");
    const staffIds = new Set((staffRoles ?? []).map(r => r.user_id));

    let all: Profile[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabase
        .from("profiles")
        .select("id, created_at, is_lead, first_deposit_at, affiliate, funnel, status, email, original_email, full_name, shaved_to, shaved_from, country, phone")
        .order("created_at", { ascending: false })
        .range(from, from + batchSize - 1);
      if (!data || data.length === 0) break;
      all = all.concat(data as Profile[]);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    setProfiles(all.filter(p => !staffIds.has(p.id)));
    setLastFetchedAt(new Date());
    setLoading(false);
  };

  const canonicalProfiles = useMemo<CanonicalProfile[]>(() => {
    const byId = new Map(profiles.map(profile => [profile.id, profile]));

    // A shave creates a pair of rows for ONE real lead: an internal placeholder
    // (email @internal.shaved) that keeps the affiliate/funnel of the delivered lead, and the
    // real client row (shaved_from set) that holds the deposit. We collapse the pair into a
    // single entity so the lead is never counted twice. "Shaved included" then decides whether
    // that lead's FTD is counted as a conversion.
    const isPlaceholder = (p?: Profile) => !!p?.email?.endsWith("@internal.shaved");

    const result: CanonicalProfile[] = [];

    for (const profile of profiles) {
      const linkedId = profile.shaved_to ?? profile.shaved_from ?? null;
      const linked = linkedId ? byId.get(linkedId) : undefined;

      // Drop the placeholder row whenever its real counterpart is present.
      if (linked && isPlaceholder(profile)) continue;

      const isShaved = !!linked;
      const depositAt = profile.first_deposit_at ?? linked?.first_deposit_at ?? null;
      const createdAt =
        isShaved && linked && new Date(linked.created_at) < new Date(profile.created_at)
          ? linked.created_at
          : profile.created_at;

      result.push({
        ...profile,
        isShaved,
        effectiveAffiliate: profile.affiliate ?? linked?.affiliate ?? null,
        effectiveCreatedAt: createdAt,
        effectiveFirstDepositAt: isShaved && !shavedIncluded ? null : depositAt,
        effectiveFunnel: profile.funnel ?? linked?.funnel ?? null,
        effectiveStatus: profile.status ?? linked?.status ?? null,
        effectiveCountry: profile.country ?? linked?.country ?? null,
      });
    }

    return result;
  }, [profiles, shavedIncluded]);

  const affiliates = useMemo(() => {
    const set = new Set(canonicalProfiles.map(p => p.effectiveAffiliate).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [canonicalProfiles]);

  const funnels = useMemo(() => {
    const set = new Set(canonicalProfiles.map(p => p.effectiveFunnel).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [canonicalProfiles]);

  const countries = useMemo(() => {
    const set = new Set(canonicalProfiles.map(p => p.effectiveCountry).filter(Boolean) as string[]);
    return Array.from(set).map(c => c.trim().toUpperCase()).sort();
  }, [canonicalProfiles]);

  const filtered = useMemo(() => {
    return canonicalProfiles.filter(p => {
      
      if (affiliateFilter !== "all" && p.effectiveAffiliate !== affiliateFilter) return false;
      if (funnelFilter !== "all" && p.effectiveFunnel !== funnelFilter) return false;
      if (countryFilter !== "all" && (p.effectiveCountry || "").trim().toUpperCase() !== countryFilter) return false;
      return true;
    });
  }, [canonicalProfiles, affiliateFilter, funnelFilter, countryFilter, shavedIncluded]);

  const leadsInRange = useMemo(() => {
    return filtered.filter(p => {
      const d = new Date(p.effectiveCreatedAt);
      return d >= startOfDay(dateFrom) && d <= endOfDay(dateTo);
    });
  }, [filtered, dateFrom, dateTo]);

  const convertedInRange = useMemo(() => {
    return filtered.filter(p => {
      if (!p.effectiveFirstDepositAt) return false;
      const d = new Date(p.effectiveFirstDepositAt);
      return d >= startOfDay(dateFrom) && d <= endOfDay(dateTo);
    });
  }, [filtered, dateFrom, dateTo]);

  const invalidsInRange = useMemo(() => {
    return leadsInRange.filter(p => p.effectiveStatus && invalidStatuses.has(p.effectiveStatus));
  }, [leadsInRange, invalidStatuses]);

  const potentialInRange = useMemo(() => {
    return leadsInRange.filter(p => !p.effectiveFirstDepositAt && p.effectiveStatus && potentialStatuses.has(p.effectiveStatus));
  }, [leadsInRange, potentialStatuses]);

  const validLeadsCount = leadsInRange.length - invalidsInRange.length;

  const potentialRate = leadsInRange.length > 0
    ? ((potentialInRange.length / leadsInRange.length) * 100)
    : 0;

  const conversionRate = validLeadsCount > 0
    ? ((convertedInRange.length / validLeadsCount) * 100)
    : 0;

  const invalidRate = leadsInRange.length > 0
    ? ((invalidsInRange.length / leadsInRange.length) * 100)
    : 0;

  const totalLeads = filtered.length;
  const totalDepositors = filtered.filter(p => !!p.effectiveFirstDepositAt).length;
  const overallRate = totalLeads > 0 ? ((totalDepositors / totalLeads) * 100) : 0;

  const DatePicker = ({ date, onChange, label }: { date: Date; onChange: (d: Date) => void; label: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start text-left font-normal w-[160px]", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => d && onChange(d)} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  const leadsList = useMemo(() => {
    return [...leadsInRange].sort((a, b) => new Date(b.effectiveCreatedAt).getTime() - new Date(a.effectiveCreatedAt).getTime());
  }, [leadsInRange]);

  // Depositors whose FTD happened in the period — even if the lead was created earlier.
  // These count towards "FTD's (Period)", so they must also appear in the lists below.
  const depositorsList = useMemo(() => {
    return [...convertedInRange].sort(
      (a, b) => new Date(b.effectiveFirstDepositAt!).getTime() - new Date(a.effectiveFirstDepositAt!).getTime()
    );
  }, [convertedInRange]);

  const combinedList = useMemo(() => {
    const map = new Map<string, CanonicalProfile>();
    [...leadsList, ...depositorsList].forEach(p => { if (!map.has(p.id)) map.set(p.id, p); });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.effectiveCreatedAt).getTime() - new Date(a.effectiveCreatedAt).getTime()
    );
  }, [leadsList, depositorsList]);

  const displayList = useMemo(() => {
    if (activeTab === "depositors") {
      return depositorsList;
    }
    return combinedList;
  }, [combinedList, depositorsList, activeTab]);

  const getStatusType = (p: CanonicalProfile): "converted" | "invalid" | "potential" | "lead" => {
    if (p.effectiveFirstDepositAt) return "converted";
    if (p.effectiveStatus && invalidStatuses.has(p.effectiveStatus)) return "invalid";
    if (p.effectiveStatus && potentialStatuses.has(p.effectiveStatus)) return "potential";
    return "lead";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conversion Stats</h1>
          <p className="text-muted-foreground text-sm">Lead-to-depositor conversion analytics</p>
        </div>
        <div className="flex items-center gap-2">
          {lastFetchedAt && (
            <span className="text-xs text-muted-foreground">Updated {format(lastFetchedAt, "HH:mm:ss")}</span>
          )}
          <Button size="sm" variant="outline" onClick={() => fetchProfiles()} disabled={loading}>
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
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Affiliates</SelectItem>
              {affiliates.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Funnel</label>
          <Select value={funnelFilter} onValueChange={setFunnelFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Funnels</SelectItem>
              {funnels.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Country</label>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(() => {
          const today = startOfDay(new Date());
          const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          const monthStart = startOfMonth(new Date());
          const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
          const lastMonthEnd = endOfDay(new Date(startOfMonth(new Date()).getTime() - 1));
          const fromTime = startOfDay(dateFrom).getTime();
          const toDay = startOfDay(dateTo).getTime();
          const matchToday = fromTime === today.getTime() && toDay === today.getTime();
          const matchLastMonth = fromTime === lastMonthStart.getTime() && toDay === startOfDay(lastMonthEnd).getTime();
          const matchMonth = fromTime === monthStart.getTime() && toDay === today.getTime();
          const matchWeek = fromTime === weekStart.getTime() && toDay === today.getTime();
          // Mutually exclusive: prioritize most specific (Week > Today > Month > Last Month)
          const isWeek = matchWeek;
          const isToday = !isWeek && matchToday;
          const isMonth = !isWeek && !isToday && matchMonth;
          const isLastMonth = !isWeek && !isToday && !isMonth && matchLastMonth;
          return (
            <div className="flex gap-2">
              <Button size="sm" variant={isToday ? "default" : "outline"} onClick={() => { setDateFrom(today); setDateTo(endOfDay(new Date())); }}>Today</Button>
              <Button size="sm" variant={isWeek ? "default" : "outline"} onClick={() => { setDateFrom(weekStart); setDateTo(endOfDay(new Date())); }}>This Week</Button>
              <Button size="sm" variant={isMonth ? "default" : "outline"} onClick={() => { setDateFrom(monthStart); setDateTo(endOfDay(new Date())); }}>This Month</Button>
              <Button size="sm" variant={isLastMonth ? "default" : "outline"} onClick={() => { setDateFrom(lastMonthStart); setDateTo(lastMonthEnd); }}>Last Month</Button>
            </div>
          );
        })()}
        <div className="flex items-center gap-2">
          <Switch id="shaved-toggle" checked={shavedIncluded} onCheckedChange={setShavedIncluded} />
          <Label htmlFor="shaved-toggle" className="text-xs font-medium text-muted-foreground cursor-pointer">Shaved included</Label>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm py-8">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Leads (Period)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <Users className="h-5 w-5 text-primary self-center" />
                  <span className="text-2xl font-bold">{leadsInRange.length}</span>
                  <span className="text-xs text-muted-foreground">total</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-semibold text-foreground">{validLeadsCount}</span> valid
                  {" · "}
                  <span className="text-destructive font-medium">{invalidsInRange.length} invalid</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">FTD's (Period)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{convertedInRange.length}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Invalids (Period)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="text-2xl font-bold">{invalidsInRange.length}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{invalidRate.toFixed(1)}% of leads</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Good Potential</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold">{potentialInRange.length}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{potentialRate.toFixed(1)}% of leads</p>
                <p className="text-xs text-muted-foreground">Follow-up / Callback</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate (Period)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{conversionRate.toFixed(1)}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{convertedInRange.length}/{validLeadsCount} valid leads</p>
                {validLeadsCount > 0 && (
                  conversionRate >= 15 ? (
                    <p className="text-xs text-green-600 dark:text-green-500 mt-1">✓ Target 15% reached</p>
                  ) : (() => {
                    const needed = Math.ceil(0.15 * validLeadsCount) - convertedInRange.length;
                    const projectedRate = ((convertedInRange.length + needed) / validLeadsCount) * 100;
                    return (
                      <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                        +{needed} FTD{needed === 1 ? "" : "s"} → {projectedRate.toFixed(1)}%
                      </p>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "depositors")}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Leads ({combinedList.length})</TabsTrigger>
              <TabsTrigger value="depositors">Depositors Only ({depositorsList.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Included Leads & Depositors ({displayList.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead>First Deposit</TableHead>
                          <TableHead>Affiliate</TableHead>
                          <TableHead>Funnel</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No leads in this period</TableCell>
                          </TableRow>
                        ) : (
                          displayList.map(p => {
                            const type = getStatusType(p);
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                                <TableCell className="text-sm">{p.original_email || p.email || "—"}</TableCell>
                                <TableCell className="text-sm tabular-nums">
                                  {p.phone ? <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a> : "—"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {p.effectiveStatus ? (
                                    <div className="flex items-center gap-1">
                                      <Badge className={cn("font-normal", statusColors[p.effectiveStatus] || "bg-muted text-muted-foreground")}>
                                        {p.effectiveStatus}
                                      </Badge>
                                      {type === "potential" && (
                                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                      )}
                                    </div>
                                  ) : "—"}
                                </TableCell>
                                <TableCell>
                                  {type === "converted" && (
                                    <Badge variant="default" className="bg-primary/10 text-primary">Depositor</Badge>
                                  )}
                                  {type === "invalid" && (
                                    <Badge variant="destructive">Invalid</Badge>
                                  )}
                                  {type === "potential" && (
                                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">
                                      <Star className="h-3 w-3 mr-1 fill-current" />
                                      Potential
                                    </Badge>
                                  )}
                                  {type === "lead" && (
                                    <Badge variant="secondary">Lead</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">{format(new Date(p.effectiveCreatedAt), "dd MMM yyyy")}</TableCell>
                                <TableCell className="text-sm">{p.effectiveFirstDepositAt ? format(new Date(p.effectiveFirstDepositAt), "dd MMM yyyy") : "—"}</TableCell>
                                <TableCell className="text-sm">{p.effectiveAffiliate || "—"}</TableCell>
                                <TableCell className="text-sm">{p.effectiveFunnel || "—"}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="depositors">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Depositors ({displayList.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>First Deposit</TableHead>
                          <TableHead>Affiliate</TableHead>
                          <TableHead>Funnel</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No depositors in this period</TableCell>
                          </TableRow>
                        ) : (
                          displayList.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                              <TableCell className="text-sm">{p.original_email || p.email || "—"}</TableCell>
                              <TableCell className="text-sm tabular-nums">
                                {p.phone ? <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a> : "—"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {p.effectiveStatus ? (
                                  <Badge className={cn("font-normal", statusColors[p.effectiveStatus] || "bg-muted text-muted-foreground")}>
                                    {p.effectiveStatus}
                                  </Badge>
                                ) : "—"}
                              </TableCell>
                              <TableCell className="text-sm">{p.effectiveFirstDepositAt ? format(new Date(p.effectiveFirstDepositAt), "dd MMM yyyy") : "—"}</TableCell>
                              <TableCell className="text-sm">{p.effectiveAffiliate || "—"}</TableCell>
                              <TableCell className="text-sm">{p.effectiveFunnel || "—"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default AdminConversionStats;
