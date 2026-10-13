import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTimeInTz, getClientTz, tzLabel } from "@/lib/timezone";
import { CalendarPlus, Clock, CheckCircle2, XCircle, Loader2, UserRound, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import Time24Input from "@/components/ui/time-24-input";

interface RequestRow {
  id: string;
  preferred_at: string;
  alternate_at: string | null;
  topic: string;
  notes: string | null;
  status: string;
  agent_response: string | null;
  created_at: string;
}

const TOPIC_OPTIONS_DE = [
  "Portfolio-Besprechung",
  "Einzahlung & Auszahlung",
  "Strategie & Empfehlungen",
  "Kontoeinstellungen",
  "Allgemeine Beratung",
  "Anderes Anliegen",
];
const TOPIC_OPTIONS_EN = [
  "Portfolio review",
  "Deposit & withdrawal",
  "Strategy & recommendations",
  "Account settings",
  "General consultation",
  "Other",
];

const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

interface Props {
  autoOpen?: boolean;
}

const RequestAppointmentCard = ({ autoOpen = false }: Props) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const locale = lang === "de" ? de : enUS;
  const topicOptions = lang === "de" ? TOPIC_OPTIONS_DE : TOPIC_OPTIONS_EN;

  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [, setHasAgent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [topic, setTopic] = useState(topicOptions[0]);
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("10:00");
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("assigned_agent")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.assigned_agent) {
        setHasAgent(true);
        const { data: agent } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", profile.assigned_agent)
          .maybeSingle();
        setAgentName(agent?.full_name || null);
      }

      const { data: reqs } = await supabase
        .from("appointment_requests")
        .select("id, preferred_at, alternate_at, topic, notes, status, agent_response, created_at")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (reqs) setRequests(reqs as RequestRow[]);
    };
    load();

    const channel = supabase
      .channel("appointment_requests_client")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointment_requests", filter: `client_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const submit = async () => {
    if (!user) return;
    if (!topic || !date || !time) {
      toast.error(t("Bitte Datum, Uhrzeit und Thema angeben.", "Please provide date, time and topic."));
      return;
    }

    const preferred = new Date(`${date}T${time}:00`);
    if (preferred.getTime() < Date.now()) {
      toast.error(t("Bitte einen zukünftigen Zeitpunkt wählen.", "Please pick a future date and time."));
      return;
    }
    let alternate: Date | null = null;
    if (altDate && altTime) {
      alternate = new Date(`${altDate}T${altTime}:00`);
    }

    setLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("assigned_agent")
      .eq("id", user.id)
      .maybeSingle();

    const { data: inserted, error } = await supabase
      .from("appointment_requests")
      .insert({
        client_id: user.id,
        agent_id: profile?.assigned_agent || null,
        preferred_at: preferred.toISOString(),
        alternate_at: alternate ? alternate.toISOString() : null,
        topic,
        notes: notes.trim() || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      toast.error(t("Anfrage konnte nicht gesendet werden.", "Could not send request.") + " " + error.message);
      setLoading(false);
      return;
    }

    // Confirmation email to the client
    try {
      const { data: me } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .maybeSingle();

      const recipientEmail = me?.email || user.email;
      if (recipientEmail) {
        const fmtDate = (d: Date) =>
          d.toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const fmtTime = (d: Date) =>
          d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "appointment-request-received",
            recipientEmail,
            idempotencyKey: `appt-request-${inserted!.id}`,
            templateData: {
              clientName: me?.full_name || undefined,
              topic,
              preferredDate: fmtDate(preferred),
              preferredTime: fmtTime(preferred),
              alternateDate: alternate ? fmtDate(alternate) : undefined,
              alternateTime: alternate ? fmtTime(alternate) : undefined,
              notes: notes.trim() || undefined,
              agentName: agentName || undefined,
            },
          },
        });
      }
    } catch (e) {
      console.error("Failed to send appointment request confirmation email", e);
    }

    // Notify the agent (if any) and admins/managers
    try {
      const recipients: string[] = [];
      if (profile?.assigned_agent) recipients.push(profile.assigned_agent);
      const { data: staff } = await supabase
        .from("user_roles")
        .select("user_id, roles!inner(name)")
        .in("roles.name", ["Admin", "Manager"]);
      (staff || []).forEach((r: any) => {
        if (r.user_id && !recipients.includes(r.user_id)) recipients.push(r.user_id);
      });
      if (recipients.length) {
        await supabase.from("notifications").insert(
          recipients.map((uid) => ({
            user_id: uid,
            title: "📅 Neue Termin-Anfrage",
            message: `${user.email || "Kunde"} möchte einen Termin am ${format(preferred, "dd.MM.yyyy 'um' HH:mm", { locale: de })} Uhr (${topic}).`,
            type: "appointment",
          }))
        );
      }
    } catch {/* notifications best-effort */}

    toast.success(t("Ihre Termin-Anfrage wurde gesendet.", "Your appointment request was sent."));
    setLoading(false);
    setOpen(false);
    setNotes("");
    setAltDate("");
    setAltTime("");
  };

  const statusBadge = (status: string) => {
    if (status === "approved")
      return <Badge className="bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />{t("Bestätigt", "Confirmed")}</Badge>;
    if (status === "declined")
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />{t("Abgelehnt", "Declined")}</Badge>;
    return <Badge className="bg-warning/15 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />{t("Ausstehend", "Pending")}</Badge>;
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-primary" />
          {t("Termin anfragen", "Request appointment")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t(
            "Vereinbaren Sie ein persönliches Beratungsgespräch mit Ihrem Account Manager.",
            "Schedule a personal consultation with your account manager."
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UserRound className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t("Ihr Account Manager", "Your account manager")}</p>
            <p className="text-sm font-semibold truncate">
              {agentName || t("Wird bei Anfrage zugewiesen", "Will be assigned on request")}
            </p>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full text-base h-12"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {t("Neuen Termin anfragen", "Request a new appointment")}
        </Button>

        {requests.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("Ihre Anfragen", "Your requests")}
            </p>
            {requests.slice(0, 4).map((r) => (
              <div key={r.id} className="rounded-lg border p-3 bg-background/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeInTz(r.preferred_at, getClientTz())} ({tzLabel(getClientTz())})
                    </p>
                  </div>
                  {statusBadge(r.status)}
                </div>
                {r.agent_response && (
                  <p className="text-xs mt-2 p-2 rounded bg-muted/60 text-muted-foreground">
                    💬 {r.agent_response}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CalendarPlus className="h-5 w-5 text-primary" />
              {t("Termin anfragen", "Request appointment")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Wählen Sie einen Wunschtermin. Ihr Berater bestätigt diesen so schnell wie möglich.",
                "Pick a preferred time. Your advisor will confirm shortly."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-base">{t("Thema", "Topic")} *</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {topicOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-base">{t("Wunschdatum", "Preferred date")} *</Label>
                <Input type="date" value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base">{t("Uhrzeit", "Time")} *</Label>
                <Time24Input value={time} onChange={setTime} className="h-11" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">{t("Alternativtermin (optional)", "Alternate date (optional)")}</Label>
                <Input type="date" value={altDate} min={todayStr()} onChange={(e) => setAltDate(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">{t("Uhrzeit", "Time")}</Label>
                <Time24Input value={altTime} onChange={setAltTime} className="h-11" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-base">{t("Ihre Nachricht (optional)", "Your message (optional)")}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("Was möchten Sie besprechen?", "What would you like to discuss?")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {t("Abbrechen", "Cancel")}
            </Button>
            <Button onClick={submit} disabled={loading} size="lg">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarPlus className="h-4 w-4 mr-2" />}
              {t("Anfrage senden", "Send request")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RequestAppointmentCard;
