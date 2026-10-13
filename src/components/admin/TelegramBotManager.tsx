import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Send, Bot, CheckCircle2, XCircle, Loader2, RefreshCw, MessageSquare, UserPlus, Trophy, CreditCard, Plus, Trash2, Bell, UserCheck, Wallet } from "lucide-react";

type ChannelKey = "leads" | "ftd" | "payment_links" | "thomas_assignment" | "wallet_requests";

type ChannelCfg = { enabled: boolean; chat_id: string };
type CustomChannel = { id: string; label: string; enabled: boolean; chat_id: string };
type BotConfig = Record<ChannelKey, ChannelCfg> & { custom?: CustomChannel[] };

const CHANNEL_META: Record<ChannelKey, { label: string; description: string; icon: any }> = {
  leads: {
    label: "New Lead Notifications",
    description: "Posted when a new lead registers on the platform.",
    icon: UserPlus,
  },
  ftd: {
    label: "FTD Notifications",
    description: "Posted when a client makes their first approved deposit.",
    icon: Trophy,
  },
  payment_links: {
    label: "Payment Link Requests (RJ - PSP)",
    description: "Posted when an agent requests a payment link via the RJ - PSP provider.",
    icon: CreditCard,
  },
  thomas_assignment: {
    label: "Lead Assigned → Thomas Schmidt",
    description: "Posted once per lead the first time it gets assigned to agent Thomas Schmidt.",
    icon: UserCheck,
  },
  wallet_requests: {
    label: "Crypto Wallet Requests (PSP)",
    description: "Posted when an agent requests a deposit wallet from the PSP. Provider replies with the wallet address.",
    icon: Wallet,
  },
};

const DEFAULTS: BotConfig = {
  leads: { enabled: true, chat_id: "" },
  ftd: { enabled: true, chat_id: "" },
  payment_links: { enabled: true, chat_id: "" },
  thomas_assignment: { enabled: true, chat_id: "" },
  wallet_requests: { enabled: true, chat_id: "" },
  custom: [],
};

const TelegramBotManager = () => {
  const [config, setConfig] = useState<BotConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [botStatus, setBotStatus] = useState<"unknown" | "ok" | "error">("unknown");
  const [checkingBot, setCheckingBot] = useState(false);
  const [testingChannel, setTestingChannel] = useState<ChannelKey | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "telegram_bot")
      .maybeSingle();
    if (data?.value) {
      const v = data.value as any;
      setConfig({
        leads: { ...DEFAULTS.leads, ...(v.leads ?? {}) },
        ftd: { ...DEFAULTS.ftd, ...(v.ftd ?? {}) },
        payment_links: { ...DEFAULTS.payment_links, ...(v.payment_links ?? {}) },
        thomas_assignment: { ...DEFAULTS.thomas_assignment, ...(v.thomas_assignment ?? {}) },
        wallet_requests: { ...DEFAULTS.wallet_requests, ...(v.wallet_requests ?? {}) },
        custom: Array.isArray(v.custom) ? v.custom : [],
      });
    }
    setLoading(false);
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    const { data } = await supabase
      .from("telegram_message_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setLogs(data ?? []);
    setLogsLoading(false);
  };

  const checkBot = async () => {
    setCheckingBot(true);
    setBotStatus("unknown");
    const { data, error } = await supabase.functions.invoke("telegram-bot-admin", {
      body: { action: "info" },
    });
    setCheckingBot(false);
    if (error || !data?.ok) {
      setBotStatus("error");
      toast.error("Bot check failed: " + (error?.message || JSON.stringify(data?.raw ?? data).slice(0, 150)));
      return;
    }
    setBotInfo(data.result);
    setBotStatus("ok");
  };

  useEffect(() => {
    fetchConfig();
    fetchLogs();
    checkBot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateChannel = (key: ChannelKey, patch: Partial<ChannelCfg>) => {
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const addCustomChannel = () => {
    setConfig((prev) => ({
      ...prev,
      custom: [
        ...(prev.custom ?? []),
        { id: crypto.randomUUID(), label: "New Channel", enabled: true, chat_id: "" },
      ],
    }));
  };

  const updateCustomChannel = (id: string, patch: Partial<CustomChannel>) => {
    setConfig((prev) => ({
      ...prev,
      custom: (prev.custom ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const removeCustomChannel = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      custom: (prev.custom ?? []).filter((c) => c.id !== id),
    }));
  };

  const saveConfig = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "telegram_bot", value: config, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Telegram bot settings saved");
  };

  const sendTestRaw = async (chatId: string, label: string, slot: string) => {
    if (!chatId) return toast.error("Enter a Chat ID first");
    setTestingChannel(slot as any);
    const { data, error } = await supabase.functions.invoke("telegram-bot-admin", {
      body: {
        action: "send_test",
        chat_id: chatId,
        text: `🧪 <b>Test message</b>\n\nChannel: <b>${label}</b>\nSent from Crypto-Börse backoffice.`,
      },
    });
    setTestingChannel(null);
    if (error || !data?.ok) {
      toast.error("Test failed: " + (error?.message || JSON.stringify(data?.raw ?? data).slice(0, 150)));
    } else {
      toast.success(`Test message sent to ${label}`);
      fetchLogs();
    }
  };

  const sendTest = (key: ChannelKey) =>
    sendTestRaw(config[key].chat_id?.trim() ?? "", CHANNEL_META[key].label, key);

  return (
    <div className="space-y-6">
      {/* Bot Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Bot className="h-4 w-4" /> Bot Connection Status
          </CardTitle>
          <CardDescription>Live status of the Telegram bot used for all notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            {checkingBot ? (
              <Badge variant="secondary" className="gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking...
              </Badge>
            ) : botStatus === "ok" ? (
              <>
                <Badge className="bg-success/15 text-success border-success/30 gap-1.5">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </Badge>
                {botInfo?.username && (
                  <span className="text-sm text-muted-foreground">
                    @{botInfo.username} <span className="opacity-50">({botInfo.first_name})</span>
                  </span>
                )}
              </>
            ) : botStatus === "error" ? (
              <Badge variant="destructive" className="gap-1.5">
                <XCircle className="h-3 w-3" /> Connection failed
              </Badge>
            ) : (
              <Badge variant="secondary">Unknown</Badge>
            )}
            <Button variant="outline" size="sm" onClick={checkBot} disabled={checkingBot} className="ml-auto">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${checkingBot ? "animate-spin" : ""}`} /> Re-check
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Channels */}
      {loading ? (
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
          {(Object.keys(CHANNEL_META) as ChannelKey[]).map((key) => {
            const meta = CHANNEL_META[key];
            const Icon = meta.icon;
            const ch = config[key];
            return (
              <Card key={key} className={!ch.enabled ? "opacity-70" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" /> {meta.label}
                  </CardTitle>
                  <CardDescription className="text-xs">{meta.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Enabled</Label>
                    <Switch
                      checked={ch.enabled}
                      onCheckedChange={(v) => updateChannel(key, { enabled: v })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telegram Chat ID</Label>
                    <Input
                      value={ch.chat_id}
                      onChange={(e) => updateChannel(key, { chat_id: e.target.value })}
                      placeholder="-1001234567890"
                      className="font-mono text-xs"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => sendTest(key)}
                    disabled={testingChannel === key || !ch.chat_id.trim()}
                  >
                    {testingChannel === key ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="h-3.5 w-3.5 mr-1.5" /> Send Test</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Custom Channels */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Bell className="h-4 w-4" /> Custom Notification Channels
            </CardTitle>
            <CardDescription>
              Add additional Telegram destinations for any future notifications. Each channel can have its own chat ID and toggle.
            </CardDescription>
          </div>
          <Button size="sm" onClick={addCustomChannel}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Channel
          </Button>
        </CardHeader>
        <CardContent>
          {(config.custom ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No custom channels yet. Click <strong>Add Channel</strong> to create one.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(config.custom ?? []).map((c) => (
                <div key={c.id} className={`border rounded-lg p-3 space-y-3 ${!c.enabled ? "opacity-70" : ""}`}>
                  <div className="flex items-center gap-2">
                    <Input
                      value={c.label}
                      onChange={(e) => updateCustomChannel(c.id, { label: e.target.value })}
                      placeholder="Channel name (e.g. Withdrawals)"
                      className="text-sm font-medium"
                    />
                    <Switch
                      checked={c.enabled}
                      onCheckedChange={(v) => updateCustomChannel(c.id, { enabled: v })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => removeCustomChannel(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telegram Chat ID</Label>
                    <Input
                      value={c.chat_id}
                      onChange={(e) => updateCustomChannel(c.id, { chat_id: e.target.value })}
                      placeholder="-1001234567890"
                      className="font-mono text-xs"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => sendTestRaw(c.chat_id.trim(), c.label || "Custom", c.id)}
                    disabled={testingChannel === (c.id as any) || !c.chat_id.trim()}
                  >
                    {testingChannel === (c.id as any) ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="h-3.5 w-3.5 mr-1.5" /> Send Test</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Settings
        </Button>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-display">How to get a Chat ID</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>1. Add the bot to your Telegram group / channel as an administrator.</p>
          <p>2. To get the chat ID, add <code className="bg-muted px-1 py-0.5 rounded">@getidsbot</code> (or <code className="bg-muted px-1 py-0.5 rounded">@myidbot</code> / <code className="bg-muted px-1 py-0.5 rounded">@username_to_id_bot</code>) to the same group, send any message, and it will reply with the group's chat ID. Alternatively, open the group in Telegram Web — the ID is in the URL (it starts with <code className="bg-muted px-1 py-0.5 rounded">-100…</code>).</p>
          <p>3. Paste the full ID (including the leading minus sign) into the field above and hit <strong>Save Settings</strong>, then send a test message to verify.</p>
        </CardContent>
      </Card>

      {/* Recent Send Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Recent Telegram Activity
            </CardTitle>
            <CardDescription>Last 30 messages sent by the bot.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${logsLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Time</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="w-24 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {new Date(row.created_at).toLocaleString("de-DE", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{row.notification_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-md truncate">
                      {row.message_preview || row.error_message || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "sent" ? (
                        <Badge className="bg-success/15 text-success border-success/30 gap-1 text-[10px]">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Sent
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 text-[10px]">
                          <XCircle className="h-2.5 w-2.5" /> Failed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramBotManager;
