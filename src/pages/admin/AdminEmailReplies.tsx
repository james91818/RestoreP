import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, MailOpen, Send, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Thread {
  id: string;
  client_user_id: string;
  client_email: string;
  client_name: string | null;
  agent_name: string | null;
  agent_email: string | null;
  subject: string;
  body_text: string;
  agent_unread_count: number;
  last_reply_at: string | null;
  created_at: string;
}

interface Reply {
  id: string;
  thread_id: string;
  sender: "client" | "agent";
  sender_name: string | null;
  body: string;
  created_at: string;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function AdminEmailReplies() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [search, setSearch] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchThreads = async () => {
    const { data, error } = await (supabase as any)
      .from("client_email_threads")
      .select("*")
      .order("last_reply_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) setThreads(data as Thread[]);
    setLoading(false);
  };

  const fetchReplies = async (threadId: string) => {
    const { data } = await (supabase as any)
      .from("client_email_replies")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    setReplies((data as Reply[]) || []);
  };

  useEffect(() => {
    fetchThreads();
    const ch = supabase
      .channel("admin-email-replies")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_email_threads" }, fetchThreads)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_email_replies" }, () => {
        fetchThreads();
        if (selectedId) fetchReplies(selectedId);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) fetchReplies(selectedId);
    else setReplies([]);
  }, [selectedId]);

  const markRead = async (threadId: string) => {
    await (supabase as any)
      .from("client_email_threads")
      .update({ agent_unread_count: 0 })
      .eq("id", threadId);
  };

  const handleSelect = (t: Thread) => {
    setSelectedId(t.id);
    if (t.agent_unread_count > 0) markRead(t.id);
  };

  const handleAgentReply = async () => {
    if (!replyBody.trim() || !selectedId || !user) return;
    setSending(true);
    const thread = threads.find(t => t.id === selectedId);

    // Insert agent reply
    const { error } = await (supabase as any)
      .from("client_email_replies")
      .insert({
        thread_id: selectedId,
        sender: "agent",
        sender_user_id: user.id,
        sender_name: user.email,
        body: replyBody.trim(),
      });

    if (error) {
      toast.error("Failed to save reply: " + error.message);
      setSending(false);
      return;
    }

    // Send email to client with the reply text via send-transactional-email
    if (thread) {
      try {
        const replyUrl = `${window.location.origin}/reply/${(threads.find(t => t.id === selectedId) as any)?.reply_token || ""}`;
        // Re-fetch to get reply_token
        const { data: full } = await (supabase as any)
          .from("client_email_threads").select("reply_token").eq("id", selectedId).maybeSingle();
        const url = full?.reply_token ? `${window.location.origin}/reply/${full.reply_token}` : replyUrl;

        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "custom-message",
            recipientEmail: thread.client_email,
            idempotencyKey: `reply-${selectedId}-${Date.now()}`,
            templateData: {
              subject: `Re: ${thread.subject}`,
              bodyText: replyBody.trim(),
              clientName: thread.client_name || undefined,
              agentName: thread.agent_name || user.email || undefined,
              agentEmail: thread.agent_email || user.email || undefined,
              replyUrl: url,
            },
          },
        });
      } catch (e: any) {
        // Reply still saved; just warn
        toast.warning("Reply saved but email send failed");
      }
    }

    setReplyBody("");
    toast.success("Reply sent");
    fetchReplies(selectedId);
    setSending(false);
  };

  const filtered = threads.filter(t => {
    if (filter === "unread" && t.agent_unread_count === 0) return false;
    if (search) {
      const q = search.toLowerCase();
      return (t.subject?.toLowerCase().includes(q) ||
              t.client_email?.toLowerCase().includes(q) ||
              t.client_name?.toLowerCase().includes(q));
    }
    return true;
  });

  const selected = threads.find(t => t.id === selectedId);
  const totalUnread = threads.reduce((s, t) => s + (t.agent_unread_count || 0), 0);

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Replies
            {totalUnread > 0 && (
              <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                {totalUnread} new
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conversations from custom emails. Clients reply via secure portal link — no inbound email server needed.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "unread" ? "default" : "outline"}
            onClick={() => setFilter("unread")}
          >
            Unread ({totalUnread})
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All ({threads.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        {/* Thread list */}
        <Card className="h-[calc(100vh-220px)] flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subject / client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-10 text-sm">
                {filter === "unread" ? "No unread replies." : "No email threads yet."}
              </div>
            ) : filtered.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                className={
                  "w-full text-left p-3 border-b hover:bg-muted/40 transition-colors " +
                  (selectedId === t.id ? "bg-muted/60" : "") +
                  (t.agent_unread_count > 0 ? " border-l-4 border-l-destructive" : "")
                }
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm truncate">
                    {t.client_name || t.client_email}
                  </span>
                  {t.agent_unread_count > 0 && (
                    <Badge className="bg-destructive text-destructive-foreground h-5 min-w-5 px-1.5 text-[10px]">
                      {t.agent_unread_count}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mb-1">{t.subject}</p>
                <p className="text-[10px] text-muted-foreground/70">
                  {t.last_reply_at ? `Last reply: ${fmt(t.last_reply_at)}` : `Sent: ${fmt(t.created_at)}`}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card className="h-[calc(100vh-220px)] flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <MailOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                Select a thread to view the conversation
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="border-b">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{selected.subject}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selected.client_name || "—"} · {selected.client_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sent by {selected.agent_name || "—"} · {fmt(selected.created_at)}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/backoffice/users/${selected.client_user_id}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Open client
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto py-4 space-y-3">
                {/* Original */}
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                    Original · {selected.agent_name} · {fmt(selected.created_at)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{selected.body_text}</p>
                </div>
                {replies.map(r => (
                  <div
                    key={r.id}
                    className={
                      "rounded-lg p-3 " +
                      (r.sender === "client"
                        ? "bg-primary/10 border border-primary/30 ml-6"
                        : "bg-muted/40 mr-6")
                    }
                  >
                    <p className="text-[11px] font-semibold mb-1">
                      {r.sender === "client"
                        ? <span className="text-primary">CLIENT REPLY</span>
                        : <span className="text-muted-foreground">{r.sender_name || "Agent"}</span>}
                      <span className="text-muted-foreground/70 font-normal"> · {fmt(r.created_at)}</span>
                    </p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.body}</p>
                  </div>
                ))}
              </CardContent>
              <div className="border-t p-3 space-y-2">
                <Textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write a reply — this will be sent to the client by email and added to the thread..."
                  rows={4}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button onClick={handleAgentReply} disabled={!replyBody.trim() || sending}>
                    {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Send reply to client
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
