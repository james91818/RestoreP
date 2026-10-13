import { Badge } from "@/components/ui/badge";
import { useFollowUps, levelFor } from "@/hooks/useFollowUps";
import { useRole, isAdminOrManager } from "@/hooks/useRole";

/** "Needs Update" / "Update Soon" badge for one customer, based on the shared follow-up data. */
const FollowUpBadge = ({ customerId }: { customerId: string }) => {
  const { roleName } = useRole();
  const scope = isAdminOrManager(roleName) ? "all" : "mine";
  const { rows } = useFollowUps(scope);
  const row = rows.find((r) => r.customer_id === customerId);
  if (!row) return null;
  const level = levelFor(row.last_activity_at);
  if (level === "overdue") return <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">Needs Update</Badge>;
  if (level === "soon") return <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-orange-500/50 text-orange-500 bg-orange-500/10">Update Soon</Badge>;
  return null;
};

export default FollowUpBadge;
