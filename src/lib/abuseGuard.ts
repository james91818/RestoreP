import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "abuse_blocked";

export const isAbuseError = (message?: string | null) =>
  !!message && message.includes("ABUSE_BLOCKED");

/** Blocks the current visitor's IP and sends them to the funny blocked page. */
export async function reportAbuse(reason: string, details?: string) {
  try {
    await supabase.functions.invoke("abuse-guard", {
      body: { action: "report", reason, details },
    });
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.setItem(CACHE_KEY, "1");
  } catch {
    /* ignore */
  }
  window.location.replace("/blocked");
}

/** Returns true when this visitor's IP is on the block list. */
export async function checkAbuseBlocked(): Promise<boolean> {
  try {
    if (sessionStorage.getItem(CACHE_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    const { data } = await supabase.functions.invoke("abuse-guard", {
      body: { action: "check" },
    });
    const blocked = !!(data as { blocked?: boolean } | null)?.blocked;
    if (blocked) {
      try {
        sessionStorage.setItem(CACHE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    return blocked;
  } catch {
    return false;
  }
}
