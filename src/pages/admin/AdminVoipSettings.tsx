import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PhoneCall, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useVoipConfig, useVoip, type VoipConfig } from "@/hooks/useVoip";

interface AgentRow {
  id: string;
  full_name: string | null;
  email: string | null;
  pbx_extension: string | null;
}

const AdminVoipSettings = () => {
  const { config, loading, save } = useVoipConfig();
  const { test } = useVoip();
  const [form, setForm] = useState<VoipConfig>(config);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [extEdits, setExtEdits] = useState<Record<string, string>>({});

  useEffect(() => setForm(config), [config]);

  useEffect(() => {
    (async () => {
      const { data: roleRows } = await supabase.from("user_roles").select("user_id");
      const ids = Array.from(new Set((roleRows ?? []).map((r: { user_id: string }) => r.user_id)));
      if (ids.length === 0) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, pbx_extension")
        .in("id", ids)
        .order("full_name");
      setAgents((data ?? []) as AgentRow[]);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(form);
      toast.success("VoIP settings saved");
    } catch (e) {
      toast.error("Save failed", { description: (e as Error).message });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const r = await test();
    setTestResult(r);
    setTesting(false);
  };

  const saveExtension = async (agentId: string) => {
    const val = (extEdits[agentId] ?? "").trim() || null;
    const { error } = await supabase
      .from("profiles")
      .update({ pbx_extension: val })
      .eq("id", agentId);
    if (error) {
      toast.error("Failed to save extension", { description: error.message });
      return;
    }
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, pbx_extension: val } : a)),
    );
    setExtEdits((prev) => {
      const { [agentId]: _, ...rest } = prev;
      return rest;
    });
    toast.success("Extension saved");
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <PhoneCall className="h-6 w-6 text-primary" /> VoIP Integration
        </h1>
        <p className="text-muted-foreground text-sm">
          Connect your Golden VoIP PBX so agents can dial, hang up and pull recordings from the backoffice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PBX Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable VoIP calls from backoffice</Label>
              <p className="text-xs text-muted-foreground">When off, calls fall back to Zoiper URI.</p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm({ ...form, enabled: v })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>PBX Proxyapi URL</Label>
              <Input
                value={form.pbx_url}
                onChange={(e) => setForm({ ...form, pbx_url: e.target.value })}
                placeholder="https://pbx.golden-voip.io/pbx/proxyapi.php"
              />
            </div>
            <div className="space-y-1">
              <Label>Tenant code</Label>
              <Input
                value={form.tenant}
                onChange={(e) => setForm({ ...form, tenant: e.target.value })}
                placeholder="e.g. DEVEL"
              />
            </div>
            <div className="space-y-1">
              <Label>Account suffix (optional)</Label>
              <Input
                value={form.account_suffix}
                onChange={(e) => setForm({ ...form, account_suffix: e.target.value })}
                placeholder="Defaults to tenant code"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.log_calls}
                onCheckedChange={(v) => setForm({ ...form, log_calls: v })}
              />
              <Label>Log outbound calls to phone_call_log</Label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Test connection
            </Button>
            {testResult && (
              <span
                className={`inline-flex items-center gap-1 text-sm ${
                  testResult.ok ? "text-success" : "text-destructive"
                }`}
              >
                {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {testResult.message}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            The API key is stored securely as <code>GOLDEN_VOIP_API_KEY</code>. Update it in
            backoffice secrets — it is never exposed to the browser.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Extensions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Agent</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Extension</th>
                  <th className="text-right p-3" />
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-muted-foreground">
                      No staff members yet.
                    </td>
                  </tr>
                ) : (
                  agents.map((a) => {
                    const draft = extEdits[a.id];
                    const dirty = draft !== undefined && draft !== (a.pbx_extension ?? "");
                    return (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="p-3">
                          <p className="font-medium">{a.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        </td>
                        <td className="p-3">
                          <Input
                            className="h-8 w-32"
                            placeholder="e.g. 402"
                            value={draft ?? a.pbx_extension ?? ""}
                            onChange={(e) =>
                              setExtEdits((prev) => ({ ...prev, [a.id]: e.target.value }))
                            }
                          />
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant={dirty ? "default" : "ghost"}
                            disabled={!dirty}
                            onClick={() => saveExtension(a.id)}
                          >
                            Save
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVoipSettings;