import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, MoreHorizontal, KeyRound, LogIn } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  suspended: "bg-destructive/10 text-destructive",
  pending: "bg-yellow-500/10 text-yellow-600",
};

const AdminAgents = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ email: "", password: "", full_name: "", role_id: "", team_id: "" });
  const [now, setNow] = useState(Date.now());

  // Password reset
  const [pwOpen, setPwOpen] = useState(false);
  const [pwUserId, setPwUserId] = useState("");
  const [pwUserName, setPwUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: rolesData } = await supabase.from("roles").select("*");
    setRoles(rolesData ?? []);
    const { data: teamsData } = await supabase.from("teams").select("*").order("name");
    setTeams(teamsData ?? []);

    // Fetch ALL user_roles with pagination to avoid the 1000-row limit
    let allUserRoles: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from("user_roles")
        .select("user_id, role_id, roles(name)")
        .range(from, from + pageSize - 1);
      if (!batch || batch.length === 0) break;
      allUserRoles = allUserRoles.concat(batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    const roleMap: Record<string, { name: string; role_id: string }> = {};
    (allUserRoles).forEach((ur: any) => {
      roleMap[ur.user_id] = { name: ur.roles?.name ?? "", role_id: ur.role_id };
    });

    const agentUserIds = allUserRoles.map((ur: any) => ur.user_id);

    if (agentUserIds.length === 0) {
      setAgents([]);
      setLoading(false);
      return;
    }

    // Fetch profiles in batches too (Supabase .in() has limits)
    let allProfiles: any[] = [];
    for (let i = 0; i < agentUserIds.length; i += 100) {
      const chunk = agentUserIds.slice(i, i + 100);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", chunk)
        .order("created_at", { ascending: false });
      allProfiles = allProfiles.concat(profiles ?? []);
    }

    // Sort all profiles by created_at desc
    allProfiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Build a profile map for lookup
    const profileMap: Record<string, any> = {};
    allProfiles.forEach(p => { profileMap[p.id] = p; });

    // Fetch team memberships for these users
    const teamMap: Record<string, string> = {};
    for (let i = 0; i < agentUserIds.length; i += 100) {
      const chunk = agentUserIds.slice(i, i + 100);
      const { data: tms } = await supabase
        .from("team_members")
        .select("user_id, team_id")
        .in("user_id", chunk);
      (tms ?? []).forEach((tm: any) => { teamMap[tm.user_id] = tm.team_id; });
    }

    // Include ALL users with roles, even if profile is missing
    const enriched = agentUserIds.map(uid => {
      const profile = profileMap[uid];
      return {
        id: uid,
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        status: profile?.status ?? "unknown",
        created_at: profile?.created_at ?? new Date().toISOString(),
        ...(profile ?? {}),
        role_name: roleMap[uid]?.name ?? "",
        role_id: roleMap[uid]?.role_id ?? "",
        team_id: teamMap[uid] ?? "",
      };
    });

    // Sort by created_at desc
    enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setAgents(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Tick every 10s to update "active" timers
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Refresh last_seen_at from DB every 15s
  useEffect(() => {
    if (agents.length === 0) return;
    const refresh = async () => {
      const ids = agents.map(a => a.id);
      const { data } = await supabase
        .from("profiles")
        .select("id, last_seen_at")
        .in("id", ids);
      if (!data) return;
      const map = new Map(data.map((p: any) => [p.id, p.last_seen_at]));
      setAgents(curr => {
        let changed = false;
        const next = curr.map(a => {
          const ls = map.get(a.id) ?? a.last_seen_at ?? null;
          if (ls === a.last_seen_at) return a;
          changed = true;
          return { ...a, last_seen_at: ls };
        });
        return changed ? next : curr;
      });
    };
    refresh();
    const iv = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
    return () => clearInterval(iv);
  }, [agents.length]);

  const updateStatus = async (userId: string, status: string) => {
    await supabase.from("profiles").update({ status }).eq("id", userId);
    toast.success(`Agent status updated to ${status}`);
    fetchData();
  };

  const assignRole = async (userId: string, roleId: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    if (roleId !== "none") {
      await supabase.from("user_roles").insert({ user_id: userId, role_id: roleId });
    }
    toast.success("Role updated");
    fetchData();
  };

  const assignTeam = async (userId: string, teamId: string) => {
    await supabase.from("team_members").delete().eq("user_id", userId);
    if (teamId !== "none") {
      await supabase.from("team_members").insert({ user_id: userId, team_id: teamId });
    }
    toast.success("Team updated");
    fetchData();
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPwLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "change_password", user_id: pwUserId, password: newPassword },
      });
      if (error) throw error;
      toast.success("Password reset successfully");
      setPwOpen(false);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setPwLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!newAgent.role_id) {
      toast.error("Please select a role for the agent");
      return;
    }
    if (!newAgent.email || !newAgent.password) {
      toast.error("Email and password are required");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: {
          action: "create_user",
          email: newAgent.email,
          password: newAgent.password,
          full_name: newAgent.full_name,
          role_id: newAgent.role_id,
          team_id: newAgent.team_id || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Agent created successfully — they can log in now");
      setCreateOpen(false);
      setNewAgent({ email: "", password: "", full_name: "", role_id: "", team_id: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create agent");
    }
  };

  const handleLoginAsAgent = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "login_as_agent", user_id: userId, site_url: window.location.origin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Opening agent session in new tab");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to login as agent");
    }
  };

  const isOnline = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
  };

  const filtered = agents.filter(u =>
    (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Agents</h1>
          <p className="text-muted-foreground text-sm">{agents.length} staff members</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Create Agent
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Agent</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Team</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Last Active</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Joined</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No agents found</td></tr>
                ) : (
                  filtered.map(u => (
                    <tr
                      key={u.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/backoffice/users/${u.id}`)}
                    >
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-sm text-primary hover:underline">{u.full_name || "—"}</p>
                          <p className="text-[11px] text-muted-foreground">{u.email}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Select
                          value={u.role_id || "none"}
                          onValueChange={(val) => assignRole(u.id, val)}
                        >
                          <SelectTrigger className="h-8 w-44 text-xs" onClick={e => e.stopPropagation()}>
                            <SelectValue placeholder="No role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No role</SelectItem>
                            {roles.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Select
                          value={u.team_id || "none"}
                          onValueChange={(val) => assignTeam(u.id, val)}
                        >
                          <SelectTrigger className="h-8 w-40 text-xs" onClick={e => e.stopPropagation()}>
                            <SelectValue placeholder="No team" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No team</SelectItem>
                            {teams.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", isOnline(u.last_seen_at) ? "bg-green-500" : "bg-gray-400")} />
                          <span className="text-xs text-muted-foreground">
                            {u.last_seen_at
                              ? (isOnline(u.last_seen_at) ? "Online" : formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true }))
                              : "Never"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/backoffice/users/${u.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => updateStatus(u.id, "active")}>Set Active</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(u.id, "suspended")}>Suspend</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleLoginAsAgent(u.id)}>
                              <LogIn className="h-4 w-4 mr-2" /> Login as Agent
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setPwUserId(u.id);
                              setPwUserName(u.full_name || u.email);
                              setPwOpen(true);
                            }}>
                              <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Agent Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={newAgent.full_name} onChange={e => setNewAgent({ ...newAgent, full_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={newAgent.email} onChange={e => setNewAgent({ ...newAgent, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" value={newAgent.password} onChange={e => setNewAgent({ ...newAgent, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={newAgent.role_id} onValueChange={val => setNewAgent({ ...newAgent, role_id: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Team (optional)</Label>
              <Select value={newAgent.team_id || "none"} onValueChange={val => setNewAgent({ ...newAgent, team_id: val === "none" ? "" : val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAgent}>Create Agent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password — {pwUserName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPwOpen(false); setNewPassword(""); }}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={pwLoading}>
              {pwLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAgents;
