import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { checkAbuseBlocked } from "@/lib/abuseGuard";

/**
 * Checks once per session whether this visitor's IP was blocked for
 * tampering with the system, and if so sends them to the /blocked page.
 */
const AbuseGate = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/blocked") return;
    let cancelled = false;
    checkAbuseBlocked().then((blocked) => {
      if (blocked && !cancelled) navigate("/blocked", { replace: true });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default AbuseGate;
