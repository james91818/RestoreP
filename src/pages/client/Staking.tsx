import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Landmark, Lock, Clock, CheckCircle2, Shield } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Compute live accrued rewards for an active stake: principal × APY × elapsedDays/365,
// capped at the full lock period so it does not exceed the contractual yield.
function computeAccruedRewards(stakeItem: any): number {
  const apy = Number(stakeItem?.staking_plans?.apy ?? 0);
  const principal = Number(stakeItem?.amount ?? 0);
  if (!apy || !principal) return Number(stakeItem?.rewards_earned ?? 0);
  const started = new Date(stakeItem.started_at).getTime();
  const unlocks = new Date(stakeItem.unlocks_at).getTime();
  const now = Date.now();
  const effectiveNow = Math.min(now, unlocks);
  const elapsedDays = Math.max(0, (effectiveNow - started) / (1000 * 60 * 60 * 24));
  const accrued = principal * (apy / 100) * (elapsedDays / 365);
  // Always show at least the stored value if admin pre-credited rewards
  const stored = Number(stakeItem?.rewards_earned ?? 0);
  return Math.max(stored, accrued);
}

const Staking = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [plans, setPlans] = useState<any[]>([]);
  const [stakes, setStakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stakeOpen, setStakeOpen] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Tick every 30s so accrued rewards visibly grow without refresh
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);


  const fetchData = async () => {
    if (!user) return;
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("staking_plans").select("*").eq("enabled", true).order("apy"),
      supabase.from("user_stakes").select("*, staking_plans(name, asset, apy)").eq("user_id", user.id).order("started_at", { ascending: false }),
    ]);
    setPlans(p ?? []);
    setStakes(s ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const stake = async () => {
    if (!user || !stakeOpen || !amount) return;
    const amtNum = Number(amount);
    if (amtNum < Number(stakeOpen.min_amount)) {
      toast.error(`Mindestbetrag ist €${stakeOpen.min_amount}`);
      return;
    }
    const { data: wallet } = await supabase.from("wallets").select("id, balance").eq("user_id", user.id).eq("currency", "EUR").maybeSingle();
    if (!wallet || Number(wallet.balance) < amtNum) {
      toast.error("Nicht genügend Guthaben");
      return;
    }
    await supabase.from("wallets").update({ balance: Number(wallet.balance) - amtNum }).eq("id", wallet.id);

    const unlocks = new Date();
    unlocks.setDate(unlocks.getDate() + stakeOpen.lock_period_days);

    await supabase.from("user_stakes").insert({
      user_id: user.id,
      plan_id: stakeOpen.id,
      amount: amtNum,
      unlocks_at: unlocks.toISOString(),
    });

    toast.success("Staking aktiviert!");
    setStakeOpen(null);
    setAmount("");
    fetchData();
  };

  const claimStake = async (stakeId: string) => {
    if (!user || claiming) return;
    setClaiming(stakeId);
    try {
      const stakeItem = stakes.find(s => s.id === stakeId);
      if (!stakeItem) return;

      const unlocked = new Date(stakeItem.unlocks_at) <= new Date();
      if (!unlocked) { toast.error("Dieser Stake ist noch gesperrt"); return; }
      if (stakeItem.claimed) { toast.error("Bereits eingelöst"); return; }

      const principal = Number(stakeItem.amount);
      const rewards = computeAccruedRewards(stakeItem);
      const total = principal + rewards;

      // Credit wallet with principal + rewards
      const { data: wallet } = await supabase.from("wallets").select("id, balance").eq("user_id", user.id).eq("currency", "EUR").maybeSingle();
      if (wallet) {
        await supabase.from("wallets").update({ balance: Number(wallet.balance) + total }).eq("id", wallet.id);
      }

      // Persist final rewards and mark as claimed
      await supabase.from("user_stakes").update({ claimed: true, rewards_earned: rewards }).eq("id", stakeId);

      toast.success(`Eingelöst: €${total.toFixed(2)} (€${principal.toFixed(2)} Kapital + €${rewards.toFixed(2)} Belohnungen)`);
      fetchData();
    } finally {
      setClaiming(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div>
         <h1 className="text-2xl font-display font-bold">Staking</h1>
         <p className="text-muted-foreground text-sm">{t("Verdienen Sie passives Einkommen durch das Sperren Ihrer Assets", "Earn passive income by locking your assets")}</p>
      </div>

      {/* Educational / motivational intro */}
      <Card className="border-[#3b82f6]/30 bg-gradient-to-br from-[#3b82f6]/10 via-transparent to-transparent">
        <CardContent className="p-5 md:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center shrink-0">
              <Landmark className="h-5 w-5 text-[#3b82f6]" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display font-bold text-lg">
                {t("Was ist Staking – und warum lohnt es sich?", "What is Staking – and why is it worth it?")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(
                  "Beim Staking stellen Sie Ihr Kapital für einen festgelegten Zeitraum zur Verfügung und erhalten dafür eine attraktive Rendite (APY) – ähnlich einem Festgeldkonto, jedoch mit deutlich höheren Zinsen. Während Ihr Kapital arbeitet, wachsen Ihre Belohnungen automatisch und planbar – ganz ohne tägliches Trading.",
                  "When you stake, you lock your capital for a defined period and receive an attractive annual yield (APY) in return – similar to a fixed-term deposit, but with significantly higher returns. While your capital works for you, rewards grow automatically and predictably – without any daily trading."
                )}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 pt-1">
            <div className="rounded-lg border border-[#3b82f6]/15 bg-background/40 p-3">
              <div className="flex items-center gap-2 text-[#3b82f6] font-semibold text-sm mb-1">
                <CheckCircle2 className="h-4 w-4" /> {t("Passives Einkommen", "Passive Income")}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("Verdienen Sie kontinuierlich Belohnungen, ohne aktiv handeln zu müssen.", "Earn continuous rewards without having to trade actively.")}
              </p>
            </div>
            <div className="rounded-lg border border-[#3b82f6]/15 bg-background/40 p-3">
              <div className="flex items-center gap-2 text-[#3b82f6] font-semibold text-sm mb-1">
                <Lock className="h-4 w-4" /> {t("Planbare Rendite", "Predictable Yield")}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("Feste APY-Sätze und klare Laufzeiten – Sie wissen genau, was Sie erwartet.", "Fixed APY rates and clear lock periods – you know exactly what to expect.")}
              </p>
            </div>
            <div className="rounded-lg border border-[#3b82f6]/15 bg-background/40 p-3">
              <div className="flex items-center gap-2 text-[#3b82f6] font-semibold text-sm mb-1">
                <Clock className="h-4 w-4" /> {t("Zinseszins-Effekt", "Compounding Effect")}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("Reinvestieren Sie Ihre Belohnungen und lassen Sie Ihr Vermögen exponentiell wachsen.", "Reinvest your rewards and let your wealth grow exponentially.")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-3">
            <Shield className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-success">
                {t("100 % versichert", "100% Insured")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(
                  "Alle Staking-Einlagen sind über unsere europäischen Verwahrungs- und Versicherungspartner vollständig abgesichert. Ihr Kapital ist jederzeit geschützt.",
                  "All staking deposits are fully secured through our European custody and insurance partners. Your capital is protected at all times."
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  <h3 className="font-display font-bold">{p.name}</h3>
                </div>
                <Badge className="bg-success/10 text-success border-success/30">{p.apy}% APY</Badge>
              </div>
               <div className="space-y-1 text-sm text-muted-foreground">
                 <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> {t("Sperrzeit", "Lock Period")}: {p.lock_period_days} {t("Tage", "Days")}</div>
                 <div className="flex items-center gap-2"><Landmark className="h-3.5 w-3.5" /> Asset: {p.asset}</div>
                 <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> Min: €{Number(p.min_amount).toLocaleString()}</div>
               </div>
              <Button className="w-full" onClick={() => { setStakeOpen(p); setAmount(""); }}>{t("Jetzt staken", "Stake Now")}</Button>
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">{t("Keine Staking-Pläne verfügbar", "No staking plans available")}</p>}
      </div>

      {/* Active Stakes */}
      {stakes.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b"><h3 className="font-display font-semibold">{t("Ihre Stakes", "Your Stakes")}</h3></div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[550px]">
              <thead>
                <tr className="border-b bg-muted/50">
                   <th className="text-left p-3 font-medium text-muted-foreground">{t("Plan", "Plan")}</th>
                   <th className="text-left p-3 font-medium text-muted-foreground">{t("Betrag", "Amount")}</th>
                   <th className="text-left p-3 font-medium text-muted-foreground">APY</th>
                   <th className="text-left p-3 font-medium text-muted-foreground">{t("Belohnungen", "Rewards")}</th>
                   <th className="text-left p-3 font-medium text-muted-foreground">{t("Entsperrt am", "Unlocks On")}</th>
                   <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                   <th className="text-right p-3 font-medium text-muted-foreground">{t("Aktion", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {stakes.map((s) => {
                  const unlocked = new Date(s.unlocks_at) <= new Date();
                  const reward = s.claimed ? Number(s.rewards_earned ?? 0) : computeAccruedRewards(s);
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{(s as any).staking_plans?.name}</td>
                      <td className="p-3">€{Number(s.amount).toLocaleString()}</td>
                      <td className="p-3 text-success font-semibold">{(s as any).staking_plans?.apy}%</td>
                      <td className={`p-3 font-semibold ${reward >= 0 ? "text-success" : "text-destructive"}`}>
                        {reward >= 0 ? "+" : ""}€{reward.toFixed(2)}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(s.unlocks_at).toLocaleDateString()}</td>
                      <td className="p-3">
                         {s.claimed ? (
                           <Badge variant="outline">{t("Eingelöst", "Claimed")}</Badge>
                          ) : unlocked ? (
                            <Badge className="bg-success/10 text-success border-success/30">{t("Bereit zum Einlösen", "Ready to Claim")}</Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {t("Gesperrt", "Locked")}</Badge>
                         )}
                      </td>
                      <td className="p-3 text-right">
                        {!s.claimed && unlocked && (
                          <Button
                            size="sm"
                            onClick={() => claimStake(s.id)}
                            disabled={claiming === s.id}
                          >
                            {claiming === s.id ? t("Wird eingelöst...", "Claiming...") : `${t("Einlösen", "Claim")} €${(Number(s.amount) + reward).toFixed(2)}`}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stake Dialog */}
      <Dialog open={!!stakeOpen} onOpenChange={() => setStakeOpen(null)}>
        <DialogContent>
           <DialogHeader><DialogTitle>{t("Staking in", "Stake in")} {stakeOpen?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
               <p><span className="text-muted-foreground">APY:</span> <span className="font-bold text-success">{stakeOpen?.apy}%</span></p>
               <p><span className="text-muted-foreground">{t("Sperrzeit", "Lock Period")}:</span> {stakeOpen?.lock_period_days} {t("Tage", "Days")}</p>
               <p><span className="text-muted-foreground">Minimum:</span> €{Number(stakeOpen?.min_amount ?? 0).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
               <Label>{t("Betrag", "Amount")} (€)</Label>
               <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Min €${stakeOpen?.min_amount}`} />
            </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setStakeOpen(null)}>{t("Abbrechen", "Cancel")}</Button>
             <Button onClick={stake}>{t("Staking bestätigen", "Confirm Staking")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Staking;
