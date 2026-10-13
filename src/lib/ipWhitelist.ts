import { supabase } from "@/lib/supabase";

// Calls the check-ip-whitelist edge function which extracts the caller IP
// from request headers and compares against platform_settings.backoffice_ip_whitelist.
// Returns `true` when access is allowed (whitelist disabled, empty, or IP matches).
// Fails open on transport errors so a flaky network doesn't lock admins out.
export async function checkBackofficeIpAllowed(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("check-ip-whitelist", {
      method: "POST",
      body: {},
    });
    if (error) {
      // 403 from edge fn comes through as a FunctionsHttpError — treat as blocked
      const status = (error as any)?.context?.status ?? (error as any)?.status;
      if (status === 403) return false;
      // Other errors (network, 5xx) — fail open
      return true;
    }
    return data?.allowed !== false;
  } catch {
    return true;
  }
}
