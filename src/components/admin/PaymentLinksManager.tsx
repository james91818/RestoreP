import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";

type Preset = {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  url: string;
  label: string | null;
  sort_order: number;
  enabled: boolean;
};

const emptyForm = { amount: "", currency: "EUR", url: "", label: "", sort_order: 0, enabled: true };

const PaymentLinksManager = () => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Preset | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPresets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_link_presets")
      .select("*")
      .eq("provider", "max_stripe")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    else setPresets((data ?? []) as Preset[]);
    setLoading(false);
  };

  useEffect(() => { fetchPresets(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: presets.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (p: Preset) => {
    setEditing(p);
    setForm({
      amount: String(p.amount),
      currency: p.currency,
      url: p.url,
      label: p.label ?? "",
      sort_order: p.sort_order,
      enabled: p.enabled,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!form.url.trim()) return toast.error("Enter a link URL");

    setSaving(true);
    const payload = {
      provider: "max_stripe",
      amount: amt,
      currency: form.currency || "EUR",
      url: form.url.trim(),
      label: form.label.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      enabled: form.enabled,
    };

    const { error } = editing
      ? await supabase.from("payment_link_presets").update(payload).eq("id", editing.id)
      : await supabase.from("payment_link_presets").insert(payload);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Link updated" : "Link added");
    setDialogOpen(false);
    fetchPresets();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment link?")) return;
    const { error } = await supabase.from("payment_link_presets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    fetchPresets();
  };

  const toggleEnabled = async (p: Preset) => {
    const { error } = await supabase
      .from("payment_link_presets")
      .update({ enabled: !p.enabled })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    fetchPresets();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Links</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the Max - Stripe preset payment links shown to agents.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Add Link
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Max - Stripe Presets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : presets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No payment links yet. Add one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-24">Enabled</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presets.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.sort_order}</TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {p.amount.toLocaleString("de-DE")} {p.currency}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.label || "—"}</TableCell>
                    <TableCell className="max-w-xs">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline text-xs font-mono break-all inline-flex items-center gap-1"
                      >
                        {p.url.length > 40 ? p.url.slice(0, 40) + "…" : p.url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Switch checked={p.enabled} onCheckedChange={() => toggleEnabled(p)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Payment Link" : "Add Payment Link"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="250"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  maxLength={3}
                />
              </div>
            </div>
            <div>
              <Label>Stripe URL</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://buy.stripe.com/..."
              />
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Quick deposit"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => setForm({ ...form, enabled: v })}
                />
                <Label>Enabled</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentLinksManager;
