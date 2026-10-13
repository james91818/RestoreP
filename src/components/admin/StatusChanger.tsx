import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface StatusChangerProps {
  userId: string;
  currentStatus: string;
  onStatusChanged: () => void;
  size?: "sm" | "lg";
}

interface LeadStatus {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

// Shared cache for statuses with subscriber notifications
let cachedStatuses: LeadStatus[] | null = null;
let cachedAt = 0;
let cachePromise: Promise<LeadStatus[]> | null = null;
const CACHE_TTL_MS = 30_000; // refresh at most every 30s
const subscribers = new Set<(s: LeadStatus[]) => void>();

const fetchStatuses = async (force = false): Promise<LeadStatus[]> => {
  const fresh = cachedStatuses && Date.now() - cachedAt < CACHE_TTL_MS;
  if (!force && fresh) return cachedStatuses!;
  if (!force && cachePromise) return cachePromise;
  cachePromise = (async () => {
    const { data } = await supabase
      .from("lead_statuses")
      .select("*")
      .order("sort_order");
    cachedStatuses = (data as LeadStatus[]) ?? [];
    cachedAt = Date.now();
    cachePromise = null;
    subscribers.forEach((cb) => cb(cachedStatuses!));
    return cachedStatuses;
  })();
  return cachePromise;
};

export const invalidateStatusCache = () => {
  cachedStatuses = null;
  cachePromise = null;
  // Re-fetch immediately and notify all mounted consumers
  fetchStatuses(true);
};

export const getStatusColor = (status: string, statuses: LeadStatus[]): string => {
  const found = statuses.find(s => s.name === status);
  return found?.color ?? "bg-muted text-muted-foreground";
};

export const useLeadStatuses = () => {
  const [statuses, setStatuses] = useState<LeadStatus[]>(cachedStatuses ?? []);

  useEffect(() => {
    fetchStatuses().then(setStatuses);
    subscribers.add(setStatuses);
    return () => { subscribers.delete(setStatuses); };
  }, []);

  return statuses;
};

const StatusChanger = ({ userId, currentStatus, onStatusChanged, size = "sm" }: StatusChangerProps) => {
  const statuses = useLeadStatuses();

  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const displayStatus = optimisticStatus ?? currentStatus;

  // If the server-side status changes (via realtime or another agent), drop the
  // local optimistic overlay so it never masks the true current value.
  useEffect(() => {
    setOptimisticStatus(null);
  }, [currentStatus]);

  const handleChange = async (newStatus: string) => {
    if (newStatus === displayStatus) return;
    // Optimistic UI: show new status instantly, don't block on network
    setOptimisticStatus(newStatus);
    toast.success(`Status changed to "${newStatus}"`);
    onStatusChanged();

    // Fire-and-forget the DB update + audit log
    void (async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", userId);
      if (error) {
        setOptimisticStatus(null);
        toast.error("Failed to update status");
        return;
      }
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (auth?.user?.id) {
          await supabase.from("activity_log").insert({
            user_id: auth.user.id,
            action: "status_changed",
            details: { target_user_id: userId, from: currentStatus, to: newStatus },
          });
        }
      } catch {}
    })();
  };

  const currentColor = getStatusColor(displayStatus, statuses);

  const sizeClasses = size === "lg"
    ? "text-sm px-6 h-12 rounded-lg font-semibold shadow-md"
    : "text-xs px-2 py-1 rounded-full font-medium";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`${sizeClasses} whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${currentColor} inline-flex items-center gap-1`}
          onClick={(e) => e.stopPropagation()}
        >
          {size === "lg" && <span className="text-xs opacity-50 mr-1">Status:</span>}
          {displayStatus}
          <ChevronDown className={size === "lg" ? "h-4 w-4 opacity-60" : "h-3 w-3 opacity-60"} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {statuses.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onClick={() => handleChange(s.name)}
            className="flex items-center gap-2"
          >
            <span className={`h-2 w-2 rounded-full ${s.color.split(" ")[0]}`} />
            <span className={displayStatus === s.name ? "font-semibold" : ""}>{s.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusChanger;
