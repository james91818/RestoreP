import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export type CopyTraderRow = {
  id?: string;
  display_name: string;
  avatar_url?: string | null;
  description?: string | null;
  win_rate?: number | null;
  total_pnl?: number | null;
  total_trades?: number | null;
  is_visible?: boolean;
  is_admin_managed?: boolean;
  allowed_asset_types?: string[];
  allowed_symbols?: string[];
};

const ASSET_TYPES = ["crypto", "stock", "index", "commodity"];

const empty: CopyTraderRow = {
  display_name: "",
  avatar_url: "",
  description: "",
  win_rate: 70,
  total_pnl: 0,
  total_trades: 0,
  is_visible: true,
  is_admin_managed: true,
  allowed_asset_types: ["crypto", "stock", "index", "commodity"],
  allowed_symbols: [],
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trader?: CopyTraderRow | null;
  onSaved: () => void;
};

const CopyTraderDialog = ({ open, onOpenChange, trader, onSaved }: Props) => {
  const [form, setForm] = useState<CopyTraderRow>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(trader ? { ...empty, ...trader } : empty);
    }
  }, [open, trader]);

  const toggleAsset = (a: string, on: boolean) => {
    const set = new Set(form.allowed_asset_types ?? []);
    if (on) set.add(a); else set.delete(a);
    setForm({ ...form, allowed_asset_types: Array.from(set) });
  };

  const save = async () => {
    if (!form.display_name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      display_name: form.display_name.trim(),
      avatar_url: form.avatar_url || null,
      description: form.description || null,
      win_rate: Number(form.win_rate ?? 0),
      total_pnl: Number(form.total_pnl ?? 0),
      total_trades: Number(form.total_trades ?? 0),
      is_visible: !!form.is_visible,
      is_admin_managed: form.is_admin_managed ?? true,
      allowed_asset_types: form.allowed_asset_types?.length ? form.allowed_asset_types : ASSET_TYPES,
      allowed_symbols: (form.allowed_symbols ?? []).map((s) => s.trim()).filter(Boolean),
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from("copy_traders").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("copy_traders").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? "Trader updated" : "Trader created");
    onSaved();
    onOpenChange(false);
  };

  const symbolsText = (form.allowed_symbols ?? []).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Copy Trader" : "New Copy Trader"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label>Display name *</Label>
            <Input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="e.g. George Soros"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Avatar URL</Label>
            <Input
              value={form.avatar_url ?? ""}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Win rate %</Label>
            <Input
              type="number"
              step="0.1"
              value={form.win_rate ?? 0}
              onChange={(e) => setForm({ ...form, win_rate: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Total trades</Label>
            <Input
              type="number"
              value={form.total_trades ?? 0}
              onChange={(e) => setForm({ ...form, total_trades: Number(e.target.value) })}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Total P&amp;L (EUR)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.total_pnl ?? 0}
              onChange={(e) => setForm({ ...form, total_pnl: Number(e.target.value) })}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Allowed asset types</Label>
            <div className="flex flex-wrap gap-3">
              {ASSET_TYPES.map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={(form.allowed_asset_types ?? []).includes(a)}
                    onCheckedChange={(v) => toggleAsset(a, !!v)}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Allowed symbols (comma separated, optional)</Label>
            <Input
              value={symbolsText}
              onChange={(e) =>
                setForm({
                  ...form,
                  allowed_symbols: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="BTC, ETH, AAPL"
            />
            <p className="text-xs text-muted-foreground">Leave empty to allow all symbols of the selected asset types.</p>
          </div>

          <div className="md:col-span-2 flex items-center justify-between border rounded-md p-3">
            <div>
              <Label>Visible to clients</Label>
              <p className="text-xs text-muted-foreground">Hide to keep this trader internal-only.</p>
            </div>
            <Switch
              checked={!!form.is_visible}
              onCheckedChange={(v) => setForm({ ...form, is_visible: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {form.id ? "Save changes" : "Create trader"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CopyTraderDialog;
