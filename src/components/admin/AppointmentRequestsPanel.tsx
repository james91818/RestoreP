import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { CalendarClock, CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface Req {
  id: string;
  preferred_at: string;
  alternate_at: string | null;
  topic: string;
  notes: string | null;
  status: string;
  agent_response: string | null;
  created_at: string;
  agent_id: string | null;
}

interface Props {
  clientId: string;
  clientName?: string;
}

const localDateTime = (iso: string) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const AppointmentRequestsPanel = ({ clientId, clientName }: Props) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Req[]>([]);
  const [actioning, setActioning] = useState<Req | null>(null);
  const [mode, setMode] = useState<"approve" | "decline">("approve");
  const [scheduleAt, setScheduleAt] = useState("");
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("appointment_requests")
      .select("id, preferred_at, alternate_at, topic, notes, status, agent_response, created_at, agent_id")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setRequests(data as Req[]);
  };

  useEffect(() => {
    if (!clientId) return;
    load();
    const channel = supabase
      .channel(`appt_req_${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointment_requests", filter: `client_id=eq.${clientId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const openAction = (r: Req, m: "approve" | "decline") => {
    setActioning(r);
    setMode(m);
    setScheduleAt(localDateTime(r.preferred_at));
    setResponse("");
  };

  const submit = async () => {
    if (!actioning || !user) return;
    setBusy(true);

    if (mode === "approve") {
      const start = new Date(scheduleAt);
      const end = new Date(start.getTime() + 30 * 60 * 1000);

      const { data: appt, error: apptErr } = await supabase
        .from("appointments")
        .insert({
          agent_id: user.id,
          client_id: clientId,
          title: actioning.topic,
          description: actioning.notes || null,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
        })
        .select("id")
        .single();

      if (apptErr) {
        toast.error("Could not create appointment: " + apptErr.message);
        setBusy(false);
        return;
      }

      await supabase
        .from("appointment_requests")
        .update({
          status: "approved",
          agent_response: response.trim() || null,
          appointment_id: appt!.id,
        })
        .eq("id", actioning.id);

      const formattedDateTime = format(start, "dd.MM.yyyy HH:mm");
      const replyLine = response.trim() ? ` 💬 ${response.trim()}` : "";

      await supabase.from("notifications").insert({
        user_id: clientId,
        title: "✅ Termin bestätigt",
        message: `Ihr Termin „${actioning.topic}" am ${formattedDateTime} Uhr wurde bestätigt.${replyLine}`,
        type: "appointment",
        priority: 2,
      });

      // Send meeting invitation email to client
      try {
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", clientId)
          .maybeSingle();
        const { data: agentProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (clientProfile?.email) {
          const meetingDate = start.toLocaleDateString("de-DE", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          });
          const fmtTime = (d: Date) =>
            d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "meeting-invitation",
              recipientEmail: clientProfile.email,
              idempotencyKey: `appt-approved-${appt!.id}`,
              templateData: {
                clientName: clientProfile.full_name || undefined,
                meetingTitle: actioning.topic,
                meetingDate,
                meetingTime: fmtTime(start),
                meetingEndTime: fmtTime(end),
                description: response.trim() || actioning.notes || undefined,
                agentName: agentProfile?.full_name || user.email || undefined,
              },
            },
          });
        }
      } catch (e) {
        console.error("Failed to send meeting invitation email", e);
      }

      toast.success("Appointment confirmed & client notified");
    } else {
      await supabase
        .from("appointment_requests")
        .update({
          status: "declined",
          agent_response: response.trim() || null,
        })
        .eq("id", actioning.id);

      await supabase.from("notifications").insert({
        user_id: clientId,
        title: "Termin-Anfrage abgelehnt",
        message: response.trim() || `Ihre Anfrage „${actioning.topic}" konnte leider nicht bestätigt werden.`,
        type: "appointment",
      });
      toast.success("Request declined");
    }

    setBusy(false);
    setActioning(null);
    load();
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
    if (s === "declined") return <Badge className="bg-destructive/15 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
    return <Badge className="bg-warning/15 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  if (requests.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Appointment Requests
          <Badge variant="secondary" className="ml-2">{requests.filter(r => r.status === "pending").length} pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{r.topic}</p>
                <p className="text-xs text-muted-foreground">
                  Preferred: {format(new Date(r.preferred_at), "EEE dd.MM.yyyy HH:mm")}
                  {r.alternate_at && <> · Alt: {format(new Date(r.alternate_at), "dd.MM. HH:mm")}</>}
                </p>
                {r.notes && (
                  <p className="text-xs mt-1 p-2 rounded bg-muted/40 border-l-2 border-primary/40">
                    <MessageSquare className="h-3 w-3 inline mr-1" />{r.notes}
                  </p>
                )}
                {r.agent_response && (
                  <p className="text-xs mt-1 text-muted-foreground italic">Reply: {r.agent_response}</p>
                )}
              </div>
              {statusBadge(r.status)}
            </div>

            {r.status === "pending" && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => openAction(r, "approve")} className="flex-1">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Approve & Schedule
                </Button>
                <Button size="sm" variant="outline" onClick={() => openAction(r, "decline")}>
                  <XCircle className="h-3 w-3 mr-1" /> Decline
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>

      <Dialog open={!!actioning} onOpenChange={(o) => !o && setActioning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "approve" ? "Approve & Schedule Appointment" : "Decline Request"}
            </DialogTitle>
            <DialogDescription>
              {clientName ? `For ${clientName}` : ""} · Topic: {actioning?.topic}
            </DialogDescription>
          </DialogHeader>

          {mode === "approve" && (
            <div className="space-y-2">
              <Label>Scheduled time</Label>
              <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
              <p className="text-xs text-muted-foreground">Default duration: 30 minutes. Will appear in your calendar.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Message to client (optional)</Label>
            <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3}
              placeholder={mode === "approve" ? "Looking forward to our call..." : "Unfortunately we can't make this time, please pick another slot."} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActioning(null)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>
              {mode === "approve" ? "Confirm" : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AppointmentRequestsPanel;
