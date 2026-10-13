import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { findCountry } from "@/lib/countries";
import { useVoipConfig } from "@/hooks/useVoip";

interface Prefix {
  id: string;
  label: string;
  prefix: string;
  country_code: string;
  phone_number: string;
}

const FLAG_URL = (cc: string) =>
  `https://flagcdn.com/24x18/${cc.toLowerCase()}.png`;

interface CallPrefixMenuProps {
  clientPhone: string;
  secondaryPhone?: string | null;
  profileId: string;
  size?: "sm" | "lg";
  label?: string;
  clientCountry?: string | null;
}

const CallPrefixMenu = ({ clientPhone, secondaryPhone, profileId, size = "sm", label, clientCountry }: CallPrefixMenuProps) => {
  const [prefixes, setPrefixes] = useState<Prefix[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { config: voipConfig } = useVoipConfig();
  const hasTwoPhones = !!(secondaryPhone && secondaryPhone.trim() && secondaryPhone.trim() !== clientPhone.trim());
  // When two phones exist, agent first picks which phone, then which prefix.
  const [selectedPhone, setSelectedPhone] = useState<string | null>(hasTwoPhones ? null : clientPhone);

  // Resolve client's country to ISO-2 to prioritize matching prefix at the top
  const clientCC = useMemo(() => {
    const c = findCountry(clientCountry);
    return c?.code?.toUpperCase() ?? null;
  }, [clientCountry]);

  const sortedPrefixes = useMemo(() => {
    if (!clientCC) return prefixes;
    const matches = prefixes.filter(p => p.country_code?.toUpperCase() === clientCC);
    const rest = prefixes.filter(p => p.country_code?.toUpperCase() !== clientCC);
    return [...matches, ...rest];
  }, [prefixes, clientCC]);

  // Reset phone selection whenever the popover closes (so reopening starts fresh)
  useEffect(() => {
    if (!open) {
      setSelectedPhone(hasTwoPhones ? null : clientPhone);
    }
  }, [open, hasTwoPhones, clientPhone]);

  const loadPrefixes = async () => {
    if (loaded) return;

    // Get current user's role IDs
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    const [{ data: allPrefixes }, { data: prefixRoles }, { data: userRoles }] = await Promise.all([
      supabase.from("phone_prefixes").select("*").order("sort_order"),
      supabase.from("phone_prefix_roles").select("*"),
      userId ? supabase.from("user_roles").select("role_id").eq("user_id", userId) : Promise.resolve({ data: [] }),
    ]);

    const myRoleIds = new Set(((userRoles as any) ?? []).map((r: any) => r.role_id));

    // Build map: prefix_id -> role_ids
    const prefixRoleMap: Record<string, string[]> = {};
    ((prefixRoles as any) ?? []).forEach((pr: any) => {
      if (!prefixRoleMap[pr.prefix_id]) prefixRoleMap[pr.prefix_id] = [];
      prefixRoleMap[pr.prefix_id].push(pr.role_id);
    });

    // Filter: show prefix if it has no role restrictions OR user has one of the allowed roles
    const filtered = ((allPrefixes as any) ?? []).filter((p: any) => {
      const allowedRoles = prefixRoleMap[p.id];
      if (!allowedRoles || allowedRoles.length === 0) return true;
      return allowedRoles.some((rid: string) => myRoleIds.has(rid));
    });

    setPrefixes(filtered);
    setLoaded(true);
  };

  useEffect(() => {
    if (open) loadPrefixes();
  }, [open]);

  const launchZoiper = (number: string) => {
    // Use a temporary anchor + click — keeps the user-gesture context that custom
    // protocols (zoiper:) require, and avoids browsers silently dropping
    // `window.location.href = "zoiper:..."` after async work.
    const url = `zoiper:${number}`;
    try {
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      // Some browsers ignore clicks on detached anchors — attach briefly.
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { document.body.removeChild(a); } catch {} }, 0);
    } catch {
      // Last-resort fallback
      window.location.href = url;
    }
  };

  const handleCall = async (phoneToCall: string, prefix?: string) => {
    setOpen(false);

    const raw = prefix ? `${prefix}${phoneToCall.replace(/^\+/, "")}` : phoneToCall;
    const number = raw.replace(/[^\d]/g, "");
    if (!number) {
      toast.error("No phone number to dial");
      return;
    }

    // Prefer PBX-based dial when VoIP is enabled; fall back to Zoiper URI otherwise.
    if (voipConfig.enabled) {
      try {
        const { data, error } = await supabase.functions.invoke("voip-proxy", {
          body: { action: "dial", number, client_id: profileId },
        });
        const err = error?.message || (data as { error?: string })?.error;
        if (err) {
          toast.error("PBX dial failed", { description: err });
        } else {
          toast.success("Call placed via PBX");
        }
      } catch (e) {
        toast.error("PBX dial failed", { description: (e as Error).message });
      }
    } else {
      launchZoiper(number);
    }

    // 2) Then do the bookkeeping in the background — failures here must NOT
    //    block the call from being placed.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const agentId = user?.id;

      // Warn (but do NOT block) if another lead is still in "Calling..."
      if (agentId) {
        const { data: stuckLeads } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("assigned_agent", agentId)
          .eq("status", "Calling...")
          .neq("id", profileId)
          .limit(1);

        if (stuckLeads && stuckLeads.length > 0) {
          const stuck = stuckLeads[0] as { id: string; full_name: string | null; email: string | null };
          const name = stuck.full_name || stuck.email || "previous lead";
          toast.warning(
            `Heads up: "${name}" is still marked as Calling… — update it after this call.`,
            {
              duration: 8000,
              action: {
                label: "Open lead",
                onClick: () => { window.location.href = `/backoffice/users/${stuck.id}`; },
              },
            }
          );
        }
      }

      // Mark this client as being called. On the very first call attempt for
      // this client, bump the status to "Calling…" regardless of current label.
      const { count: priorCalls } = await supabase
        .from("phone_call_log")
        .select("id", { count: "exact", head: true })
        .eq("client_id", profileId);

      const updates: { being_called: boolean; status?: string } = { being_called: true };
      if (!priorCalls || priorCalls === 0) {
        updates.status = "Calling...";
      }
      await supabase.from("profiles").update(updates).eq("id", profileId);

      // When PBX is disabled we still record a client-side log entry (PBX path logs server-side).
      if (agentId && !voipConfig.enabled) {
        await supabase.from("phone_call_log").insert({
          client_id: profileId,
          agent_id: agentId,
          phone_number: phoneToCall,
          prefix: prefix ?? null,
        });
      }
    } catch (error: any) {
      // Don't surface bookkeeping failures as a "call failed" message —
      // the dialer was already launched.
      console.error("Call bookkeeping failed:", error);
    }
  };

  // Phone selection step (only when 2 phones exist and none chosen yet)
  const showPhoneStep = hasTwoPhones && !selectedPhone;
  const activePhone = selectedPhone ?? clientPhone;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={size === "lg" ? "default" : "outline"}
          size={size === "lg" ? "lg" : "sm"}
          className={size === "lg"
            ? "bg-green-600 hover:bg-green-700 text-white font-semibold px-6 h-12 shadow-md text-sm"
            : "text-success border-success/30 hover:bg-success/10"}
        >
          <Phone className={size === "lg" ? "h-5 w-5 mr-2" : "h-4 w-4 mr-1"} />
          {size === "lg" ? (label ? `Call ${label}` : "Click to Call") : (label ? `Call ${label}` : "Call")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {showPhoneStep ? (
          <>
            <p className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Select Phone</p>
            <button
              onClick={() => setSelectedPhone(clientPhone)}
              className="flex items-center gap-3 w-full rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
            >
              <div className="h-5 w-6 flex items-center justify-center">
                <Phone className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Primary (Mobile)</p>
                <p className="text-xs text-muted-foreground font-mono">{clientPhone}</p>
              </div>
            </button>
            <button
              onClick={() => setSelectedPhone(secondaryPhone!)}
              className="flex items-center gap-3 w-full rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
            >
              <div className="h-5 w-6 flex items-center justify-center">
                <Phone className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Secondary (Landline)</p>
                <p className="text-xs text-muted-foreground font-mono">{secondaryPhone}</p>
              </div>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Prefix</p>
              {hasTwoPhones && (
                <button
                  onClick={() => setSelectedPhone(null)}
                  className="text-[10px] text-primary hover:underline"
                >
                  ← Change phone
                </button>
              )}
            </div>

            {/* Default - no prefix */}
            <button
              onClick={() => handleCall(activePhone)}
              className="flex items-center gap-3 w-full rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
            >
              <div className="h-5 w-6 flex items-center justify-center">
                <img
                  src={FLAG_URL("AT")}
                  alt="AT"
                  className="h-4 w-auto rounded-[2px] shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">AT Conversion Rotating</p>
                <p className="text-xs text-muted-foreground font-mono">{activePhone}</p>
              </div>
            </button>

            {sortedPrefixes.length > 0 && (
              <div className="border-t my-1" />
            )}

            {sortedPrefixes.map(p => {
              const isMatch = clientCC && p.country_code && p.country_code.toUpperCase() === clientCC;
              return (
              <button
                key={p.id}
                onClick={() => handleCall(activePhone, p.prefix)}
                className={`flex items-center gap-3 w-full rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors ${isMatch ? "bg-success/10 ring-1 ring-success/30" : ""}`}
              >
                <div className="h-5 w-6 flex items-center justify-center">
                  {p.country_code ? (
                    <img
                      src={FLAG_URL(p.country_code)}
                      alt={p.country_code}
                      className="h-4 w-auto rounded-[2px] shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium flex items-center gap-2">
                    {p.label}
                    {isMatch && <span className="text-[10px] text-success font-semibold uppercase">Match</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono font-semibold">{p.prefix}</span>{activePhone.replace(/^\+/, "")}
                  </p>
                </div>
              </button>
              );
            })}

            {!loaded && (
              <div className="flex justify-center py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CallPrefixMenu;
