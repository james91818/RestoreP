import { useEffect, useState } from "react";
import { Phone, Pencil, Check, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Props {
  userId: string;
  initialPhone?: string | null;
  clientName?: string | null;
}

// Light-touch phone validator: at least 6 digits, allows + - space ()
const isValidPhone = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 6 && digits.length <= 20;
};

const PhoneCheckCard = ({ userId, initialPhone, clientName }: Props) => {
  const [phone, setPhone] = useState<string>(initialPhone || "");
  const [editing, setEditing] = useState<boolean>(!initialPhone);
  const [draft, setDraft] = useState<string>(initialPhone || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialPhone && !phone) {
      setPhone(initialPhone);
      setDraft(initialPhone);
      setEditing(false);
    }
  }, [initialPhone, phone]);

  const notifyStaff = async (oldPhone: string, newPhone: string) => {
    try {
      // Look up assigned + ftd agent and all Admins/Managers
      const { data: profile } = await supabase
        .from("profiles")
        .select("assigned_agent, ftd_agent, full_name, email")
        .eq("id", userId)
        .maybeSingle();

      const recipients = new Set<string>();
      if ((profile as any)?.assigned_agent) recipients.add((profile as any).assigned_agent);
      if ((profile as any)?.ftd_agent) recipients.add((profile as any).ftd_agent);

      const { data: staff } = await (supabase as any)
        .from("user_roles")
        .select("user_id, roles!inner(name)")
        .in("roles.name", ["Admin", "Manager"]);
      (staff ?? []).forEach((s: any) => s.user_id && recipients.add(s.user_id));

      const label =
        clientName || (profile as any)?.full_name || (profile as any)?.email || "Client";
      const rows = Array.from(recipients).map((uid) => ({
        user_id: uid,
        title: "📞 Client updated phone number",
        message: `${label} updated their phone on the welcome page${
          oldPhone ? ` (was ${oldPhone})` : ""
        } → ${newPhone}.`,
        type: "client_online",
        priority: 3,
      }));

      if (rows.length > 0) {
        await supabase.from("notifications").insert(rows as any);
      }
    } catch (e) {
      // Non-blocking — phone is already saved on the profile
      console.error("notify staff failed", e);
    }
  };

  const handleSave = async () => {
    const cleaned = draft.trim();
    if (!isValidPhone(cleaned)) {
      toast.error("Bitte geben Sie eine gültige Telefonnummer ein.");
      return;
    }
    if (cleaned === phone) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const oldPhone = phone;
    const { error } = await supabase
      .from("profiles")
      .update({ phone: cleaned } as any)
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.");
      return;
    }
    setPhone(cleaned);
    setEditing(false);
    toast.success("Telefonnummer aktualisiert. Ihr Berater wurde informiert.");
    void notifyStaff(oldPhone, cleaned);
  };

  return (
    <div className="mt-5 rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-sm p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
          <Phone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs md:text-sm font-semibold text-[hsl(var(--hero-foreground))] mb-1">
            Ihre Telefonnummer für den Anruf
          </div>

          {!editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg md:text-xl font-bold text-[hsl(var(--hero-foreground))] tabular-nums">
                {phone || "—"}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraft(phone);
                  setEditing(true);
                }}
                className="h-8 gap-1 text-xs bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
                {phone ? "Ändern" : "Eintragen"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="tel"
                inputMode="tel"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="+49 …"
                className="h-10 max-w-[220px] bg-white/5 border-white/20 text-[hsl(var(--hero-foreground))] placeholder:text-[hsl(var(--hero-muted))]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") {
                    setDraft(phone);
                    setEditing(!phone);
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-10 gap-1"
              >
                <Check className="h-4 w-4" />
                Speichern
              </Button>
              {phone && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDraft(phone);
                    setEditing(false);
                  }}
                  className="h-10 gap-1 text-[hsl(var(--hero-muted))]"
                >
                  <X className="h-4 w-4" />
                  Abbrechen
                </Button>
              )}
            </div>
          )}

          <p className="mt-2 text-xs text-[hsl(var(--hero-muted))] leading-relaxed flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            Stimmt die Nummer? Falls nicht, korrigieren Sie sie hier — Ihr Berater wird sofort benachrichtigt.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhoneCheckCard;
