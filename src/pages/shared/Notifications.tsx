import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Notifications = () => {
  const { user } = useAuth();
  const { isStaff, roleName } = useRole();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAgentLike =
    roleName === "Agent" ||
    roleName === "Agent Conversion" ||
    roleName === "Agent Retention";

  // Notification types that are tied to a specific client and require access.
  const CLIENT_SCOPED_TYPES = new Set([
    "lead",
    "client_online",
    "deposit",
    "payment_link",
  ]);

  const fetchData = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("read", { ascending: true })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    let list = data ?? [];

    // For agents, hide client-scoped notifications about clients they don't have access to.
    if (isAgentLike && list.length > 0) {
      // Pull every profile this agent can see (RLS auto-filters to assigned/ftd clients)
      const { data: accessible } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      const accessibleNames = new Set<string>();
      const accessibleEmails = new Set<string>();
      (accessible ?? []).forEach((p: any) => {
        if (p.full_name) accessibleNames.add(p.full_name.toLowerCase().trim());
        if (p.email) accessibleEmails.add(p.email.toLowerCase().trim());
      });

      list = list.filter((n: any) => {
        if (!CLIENT_SCOPED_TYPES.has(n.type)) return true;
        const text = `${n.title ?? ""} ${n.message ?? ""}`.toLowerCase();
        const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
        if (emailMatch && accessibleEmails.has(emailMatch[0])) return true;
        // Match by leading name in message
        const msg = (n.message ?? "").trim().toLowerCase();
        const nameMatch = msg.match(/^(.+?)\s+(?:just signed up|is now online|paid|\()/i);
        const candidate = nameMatch?.[1]?.trim();
        if (candidate && accessibleNames.has(candidate)) return true;
        return false;
      });
    }

    setNotifications(list);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, isAgentLike]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    fetchData();
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const clearAll = async () => {
    if (!user) return;
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
    if (error) {
      toast.error(isStaff ? "Failed to clear notifications" : t("Konnte Benachrichtigungen nicht löschen", "Failed to clear notifications"));
      return;
    }
    setNotifications([]);
    toast.success(isStaff ? "All notifications cleared" : t("Alle Benachrichtigungen gelöscht", "All notifications cleared"));
  };

  // Try to find a client profile referenced by the notification message.
  // Strategy: extract email if present, otherwise use the leading name segment.
  const findClientId = async (n: any): Promise<string | null> => {
    const text = `${n.title ?? ""} ${n.message ?? ""}`;
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (emailMatch) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", emailMatch[0])
        .maybeSingle();
      if (data?.id) return data.id;
    }
    // Try to extract leading name from messages like "John Doe just signed up." / "John Doe is now online."
    const msg = (n.message ?? "").trim();
    const nameMatch = msg.match(/^(.+?)\s+(?:just signed up|is now online|paid|\()/i);
    const candidate = nameMatch?.[1]?.trim();
    if (candidate && candidate.length >= 2) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", candidate)
        .limit(1);
      if (data && data.length > 0) return data[0].id;
    }
    return null;
  };

  const handleClick = async (n: any) => {
    if (!n.read) {
      await markRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }

    const type = n.type as string;

    // Client-side routing
    if (!isStaff) {
      if (type === "deposit") return navigate("/wallet");
      if (type === "appointment") return navigate("/calendar");
      if (type === "chat") return navigate("/dashboard");
      return;
    }

    // Staff routing
    if (type === "chat") return navigate("/backoffice/live-chats");
    if (type === "appointment") return navigate("/backoffice/calendar");

    if (type === "lead" || type === "client_online" || type === "deposit" || type === "payment_link") {
      const clientId = await findClientId(n);
      const hash = type === "payment_link" ? "#stripe-intents" : "";
      if (clientId) return navigate(`/backoffice/users/${clientId}${hash}`);
      if (isAgentLike) {
        toast.error("You don't have access to this client.");
        return;
      }
      // Non-agent staff fallbacks
      if (type === "lead" || type === "client_online") return navigate("/backoffice/users");
      if (type === "deposit" || type === "payment_link") return navigate("/backoffice/depositors");
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">{isStaff ? "Notifications" : t("Benachrichtigungen", "Notifications")}</h1>
          <p className="text-muted-foreground text-sm">{unreadCount} {isStaff ? "unread" : t("ungelesen", "unread")}</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4 mr-1" /> {isStaff ? "Mark all as read" : t("Alle als gelesen markieren", "Mark all as read")}
            </Button>
          )}
          {notifications.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" /> {isStaff ? "Clear all" : t("Alle löschen", "Clear all")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isStaff ? "Clear all notifications?" : t("Alle Benachrichtigungen löschen?", "Clear all notifications?")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isStaff
                      ? "This will permanently delete all your notifications. This action cannot be undone."
                      : t(
                          "Dadurch werden alle Ihre Benachrichtigungen dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.",
                          "This will permanently delete all your notifications. This action cannot be undone."
                        )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{isStaff ? "Cancel" : t("Abbrechen", "Cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isStaff ? "Clear all" : t("Alle löschen", "Clear all")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>{isStaff ? "No notifications yet" : t("Noch keine Benachrichtigungen", "No notifications yet")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const priority = n.priority ?? 0;
            const isUrgent = priority >= 3;
            const isHigh = priority === 2;
            const accent = isUrgent
              ? "border-destructive/50 bg-destructive/[0.04]"
              : isHigh
              ? "border-primary/50 bg-primary/[0.04]"
              : !n.read ? "border-primary/30 bg-primary/[0.02]" : "";
            return (
              <Card key={n.id} className={`transition-colors cursor-pointer hover:bg-muted/40 ${accent}`} onClick={() => handleClick(n)}>
                <CardContent className="p-4 flex items-start gap-3">
                  {isUrgent ? (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                  ) : (
                    <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${!n.read ? (isHigh ? "bg-primary" : "bg-primary") : "bg-transparent"}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{n.title}</p>
                      {isUrgent && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{isStaff ? "Urgent" : t("Dringend", "Urgent")}</Badge>}
                      {isHigh && <Badge className="text-[10px] h-4 px-1.5 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">{isStaff ? "High" : t("Wichtig", "High")}</Badge>}
                    </div>
                    {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("de-DE")}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
