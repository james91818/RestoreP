import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AffiliateFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliate: { id: string; name: string; visible_fields: Record<string, boolean> | null } | null;
  onSaved: () => void;
}

const FIELD_OPTIONS = [
  { key: "name", label: "Lead Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "country", label: "Country" },
  { key: "funnel", label: "Funnel" },
  { key: "status", label: "Status" },
  { key: "registered_at", label: "Registration Date" },
  { key: "first_deposit_at", label: "First Deposit Date" },
];

const AffiliateFieldsDialog = ({ open, onOpenChange, affiliate, onSaved }: AffiliateFieldsDialogProps) => {
  const defaults = FIELD_OPTIONS.reduce((acc, f) => ({ ...acc, [f.key]: true }), {} as Record<string, boolean>);
  const [fields, setFields] = useState<Record<string, boolean>>(defaults);
  const [saving, setSaving] = useState(false);

  // Sync state when affiliate changes
  const [lastId, setLastId] = useState<string | null>(null);
  if (affiliate && affiliate.id !== lastId) {
    setLastId(affiliate.id);
    const merged = { ...defaults, ...(affiliate.visible_fields ?? {}) };
    setFields(merged);
  }

  const toggle = (key: string) => {
    setFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!affiliate) return;
    setSaving(true);
    const { error } = await supabase
      .from("affiliates")
      .update({ visible_fields: fields as any })
      .eq("id", affiliate.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Field visibility updated");
      onSaved();
      onOpenChange(false);
    }
  };

  const enabledCount = Object.values(fields).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>API Field Visibility — {affiliate?.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Control which lead fields this affiliate receives in API responses. Unchecked fields will be hidden.
        </p>
        <div className="space-y-3 py-2">
          {FIELD_OPTIONS.map(f => (
            <div key={f.key} className="flex items-center gap-3">
              <Checkbox
                id={`field-${f.key}`}
                checked={fields[f.key] !== false}
                onCheckedChange={() => toggle(f.key)}
              />
              <Label htmlFor={`field-${f.key}`} className="cursor-pointer text-sm">
                {f.label}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{enabledCount}/{FIELD_OPTIONS.length} fields enabled</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AffiliateFieldsDialog;
