import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Pencil, Eye, EyeOff, FileText, Globe, Settings, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import AffiliateFieldsDialog from "@/components/admin/AffiliateFieldsDialog";

interface Affiliate {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  api_key: string;
  status: string;
  created_at: string;
  notes: string | null;
  visible_fields: Record<string, boolean> | null;
  username?: string | null;
  password?: string | null;
}

const AdminAffiliates = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false);
  const [fieldsAffiliate, setFieldsAffiliate] = useState<Affiliate | null>(null);
  const [editing, setEditing] = useState<Affiliate | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", notes: "", telegram_group_id: "", username: "", password: "" });
  const [ipList, setIpList] = useState<string[]>([""]);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchAffiliates = async () => {
    const { data } = await supabase
      .from("affiliates")
      .select("*")
      .order("created_at", { ascending: false });
    setAffiliates((data as Affiliate[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAffiliates(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", company: "", notes: "", telegram_group_id: "", username: "", password: "" });
    setIpList([""]);
    setDialogOpen(true);
  };

  const openEdit = (a: Affiliate) => {
    setEditing(a);
    setForm({ name: a.name, email: a.email ?? "", company: a.company ?? "", notes: a.notes ?? "", telegram_group_id: (a as any).telegram_group_id ?? "", username: a.username ?? "", password: a.password ?? "" });
    const ips = (a as any).allowed_ips ?? [];
    setIpList(ips.length > 0 ? ips : [""]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (saving) return;
    setSaving(true);
    try {
      const ips = ipList.map(s => s.trim()).filter(Boolean);
      if (editing) {
        await supabase.from("affiliates").update({
          name: form.name, email: form.email || null, company: form.company || null, notes: form.notes || null, allowed_ips: ips, telegram_group_id: form.telegram_group_id || null,
          username: form.username.trim() || null, password: form.password || null,
        } as any).eq("id", editing.id);
        toast.success("Affiliate updated");
      } else {
        await supabase.from("affiliates").insert({
          name: form.name, email: form.email || null, company: form.company || null, notes: form.notes || null, allowed_ips: ips, telegram_group_id: form.telegram_group_id || null,
          username: form.username.trim() || null, password: form.password || null,
        } as any);
        toast.success("Affiliate created");
      }
      setDialogOpen(false);
      fetchAffiliates();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("affiliates").delete().eq("id", id);
    toast.success("Affiliate deleted");
    fetchAffiliates();
  };

  const toggleStatus = async (a: Affiliate) => {
    const newStatus = a.status === "active" ? "suspended" : "active";
    await supabase.from("affiliates").update({ status: newStatus }).eq("id", a.id);
    toast.success(`Affiliate ${newStatus}`);
    fetchAffiliates();
  };

  const regenerateKey = async (id: string) => {
    // Generate new key via update with default
    const newKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    await supabase.from("affiliates").update({ api_key: newKey }).eq("id", id);
    toast.success("API key regenerated");
    fetchAffiliates();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openDocs = (a: Affiliate) => {
    setSelectedAffiliate(a);
    setDocsDialogOpen(true);
  };

  const registerUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-register-lead`;
  const leadsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-leads`;
  const depositsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-deposits`;

  const getDocsContent = (a: Affiliate) => `# Affiliate API Documentation
## Partner: ${a.name}

### Your Credentials
- **API Key:** ${a.api_key}
- **Username:** ${a.username || "(not set)"}
- **Password:** ${a.password || "(not set)"}
- **Whitelisted IPs:** ${((a as any).allowed_ips ?? []).length > 0 ? ((a as any).allowed_ips as string[]).join(", ") : "None (all blocked)"}

> Your API requests will only be accepted from the whitelisted IP addresses above. Contact us to update your IPs.

### Authentication (all endpoints)
Use EITHER the API key header:
\`\`\`
X-Affiliate-Key: ${a.api_key}
\`\`\`
OR HTTP Basic Auth with your username and password:
\`\`\`
Authorization: Basic <base64(username:password)>
\`\`\`

---

## 1. Register a Lead
POST ${registerUrl}

### Request Body (JSON)
\`\`\`json
{
  "email": "lead@example.com",        // Required
  "full_name": "John Doe",            // Required
  "phone": "+49123456789",            // Optional
  "country": "Germany",               // Optional
  "funnel": "landing-page-crypto"     // Optional - tracking funnel name
}
\`\`\`

### Success Response (201)
\`\`\`json
{
  "success": true,
  "lead_id": "uuid-of-created-lead",
  "redirect_url": "https://crypto-boerse.com/al/<auto-login-token>",
  "landing_url": "https://crypto-boerse.com/al/<auto-login-token>"
}
\`\`\`

> **Important:** After a successful registration, redirect the lead's browser to the \`redirect_url\` returned in the response. This auto-logs the lead in and opens \`/welcome\`, where the visit is tracked for Welcome Stats. If the affiliate only sends the lead server-to-server and does not redirect the browser, the lead is created but will not appear online.

### Direct browser form option
If the affiliate posts a browser form directly to the endpoint, add \`?redirect=true\` to the URL. The API will create the lead and immediately redirect the browser to the auto-login welcome page.

### Error Responses
- **400** - Missing required fields or duplicate email
- **401** - Invalid or missing API key
- **403** - Affiliate account suspended

### Example (cURL)
\`\`\`bash
curl -X POST "${registerUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Affiliate-Key: ${a.api_key}" \\
  -d '{
    "email": "lead@example.com",
    "full_name": "John Doe",
    "phone": "+49123456789",
    "country": "Germany",
    "funnel": "landing-page-crypto"
  }'
\`\`\`

---

## 2. List Your Leads
POST ${leadsUrl}

### Request Body (JSON)
\`\`\`json
{
  "from": "2026-01-01",     // Optional - filter start date
  "to": "2026-12-31",       // Optional - filter end date
  "limit": 100,             // Optional - max 1000, default 100
  "page": 1                 // Optional - default 1
}
\`\`\`

### Success Response (200)
\`\`\`json
{
  "success": true,
  "affiliate": "${a.name}",
  "total": 42,
  "page": 1,
  "limit": 100,
  "leads": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "lead@example.com",
      "phone": "+49123456789",
      "country": "Germany",
      "funnel": "landing-page-crypto",
      "status": "New Registration",
      "registered_at": "2026-03-20T14:30:00Z",
      "first_deposit_at": "2026-03-22T10:15:00Z"
    }
  ]
}
\`\`\`

### Example (cURL)
\`\`\`bash
curl -X POST "${leadsUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Affiliate-Key: ${a.api_key}" \\
  -d '{ "from": "2026-03-01", "to": "2026-03-31", "limit": 1000, "page": 1 }'
\`\`\`

---

## 3. List Your Deposits
POST ${depositsUrl}

Returns only leads who have made their first deposit. Filterable by \`first_deposit_at\` date range.

### Request Body (JSON)
\`\`\`json
{
  "from": "2026-01-01",     // Optional - filter by first_deposit_at start date
  "to": "2026-12-31",       // Optional - filter by first_deposit_at end date
  "limit": 100,             // Optional - max 1000, default 100
  "page": 1                 // Optional - default 1
}
\`\`\`

### Success Response (200)
\`\`\`json
{
  "success": true,
  "affiliate": "${a.name}",
  "total": 12,
  "page": 1,
  "limit": 100,
  "deposits": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "lead@example.com",
      "phone": "+49123456789",
      "country": "Germany",
      "funnel": "landing-page-crypto",
      "status": "Active",
      "registered_at": "2026-03-20T14:30:00Z",
      "first_deposit_at": "2026-03-22T10:15:00Z"
    }
  ]
}
\`\`\`

### Example (cURL)
\`\`\`bash
curl -X POST "${depositsUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Affiliate-Key: ${a.api_key}" \\
  -d '{ "from": "2026-03-01", "to": "2026-03-31", "limit": 1000, "page": 1 }'
\`\`\`

---

### Notes
- Leads are automatically created with "New Registration" status
- The affiliate name is tracked on each lead for attribution
- Duplicate emails will return an error
- The Deposits endpoint only returns leads with a confirmed first deposit
`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Affiliates</h1>
          <p className="text-muted-foreground text-sm">{affiliates.length} affiliate partners</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Affiliate
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">API Key</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : affiliates.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No affiliates yet</td></tr>
                ) : (
                  affiliates.map(a => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{a.name}</td>
                      <td className="p-3 text-muted-foreground">{a.email || "—"}</td>
                      <td className="p-3 text-muted-foreground">{a.company || "—"}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[180px] truncate">
                            {visibleKeys.has(a.id) ? a.api_key : "••••••••••••••••"}
                          </code>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleKeyVisibility(a.id)}>
                            {visibleKeys.has(a.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(a.api_key)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-xs cursor-pointer ${a.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                          onClick={() => toggleStatus(a)}
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(a)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDocs(a)}>
                              <FileText className="h-4 w-4 mr-2" /> API Docs
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setFieldsAffiliate(a); setFieldsDialogOpen(true); }}>
                              <Settings className="h-4 w-4 mr-2" /> Field Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const docs = getDocsContent(a);
                              const blob = new Blob([docs], { type: "text/plain" });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `affiliate-api-docs-${a.name.toLowerCase().replace(/\s+/g, "-")}.txt`;
                              link.click();
                              URL.revokeObjectURL(url);
                            }}>
                              <Globe className="h-4 w-4 mr-2" /> Download Docs
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => regenerateKey(a.id)}>
                              <Copy className="h-4 w-4 mr-2" /> Regenerate Key
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(a)}>
                              {a.status === "active" ? "Suspend" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(a.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Affiliate" : "Create Affiliate"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Partner name" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contact@partner.com" />
            </div>
            <div className="space-y-1">
              <Label>Company</Label>
              <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>API Username</Label>
                <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="partner_login" autoComplete="off" />
              </div>
              <div className="space-y-1">
                <Label>API Password</Label>
                <Input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" autoComplete="new-password" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Allowed IPs *</Label>
              {ipList.map((ip, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={ip}
                    onChange={e => {
                      const updated = [...ipList];
                      updated[idx] = e.target.value;
                      setIpList(updated);
                    }}
                    placeholder="e.g. 203.0.113.5"
                    className="flex-1"
                  />
                  {ipList.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setIpList(ipList.filter((_, i) => i !== idx))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setIpList([...ipList, ""])} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Add IP
              </Button>
              <p className="text-xs text-muted-foreground">Only these IPs can use the API.</p>
            </div>
            <div className="space-y-1">
              <Label>Telegram Group ID</Label>
              <Input value={form.telegram_group_id} onChange={e => setForm({ ...form, telegram_group_id: e.target.value })} placeholder="e.g. -1001234567890" />
              <p className="text-xs text-muted-foreground">Chat ID of the Telegram group to receive lead feedback.</p>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Docs Dialog */}
      <Dialog open={docsDialogOpen} onOpenChange={setDocsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API Documentation — {selectedAffiliate?.name}</DialogTitle>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="space-y-6">
              {/* Register Lead Endpoint */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">1. Register a Lead</h3>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-3 py-2 rounded font-mono flex-1 break-all">
                    POST {registerUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(registerUrl)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* List Leads Endpoint */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">2. List Your Leads</h3>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-3 py-2 rounded font-mono flex-1 break-all">
                    POST {leadsUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(leadsUrl)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Your Credentials</h3>
                <div className="bg-muted px-3 py-2 rounded space-y-1 text-xs font-mono">
                  <div><span className="text-muted-foreground">API Key:</span> {selectedAffiliate.api_key}</div>
                  <div><span className="text-muted-foreground">Whitelisted IPs:</span> {((selectedAffiliate as any).allowed_ips ?? []).length > 0 ? ((selectedAffiliate as any).allowed_ips as string[]).join(", ") : "None"}</div>
                </div>
                <p className="text-xs text-muted-foreground">Requests are only accepted from whitelisted IPs.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Authentication Header</h3>
                <code className="text-xs bg-muted px-3 py-2 rounded font-mono block">
                  X-Affiliate-Key: {selectedAffiliate.api_key}
                </code>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Register — Request Body (JSON)</h3>
                <pre className="text-xs bg-muted px-3 py-2 rounded font-mono overflow-x-auto">{`{
  "email": "lead@example.com",        // Required
  "full_name": "John Doe",            // Required
  "phone": "+49123456789",            // Optional
  "country": "Germany",               // Optional
  "funnel": "landing-page-crypto"     // Optional
}`}</pre>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Register — Success Response (201)</h3>
                <pre className="text-xs bg-muted px-3 py-2 rounded font-mono overflow-x-auto">{`{
  "success": true,
  "lead_id": "uuid-of-created-lead",
  "redirect_url": "https://crypto-boerse.com/al/<auto-login-token>",
  "landing_url": "https://crypto-boerse.com/al/<auto-login-token>"
}`}</pre>
                <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2">
                  <strong>Important:</strong> After a successful registration, redirect the lead's browser to the <code className="text-xs">redirect_url</code>. This auto-logs them in, opens <code className="text-xs">/welcome</code>, and makes the visit appear in Welcome Stats. Server-to-server lead posting alone cannot show the lead online.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">List Leads — Request Body (JSON)</h3>
                <pre className="text-xs bg-muted px-3 py-2 rounded font-mono overflow-x-auto">{`{
  "from": "2026-01-01",     // Optional - filter start date
  "to": "2026-12-31",       // Optional - filter end date
  "limit": 100,             // Optional - max 1000
  "page": 1                 // Optional - default 1
}`}</pre>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">cURL Examples</h3>
                <pre className="text-xs bg-muted px-3 py-2 rounded font-mono overflow-x-auto whitespace-pre-wrap">{`# Register a lead
curl -X POST "${registerUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Affiliate-Key: ${selectedAffiliate.api_key}" \\
  -d '{
    "email": "lead@example.com",
    "full_name": "John Doe",
    "phone": "+49123456789",
    "country": "Germany"
  }'

# List your leads
curl -X POST "${leadsUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Affiliate-Key: ${selectedAffiliate.api_key}" \\
  -d '{ "from": "2026-03-01", "to": "2026-03-31", "limit": 1000, "page": 1 }'`}</pre>
              </div>

              <Button variant="outline" size="sm" onClick={() => copyToClipboard(getDocsContent(selectedAffiliate))}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Copy All Docs
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AffiliateFieldsDialog
        open={fieldsDialogOpen}
        onOpenChange={setFieldsDialogOpen}
        affiliate={fieldsAffiliate}
        onSaved={fetchAffiliates}
      />
    </div>
  );
};

export default AdminAffiliates;
