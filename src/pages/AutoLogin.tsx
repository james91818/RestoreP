import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const AutoLogin = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState<string>("Signing you in…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (!token) {
        setStatus("error");
        setMessage("Missing token.");
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("auto-login", {
          body: { token },
        });
        if (error || !data?.success) {
          setStatus("error");
          setMessage(data?.error || error?.message || "Could not sign in.");
          return;
        }
        const { error: setErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (setErr) {
          setStatus("error");
          setMessage(setErr.message);
          return;
        }
        navigate("/welcome", { replace: true });
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message || "Unexpected error.");
      }
    })();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="text-center max-w-md">
        {status === "loading" ? (
          <>
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-2">Login link not valid</h1>
            <p className="text-sm text-muted-foreground mb-4">{message}</p>
            <a href="/login" className="text-primary underline text-sm">Go to login</a>
          </>
        )}
      </div>
    </div>
  );
};

export default AutoLogin;
