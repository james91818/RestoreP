import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientCountry: string | null;
}

const PaymentLinkDialog = ({ open, onOpenChange, clientId, clientName, clientCountry }: Props) => {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [method, setMethod] = useState<"credit_card" | "paypal">("credit_card");
  const [sending, setSending] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  // Check if client is online
  useEffect(() => {
    if (!open || !clientId) return;
    const check = async () => {
      const { data } = await supabase.from("profiles").select("last_seen_at").eq("id", clientId).single();
      if (data?.last_seen_at) {
        const diff = Date.now() - new Date(data.last_seen_at).getTime();
        setIsOnline(diff < 30000);
      } else {
        setIsOnline(false);
      }
    };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, [open, clientId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setAmount("");
      setCurrency("EUR");
      setMethod("credit_card");
      setSending(false);
      setRequestId(null);
      setPaymentLink(null);
      setPolling(false);
    }
  }, [open]);

  // Subscribe to realtime updates + poll fallback for the request
  useEffect(() => {
    if (!requestId) return;

    setPolling(true);
    let cancelled = false;

    const applyIfReady = (row: any) => {
      if (cancelled) return false;
      if (row?.status === 'fulfilled' && row?.payment_link) {
        setPaymentLink(row.payment_link);
        setPolling(false);
        toast.success("Payment link received!");
        return true;
      }
      return false;
    };

    // 1. Immediate fetch (in case it was already fulfilled before subscription)
    const fetchOnce = async () => {
      const { data } = await supabase
        .from('payment_link_requests')
        .select('status,payment_link')
        .eq('id', requestId)
        .maybeSingle();
      return applyIfReady(data);
    };
    fetchOnce();

    // 2. Realtime subscription
    const channel = supabase
      .channel(`payment-link-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_link_requests',
          filter: `id=eq.${requestId}`,
        },
        (payload: any) => applyIfReady(payload.new)
      )
      .subscribe();

    // 3. Polling fallback (every 5s) in case realtime drops
    const iv = setInterval(async () => {
      const done = await fetchOnce();
      if (done) clearInterval(iv);
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(iv);
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-payment-link', {
        body: {
          user_id: clientId,
          full_name: clientName,
          amount: Number(amount),
          currency,
          country: clientCountry || 'N/A',
          method,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Request failed');

      setRequestId(data.request_id);
      toast.success("Payment link request sent to Telegram!");
    } catch (err: any) {
      console.error("Payment link request error:", err);
      toast.error(err.message || "Failed to send request");
      setSending(false);
    }
  };

  const handleCopyLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleForceLink = async () => {
    if (!paymentLink) return;
    const { error } = await supabase.from("profiles").update({ force_redirect_url: paymentLink } as any).eq("id", clientId);
    if (error) {
      toast.error("Failed to force link on client");
      return;
    }
    toast.success("Link forced — client will be redirected shortly");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Payment Link</DialogTitle>
        </DialogHeader>

        {!requestId ? (
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Client</Label>
              <p className="font-medium">{clientName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Country</Label>
              <p className="font-medium">{clientCountry || "N/A"}</p>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as "credit_card" | "paypal")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={sending}>
                {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : "Send Request"}
              </Button>
            </DialogFooter>
          </div>
        ) : paymentLink ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground mb-1">Payment Link</p>
              <p className="text-sm font-mono break-all">{paymentLink}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" /> Copy Link
              </Button>
              <Button variant="outline" onClick={() => window.open(paymentLink, '_blank')}>
                <ExternalLink className="h-4 w-4" />
              </Button>
              {isOnline && (
                <Button variant="destructive" onClick={handleForceLink} title="Force open on client">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Waiting for payment link...</p>
            <p className="text-xs text-muted-foreground/60">The link will appear here automatically once the provider responds in Telegram.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentLinkDialog;
