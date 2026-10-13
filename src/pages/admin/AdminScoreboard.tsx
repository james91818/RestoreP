import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Trophy, Medal, Award, TrendingUp, Users, Settings2 } from "lucide-react";
import { format, startOfMonth, startOfDay } from "date-fns";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

interface AgentScore {
  agent_id: string;
  agent_name: string;
  total_amount: number;
  deposit_count: number;
}

interface Team {
  id: string;
  name: string;
}

interface StaffMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role_name: string;
  team_id: string | null;
}

const rankIcons = [
  <Trophy key="t" className="h-5 w-5 text-yellow-500" />,
  <Medal key="m" className="h-5 w-5 text-gray-400" />,
  <Award key="a" className="h-5 w-5 text-amber-700" />,
];

const AdminScoreboard = () => {
  const { roleName } = useRole();
  const isAdmin = roleName === "Admin";

  const [teams, setTeams] = useState<Team[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [deposits, setDeposits] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);

    const [teamsRes, depositsRes, profilesRes, rolesRes, membersRes] = await Promise.all([
      supabase.from("teams").select("id, name").order("name"),
      supabase.from("deposits").select("amount, created_at, user_id, processed_by").eq("status", "approved"),
      supabase.from("profiles").select("id, full_name, email, assigned_agent"),
      supabase.from("user_roles").select("user_id, roles(name)"),
      supabase.from("team_members").select("user_id, team_id"),
    ]);

    const allTeams = teamsRes.data || [];
    setTeams(allTeams);

    const memberMap = new Map((membersRes.data || []).map((m: any) => [m.user_id, m.team_id]));

    const staffList: StaffMember[] = [];
    (rolesRes.data || []).forEach((r: any) => {
      const roleName = r.roles?.name;
      if (!["Admin", "Manager", "Agent"].includes(roleName)) return;
      const profile = (profilesRes.data || []).find((p) => p.id === r.user_id);
      staffList.push({
        user_id: r.user_id,
        full_name: profile?.full_name || null,
        email: profile?.email || null,
        role_name: roleName,
        team_id: memberMap.get(r.user_id) || null,
      });
    });
    setStaff(staffList);

    setDeposits(depositsRes.data || []);
    setProfileMap(new Map((profilesRes.data || []).map((p) => [p.id, p])));
    setLoading(false);
  };

  const staffIds = useMemo(() => new Set(staff.map((s) => s.user_id)), [staff]);
  const teamMemberIds = useMemo(() => {
    if (selectedTeam === "all") return staffIds;
    if (selectedTeam === "unassigned") {
      return new Set(staff.filter((s) => !s.team_id).map((s) => s.user_id));
    }
    return new Set(staff.filter((s) => s.team_id === selectedTeam).map((s) => s.user_id));
  }, [staff, selectedTeam, staffIds]);

  const todayStart = startOfDay(new Date()).toISOString();
  const monthStart = startOfMonth(new Date()).toISOString();

  const aggregate = (filterFn: (d: any) => boolean): AgentScore[] => {
    const map = new Map<string, AgentScore>();
    deposits.filter(filterFn).forEach((dep) => {
      const agentId = dep.processed_by || profileMap.get(dep.user_id)?.assigned_agent;
      if (!agentId || !teamMemberIds.has(agentId)) return;
      const existing = map.get(agentId);
      const agentProfile = profileMap.get(agentId);
      const agentName = agentProfile?.full_name || agentProfile?.email || "Unknown Agent";
      if (existing) {
        existing.total_amount += Number(dep.amount);
        existing.deposit_count += 1;
      } else {
        map.set(agentId, {
          agent_id: agentId,
          agent_name: agentName,
          total_amount: Number(dep.amount),
          deposit_count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total_amount - a.total_amount);
  };

  const dailyScores = useMemo(() => aggregate((d) => d.created_at >= todayStart), [deposits, teamMemberIds, profileMap]);
  const monthlyScores = useMemo(() => aggregate((d) => d.created_at >= monthStart), [deposits, teamMemberIds, profileMap]);

  const assignTeam = async (userId: string, teamId: string | null) => {
    // Remove any existing memberships
    await supabase.from("team_members").delete().eq("user_id", userId);
    if (teamId) {
      const { error } = await supabase.from("team_members").insert({ user_id: userId, team_id: teamId });
      if (error) {
        toast.error("Failed to assign team");
        return;
      }
    }
    setStaff((prev) => prev.map((s) => (s.user_id === userId ? { ...s, team_id: teamId } : s)));
    toast.success("Team updated");
  };

  const ScoreTable = ({ scores }: { scores: AgentScore[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead className="text-right">Deposits</TableHead>
          <TableHead className="text-right">Total Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scores.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
              No deposits recorded for this period
            </TableCell>
          </TableRow>
        ) : (
          scores.map((score, idx) => (
            <TableRow key={score.agent_id} className={idx === 0 ? "bg-primary/5" : ""}>
              <TableCell className="font-bold">
                <div className="flex items-center gap-2">
                  {idx < 3 ? rankIcons[idx] : <span className="text-muted-foreground pl-1">#{idx + 1}</span>}
                </div>
              </TableCell>
              <TableCell className="font-medium">{score.agent_name}</TableCell>
              <TableCell className="text-right">{score.deposit_count}</TableCell>
              <TableCell className="text-right font-semibold">
                €{score.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const topDaily = dailyScores[0];
  const topMonthly = monthlyScores[0];
  const totalToday = dailyScores.reduce((s, a) => s + a.total_amount, 0);
  const totalMonth = monthlyScores.reduce((s, a) => s + a.total_amount, 0);

  const selectedTeamLabel =
    selectedTeam === "all" ? "All Teams" : selectedTeam === "unassigned" ? "Unassigned" : teams.find((t) => t.id === selectedTeam)?.name || "";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Score Board</h1>
          <p className="text-muted-foreground text-sm">Agent deposit performance rankings — {selectedTeamLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[200px]">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Dialog open={manageOpen} onOpenChange={setManageOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" /> Manage Teams
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Assign Agents to Teams</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="w-[180px]">Team</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((s) => (
                        <TableRow key={s.user_id}>
                          <TableCell className="font-medium">{s.full_name || s.email || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{s.role_name}</TableCell>
                          <TableCell>
                            <Select
                              value={s.team_id || "none"}
                              onValueChange={(v) => assignTeam(s.user_id, v === "none" ? null : v)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— None —</SelectItem>
                                {teams.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <DialogFooter>
                  <Button onClick={() => setManageOpen(false)}>Done</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Top Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="text-lg font-bold">{topDaily?.agent_name || "—"}</span>
            </div>
            {topDaily && (
              <p className="text-sm text-muted-foreground mt-1">
                €{topDaily.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">
                €{totalToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{dailyScores.reduce((s, a) => s + a.deposit_count, 0)} deposits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Top Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="text-lg font-bold">{topMonthly?.agent_name || "—"}</span>
            </div>
            {topMonthly && (
              <p className="text-sm text-muted-foreground mt-1">
                €{topMonthly.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{format(new Date(), "MMMM")} Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">
                €{totalMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{monthlyScores.reduce((s, a) => s + a.deposit_count, 0)} deposits</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Today</TabsTrigger>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today — {format(new Date(), "dd MMM yyyy")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-muted-foreground text-sm py-4">Loading…</p> : <ScoreTable scores={dailyScores} />}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{format(new Date(), "MMMM yyyy")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-muted-foreground text-sm py-4">Loading…</p> : <ScoreTable scores={monthlyScores} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminScoreboard;
