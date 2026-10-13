import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone } from "lucide-react";
import { format } from "date-fns";

interface PhoneCallLogProps {
  userId: string;
}

interface CallEntry {
  id: string;
  phone_number: string;
  prefix: string | null;
  created_at: string;
  agent_id: string;
  agent_name?: string | null;
}

const PhoneCallLog = ({ userId }: PhoneCallLogProps) => {
  const [calls, setCalls] = useState<CallEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("phone_call_log")
      .select("id, phone_number, prefix, created_at, agent_id")
      .eq("client_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) {
      setCalls([]);
      setLoading(false);
      return;
    }

    const agentIds = Array.from(new Set(data.map((c) => c.agent_id)));
    const { data: agents } = agentIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", agentIds)
      : { data: [] as any[] };

    const agentMap = new Map(
      (agents || []).map((a: any) => [a.id, a.full_name || a.email || "Unknown"]),
    );

    setCalls(
      data.map((c) => ({ ...c, agent_name: agentMap.get(c.agent_id) || "Unknown" })),
    );
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();

    // Refetch when window/tab regains focus (e.g. after returning from Zoiper)
    const onFocus = () => load();
    const onVisibility = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    // Realtime: append new calls for this client as they happen
    const channel = supabase
      .channel(`phone_call_log_${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "phone_call_log", filter: `client_id=eq.${userId}` },
        () => { load(); },
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Phone Call History ({calls.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : calls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No calls placed to this client yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Number Dialed</TableHead>
                <TableHead>Prefix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="tabular-nums">
                    {format(new Date(c.created_at), "dd MMM yyyy, HH:mm:ss")}
                  </TableCell>
                  <TableCell>{c.agent_name}</TableCell>
                  <TableCell className="tabular-nums">{c.phone_number}</TableCell>
                  <TableCell className="text-muted-foreground">{c.prefix || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PhoneCallLog;
