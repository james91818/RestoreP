import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { CrgCheckRow } from "@/hooks/useCrgGuard";

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

interface Props {
  open: boolean;
  check: CrgCheckRow | null;
  onCancel: () => void;
  onApprove: () => void;
  onShave?: () => void;
}

export default function CrgWarningDialog({ open, check, onCancel, onApprove, onShave }: Props) {
  if (!check) return null;
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            CRG guarantee would be exceeded
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Approving this FTD pushes <b>{check.affiliate_name}</b> /{" "}
                <b>{check.funnel}</b> ({check.country.toUpperCase()}) past the{" "}
                <b>{check.crg_pct}%</b> CRG guarantee for this week (Mon–Sat).
              </p>
              <div className="rounded-md border bg-muted/40 p-3 grid grid-cols-2 gap-2 tabular-nums">
                <div>Leads this week</div><div className="text-right font-medium">{check.week_leads}</div>
                <div>FTDs already kept</div><div className="text-right font-medium">{check.week_ftds}</div>
                <div>Guaranteed FTDs</div><div className="text-right font-medium">{check.guaranteed.toFixed(2)}</div>
                <div>Deal CPA</div><div className="text-right font-medium">{usd(check.cpa_usd)}</div>
                <div className="col-span-2 pt-2 border-t border-border/60 text-amber-600 dark:text-amber-400">
                  Suggested: shave this lead instead — you've already met the guarantee, so this FTD adds real cost.
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          {onShave && (
            <Button variant="secondary" onClick={onShave}>
              Shave lead
            </Button>
          )}
          <AlertDialogAction onClick={onApprove}>
            Approve anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
