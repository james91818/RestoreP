import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlarmClock, UserRound } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useFollowUps, periodKey, formatSince, FollowUpRow } from "@/hooks/useFollowUps";
import AddCommentDialog from "./AddCommentDialog";

const storageKey = (uid: string) => `followup-dismissed:${uid}`;
const readSeen = (uid: string): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(storageKey(uid)) || "[]")); } catch { return new Set(); }
};
const writeSeen = (uid: string, keys: string[]) => localStorage.setItem(storageKey(uid), JSON.stringify(keys));

/**
 * Agent-facing reminders. Summary popup when several customers are overdue,
 * single-customer popup when exactly one new customer crosses 48h.
 * Dismissals are remembered per overdue period (shared across tabs via localStorage),
 * so the same reminder never repeats until a new 48h period begins.
 */
const FollowUpAlerts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { overdue, loaded } = useFollowUps("mine", !!user);
  const [mode, setMode] = useState<"none" | "bulk" | "single">("none");
  const [newOnes, setNewOnes] = useState<FollowUpRow[]>([]);
  const [commentTarget, setCommentTarget] = useState<FollowUpRow | null>(null);
  const shownRef = useRef<Set<string>>(new Set());

  const keys = useMemo(() => overdue.map(periodKey), [overdue]);

  useEffect(() => {
    if (!user || !loaded || mode !== "none" || commentTarget) return;
    const seen = readSeen(user.id);
    const fresh = overdue.filter((r) => !seen.has(periodKey(r)) && !shownRef.current.has(periodKey(r)));
    if (fresh.length === 0) return;
    fresh.forEach((r) => shownRef.current.add(periodKey(r)));
    setNewOnes(fresh);
    setMode(fresh.length === 1 ? "single" : "bulk");
  }, [keys.join("|"), loaded, user?.id, mode, commentTarget]);

  const dismiss = () => {
    if (user) writeSeen(user.id, Array.from(new Set([...keys, ...readSeen(user.id)].filter((k) => keys.includes(k)))));
    setMode("none");
  };

  const single = newOnes[0];
  const liveSingle = single && overdue.find((r) => r.customer_id === single.customer_id);
  const openCustomer = (id: string) => { dismiss(); navigate(`/backoffice/users/${id}`); };

  return (
    <>
      <Dialog open={mode === "bulk" && overdue.length > 0} onOpenChange={(o) => !o && dismiss()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlarmClock className="h-5 w-5 text-destructive" /> Follow-Up Required
            </DialogTitle>
            <DialogDescription>
              You have <strong className="text-foreground">{overdue.length}</strong> customer{overdue.length === 1 ? "" : "s"} that
              {overdue.length === 1 ? " has" : " have"} not been updated in the last 48 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto divide-y divide-border rounded-md border border-border">
            {overdue.map((r) => (
              <div key={r.customer_id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.full_name || r.email || "Customer"}</p>
                  <p className="text-xs text-destructive">{formatSince(r.last_activity_at)} without update</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setCommentTarget(r)}>Add Comment</Button>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={dismiss}>Remind Me Later</Button>
            <Button onClick={() => { dismiss(); navigate("/backoffice/follow-ups"); }}>Review Customers</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "single" && !!liveSingle} onOpenChange={(o) => !o && dismiss()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlarmClock className="h-5 w-5 text-destructive" /> Customer Follow-Up Required
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1 pt-1">
                <p className="flex items-center gap-2 text-foreground"><UserRound className="h-4 w-4" /> {liveSingle?.full_name || liveSingle?.email}</p>
                <p>{liveSingle?.has_comment ? "Your last update was" : "Assigned without any update for"} <strong className="text-destructive">{liveSingle && formatSince(liveSingle.last_activity_at)}</strong>{liveSingle?.has_comment ? " ago." : "."}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={dismiss}>Close</Button>
            <Button variant="outline" onClick={() => liveSingle && openCustomer(liveSingle.customer_id)}>Open Customer</Button>
            <Button onClick={() => liveSingle && setCommentTarget(liveSingle)}>Add Comment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {commentTarget && (
        <AddCommentDialog
          open
          onOpenChange={(o) => !o && setCommentTarget(null)}
          userId={commentTarget.customer_id}
          userName={commentTarget.full_name || commentTarget.email || "Customer"}
          onSaved={() => { if (mode === "single") setMode("none"); }}
        />
      )}
    </>
  );
};

export default FollowUpAlerts;
