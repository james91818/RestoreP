import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Copy, ExternalLink, Send, Loader2, ArrowLeft, Building2 } from "lucide-react";

const P2P_LINK = "https://p2p.crypto-borse.com/";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientCountry: string | null;
  /** Called when the agent picks "RJ - PSP" so the parent can open the Telegram-request dialog. */
  onPickRjPsp: () => void;
}

type Preset = {
  id: string;
  amount: number;
  currency: string;
  url: string;
  label: string | null;
  sort_order: number;
};

type Step = "provider" | "amount" | "link";

const PaymentProviderPickerDialog = ({ open, onOpenChange, clientId, clientName, onPickRjPsp }: Props) => {
  const [step, setStep] = useState<Step>("provider");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Preset | null>(null);
  const [forcing, setForcing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("provider");
      setPicked(null);
      setForcing(false);
    }
  }, [open]);

  // Online check
  useEffect(() => {
    if (!open || !clientId) return;
    const check = async () => {
      const { data } = await supabase.from("profiles").select("last_seen_at").eq("id", clientId).single();
      if (data?.last_seen_at) {
        setIsOnline(Date.now() - new Date(data.last_seen_at).getTime() < 30000);
      } else {
        setIsOnline(false);
      }
    };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, [open, clientId]);

  const handlePickMax = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_link_presets")
      .select("*")
      .eq("provider", "max_stripe")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast.error("No active Max - Stripe links configured. Add some in Settings → Payment Links.");
      return;
    }
    setPresets(data as Preset[]);
    setStep("amount");
  };

  const handlePickAmount = (p: Preset) => {
    setPicked(p);
    setStep("link");
  };

  const handleCopy = () => {
    if (!picked) return;
    navigator.clipboard.writeText(picked.url);
    toast.success("Link copied to clipboard!");
  };

  const handleForce = async () => {
    if (!picked) return;
    setForcing(true);
    const { error } = await supabase
      .from("profiles")
      .update({ force_redirect_url: picked.url } as any)
      .eq("id", clientId);
    setForcing(false);
    if (error) return toast.error("Failed to force link on client");
    toast.success("Link forced — client will be redirected shortly");
  };

  const back = () => {
    if (step === "link") setStep("amount");
    else if (step === "amount") setStep("provider");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== "provider" && (
              <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={back}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === "provider" && "Choose Payment Provider"}
            {step === "amount" && "Choose Amount"}
            {step === "link" && "Payment Link Ready"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: provider picker */}
        {step === "provider" && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Client: <span className="font-medium text-foreground">{clientName}</span>
            </p>
            <button
              type="button"
              onClick={handlePickMax}
              disabled={loading}
              className="w-full flex items-center gap-3 rounded-lg border border-border/60 bg-card hover:bg-accent transition p-4 text-left disabled:opacity-50"
            >
              <div className="h-10 w-10 rounded-md bg-[#635bff] text-white flex items-center justify-center shrink-0 font-bold text-sm tracking-tight">
                <svg viewBox="0 0 60 25" className="h-4 w-auto" fill="currentColor" aria-label="Stripe">
                  <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.14v5.85zm-4.91.7c0 2.97-2.36 4.66-5.8 4.66a11.6 11.6 0 0 1-4.51-.93v-3.93c1.38.75 3.13 1.31 4.51 1.31.93 0 1.6-.25 1.6-1.02 0-1.99-6.3-1.24-6.3-5.84 0-2.92 2.23-4.67 5.58-4.67 1.32 0 2.64.2 3.96.73v3.88a9.06 9.06 0 0 0-3.97-1.03c-.88 0-1.43.25-1.43.9 0 1.87 6.36.98 6.36 5.94z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold">Max - Stripe (Credit Card)</p>
                <p className="text-xs text-muted-foreground">Pick a fixed amount → instant Stripe checkout link</p>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </button>
            <button
              type="button"
              onClick={() => { onOpenChange(false); setTimeout(onPickRjPsp, 150); }}
              className="w-full flex items-center gap-3 rounded-lg border border-border/60 bg-card hover:bg-accent transition p-4 text-left"
            >
              <div className="h-10 w-10 rounded-md bg-gradient-to-br from-[#003087] to-[#009cde] text-white flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-label="Credit Card / PayPal">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 1.186A.641.641 0 0 1 5.577.5h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H8.83c-.524 0-.968.382-1.05.9l-.642 4.073-.063.396z"/>
                  <path d="M19.254 6.534c-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H8.32c-.524 0-.968.382-1.05.9l-1.12 7.097a.336.336 0 0 0 .332.39h3.882c.459 0 .85-.334.922-.788l.038-.197.732-4.64.047-.256a.935.935 0 0 1 .922-.788h.581c3.762 0 6.706-1.528 7.566-5.946.36-1.846.174-3.388-.778-4.471a3.717 3.717 0 0 0-.064-.07c.073.355.122.722.064 1.535z" opacity=".7"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold">RJ - PSP (Credit Card / Paypal)</p>
                <p className="text-xs text-muted-foreground">Send a request to Telegram — provider returns the link</p>
                <p className="text-[11px] text-amber-400 mt-1">⚠️ Tell the client: the checkout will display the amount in <b>AUD</b>, not EUR.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setPicked({ id: "p2p", amount: 0, currency: "EUR", url: P2P_LINK, label: "P2P Bank Payment", sort_order: 0 });
                setStep("link");
              }}
              className="w-full flex items-center gap-3 rounded-lg border border-border/60 bg-card hover:bg-accent transition p-4 text-left"
            >
              <div className="h-10 w-10 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">P2P Bank Payment</p>
                <p className="text-xs text-muted-foreground">Direct bank-to-bank P2P transfer link</p>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: amount picker */}
        {step === "amount" && (
          <div className="grid grid-cols-2 gap-2 py-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePickAmount(p)}
                className="rounded-lg border border-border/60 bg-card hover:border-primary hover:bg-accent transition p-4 text-center"
              >
                <p className="text-xl font-bold tabular-nums">
                  {p.amount.toLocaleString("de-DE")} {p.currency}
                </p>
                {p.label && <p className="text-[11px] text-muted-foreground mt-1">{p.label}</p>}
              </button>
            ))}
          </div>
        )}

        {/* Step 3: link */}
        {step === "link" && picked && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground mb-1">
                {picked.id === "p2p"
                  ? "P2P Bank Payment"
                  : `${picked.amount.toLocaleString("de-DE")} ${picked.currency} — Stripe Checkout`}
              </p>
              <p className="text-sm font-mono break-all">{picked.url}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" /> Copy Link
              </Button>
              <Button variant="outline" onClick={() => window.open(picked.url, "_blank")}>
                <ExternalLink className="h-4 w-4" />
              </Button>
              {isOnline && (
                <Button variant="destructive" onClick={handleForce} disabled={forcing} title="Force open on client">
                  {forcing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              )}
            </div>
            {!isOnline && (
              <p className="text-[11px] text-muted-foreground text-center">
                Client is offline — Force-redirect available only when client is online.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentProviderPickerDialog;
