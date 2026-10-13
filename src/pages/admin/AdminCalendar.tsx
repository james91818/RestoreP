import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useRole, isAdminOrManager } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Clock, Trash2, Pencil, CalendarDays, User, Search,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO,
} from "date-fns";
import { getStaffTz, getClientTz, zonedDateTimeToUTC, formatTimeInTz, tzLabel, dateKeyInTz } from "@/lib/timezone";
import Time24Input from "@/components/ui/time-24-input";

interface Appointment {
  id: string;
  agent_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  color: string;
  notifications_enabled?: boolean;
  notify_client?: boolean;
  notify_agent?: boolean;
  created_at: string;
}

const COLORS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#06b6d4", label: "Cyan" },
];

// Profiles must be paged: a single select caps out at 1000 rows, which was
// hiding depositors from the appointment client picker.
const fetchAllProfiles = async (): Promise<any[]> => {
  const pageSize = 1000;
  const all: any[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, first_deposit_at")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error || !data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
  }
  return all;
};

const AdminCalendar = () => {
  const { user } = useAuth();
  const { roleName } = useRole();
  const canViewOthers = isAdminOrManager(roleName);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenDone = useRef(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("mine");
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", start_time: "09:00", end_time: "10:00", color: "#3b82f6", client_id: "",
  });
  const [notifyClient, setNotifyClient] = useState(true);
  const [notifyAgent, setNotifyAgent] = useState(true);

  // Day detail
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [detailDate, setDetailDate] = useState<Date | null>(null);

  // Clients for linking
  const [clients, setClients] = useState<any[]>([]);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientType, setClientType] = useState<"leads" | "depositors" | "all">("all");
  const visibleClients = clients.filter(c =>
    clientType === "all" ? true : clientType === "depositors" ? !!c.first_deposit_at : !c.first_deposit_at
  );

  useEffect(() => {
    const fetchAgentsAndClients = async () => {
      if (!canViewOthers) return;
      const [profiles, { data: urData }] = await Promise.all([
        fetchAllProfiles(),
        supabase.from("user_roles").select("user_id, roles(name)"),
      ]);
      // Build map: userId -> set of role names
      const roleMap = new Map<string, Set<string>>();
      (urData ?? []).forEach((ur: any) => {
        const rname = Array.isArray(ur.roles) ? ur.roles[0]?.name : ur.roles?.name;
        if (!rname) return;
        if (!roleMap.has(ur.user_id)) roleMap.set(ur.user_id, new Set());
        roleMap.get(ur.user_id)!.add(rname);
      });
      const staffIds = new Set(roleMap.keys());

      // Conversion managers can only see Conversion-side staff
      const isConversionMgr = roleName === "Manager Conversion";
      const isRetentionMgr = roleName === "Manager Retention";
      const allowedForConversion = new Set(["Agent Conversion", "Manager Conversion"]);
      const allowedForRetention = new Set(["Agent Retention", "Manager Retention"]);

      const visibleStaff = (profiles ?? []).filter(p => {
        if (!staffIds.has(p.id)) return false;
        const roles = roleMap.get(p.id) ?? new Set();
        if (isConversionMgr) return Array.from(roles).some(r => allowedForConversion.has(r));
        if (isRetentionMgr) return Array.from(roles).some(r => allowedForRetention.has(r));
        return true;
      });
      setAgents(visibleStaff);
      setClients((profiles ?? []).filter(p => !staffIds.has(p.id)));
    };
    fetchAgentsAndClients();
  }, [canViewOthers, roleName]);

  // Fetch non-staff clients (and staff list for name lookup) for agent users
  useEffect(() => {
    if (canViewOthers) return;
    const fetchClients = async () => {
      const [profiles, { data: urData }] = await Promise.all([
        fetchAllProfiles(),
        supabase.from("user_roles").select("user_id"),
      ]);
      const staffIds = new Set((urData ?? []).map((ur: any) => ur.user_id));
      setClients((profiles ?? []).filter(p => !staffIds.has(p.id)));
      setAgents((profiles ?? []).filter(p => staffIds.has(p.id)));
    };
    fetchClients();
  }, [canViewOthers]);

  // Auto-open create dialog when coming from user detail with ?client=...
  useEffect(() => {
    if (autoOpenDone.current) return;
    const clientId = searchParams.get("client");
    const clientName = searchParams.get("clientName");
    if (clientId && user) {
      autoOpenDone.current = true;
      setSelectedDate(new Date());
      setEditing(null);
      setForm({
        title: clientName ? `Meeting with ${clientName}` : "",
        description: "",
        start_time: "09:00",
        end_time: "10:00",
        color: "#3b82f6",
        client_id: clientId,
      });
      setDialogOpen(true);
      // Clean URL params
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, user]);

  const fetchAppointments = async () => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });

    let query = supabase
      .from("appointments")
      .select("*")
      .gte("start_at", start.toISOString())
      .lte("start_at", end.toISOString())
      .order("start_at");

    if (selectedAgent !== "all" && selectedAgent !== "mine") {
      query = query.eq("agent_id", selectedAgent);
    } else if (selectedAgent === "mine" || !canViewOthers) {
      query = query.eq("agent_id", user?.id);
    } else if (selectedAgent === "all" && (roleName === "Manager Conversion" || roleName === "Manager Retention")) {
      const visibleIds = agents.map((a: any) => a.id);
      if (visibleIds.length === 0) {
        setAppointments([]);
        setLoading(false);
        return;
      }
      query = query.in("agent_id", visibleIds);
    }

    const { data } = await query;
    setAppointments((data ?? []) as Appointment[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchAppointments();
  }, [user, currentMonth, selectedAgent, agents.length, roleName]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const appointmentsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach(apt => {
      const dayKey = dateKeyInTz(apt.start_at, getStaffTz());
      if (!map[dayKey]) map[dayKey] = [];
      map[dayKey].push(apt);
    });
    return map;
  }, [appointments]);

  const openCreateDialog = (date: Date) => {
    setEditing(null);
    setSelectedDate(date);
    setForm({ title: "", description: "", start_time: "09:00", end_time: "10:00", color: "#3b82f6", client_id: "" });
    
    setNotifyClient(true);
    setNotifyAgent(true);
    setDialogOpen(true);
  };

  const openEditDialog = (apt: Appointment) => {
    setEditing(apt);
    setNotifyClient(apt.notify_client !== false);
    setNotifyAgent(apt.notify_agent !== false);
    setSelectedDate(parseISO(dateKeyInTz(apt.start_at, getStaffTz())));
    setForm({
      title: apt.title,
      description: apt.description || "",
      start_time: formatTimeInTz(apt.start_at, getStaffTz()),
      end_time: formatTimeInTz(apt.end_at, getStaffTz()),
      color: apt.color || "#3b82f6",
      client_id: apt.client_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!selectedDate || !user) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const staffTz = getStaffTz();
    const start_at = zonedDateTimeToUTC(dateStr, form.start_time, staffTz);
    // No end time in the form — appointments default to a 1 hour slot internally.
    const end_at = new Date(new Date(start_at).getTime() + 60 * 60 * 1000).toISOString();

    const payload = {
      title: form.title,
      description: form.description || null,
      start_at,
      end_at,
      color: form.color,
      client_id: form.client_id || null,
      notifications_enabled: notifyClient || notifyAgent,
      notify_client: notifyClient,
      notify_agent: notifyAgent,
    };

    if (editing) {
      const { error } = await supabase.from("appointments").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Appointment updated");
    } else {
      const appointmentId = crypto.randomUUID();
      const { error } = await supabase.from("appointments").insert({ ...payload, id: appointmentId, agent_id: user.id });
      if (error) { toast.error(error.message); return; }
      // Notify the client about the appointment
      if (payload.client_id && notifyClient) {
        const startFormatted = new Date(start_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: getClientTz() });
        await supabase.from("notifications").insert({
          user_id: payload.client_id,
          title: "Neuer Termin / New Appointment",
          message: `${payload.title} – ${startFormatted}`,
          type: "appointment",
        });

        // Confirmation email to the client
        {
          const client = clients.find(c => c.id === payload.client_id);
          const clientEmail = client?.email;
          const clientName = client?.full_name || client?.email || undefined;
          const agentProfile = agents.find(a => a.id === user.id);
          const agentDisplayName = agentProfile?.full_name || user.email || undefined;

          if (clientEmail) {
            const meetingDate = new Date(start_at).toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: getClientTz() });
            const clientStart = formatTimeInTz(start_at, getClientTz());
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "meeting-invitation",
                recipientEmail: clientEmail,
                idempotencyKey: `meeting-invite-${appointmentId}`,
                templateData: {
                  clientName,
                  meetingTitle: payload.title,
                  meetingDate,
                  meetingTime: clientStart,
                  description: payload.description || undefined,
                  agentName: agentDisplayName,
                },
              },
            });
            toast.success("Meeting email sent to client");
          }
        }
      }
      toast.success("Appointment created");
    }
    setDialogOpen(false);
    fetchAppointments();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("appointments").delete().eq("id", id);
    toast.success("Appointment deleted");
    setDialogOpen(false);
    setDayDetailOpen(false);
    fetchAppointments();
  };

  const openDayDetail = (date: Date) => {
    setDetailDate(date);
    setDayDetailOpen(true);
  };

  const dayAppointments = detailDate
    ? appointmentsByDay[format(detailDate, "yyyy-MM-dd")] ?? []
    : [];

  const getAgentName = (agentId: string) => {
    if (agentId === user?.id) return "You";
    const agent = agents.find(a => a.id === agentId);
    return agent?.full_name || agent?.email || "Unknown";
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || client?.email || "Unknown Client";
  };

  return (
    <div className="space-y-4 flex flex-col min-h-[600px] pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Calendar</h1>
          <p className="text-muted-foreground text-sm">Manage your appointments and schedule</p>
        </div>
        <Button onClick={() => openCreateDialog(new Date())}>
          <Plus className="h-4 w-4 mr-2" /> New Appointment
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
        </div>
        {canViewOthers && (
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">My Calendar</SelectItem>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.full_name || a.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Calendar Grid */}
      <Card className="flex flex-col">
        <CardContent className="p-0 flex flex-col">
          <div className="grid grid-cols-7">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <div key={day} className="p-3 text-center text-sm font-semibold text-muted-foreground border-b bg-muted/30">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayApts = appointmentsByDay[dayKey] ?? [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);

              return (
                <div
                  key={idx}
                  className={`min-h-[120px] border-b border-r p-2 cursor-pointer transition-colors hover:bg-muted/20 overflow-hidden flex flex-col ${
                    !inMonth ? "bg-muted/10 opacity-50" : ""
                  } ${today ? "bg-primary/5" : ""}`}
                  onClick={() => openDayDetail(day)}
                  onDoubleClick={() => openCreateDialog(day)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                      today ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}>
                      {format(day, "d")}
                    </span>
                    {dayApts.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {dayApts.length}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 flex-1 max-h-[140px] overflow-y-auto pr-0.5">
                    {dayApts.map(apt => {
                      const clientP = apt.client_id ? clients.find(c => c.id === apt.client_id) : null;
                      const clientName = clientP ? (clientP.full_name || clientP.email || "Client") : null;
                      const agentP = agents.find(a => a.id === apt.agent_id);
                      const agentName = agentP ? (agentP.full_name || agentP.email)
                        : (apt.agent_id === user?.id ? "You" : null);
                      return (
                        <div
                          key={apt.id}
                          className="text-xs leading-tight px-1.5 py-1 rounded text-white"
                          style={{ backgroundColor: apt.color || "#3b82f6" }}
                          onClick={(e) => { e.stopPropagation(); openEditDialog(apt); }}
                        >
                          <div className="truncate font-medium">
                            {formatTimeInTz(apt.start_at, getStaffTz())} {apt.title}
                          </div>
                          {(clientName || agentName) && (
                            <div className="truncate opacity-90 text-[10px]">
                              {clientName ?? "—"}{agentName ? ` · ${agentName}` : ""}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={dayDetailOpen} onOpenChange={setDayDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {detailDate && format(detailDate, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {dayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No appointments on this day</p>
            ) : (
              dayAppointments.map(apt => (
                <div key={apt.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="w-1 h-full min-h-[40px] rounded-full shrink-0" style={{ backgroundColor: apt.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{apt.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatTimeInTz(apt.start_at, getStaffTz())}
                      </span>
                    </div>
                    {apt.description && (
                      <p className="text-xs text-muted-foreground mt-1">{apt.description}</p>
                    )}
                    {apt.client_id && (
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{getClientName(apt.client_id)}</span>
                      </div>
                    )}
                    {canViewOthers && selectedAgent !== "mine" && apt.agent_id !== user?.id && (
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Agent: {getAgentName(apt.agent_id)}</span>
                    )}
                  </div>
                  {apt.agent_id === user?.id && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDayDetailOpen(false); openEditDialog(apt); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(apt.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => { setDayDetailOpen(false); if (detailDate) openCreateDialog(detailDate); }}>
              <Plus className="h-4 w-4 mr-2" /> Add Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Appointment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Appointment" : "New Appointment"}
              {selectedDate && ` — ${format(selectedDate, "MMM d, yyyy")}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Call with client" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Notes..." rows={2} />
            </div>
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Your time ({tzLabel(getStaffTz())})
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start time</Label>
                <Time24Input value={form.start_time} onChange={v => setForm({ ...form, start_time: v })} />
              </div>
              {selectedDate && (() => {
                const dateStr = format(selectedDate, "yyyy-MM-dd");
                try {
                  const startUtc = zonedDateTimeToUTC(dateStr, form.start_time, getStaffTz());
                  return (
                    <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground border-t border-border/50">
                      <span className="font-medium">Client sees ({tzLabel(getClientTz())})</span>
                      <span className="font-mono tabular-nums text-foreground">
                        {formatTimeInTz(startUtc, getClientTz())}
                      </span>
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
            <div className="space-y-1">
              <Label>Client (optional)</Label>
              <div className="flex gap-2 pb-1">
                {([
                  { key: "leads", label: "Leads" },
                  { key: "depositors", label: "Depositors" },
                  { key: "all", label: "All" },
                ] as const).map(opt => (
                  <Button
                    key={opt.key}
                    type="button"
                    size="sm"
                    variant={clientType === opt.key ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => { setClientType(opt.key); setForm(f => ({ ...f, client_id: "" })); }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    <span className="truncate">
                      {form.client_id
                        ? (clients.find(c => c.id === form.client_id)?.full_name
                          || clients.find(c => c.id === form.client_id)?.email
                          || "Selected client")
                        : "No client"}
                    </span>
                    <Search className="h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or email..." />
                    <CommandList>
                      <CommandEmpty>No client found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="no client" onSelect={() => { setForm(f => ({ ...f, client_id: "" })); setClientPickerOpen(false); }}>
                          No client
                        </CommandItem>
                        {visibleClients.map(c => (
                          <CommandItem
                            key={c.id}
                            value={`${c.full_name ?? ""} ${c.email ?? ""}`}
                            onSelect={() => { setForm(f => ({ ...f, client_id: c.id })); setClientPickerOpen(false); }}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm">{c.full_name || c.email}</p>
                              {c.full_name && c.email && (
                                <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                              )}
                            </div>
                            {c.first_deposit_at && (
                              <Badge variant="secondary" className="ml-auto text-[10px]">Depositor</Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {/* Notifications toggles */}
            <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="appt-notify-client"
                  checked={notifyClient}
                  onCheckedChange={(checked) => setNotifyClient(checked === true)}
                />
                <Label htmlFor="appt-notify-client" className="text-sm cursor-pointer">
                  Notify client (confirmation email + dashboard notification now, and 1h before)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="appt-notify-agent"
                  checked={notifyAgent}
                  onCheckedChange={(checked) => setNotifyAgent(checked === true)}
                />
                <Label htmlFor="appt-notify-agent" className="text-sm cursor-pointer">
                  Notify agent (backoffice 1h reminder)
                </Label>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      form.color === c.value ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setForm({ ...form, color: c.value })}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editing && (
              <Button variant="destructive" size="sm" onClick={() => handleDelete(editing.id)} className="mr-auto">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCalendar;
