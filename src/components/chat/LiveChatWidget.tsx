import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { MessageCircle, X, Send, UserRound, Bot, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const LiveChatWidget = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isStaff } = useRole();
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"ai" | "agent">("ai");
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldShow = !!user && !isStaff;

  // Chat stays closed by default — only opens when the client clicks the chat button
  // (or when an agent triggers force_chat_open below).

  // Poll for force_chat_open flag from agent
  useEffect(() => {
    if (!shouldShow) return;
    const checkForceOpen = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("force_chat_open")
        .eq("id", user!.id)
        .single();
      if ((data as any)?.force_chat_open) {
        setOpen(true);
        // Reset the flag
        await supabase.from("profiles").update({ force_chat_open: false } as any).eq("id", user!.id);
      }
    };
    checkForceOpen();
    const interval = setInterval(checkForceOpen, 5000);
    return () => clearInterval(interval);
  }, [shouldShow, user]);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
  };

  // Load existing open room on mount
  useEffect(() => {
    if (!shouldShow || !open) return;
    const loadRoom = async () => {
      const { data } = await supabase
        .from("chat_rooms")
        .select("id, mode")
        .eq("user_id", user!.id)
        .in("status", ["open", "escalated"])
        .limit(1)
        .maybeSingle();
      if (data) {
        setRoomId(data.id);
        setMode(data.mode as any);
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("room_id", data.id)
          .order("created_at");
        setMessages(msgs || []);
        scrollToBottom();
      } else {
        // No existing room — create one so AI greets first
        await createRoom();
      }
    };
    loadRoom();
  }, [shouldShow, open]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const newMsg = payload.new;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Also subscribe to room mode changes
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "chat_rooms",
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        const updated = payload.new;
        setMode(updated.mode as any);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Mark the conversation as read by the client while the chat window is open
  useEffect(() => {
    if (!shouldShow || !open || !roomId) return;
    const markRead = async () => {
      await supabase
        .from("chat_rooms")
        .update({ client_last_read_at: new Date().toISOString() } as any)
        .eq("id", roomId);
    };
    markRead();
    const interval = setInterval(markRead, 10000);
    return () => clearInterval(interval);
  }, [shouldShow, open, roomId, messages.length]);

  if (!shouldShow) return null;

  const createRoom = async () => {
    const { data } = await supabase.functions.invoke("live-chat", {
      body: { action: "create_room" },
    });
    if (data?.room_id) {
      setRoomId(data.room_id);
      setMode("ai");
      // Load the AI greeting message
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", data.room_id)
        .order("created_at");
      setMessages(msgs || []);
      scrollToBottom();
    }
    return data?.room_id;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setLoading(true);

    let rid = roomId;
    if (!rid) {
      rid = await createRoom();
      if (!rid) { setLoading(false); return; }
    }

    // Optimistic add
    const optimistic = {
      id: `temp-${Date.now()}`,
      room_id: rid,
      sender_id: user!.id,
      content: text,
      type: "text",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const { data, error } = await supabase.functions.invoke("live-chat", {
        body: { room_id: rid, message: text },
      });

      if (error) throw error;

      if (data?.mode === "agent") {
        setMode("agent");
      }
      // AI reply will arrive via realtime or is in data.reply
      if (data?.reply) {
        // The edge function already inserts, realtime will pick it up
      }
    } catch (e: any) {
      toast.error(t("Nachricht konnte nicht gesendet werden", "Failed to send message"));
    } finally {
      setLoading(false);
    }
  };

  const escalate = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      await supabase.functions.invoke("live-chat", {
        body: { room_id: roomId, action: "escalate" },
      });
      setMode("agent");
      toast.success(t("Sie werden mit einem Berater verbunden", "You are being connected to an advisor"));
    } catch {
      toast.error(t("Fehler beim Weiterleiten", "Error forwarding"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button with label */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-24 md:bottom-6 right-4 z-50 flex flex-col items-end gap-2"
          >
            {/* Tooltip label */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1, duration: 0.4 }}
              className="bg-background border shadow-lg rounded-xl px-4 py-2 text-sm font-medium text-foreground max-w-[200px] relative"
            >
              <span>{t("Brauchen Sie Hilfe? Schreiben Sie uns!", "Need help? Write to us!")}</span>
              <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-background border-b border-r rotate-45" />
            </motion.div>
            <button
              onClick={() => setOpen(true)}
              className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 md:bottom-6 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden"
            style={{ height: "500px", maxHeight: "calc(100vh - 8rem)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                {mode === "ai" ? <Bot className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                <div>
                  <p className="text-sm font-semibold">
                    {mode === "ai" ? t("KI-Assistent", "AI Assistant") : t("Berater", "Advisor")}
                  </p>
                  <p className="text-[10px] opacity-80">
                    {mode === "ai" ? t("Immer verfügbar", "Always available") : t("Verbunden", "Connected")}
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-primary-foreground/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Bot className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>Willkommen! Wie kann ich Ihnen helfen?</p>
                </div>
              )}
              {messages.map((m) => {
                const isUser = m.sender_id === user!.id;
                const isSystem = m.type === "system";
                if (isSystem) {
                  return (
                    <div key={m.id} className="text-center">
                      <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground">
                        {m.content}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className={`text-[9px] mt-1 ${isUser ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Escalate button */}
            {mode === "ai" && messages.length > 2 && (
              <div className="px-3 pb-1">
                <button
                  onClick={escalate}
                  className="w-full text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1 rounded-md hover:bg-muted transition-colors"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  Mit einem Berater verbinden
                </button>
              </div>
            )}

            {/* Input */}
            <div className="border-t p-3 flex gap-2">
              <Input
                placeholder={t("Nachricht eingeben...", "Type a message...")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                disabled={loading}
                className="text-sm"
              />
              <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveChatWidget;
