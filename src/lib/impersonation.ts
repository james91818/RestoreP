const KEY = "impersonated-session";

/**
 * Marks the current browser tab as an agent "Login as Client" session.
 * Impersonated sessions must never write client presence data
 * (last_seen_at, current_page, page visits) so the CRM keeps showing
 * the last time the client was *really* online.
 */
export function detectImpersonationFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("impersonated") === "1") {
      sessionStorage.setItem(KEY, "1");
      params.delete("impersonated");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash
      );
    }
  } catch {
    // ignore
  }
}

export function isImpersonatedSession(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
