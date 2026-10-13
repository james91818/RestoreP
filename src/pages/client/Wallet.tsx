import { isAbuseError, reportAbuse } from "@/lib/abuseGuard";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownRight, Landmark, Bitcoin, CheckCircle2, Clock, XCircle, History, ArrowLeftRight, DollarSign, PoundSterling, Coins, CircleDollarSign, BadgeDollarSign, TrendingUp, Copy, Gift, Users, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import btcIcon from "@/assets/crypto/btc.png";
import ethIcon from "@/assets/crypto/eth.png";
import solIcon from "@/assets/crypto/sol.png";
import xrpIcon from "@/assets/crypto/xrp.png";
import bnbIcon from "@/assets/crypto/bnb.png";
import dogeIcon from "@/assets/crypto/doge.png";
import adaIcon from "@/assets/crypto/ada.png";
import dotIcon from "@/assets/crypto/dot.png";
import linkIcon from "@/assets/crypto/link.png";
import avaxIcon from "@/assets/crypto/avax.png";

const CRYPTO_ICON_MAP: Record<string, string> = {
  BTC: btcIcon, ETH: ethIcon, SOL: solIcon, XRP: xrpIcon, BNB: bnbIcon,
  DOGE: dogeIcon, ADA: adaIcon, DOT: dotIcon, LINK: linkIcon, AVAX: avaxIcon,
};

const FIAT_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD"];
const CRYPTO_CURRENCIES = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "DOT", "LINK", "AVAX"];

const FIAT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  EUR: Landmark, USD: DollarSign, GBP: PoundSterling, CHF: CircleDollarSign, AUD: BadgeDollarSign, CAD: BadgeDollarSign,
};

const CurrencyIcon = ({ currency, className }: { currency: string; className?: string }) => {
  const cryptoSrc = CRYPTO_ICON_MAP[currency];
  if (cryptoSrc) return <img src={cryptoSrc} alt={currency} className={`${className} rounded-full object-contain`} />;
  const FiatIcon = FIAT_ICON_MAP[currency] || Coins;
  return <FiatIcon className={className} />;
};
const statusConfig: Record<string, { labelDe: string; labelEn: string; icon: typeof CheckCircle2; className: string }> = {
  approved: { labelDe: "Genehmigt", labelEn: "Approved", icon: CheckCircle2, className: "text-emerald-600 bg-emerald-500/10" },
  pending: { labelDe: "In Bearbeitung", labelEn: "Pending", icon: Clock, className: "text-amber-600 bg-amber-500/10" },
  rejected: { labelDe: "Abgelehnt", labelEn: "Rejected", icon: XCircle, className: "text-destructive bg-destructive/10" },
};

const WalletPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { wallets, cryptoPricesEur, totalBalanceEur, inTradesEur, openTradesPnlEur, projectedBalanceEur, refreshBalance } = useBalance();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [closedTrades, setClosedTrades] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositStep, setDepositStep] = useState(0);
  const [depositType, setDepositType] = useState<"fiat" | "crypto" | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(0);
  const [withdrawType, setWithdrawType] = useState<"fiat" | "crypto" | null>(null);
  const [showP2pInfo, setShowP2pInfo] = useState(false);
  const [form, setForm] = useState({ amount: "", currency: "EUR", method: "bank_wire", wallet_address: "", destination: "", bank_name: "", iban: "", swift: "" });
  const [activeTab, setActiveTab] = useState<"deposits" | "withdrawals" | "swaps" | "bonuses">("deposits");
  const [swaps, setSwaps] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapStep, setSwapStep] = useState(0);
  const [swapFrom, setSwapFrom] = useState("");
  const [swapTo, setSwapTo] = useState("");
  const [swapAmount, setSwapAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [cryptoAddresses, setCryptoAddresses] = useState<any[]>([]);
  const [bankDetails, setBankDetails] = useState<any | null>(null);

  const fetchData = async () => {
    if (!user) return;
    const [{ data: d }, { data: wd }, { data: sw }, { data: ct }, { data: ca }, { data: bd }, { data: bn }] = await Promise.all([
      supabase.from("deposits").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("swaps").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("trades").select("pnl, closed_at").eq("user_id", user.id).eq("status", "closed").order("closed_at", { ascending: true }),
      (supabase as any).from("client_crypto_addresses").select("*").eq("user_id", user.id),
      (supabase as any).from("client_bank_details").select("*").eq("user_id", user.id).maybeSingle(),
      (supabase as any).rpc("get_my_bonuses"),
    ]);
    setDeposits(d ?? []);
    setWithdrawals(wd ?? []);
    setSwaps(sw ?? []);
    setClosedTrades(ct ?? []);
    setCryptoAddresses(ca ?? []);
    setBankDetails(bd ?? null);
    setBonuses(bn ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);


  const buildRecipientIds = async () => {
    if (!user) return { ids: new Set<string>(), clientName: "A client" };
    const { data: profile } = await supabase
      .from("profiles")
      .select("assigned_agent, ftd_agent, full_name, email")
      .eq("id", user.id)
      .single();

    const { data: staffRoles } = await supabase
      .from("roles")
      .select("id")
      .in("name", ["Admin", "Manager"]);

    const { data: staffMembers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role_id", (staffRoles ?? []).map(r => r.id));

    const recipientIds = new Set<string>();
    if (profile?.assigned_agent) recipientIds.add(profile.assigned_agent);
    if ((profile as any)?.ftd_agent) recipientIds.add((profile as any).ftd_agent);
    (staffMembers ?? []).forEach(sm => recipientIds.add(sm.user_id));
    recipientIds.delete(user.id);

    const clientName = profile?.full_name || profile?.email || "A client";
    return { ids: recipientIds, clientName };
  };

  const notifyDepositIntent = async () => {
    if (!user) return;
    // Throttle: only one intent notification per 10 minutes per session
    try {
      const key = `depositIntentNotifiedAt:${user.id}`;
      const last = Number(localStorage.getItem(key) || 0);
      if (Date.now() - last < 10 * 60 * 1000) return;
      localStorage.setItem(key, String(Date.now()));
    } catch { /* ignore */ }

    try {
      const { ids, clientName } = await buildRecipientIds();
      if (ids.size === 0) return;
      await supabase.from("notifications").insert(
        Array.from(ids).map(uid => ({
          user_id: uid,
          title: "💳 Client opened Deposit",
          message: `${clientName} just opened the deposit dialog from the Wallet. They may need assistance.`,
          type: "deposit",
          priority: 2,
        }))
      );
    } catch (e) {
      console.error("Failed to send deposit-intent notifications:", e);
    }
  };

  const submitDeposit = async () => {
    if (!user || !form.amount) return;
    const { error: depositError } = await supabase.from("deposits").insert({
      user_id: user.id,
      amount: Number(form.amount),
      currency: form.currency,
      method: form.method,
      wallet_address: form.wallet_address || null,
    });

    if (depositError) {
      if (isAbuseError(depositError.message)) {
        await reportAbuse("deposit_tamper", depositError.message);
        return;
      }
      console.error("Failed to submit deposit:", depositError);
      return;
    }


    try {
      const { ids, clientName } = await buildRecipientIds();
      if (ids.size > 0) {
        await supabase.from("notifications").insert(
          Array.from(ids).map(uid => ({
            user_id: uid,
            title: "New Deposit Request",
            message: `${clientName} submitted a ${form.currency} ${Number(form.amount).toLocaleString()} deposit via ${form.method === "crypto" ? "crypto" : "bank wire"}.`,
            type: "deposit",
            priority: 3,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to send deposit notifications:", e);
    }

    toast.success(t("Einzahlungsanfrage eingereicht.", "Deposit request submitted."));
    fetchData();
  };

  const submitWithdrawal = async () => {
    if (!user || !form.amount) return;
    const isCrypto = form.method === "crypto";
    if (isCrypto && !form.destination.trim()) {
      toast.error("Bitte geben Sie Ihre Wallet-Adresse ein");
      return;
    }
    if (!isCrypto && (!form.bank_name.trim() || !form.iban.trim())) {
      toast.error("Bitte geben Sie Ihre Bankdaten ein (Bankname und IBAN)");
      return;
    }
    const wallet = wallets.find(w => w.currency === form.currency);
    if (!wallet || Number(wallet.balance) < Number(form.amount)) {
      toast.error("Nicht genügend Guthaben");
      return;
    }
    const destination = isCrypto
      ? form.destination.trim()
      : `Bank: ${form.bank_name.trim()}, IBAN: ${form.iban.trim()}${form.swift.trim() ? `, SWIFT: ${form.swift.trim()}` : ""}`;

    await supabase.from("withdrawals").insert({
      user_id: user.id,
      amount: Number(form.amount),
      currency: form.currency,
      method: form.method,
      destination,
    });

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("assigned_agent, full_name, email")
        .eq("id", user.id)
        .single();

      const { data: staffRoles } = await supabase
        .from("roles")
        .select("id, name")
        .in("name", ["Admin", "Manager"]);

      const staffRoleIds = (staffRoles ?? []).map(r => r.id);
      const { data: staffMembers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role_id", staffRoleIds);

      const recipientIds = new Set<string>();
      if (profile?.assigned_agent) recipientIds.add(profile.assigned_agent);
      (staffMembers ?? []).forEach(sm => recipientIds.add(sm.user_id));
      recipientIds.delete(user.id);

      const clientName = profile?.full_name || profile?.email || "A client";
      const notifications = Array.from(recipientIds).map(uid => ({
        user_id: uid,
        title: "New Withdrawal Request",
        message: `${clientName} requested a ${form.currency} ${Number(form.amount).toLocaleString()} withdrawal via ${form.method === "crypto" ? "crypto" : "bank wire"}.`,
        type: "withdrawal",
      }));

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
    } catch (e) {
      console.error("Failed to send notifications:", e);
    }

    toast.success(t("Auszahlungsantrag eingereicht.", "Withdrawal request submitted."));
    fetchData();
  };

  const resetForm = () => {
    setForm({ amount: "", currency: "EUR", method: "bank_wire", wallet_address: "", destination: "", bank_name: "", iban: "", swift: "" });
    setDepositStep(0);
    setDepositType(null);
    setWithdrawStep(0);
    setWithdrawType(null);
    setShowP2pInfo(false);
  };

  const fiatWallets = wallets.filter(w => FIAT_CURRENCIES.includes(w.currency));
  const cryptoWallets = wallets.filter(w => CRYPTO_CURRENCIES.includes(w.currency) && Number(w.balance) > 0);

  /** Convert an amount from one currency to another using cryptoPricesEur */
  const convertAmount = (amount: number, from: string, to: string): number => {
    const isFiat = (c: string) => FIAT_CURRENCIES.includes(c);
    // fiat→fiat: 1:1 (simplified, same base)
    if (isFiat(from) && isFiat(to)) return amount;
    // fiat→crypto: divide by crypto price in EUR
    if (isFiat(from) && !isFiat(to)) {
      const price = cryptoPricesEur[to];
      return price ? amount / price : amount;
    }
    // crypto→fiat: multiply by crypto price in EUR
    if (!isFiat(from) && isFiat(to)) {
      const price = cryptoPricesEur[from];
      return price ? amount * price : amount;
    }
    // crypto→crypto: convert via EUR
    const fromPrice = cryptoPricesEur[from];
    const toPrice = cryptoPricesEur[to];
    return (fromPrice && toPrice) ? (amount * fromPrice) / toPrice : amount;
  };

  const swapReceiveAmount = swapFrom && swapTo && swapAmount
    ? convertAmount(Number(swapAmount), swapFrom, swapTo)
    : 0;

  const methodLabel = (m: string) => {
    const labels: Record<string, [string, string]> = {
      bank_wire: ["Banküberweisung", "Bank Transfer"],
      crypto: ["Kryptowährung", "Cryptocurrency"],
      credit_card: ["Kreditkarte", "Credit Card"],
      e_wallet: ["E-Wallet", "E-Wallet"],
    };
    return labels[m] ? t(labels[m][0], labels[m][1]) : m;
  };

  const txList = activeTab === "deposits" ? deposits : activeTab === "withdrawals" ? withdrawals : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-8 px-2 sm:px-0">

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Hero: Balance */}
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <p className="text-base sm:text-lg text-muted-foreground font-semibold mb-2">
                {t("Ihr Gesamtsaldo", "Your Total Balance")}
              </p>
              <p className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
                €{(projectedBalanceEur ?? totalBalanceEur ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t("Wallet + offene Trades + Live G&V + Staking", "Wallet + open trades + live P&L + staking")}
              </p>
              {inTradesEur > 0 && (
                <div className="mt-4 inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-primary/20 bg-background/40 px-3 py-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {t("Saldo bei Schließung aller offenen Trades", "Balance if all open trades were closed")}:
                  </span>
                  <span className={`text-base sm:text-lg font-semibold tabular-nums ${((projectedBalanceEur ?? (totalBalanceEur ?? 0)) >= (totalBalanceEur ?? 0)) ? "text-success" : "text-destructive"}`}>
                    €{(projectedBalanceEur ?? (totalBalanceEur ?? 0)).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs sm:text-sm tabular-nums text-muted-foreground">
                    ({t("Einsatz", "Stake")}: €{inTradesEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {" + "}
                    <span className={openTradesPnlEur >= 0 ? "text-success" : "text-destructive"}>
                      {t("Gewinn", "P&L")}: {openTradesPnlEur >= 0 ? "+" : ""}€{openTradesPnlEur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    )
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons — large, clear, touch-friendly */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => { resetForm(); setDepositOpen(true); notifyDepositIntent(); }}
              className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all active:scale-[0.98]"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 shrink-0">
                <ArrowUpRight className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="text-left">
                <span className="text-xl sm:text-2xl font-display font-bold block">{t("Einzahlen", "Deposit")}</span>
                <span className="text-sm text-muted-foreground">{t("Geld auf Ihr Konto einzahlen", "Add money to your account")}</span>
              </div>
            </button>
            <button
              onClick={() => { setSwapFrom(""); setSwapTo(""); setSwapAmount(""); setSwapStep(0); setSwapOpen(true); }}
              className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all active:scale-[0.98]"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 shrink-0">
                <ArrowLeftRight className="h-8 w-8 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-xl sm:text-2xl font-display font-bold block">{t("Tauschen", "Swap")}</span>
                <span className="text-sm text-muted-foreground">{t("Währungen untereinander tauschen", "Exchange between currencies")}</span>
              </div>
            </button>
            <button
              onClick={() => { resetForm(); setWithdrawOpen(true); }}
              className="group flex items-center gap-4 p-6 rounded-2xl border-2 border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-all active:scale-[0.98]"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/15 shrink-0">
                <ArrowDownRight className="h-8 w-8 text-orange-600" />
              </div>
              <div className="text-left">
                <span className="text-xl sm:text-2xl font-display font-bold block">{t("Auszahlen", "Withdraw")}</span>
                <span className="text-sm text-muted-foreground">{t("Geld von Ihrem Konto abheben", "Cash out from your account")}</span>
              </div>
            </button>
          </div>

          {/* Fiat Assets */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Landmark className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-bold">{t("Ihre Konten", "Your Accounts")}</h2>
                <p className="text-sm text-muted-foreground">{t("Klassische Währungen (Euro, Dollar, etc.)", "Traditional currencies (Euro, Dollar, etc.)")}</p>
              </div>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {fiatWallets.map((w) => (
                <Card key={w.id} className={`transition-all hover:shadow-md ${Number(w.balance) > 0 ? "border-border" : "opacity-40"}`}>
                  <CardContent className="p-5 sm:p-6 flex items-center gap-4">
                    <div className="h-13 w-13 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CurrencyIcon currency={w.currency} className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">{w.currency}</p>
                      <p className="text-2xl sm:text-3xl font-display font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {Number(w.balance).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {fiatWallets.length === 0 && (
                <p className="col-span-full text-base text-muted-foreground py-4">{t("Keine Konten gefunden.", "No accounts found.")}</p>
              )}
            </div>
          </div>

          {/* Crypto Assets */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Bitcoin className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-bold">{t("Krypto-Vermögen", "Crypto Assets")}</h2>
                <p className="text-sm text-muted-foreground">{t("Ihre digitalen Währungen", "Your digital currencies")}</p>
              </div>
            </div>
            {cryptoWallets.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="p-10 flex flex-col items-center text-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Bitcoin className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{t("Keine Krypto-Vermögenswerte", "No Crypto Assets")}</p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                      {t(
                        "Verwenden Sie die Tauschen-Funktion oben, um Euro in Kryptowährungen umzuwandeln.",
                        "Use the Swap button above to convert Euro into cryptocurrencies."
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {cryptoWallets.map((w) => {
                  const eurValue = cryptoPricesEur[w.currency] ? Number(w.balance) * cryptoPricesEur[w.currency] : null;
                  return (
                    <Card key={w.id} className="transition-all hover:shadow-md">
                      <CardContent className="p-5 sm:p-6 flex items-center gap-4">
                        <div className="h-13 w-13 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <CurrencyIcon currency={w.currency} className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">{w.currency}</p>
                          <p className="text-2xl font-display font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {Number(w.balance).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                          </p>
                          {eurValue !== null && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              ≈ €{eurValue.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <History className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold">{t("Verlauf", "History")}</h2>
                  <p className="text-sm text-muted-foreground">{t("Alle Ihre Transaktionen", "All your transactions")}</p>
                </div>
              </div>
              <div className="flex rounded-xl border-2 border-border overflow-hidden">
                <button
                  onClick={() => setActiveTab("deposits")}
                  className={`px-5 py-3 text-sm sm:text-base font-semibold transition-colors ${
                    activeTab === "deposits"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {t("Einzahlungen", "Deposits")}
                </button>
                <button
                  onClick={() => setActiveTab("withdrawals")}
                  className={`px-5 py-3 text-sm sm:text-base font-semibold transition-colors border-l-2 border-border ${
                    activeTab === "withdrawals"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {t("Auszahlungen", "Withdrawals")}
                </button>
                <button
                  onClick={() => setActiveTab("swaps")}
                  className={`px-5 py-3 text-sm sm:text-base font-semibold transition-colors border-l-2 border-border ${
                    activeTab === "swaps"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {t("Tausch", "Swaps")}
                </button>
                <button
                  onClick={() => setActiveTab("bonuses")}
                  className={`px-5 py-3 text-sm sm:text-base font-semibold transition-colors border-l-2 border-border ${
                    activeTab === "bonuses"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {t("Boni", "Bonuses")}
                </button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {activeTab === "bonuses" ? (
                  bonuses.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-base text-muted-foreground">{t("Noch keine Boni erhalten", "No bonuses received yet")}</p>
                    </div>
                  ) : bonuses.map((b: any) => {
                    const bonusName = (b.content || "").split(" — ")[1]?.trim() || "";
                    return (
                      <div key={b.id} className="flex items-center gap-4 p-5 sm:p-6 hover:bg-accent/30 transition-colors">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full shrink-0 text-amber-600 bg-amber-500/10">
                          <Gift className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base sm:text-lg font-semibold text-foreground truncate">
                            {bonusName || t("Bonus", "Bonus")}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg sm:text-xl font-display font-bold text-emerald-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                              +{b.currency} {Number(b.amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground block">
                            {new Date(b.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                          </span>
                        </div>
                        <span className="text-sm font-semibold px-3 py-1.5 rounded-full whitespace-nowrap text-amber-600 bg-amber-500/10">
                          {t("Bonus", "Bonus")}
                        </span>
                      </div>
                    );
                  })
                ) : activeTab === "swaps" ? (
                  swaps.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-base text-muted-foreground">{t("Noch keine Tauschvorgänge vorhanden", "No swaps yet")}</p>
                    </div>
                  ) : swaps.map((sw) => (
                    <div key={sw.id} className="flex items-center gap-4 p-5 sm:p-6 hover:bg-accent/30 transition-colors">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full shrink-0 text-primary bg-primary/10">
                        <ArrowLeftRight className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground font-medium">{t("Von", "From")}</span>
                            <span className="text-lg sm:text-xl font-display font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                              {sw.from_currency} {Number(sw.amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground font-medium">{t("Nach", "To")}</span>
                            <span className="text-lg sm:text-xl font-display font-bold text-emerald-600" style={{ fontVariantNumeric: "tabular-nums" }}>
                              {sw.to_currency} {Number((sw as any).received_amount ?? sw.amount).toLocaleString("de-DE", { minimumFractionDigits: CRYPTO_CURRENCIES.includes(sw.to_currency) ? 8 : 2 })}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground mt-1 block">
                          {new Date(sw.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                        </span>
                      </div>
                      <span className="text-sm font-semibold px-3 py-1.5 rounded-full whitespace-nowrap text-emerald-600 bg-emerald-500/10">
                        {t("Abgeschlossen", "Completed")}
                      </span>
                    </div>
                  ))
                ) : txList.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-base text-muted-foreground">
                      {activeTab === "deposits" ? t("Noch keine Einzahlungen vorhanden", "No deposits yet") : t("Noch keine Auszahlungen vorhanden", "No withdrawals yet")}
                    </p>
                  </div>
                ) : txList.map((tx) => {
                  const status = statusConfig[tx.status] ?? { labelDe: tx.status, labelEn: tx.status, icon: Clock, className: "bg-muted text-muted-foreground" };
                  const StatusIcon = status.icon;
                  return (
                    <div key={tx.id} className="flex items-center gap-4 p-5 sm:p-6 hover:bg-accent/30 transition-colors">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full shrink-0 ${status.className}`}>
                        <StatusIcon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-xl font-display font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {tx.currency} {Number(tx.amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground mt-1 block">
                          {methodLabel(tx.method)} · {new Date(tx.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                        </span>
                      </div>
                      <span className={`text-sm font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${status.className}`}>
                        {t(status.labelDe, status.labelEn)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Profit History Chart */}
          {(() => {
            const profitData = closedTrades
              .filter((tr: any) => tr.closed_at && tr.pnl != null)
              .sort((a: any, b: any) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime())
              .reduce((acc: any[], tr: any) => {
                const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
                const cumulative = prev + Number(tr.pnl);
                acc.push({
                  date: new Date(tr.closed_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
                  profit: Number(Number(tr.pnl).toFixed(2)),
                  cumulative: Number(cumulative.toFixed(2)),
                });
                return acc;
              }, []);
            
            const totalProfit = profitData.length > 0 ? profitData[profitData.length - 1].cumulative : 0;
            const isPositive = totalProfit >= 0;

            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="text-xl sm:text-2xl font-display font-bold">{t("Gewinnverlauf", "Profit History")}</h2>
                    <p className="text-sm text-muted-foreground">{t("Ihr gesamter Handelsverlauf", "Your all-time trading performance")}</p>
                  </div>
                </div>
                <Card>
                  <CardContent className="p-5 sm:p-6">
                    {profitData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-base text-muted-foreground">{t("Noch keine abgeschlossenen Trades", "No closed trades yet")}</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">{t("Ihr Gewinnverlauf wird hier angezeigt", "Your profit history will appear here")}</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-3 mb-6">
                          <span className="text-sm text-muted-foreground font-medium">{t("Gesamtgewinn", "Total Profit")}</span>
                          <span className={`text-3xl font-display font-bold ${isPositive ? "text-emerald-600" : "text-destructive"}`}>
                            {isPositive ? "+" : ""}€{totalProfit.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div style={{ width: "100%", height: 280 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={profitData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                              <defs>
                                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} stopOpacity={0.3} />
                                  <stop offset="95%" stopColor={isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `€${v}`} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                  fontSize: "14px",
                                }}
                                formatter={(value: number, name: string) => [
                                  `€${value.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
                                  name === "cumulative" ? t("Gesamt", "Total") : t("Trade", "Trade"),
                                ]}
                              />
                              <Area
                                type="monotone"
                                dataKey="cumulative"
                                stroke={isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"}
                                strokeWidth={2.5}
                                fill="url(#profitGradient)"
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 2 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </>
      )}

      {/* Deposit Multi-Step Dialog */}
      <Dialog open={depositOpen} onOpenChange={(open) => { setDepositOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {/* Progress bar */}
          <div className="flex gap-1 px-6 pt-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= depositStep ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          <div className="px-6 pb-6 pt-4">
            {/* Step 0: Choose deposit type */}
            {depositStep === 0 && (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display">{t("Einzahlungsart wählen", "Choose Deposit Type")}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t("Wie möchten Sie einzahlen?", "How would you like to deposit?")}</p>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { setDepositType("fiat"); setForm(f => ({ ...f, method: "bank_wire", currency: "EUR" })); setDepositStep(1); }}
                    className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="h-14 w-14 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <Landmark className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <span className="font-display font-bold text-base block">{t("Fiat", "Fiat")}</span>
                      <span className="text-xs text-muted-foreground">{t("Banküberweisung", "Bank Transfer")}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      const firstCurrency = cryptoAddresses[0]?.currency || "BTC";
                      setDepositType("crypto");
                      setForm(f => ({ ...f, method: "crypto", currency: firstCurrency }));
                      setDepositStep(1);
                    }}
                    className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="h-14 w-14 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <Bitcoin className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <span className="font-display font-bold text-base block">{t("Krypto", "Crypto")}</span>
                      <span className="text-xs text-muted-foreground">{t("Kryptowährung", "Cryptocurrency")}</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Enter details */}
            {depositStep === 1 && (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display">
                    {depositType === "fiat" ? t("Banküberweisung", "Bank Transfer") : t("Krypto-Einzahlung", "Crypto Deposit")}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t("Bitte geben Sie die Details ein", "Please enter the details")}</p>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("Betrag", "Amount")}</Label>
                    <Input className="h-12 text-lg" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={t("z.B. 1.000", "e.g. 1,000")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("Währung", "Currency")}</Label>
                    {depositType === "crypto" && cryptoAddresses.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
                        {t(
                          "Für Ihr Konto ist keine Wallet hinterlegt. Bitte kontaktieren Sie Ihren Account Manager, um eine Einzahlungsadresse anzufordern.",
                          "No wallet is linked to your account. Please contact your account manager to request a deposit address."
                        )}
                      </div>
                    ) : (
                      <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                        <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(depositType === "fiat"
                            ? FIAT_CURRENCIES
                            : Array.from(new Set(cryptoAddresses.map((a: any) => a.currency)))
                          ).map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {depositType === "crypto" && cryptoAddresses.length > 0 && (() => {
                    const matched = cryptoAddresses.find((a: any) => a.currency === form.currency);
                    if (!matched) return null;
                    return (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">{t("Einzahlungsadresse", "Deposit Address")}</Label>
                        <div className="rounded-lg border-2 border-primary/50 bg-primary/10 p-4 space-y-3 shadow-sm">
                          <div className="font-mono text-base sm:text-lg font-bold break-all select-all text-foreground tracking-tight leading-snug">
                            {matched.address}
                          </div>
                          {matched.label && (
                            <div className="text-xs text-muted-foreground">
                              {matched.label}{matched.network ? ` · ${matched.network}` : ""}
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="w-full h-10 font-semibold"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(matched.address);
                                toast.success(t("Adresse kopiert", "Address copied"));
                              } catch {
                                toast.error(t("Kopieren fehlgeschlagen", "Copy failed"));
                              }
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            {t("Adresse kopieren", "Copy address")}
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                  {depositType === "fiat" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">{t("Empfänger-Bankverbindung", "Recipient Bank Details")}</Label>
                      {bankDetails && (bankDetails.iban || bankDetails.bank_name) ? (
                        <div className="rounded-lg border-2 border-primary/50 bg-primary/10 p-4 space-y-3 shadow-sm">
                          {[
                            { label: t("Begünstigter", "Account Holder"), value: bankDetails.account_holder },
                            { label: t("Bank", "Bank"), value: bankDetails.bank_name },
                            { label: "IBAN", value: bankDetails.iban, mono: true },
                            { label: "SWIFT/BIC", value: bankDetails.swift_bic, mono: true },
                            { label: t("Verwendungszweck", "Reference"), value: bankDetails.reference },
                          ].filter(r => r.value).map((row) => (
                            <div key={row.label} className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground">{row.label}</div>
                                <div className={`text-sm font-semibold break-all select-all ${row.mono ? "font-mono tracking-tight" : ""}`}>{row.value}</div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 shrink-0"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(String(row.value));
                                    toast.success(t("Kopiert", "Copied"));
                                  } catch {
                                    toast.error(t("Kopieren fehlgeschlagen", "Copy failed"));
                                  }
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          {bankDetails.notes && (
                            <div className="text-xs text-muted-foreground border-t border-border/60 pt-2">{bankDetails.notes}</div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
                          {t(
                            "Es ist noch keine Bankverbindung für Sie hinterlegt. Bitte kontaktieren Sie Ihren Account Manager, um die Empfängerdaten zu erhalten.",
                            "No bank details have been set up for you yet. Please contact your account manager to receive the recipient details."
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {depositType === "crypto" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">{t("Ihre Absender-Adresse (optional)", "Your sending address (optional)")}</Label>
                      <Input className="h-12 text-base" value={form.wallet_address} onChange={(e) => setForm({ ...form, wallet_address: e.target.value })} placeholder={t("Absender-Wallet", "Sender wallet")} />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setDepositStep(0)}>
                    {t("Zurück", "Back")}
                  </Button>
                  <Button
                    className="flex-1 h-12 font-bold rounded-xl"
                    disabled={
                      !form.amount ||
                      Number(form.amount) <= 0 ||
                      (depositType === "crypto" && cryptoAddresses.length === 0)
                    }
                    onClick={() => setDepositStep(2)}
                  >
                    {t("Weiter", "Continue")}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {depositStep === 2 && (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display">{t("Zusammenfassung", "Review")}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t("Bitte überprüfen Sie Ihre Angaben", "Please review your details")}</p>
                </DialogHeader>

                <Card className="border-2 border-dashed border-border">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t("Art", "Type")}</span>
                      <span className="font-semibold">{depositType === "fiat" ? t("Banküberweisung", "Bank Transfer") : t("Kryptowährung", "Cryptocurrency")}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t("Betrag", "Amount")}</span>
                      <span className="font-display font-bold text-lg">
                        {form.currency} {Number(form.amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {depositType === "crypto" && form.wallet_address && (
                      <>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("Wallet", "Wallet")}</span>
                          <span className="font-mono text-xs truncate max-w-[180px]">{form.wallet_address}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setDepositStep(1)}>
                    {t("Zurück", "Back")}
                  </Button>
                  <Button
                    className="flex-1 h-12 font-bold rounded-xl"
                    onClick={async () => {
                      await submitDeposit();
                      setDepositStep(3);
                    }}
                  >
                    {t("Einzahlung absenden", "Submit Deposit")}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation / Contact message */}
            {depositStep === 3 && (
              <div className="flex flex-col items-center text-center py-4 space-y-5">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-display font-bold">{t("Anfrage eingereicht", "Request Submitted")}</h3>
                  <p className="text-base font-medium leading-relaxed">
                    {t("Um die Einzahlung abzuschließen, wenden Sie sich bitte an Ihren Account Manager.", "To complete the deposit, please contact your account manager.")}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("Ihr Account Manager wird Sie durch den Einzahlungsprozess führen und alle notwendigen Details bereitstellen.", "Your account manager will guide you through the deposit process and provide all necessary details.")}
                  </p>
                </div>
                <Button className="w-full h-12 text-base font-bold rounded-xl" onClick={() => { setDepositOpen(false); resetForm(); }}>
                  {t("Verstanden", "Understood")}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Multi-Step Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={(open) => { setWithdrawOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {/* Progress bar */}
          <div className="flex gap-1 px-6 pt-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= withdrawStep ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          <div className="px-6 pb-6 pt-4">
            {/* Step 0b: P2P explanation for fiat */}
            {withdrawStep === 0 && showP2pInfo && (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display">{t("Auszahlungsweg wählen", "Choose Payout Route")}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("Fiat-Auszahlungen auf Ihr Bankkonto erfolgen über unser P2P-Netzwerk.", "Fiat payouts to your bank account are processed through our P2P network.")}
                  </p>
                </DialogHeader>

                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <Info className="h-4 w-4 text-primary" />
                    {t("Wichtig zu wissen", "Important to know")}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Ihre Auszahlung wird über P2P (Peer-to-Peer) abgewickelt. Das bedeutet: Der Betrag wird von einem anderen verifizierten Kunden unseres Netzwerks auf Ihr Bankkonto überwiesen. Auf Ihrem Kontoauszug erscheint daher der Name einer anderen Person und nicht der Name des Unternehmens. Das ist völlig normal und Teil des sicheren P2P-Verfahrens.",
                      "Your withdrawal is settled via P2P (peer-to-peer). This means the amount is transferred to your bank account by another verified client of our network. Your bank statement will therefore show a different person's name instead of the company name. This is completely normal and part of the secure P2P process."
                    )}
                  </p>
                </div>

                <button
                  onClick={() => setWithdrawStep(1)}
                  className="w-full group flex items-center gap-4 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-base block">{t("P2P-Auszahlung", "P2P Payout")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("Banküberweisung über unser P2P-Netzwerk", "Bank transfer via our P2P network")}
                    </span>
                  </div>
                </button>

                <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => { setShowP2pInfo(false); setWithdrawType(null); }}>
                  {t("Zurück", "Back")}
                </Button>
              </div>
            )}

            {/* Step 0: Choose withdrawal type */}
            {withdrawStep === 0 && !showP2pInfo && (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display">{t("Auszahlungsart wählen", "Choose Withdrawal Type")}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t("Wie möchten Sie auszahlen?", "How would you like to withdraw?")}</p>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { setWithdrawType("fiat"); setForm(f => ({ ...f, method: "bank_wire", currency: "EUR" })); setShowP2pInfo(true); }}
                    className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="h-14 w-14 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <Landmark className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <span className="font-display font-bold text-base block">{t("Fiat", "Fiat")}</span>
                      <span className="text-xs text-muted-foreground">{t("Banküberweisung", "Bank Transfer")}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => { setWithdrawType("crypto"); setForm(f => ({ ...f, method: "crypto", currency: "BTC" })); setWithdrawStep(1); }}
                    className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="h-14 w-14 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <Bitcoin className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <span className="font-display font-bold text-base block">{t("Krypto", "Crypto")}</span>
                      <span className="text-xs text-muted-foreground">{t("Kryptowährung", "Cryptocurrency")}</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Enter details */}
            {withdrawStep === 1 && (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display">
                    {withdrawType === "fiat" ? t("Banküberweisung", "Bank Transfer") : t("Krypto-Auszahlung", "Crypto Withdrawal")}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t("Bitte geben Sie die Details ein", "Please enter the details")}</p>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("Betrag", "Amount")}</Label>
                    <Input className="h-12 text-lg" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={t("z.B. 500", "e.g. 500")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("Währung", "Currency")}</Label>
                    <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                      <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {wallets.filter(w => Number(w.balance) > 0 && (withdrawType === "fiat" ? FIAT_CURRENCIES : CRYPTO_CURRENCIES).includes(w.currency)).map(w => (
                          <SelectItem key={w.currency} value={w.currency}>{w.currency} ({Number(w.balance).toLocaleString("de-DE", { minimumFractionDigits: 2 })})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {withdrawType === "crypto" ? (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">{t("Ziel-Wallet-Adresse", "Destination Wallet Address")} *</Label>
                      <Input className="h-12 text-base" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder={t("z.B. 0x1a2b3c... oder bc1q...", "e.g. 0x1a2b3c... or bc1q...")} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2">
                        <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>
                          {t(
                            "P2P-Auszahlung: Der Betrag wird von einem anderen verifizierten Kunden überwiesen – auf Ihrem Kontoauszug erscheint dessen Name.",
                            "P2P payout: the amount is transferred by another verified client — their name will appear on your bank statement."
                          )}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">{t("Bankname", "Bank Name")} *</Label>
                        <Input className="h-12 text-base" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder={t("z.B. Deutsche Bank", "e.g. Deutsche Bank")} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">IBAN *</Label>
                        <Input className="h-12 text-base" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder={t("z.B. DE89 3704 0044 0532 0130 00", "e.g. DE89 3704 0044 0532 0130 00")} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">SWIFT/BIC ({t("optional", "optional")})</Label>
                        <Input className="h-12 text-base" value={form.swift} onChange={(e) => setForm({ ...form, swift: e.target.value })} placeholder={t("z.B. DEUTDEDB", "e.g. DEUTDEDB")} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setWithdrawStep(0)}>
                    {t("Zurück", "Back")}
                  </Button>
                  <Button
                    className="flex-1 h-12 font-bold rounded-xl"
                    disabled={!form.amount || Number(form.amount) <= 0 || (withdrawType === "crypto" && !form.destination.trim()) || (withdrawType === "fiat" && (!form.bank_name.trim() || !form.iban.trim()))}
                    onClick={() => setWithdrawStep(2)}
                  >
                    {t("Weiter", "Continue")}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {withdrawStep === 2 && (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display">{t("Zusammenfassung", "Review")}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t("Bitte überprüfen Sie Ihre Angaben", "Please review your details")}</p>
                </DialogHeader>

                <Card className="border-2 border-dashed border-border">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t("Art", "Type")}</span>
                      <span className="font-semibold">{withdrawType === "fiat" ? t("Banküberweisung", "Bank Transfer") : t("Kryptowährung", "Cryptocurrency")}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t("Betrag", "Amount")}</span>
                      <span className="font-display font-bold text-lg">
                        {form.currency} {Number(form.amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {withdrawType === "crypto" && form.destination && (
                      <>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("Ziel-Wallet", "Destination Wallet")}</span>
                          <span className="font-mono text-xs truncate max-w-[180px]">{form.destination}</span>
                        </div>
                      </>
                    )}
                    {withdrawType === "fiat" && (
                      <>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t("Bank", "Bank")}</span>
                          <span className="font-semibold text-sm">{form.bank_name}</span>
                        </div>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">IBAN</span>
                          <span className="font-mono text-xs truncate max-w-[180px]">{form.iban}</span>
                        </div>
                        {form.swift && (
                          <>
                            <div className="h-px bg-border" />
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">SWIFT/BIC</span>
                              <span className="font-mono text-xs">{form.swift}</span>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setWithdrawStep(1)}>
                    {t("Zurück", "Back")}
                  </Button>
                  <Button
                    className="flex-1 h-12 font-bold rounded-xl"
                    onClick={async () => {
                      await submitWithdrawal();
                      setWithdrawStep(3);
                    }}
                  >
                    {t("Auszahlung absenden", "Submit Withdrawal")}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {withdrawStep === 3 && (
              <div className="flex flex-col items-center text-center py-4 space-y-5">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-display font-bold">{t("Auszahlungsanfrage eingereicht", "Withdrawal Request Submitted")}</h3>
                  <p className="text-base font-medium leading-relaxed">
                    {t("Ihre Auszahlungsanfrage wurde erfolgreich eingereicht und wird derzeit bearbeitet.", "Your withdrawal request has been successfully submitted and is currently being processed.")}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("Sie erhalten eine Benachrichtigung, sobald Ihre Auszahlung bearbeitet wurde. Dies kann bis zu 1–3 Werktage dauern.", "You will receive a notification once your withdrawal has been processed. This may take up to 1–3 business days.")}
                  </p>
                </div>
                <Button className="w-full h-12 text-base font-bold rounded-xl" onClick={() => { setWithdrawOpen(false); resetForm(); }}>
                  {t("Verstanden", "Understood")}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Swap Multi-Step Dialog */}
      <Dialog open={swapOpen} onOpenChange={(open) => { setSwapOpen(open); if (!open) { setSwapStep(0); setSwapFrom(""); setSwapTo(""); setSwapAmount(""); } }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <div className="flex gap-1 px-6 pt-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= swapStep ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          <div className="px-6 pb-6 pt-4">
            {/* Step 0: Select FROM currency */}
            {swapStep === 0 && (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display">{t("Tauschen – Von", "Swap – From")}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t("Welche Währung möchten Sie tauschen?", "Which currency do you want to swap?")}</p>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("Von Währung", "From Currency")}</Label>
                    <Select value={swapFrom} onValueChange={setSwapFrom}>
                      <SelectTrigger className="h-14 text-lg"><SelectValue placeholder={t("Währung wählen...", "Select currency...")} /></SelectTrigger>
                      <SelectContent>
                        {wallets.filter(w => Number(w.balance) > 0).map(w => (
                          <SelectItem key={w.currency} value={w.currency} className="text-base py-3">
                            <span className="flex items-center gap-2">
                              <CurrencyIcon currency={w.currency} className="h-4 w-4" />
                              {w.currency} — {Number(w.balance).toLocaleString("de-DE", { minimumFractionDigits: 2 })} {t("verfügbar", "available")}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("Betrag", "Amount")}</Label>
                    <Input
                      className="h-14 text-xl font-display"
                      type="number"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      placeholder={t("z.B. 100", "e.g. 100")}
                    />
                    {swapFrom && (
                      <p className="text-xs text-muted-foreground">
                        {t("Verfügbar", "Available")}: {Number(wallets.find(w => w.currency === swapFrom)?.balance ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} {swapFrom}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full h-12 font-bold rounded-xl text-base"
                  disabled={!swapFrom || !swapAmount || Number(swapAmount) <= 0}
                  onClick={() => setSwapStep(1)}
                >
                  {t("Weiter", "Continue")}
                </Button>
              </div>
            )}

            {/* Step 1: Select TO currency */}
            {swapStep === 1 && (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display">{t("Tauschen – Nach", "Swap – To")}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t("In welche Währung möchten Sie tauschen?", "Which currency do you want to receive?")}</p>
                </DialogHeader>

                <div className="p-4 rounded-xl bg-muted/50 flex items-center gap-3">
                  <CurrencyIcon currency={swapFrom} className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("Sie tauschen", "You are swapping")}</p>
                    <p className="font-display font-bold text-lg">{swapFrom} {Number(swapAmount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t("Zielwährung", "Target Currency")}</Label>
                  <Select value={swapTo} onValueChange={setSwapTo}>
                    <SelectTrigger className="h-14 text-lg"><SelectValue placeholder={t("Währung wählen...", "Select currency...")} /></SelectTrigger>
                    <SelectContent>
                      {[...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES].filter(c => c !== swapFrom).map(c => (
                        <SelectItem key={c} value={c} className="text-base py-3">
                          <span className="flex items-center gap-2">
                            <CurrencyIcon currency={c} className="h-4 w-4" />
                            {c}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setSwapStep(0)}>
                    {t("Zurück", "Back")}
                  </Button>
                  <Button className="flex-1 h-12 font-bold rounded-xl" disabled={!swapTo} onClick={() => setSwapStep(2)}>
                    {t("Weiter", "Continue")}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {swapStep === 2 && (
              <div className="space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-display">{t("Zusammenfassung", "Review")}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t("Bitte überprüfen Sie den Tausch", "Please review your swap")}</p>
                </DialogHeader>

                <Card className="border-2 border-dashed border-border">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CurrencyIcon currency={swapFrom} className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{t("Von", "From")}</span>
                      </div>
                      <span className="font-display font-bold text-lg">{swapFrom} {Number(swapAmount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-center">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <ArrowLeftRight className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CurrencyIcon currency={swapTo} className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{t("Nach", "To")}</span>
                      </div>
                      <span className="font-display font-bold text-lg">{swapTo} {swapReceiveAmount.toLocaleString("de-DE", { minimumFractionDigits: CRYPTO_CURRENCIES.includes(swapTo) ? 8 : 2 })}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setSwapStep(1)}>
                    {t("Zurück", "Back")}
                  </Button>
                  <Button className="flex-1 h-12 font-bold rounded-xl" disabled={saving} onClick={async () => {
                    setSaving(true);
                    try {
                      const amt = Number(swapAmount);
                      const received = convertAmount(amt, swapFrom, swapTo);
                      const fromWallet = wallets.find(w => w.currency === swapFrom);
                      if (!fromWallet || Number(fromWallet.balance) < amt) {
                        toast.error(t("Unzureichendes Guthaben", "Insufficient balance"));
                        return;
                      }
                      // Debit source wallet
                      await supabase.from("wallets").update({ balance: Number(fromWallet.balance) - amt }).eq("id", fromWallet.id);
                      // Credit target wallet (upsert) with converted amount
                      const toWallet = wallets.find(w => w.currency === swapTo);
                      if (toWallet) {
                        await supabase.from("wallets").update({ balance: Number(toWallet.balance) + received }).eq("id", toWallet.id);
                      } else {
                        await supabase.from("wallets").insert({ user_id: user!.id, currency: swapTo, balance: received });
                      }
                      // Log the swap
                      await supabase.from("swaps").insert({ user_id: user!.id, from_currency: swapFrom, to_currency: swapTo, amount: amt, received_amount: received } as any);
                      await Promise.all([fetchData(), refreshBalance()]);
                      setSwapStep(3);
                    } catch {
                      toast.error(t("Fehler beim Tausch", "Swap failed"));
                    } finally {
                      setSaving(false);
                    }
                  }}>
                    {saving ? t("Wird verarbeitet...", "Processing...") : t("Jetzt tauschen", "Swap Now")}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {swapStep === 3 && (
              <div className="flex flex-col items-center text-center py-4 space-y-5">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-display font-bold">{t("Tausch abgeschlossen", "Swap Completed")}</h3>
                  <p className="text-base font-medium leading-relaxed">
                    {t(
                      `${Number(swapAmount).toLocaleString("de-DE", { minimumFractionDigits: 2 })} ${swapFrom} wurde erfolgreich in ${swapReceiveAmount.toLocaleString("de-DE", { minimumFractionDigits: CRYPTO_CURRENCIES.includes(swapTo) ? 8 : 2 })} ${swapTo} getauscht.`,
                      `${Number(swapAmount).toLocaleString("de-DE", { minimumFractionDigits: 2 })} ${swapFrom} has been successfully swapped to ${swapReceiveAmount.toLocaleString("de-DE", { minimumFractionDigits: CRYPTO_CURRENCIES.includes(swapTo) ? 8 : 2 })} ${swapTo}.`
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("Ihr Guthaben wurde sofort aktualisiert.", "Your balance has been updated instantly.")}
                  </p>
                </div>
                <Button className="w-full h-12 text-base font-bold rounded-xl" onClick={() => { setSwapOpen(false); setSwapStep(0); setSwapFrom(""); setSwapTo(""); setSwapAmount(""); }}>
                  {t("Fertig", "Done")}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletPage;
