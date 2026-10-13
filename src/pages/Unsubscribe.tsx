import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MailX, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const validate = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await res.json();
        if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      } catch { setStatus("invalid"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground" />}
          {status === "valid" && (
            <>
              <MailX className="h-12 w-12 mx-auto text-destructive" />
              <h1 className="text-xl font-semibold">E-Mail-Abmeldung</h1>
              <p className="text-muted-foreground text-sm">
                Möchten Sie sich wirklich von unseren E-Mail-Benachrichtigungen abmelden?
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} variant="destructive">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Abmeldung bestätigen
              </Button>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
              <h1 className="text-xl font-semibold">Erfolgreich abgemeldet</h1>
              <p className="text-muted-foreground text-sm">Sie erhalten keine weiteren E-Mail-Benachrichtigungen mehr.</p>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <h1 className="text-xl font-semibold">Bereits abgemeldet</h1>
              <p className="text-muted-foreground text-sm">Sie haben sich bereits von unseren E-Mails abgemeldet.</p>
            </>
          )}
          {status === "invalid" && (
            <>
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h1 className="text-xl font-semibold">Ungültiger Link</h1>
              <p className="text-muted-foreground text-sm">Dieser Abmeldelink ist ungültig oder abgelaufen.</p>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h1 className="text-xl font-semibold">Fehler</h1>
              <p className="text-muted-foreground text-sm">Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
