import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, CalendarPlus, Mail, MessageCircle, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

type Manager = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
};

const initials = (name?: string | null) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "AM";

const AccountManagerCard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [manager, setManager] = useState<Manager | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_my_account_manager" as any);
      if (cancelled) return;
      const row = Array.isArray(data) ? (data[0] as Manager | undefined) : null;
      if (row) setManager(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!manager) return null;

  const name = manager.full_name || t("Ihr Betreuer", "Your manager");

  return (
    <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar className="h-16 w-16 ring-2 ring-primary/30">
              {manager.avatar_url && <AvatarImage src={manager.avatar_url} alt={name} />}
              <AvatarFallback className="bg-primary/15 text-primary font-display font-bold text-lg">
                {initials(manager.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                {t("Ihr persönlicher Kundenbetreuer", "Your personal account manager")}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <h3 className="text-xl sm:text-2xl font-display font-bold truncate">{name}</h3>
                <BadgeCheck className="h-5 w-5 text-primary shrink-0" />
              </div>
              <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
                {manager.email && (
                  <a href={`mailto:${manager.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> {manager.email}
                  </a>
                )}
                {manager.phone && (
                  <a href={`tel:${manager.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" /> {manager.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end shrink-0">
            <Button className="rounded-xl font-semibold" onClick={() => navigate("/calendar")}>
              <CalendarPlus className="h-4 w-4 mr-1.5" /> {t("Termin anfragen", "Request appointment")}
            </Button>
            <Button variant="outline" className="rounded-xl font-semibold" onClick={() => navigate("/support")}>
              <MessageCircle className="h-4 w-4 mr-1.5" /> {t("Nachricht senden", "Send message")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountManagerCard;
