import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Bot, UserRound, X, Languages, Loader2, ExternalLink, Check, CheckCheck } from "lucide-react";
import { useLiveChatAlerts } from "@/hooks/useLiveChatAlerts";
import { toast } from "sonner";

const AI_SENDER = "00000000-0000-0000-0000-000000000000";

const AdminLiveChats = () => {
  const { user } = useAuth();
  const { roleName } = useRole();
  const hideDepositors = roleName === "Agent Conversion" || roleName === "Manager Conversion";
  const hideLeads = roleName === "Agent Retention" || roleName === "Manager Retention";
  const isAgentLike =
    roleName === "Agent" ||
    roleName === "Agent Conversion" ||
    roleName === "Agent Retention";
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [translations, setTranslations] = useState<Record<string, { text?: string; loading?: boolean }>>({});
  const { markSeen, alerts } = useLiveChatAlerts();
  const unreadMap = Object.fromEntries(alerts.map((a) => [a.roomId, a.unreadCount]));

  const translateMessage = async (messageId: string, content: string) => {
    // Toggle off if already translated
    if (translations[messageId]?.text) {
      setTranslations((p) => {
        const next = { ...p };
        delete next[messageId];
        return next;
      });
      return;
    }
    setTranslations((p) => ({ ...p, [messageId]: { loading: true } }));
    try {
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { text: content, target: "English" },
      });
      if (error) throw error;
      setTranslations((p) => ({ ...p, [messageId]: { text: data?.translation || "" } }));
    } catch (e) {
      setTranslations((p) => {
        const next = { ...p };
        delete next[messageId];
        return next;
      });
    }
  };

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("chat_rooms")
      .select("*")
      .in("status", ["open", "escalated", "waiting"])
      .order("updated_at", { ascending: false });
    let allRooms = data || [];

    // Fetch profiles for all user_ids
    const userIds = [...new Set(allRooms.map((r: any) => r.user_id))];
    let profMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, first_deposit_at, is_lead, assigned_agent, ftd_agent")
        .in("id", userIds);
      (profs || []).forEach((p: any) => { profMap[p.id] = p; });
    }

    // For agent-like roles, only show chats of clients they have access to
    if (isAgentLike && user) {
      const isConversionOnly = roleName === "Agent Conversion";
      allRooms = allRooms.filter((r: any) => {
        const p = profMap[r.user_id];
        if (!p) return false;
        if (isConversionOnly) {
          // Conversion: leads they own + depositors where they were the FTD agent
          return (p.is_lead === true && p.assigned_agent === user.id) ||
                 (p.is_lead === false && p.ftd_agent === user.id);
        }
        // Agent / Agent Retention: any client assigned to them
        return p.assigned_agent === user.id;
      });
    }

    // Show rooms where a real person (client OR staff) has sent a message.
    // AI-only rooms stay hidden, but agent-initiated ("force chat") rooms show up.
    if (allRooms.length > 0) {
      const roomIds = allRooms.map((r: any) => r.id);
      const { data: humanMsgs } = await supabase
        .from("chat_messages")
        .select("room_id, sender_id, type")
        .in("room_id", roomIds)
        .neq("sender_id", AI_SENDER)
        .neq("type", "system");
      const roomsWithHumanMsg = new Set(
        (humanMsgs || []).map((m: any) => m.room_id)
      );
      allRooms = allRooms.filter((r: any) => roomsWithHumanMsg.has(r.id));
    }

    setRooms(allRooms);
    setProfiles(profMap);
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, []);

  // Auto-open a chat room from ?room= URL param (deep link from LiveChatsFab)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const target = searchParams.get("room");
    if (!target || rooms.length === 0) return;
    const found = rooms.find((r) => r.id === target);
    if (found && (!activeRoom || activeRoom.id !== target)) {
      openRoom(found);
      // Clear the param so refresh doesn't keep re-opening
      const next = new URLSearchParams(searchParams);
      next.delete("room");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, searchParams]);
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_rooms" }, (payload: any) => {
        fetchRooms();
        const updated = payload.new;
        if (updated?.id) {
          setActiveRoom((prev: any) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const openRoom = async (room: any) => {
    setActiveRoom(room);
    markSeen(room.id);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at");
    setMessages(data || []);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
  };

  // Realtime for messages in active room
  useEffect(() => {
    if (!activeRoom) return;
    const channel = supabase
      .channel(`admin-chat-msg-${activeRoom.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${activeRoom.id}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        // Auto-mark this room as seen since the agent is actively viewing it
        markSeen(activeRoom.id);
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeRoom?.id]);

  const sendReply = async () => {
    if (!user || !activeRoom || !reply.trim()) return;
    const text = reply.trim();
    const roomId = activeRoom.id;
    setReply("");
    const { data: inserted, error } = await supabase
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content: text,
        type: "text",
      })
      .select("*")
      .single();

    if (error) {
      setReply(text);
      toast.error(`Message not sent: ${error.message}`);
      return;
    }

    if (inserted) {
      setMessages((prev) =>
        prev.some((m) => m.id === (inserted as any).id) ? prev : [...prev, inserted]
      );
      setTimeout(
        () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
        50
      );
    }

    // Ensure room is in agent mode
    await supabase.from("chat_rooms").update({ mode: "agent", agent_id: user.id }).eq("id", roomId);
  };

  const closeRoom = async (roomId: string) => {
    await supabase.from("chat_rooms").update({ status: "closed" }).eq("id", roomId);
    if (activeRoom?.id === roomId) {
      setActiveRoom(null);
      setMessages([]);
    }
    fetchRooms();
  };

  const statusColor: Record<string, string> = {
    open: "bg-yellow-500/10 text-yellow-600",
    escalated: "bg-destructive/10 text-destructive",
    closed: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Live Chats</h1>
        <p className="text-muted-foreground text-sm">Kundenunterhaltungen verwalten</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Room lists - split into Depositors and Leads */}
        <div className="lg:col-span-1 space-y-4">
          {(() => {
            const sortByUnread = (a: any, b: any) => (unreadMap[b.id] || 0) - (unreadMap[a.id] || 0);
            const depositors = rooms.filter((r) => profiles[r.user_id]?.first_deposit_at).sort(sortByUnread);
            const leads = rooms.filter((r) => !profiles[r.user_id]?.first_deposit_at).sort(sortByUnread);

            const renderRoom = (r: any) => {
              const prof = profiles[r.user_id];
              const unread = unreadMap[r.id] || 0;
              const hasUnread = unread > 0;
              return (
                <Card
                  key={r.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/30 ${activeRoom?.id === r.id ? "ring-1 ring-primary" : ""} ${hasUnread ? "ring-2 ring-destructive bg-destructive/5" : ""}`}
                  onClick={() => openRoom(r)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        {hasUnread && (
                          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className={`text-sm truncate ${hasUnread ? "font-bold" : "font-medium"}`}>{prof?.full_name || prof?.email || "Unbekannt"}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(r.updated_at).toLocaleString("de-DE")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {hasUnread && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">
                            {unread}
                          </Badge>
                        )}
                        {r.mode === "ai" ? <Bot className="h-3 w-3 text-muted-foreground" /> : <UserRound className="h-3 w-3 text-primary" />}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[r.status] ?? "bg-muted"}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            };

            if (loading) {
              return (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              );
            }

            return (
              <>
                {!hideDepositors && (
                  <Card className="border-emerald-500/30 overflow-hidden">
                    <CardHeader className="py-2.5 px-3 bg-emerald-500/5 border-b border-emerald-500/20">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-600 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5" /> Depositors
                        </span>
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{depositors.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-2 max-h-[40vh] overflow-y-auto">
                      {depositors.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-3">No depositor chats</p>
                      ) : (
                        depositors.map(renderRoom)
                      )}
                    </CardContent>
                  </Card>
                )}

                {!hideLeads && (
                  <Card className="border-blue-500/30 overflow-hidden">
                    <CardHeader className="py-2.5 px-3 bg-blue-500/5 border-b border-blue-500/20">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-600 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" /> Leads
                        </span>
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{leads.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-2 max-h-[40vh] overflow-y-auto">
                      {leads.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-3">No lead chats</p>
                      ) : (
                        leads.map(renderRoom)
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </div>

        {/* Conversation */}
        <div className="lg:col-span-2">
          {activeRoom ? (
            <Card className="flex flex-col h-[600px]">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-display">
                      {profiles[activeRoom.user_id]?.full_name || "Client"}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {activeRoom.mode === "ai" ? "KI" : "Berater"}
                      </Badge>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {activeRoom.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/backoffice/users/${activeRoom.user_id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" /> Open client
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => closeRoom(activeRoom.id)}>
                      <X className="h-4 w-4 mr-1" /> Close
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => {
                  const isClient = m.sender_id === activeRoom.user_id;
                  const isAI = m.sender_id === AI_SENDER;
                  const isSystem = m.type === "system";

                  if (isSystem) {
                    return (
                      <div key={m.id} className="text-center">
                        <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground">{m.content}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} className={`group flex items-end gap-1 ${isClient ? "justify-start" : "justify-end"}`}>
                      {!isClient && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => translateMessage(m.id, m.content)}
                          title={translations[m.id]?.text ? "Hide translation" : "Translate to English"}
                        >
                          {translations[m.id]?.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                        </Button>
                      )}
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isClient
                          ? "bg-muted"
                          : isAI
                            ? "bg-accent text-accent-foreground"
                            : "bg-primary text-primary-foreground"
                      }`}>
                        {isAI && <p className="text-[9px] font-semibold mb-0.5 opacity-60">KI</p>}
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        {translations[m.id]?.text && (
                          <div className="mt-2 pt-2 border-t border-current/20">
                            <p className="text-[9px] font-semibold mb-0.5 opacity-60 flex items-center gap-1">
                              <Languages className="h-2.5 w-2.5" /> ENGLISH
                            </p>
                            <p className="whitespace-pre-wrap italic opacity-90">{translations[m.id].text}</p>
                          </div>
                        )}
                        {(() => {
                          const sentAt = new Date(m.created_at);
                          const fmt = (d: Date) =>
                            d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
                          const readAtRaw = (activeRoom as any).client_last_read_at;
                          const readAt = readAtRaw ? new Date(readAtRaw) : null;
                          const isRead = !isClient && !!readAt && readAt.getTime() >= sentAt.getTime();
                          return (
                            <p className="text-[9px] mt-1 opacity-60 flex items-center gap-1">
                              <span>{isClient ? fmt(sentAt) : `Sent ${fmt(sentAt)}`}</span>
                              {!isClient && !isAI && (
                                isRead ? (
                                  <span className="flex items-center gap-0.5">
                                    <CheckCheck className="h-2.5 w-2.5" /> Read {fmt(readAt!)}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5">
                                    <Check className="h-2.5 w-2.5" /> Not read yet
                                  </span>
                                )
                              )}
                            </p>
                          );
                        })()}
                      </div>
                      {isClient && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => translateMessage(m.id, m.content)}
                          title={translations[m.id]?.text ? "Hide translation" : "Translate to English"}
                        >
                          {translations[m.id]?.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
              <div className="border-t p-3 flex gap-2">
                <Input
                  placeholder="Type a reply..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                />
                <Button onClick={sendReply} disabled={!reply.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>Select a chat to view the conversation</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLiveChats;
