import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, Loader2, Landmark } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BankRow {
  id: string;
  label: string | null;
  account_holder: string;
  bank_name: string;
  iban: string;
  bic: string | null;
  reference: string | null;
  country: string;
  enabled: boolean;
  sort_order: number;
}

const EMPTY: Omit<BankRow, "id"> = {
  label: "",
  account_holder: "",
  bank_name: "",
  iban: "",
  bic: "",
  reference: "",
  country: "Austria",
  enabled: true,
  sort_order: 0,
};

export default function AdminWelcomeBanks() {
  const [rows, setRows] = useState<BankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("welcome_bank_accounts" as any)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async () => {
    if (!draft.account_holder || !draft.bank_name || !draft.iban) {
      toast({ title: "Missing fields", description: "Account holder, bank name and IBAN are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("welcome_bank_accounts" as any).insert(draft);
    setCreating(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setDraft({ ...EMPTY });
    toast({ title: "Bank account added" });
    void load();
  };

  const updateRow = (id: string, patch: Partial<BankRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleSave = async (row: BankRow) => {
    setSaving(row.id);
    const { id, ...rest } = row;
    const { error } = await supabase.from("welcome_bank_accounts" as any).update(rest).eq("id", id);
    setSaving(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bank account?")) return;
    const { error } = await supabase.from("welcome_bank_accounts" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Landmark className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Welcome Page Banks</h1>
          <p className="text-sm text-muted-foreground">
            Bank accounts shown to Austrian clients on the welcome page (one is randomly assigned per visit).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add new bank account
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Label (internal)" value={draft.label ?? ""} onChange={(v) => setDraft({ ...draft, label: v })} />
          <Field label="Country" value={draft.country} onChange={(v) => setDraft({ ...draft, country: v })} />
          <Field label="Account holder *" value={draft.account_holder} onChange={(v) => setDraft({ ...draft, account_holder: v })} />
          <Field label="Bank name *" value={draft.bank_name} onChange={(v) => setDraft({ ...draft, bank_name: v })} />
          <Field label="IBAN *" value={draft.iban} onChange={(v) => setDraft({ ...draft, iban: v })} />
          <Field label="BIC / SWIFT" value={draft.bic ?? ""} onChange={(v) => setDraft({ ...draft, bic: v })} />
          <Field label="Reference (optional)" value={draft.reference ?? ""} onChange={(v) => setDraft({ ...draft, reference: v })} />
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
              <span className="text-sm">Enabled</span>
            </div>
            <Button onClick={handleCreate} disabled={creating} className="ml-auto">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No bank accounts yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Label" value={row.label ?? ""} onChange={(v) => updateRow(row.id, { label: v })} />
                <Field label="Country" value={row.country} onChange={(v) => updateRow(row.id, { country: v })} />
                <Field label="Account holder" value={row.account_holder} onChange={(v) => updateRow(row.id, { account_holder: v })} />
                <Field label="Bank name" value={row.bank_name} onChange={(v) => updateRow(row.id, { bank_name: v })} />
                <Field label="IBAN" value={row.iban} onChange={(v) => updateRow(row.id, { iban: v })} />
                <Field label="BIC / SWIFT" value={row.bic ?? ""} onChange={(v) => updateRow(row.id, { bic: v })} />
                <Field label="Reference" value={row.reference ?? ""} onChange={(v) => updateRow(row.id, { reference: v })} />
                <div className="flex items-end gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={row.enabled} onCheckedChange={(v) => updateRow(row.id, { enabled: v })} />
                    <span className="text-sm">Enabled</span>
                  </div>
                  <Label className="ml-3 text-sm">Order</Label>
                  <Input
                    type="number"
                    className="w-20"
                    value={row.sort_order}
                    onChange={(e) => updateRow(row.id, { sort_order: parseInt(e.target.value, 10) || 0 })}
                  />
                  <Button onClick={() => handleSave(row)} disabled={saving === row.id} variant="default" className="ml-auto">
                    {saving === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                  <Button onClick={() => handleDelete(row.id)} variant="destructive" size="icon">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
