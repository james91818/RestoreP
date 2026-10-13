import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import logoAsset from "@/assets/crypto-boerse-logo.png.asset.json";
const logo = logoAsset.url;

interface ThreadReply {
  id: string;
  sender: "client" | "agent";
  sender_name: string | null;
  body: string;
  created_at: string;
}

interface ThreadData {
  thread_id: string;
  subject: string;
  body_text: string;
  agent_name: string | null;
  agent_email: string | null;
  client_name: string | null;
  client_email: string;
  created_at: string;
  replies: ThreadReply[];
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

export default function EmailReply() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const fetchThread = async () => {
    if (!token) return;
    const { data, error } = await (supabase as any).rpc("get_email_thread_by_token", { _token: token });
    if (error) { setError(error.message); setLoading(false); return; }
    if (!data || data.length === 0) {
      setError("Diese Antwort-Verknüpfung ist ungültig oder abgelaufen.");
      setLoading(false);
      return;
    }
    setThread(data[0] as ThreadData);
    setLoading(false);
  };

  useEffect(() => {
    fetchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSend = async () => {
    if (!body.trim() || !token) return;
    setSending(true);
    const { error } = await (supabase as any).rpc("post_client_reply_by_token", {
      _token: token,
      _body: body.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    setBody("");
    setSent(true);
    toast.success("Ihre Antwort wurde übermittelt.");
    fetchThread();
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Crypto-Börse" className="h-14 mb-3" />
          <p className="text-[#3b82f6] text-sm tracking-widest uppercase font-semibold">
            Sicheres Antwortportal
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
          </div>
        )}

        {error && !loading && (
          <Card className="bg-white border-0">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
              <p className="text-lg font-semibold text-gray-900">Verknüpfung ungültig</p>
              <p className="text-sm text-gray-600 mt-2">{error}</p>
              <p className="text-xs text-gray-500 mt-4">
                Bitte kontaktieren Sie uns per E-Mail an <a href="mailto:support@crypto-borse.com" className="text-primary hover:underline">support@crypto-borse.com</a> oder über den Live-Chat.
              </p>
            </CardContent>
          </Card>
        )}

        {thread && !error && (
          <>
            {/* Original email */}
            <Card className="bg-white border-0 mb-4 shadow-xl">
              <CardHeader className="border-b">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-[#3b82f6] mt-0.5" />
                  <div className="flex-1">
                    <CardTitle className="text-lg text-gray-900">{thread.subject}</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      Von <span className="font-medium">{thread.agent_name || "Crypto-Börse"}</span>
                      {thread.agent_email && <> · {thread.agent_email}</>} · {formatDate(thread.created_at)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {thread.client_name && (
                  <p className="text-sm text-gray-700 mb-3">Sehr geehrte/r {thread.client_name},</p>
                )}
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {thread.body_text}
                </div>
              </CardContent>
            </Card>

            {/* Conversation */}
            {thread.replies.length > 0 && (
              <div className="space-y-3 mb-4">
                {thread.replies.map((r) => (
                  <Card
                    key={r.id}
                    className={
                      "border-0 shadow-md " +
                      (r.sender === "client"
                        ? "bg-[#3b82f6]/15 ml-8"
                        : "bg-white mr-8")
                    }
                  >
                    <CardContent className="py-3 px-4">
                      <p className="text-xs font-semibold mb-1 text-gray-700">
                        {r.sender === "client"
                          ? `Sie · ${formatDate(r.created_at)}`
                          : `${r.sender_name || "Crypto-Börse"} · ${formatDate(r.created_at)}`}
                      </p>
                      <p className="text-sm whitespace-pre-wrap text-gray-800 leading-relaxed">
                        {r.body}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Reply box */}
            <Card className="bg-white border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base text-gray-900">Antworten</CardTitle>
                <p className="text-xs text-gray-500">
                  Ihre Nachricht wird sicher und verschlüsselt direkt an Ihren Berater übermittelt.
                </p>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Schreiben Sie hier Ihre Antwort..."
                  rows={6}
                  maxLength={10000}
                  className="resize-none"
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-400">
                    {sent && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Antwort übermittelt
                      </span>
                    )}
                  </p>
                  <Button
                    onClick={handleSend}
                    disabled={sending || !body.trim()}
                    className="bg-[#3b82f6] hover:bg-[#c19e2c] text-white font-semibold"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Antwort senden
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-xs text-white/40 mt-6">
              © {new Date().getFullYear()} Crypto-Börse — Premium Investment Solutions
            </p>
          </>
        )}
      </div>
    </div>
  );
}
