import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface VoipConfig {
  enabled: boolean;
  pbx_url: string;
  tenant: string;
  account_suffix: string;
  log_calls: boolean;
}

const DEFAULT_CONFIG: VoipConfig = {
  enabled: false,
  pbx_url: "https://pbx.golden-voip.io/pbx/proxyapi.php",
  tenant: "",
  account_suffix: "",
  log_calls: true,
};

export function useVoipConfig() {
  const [config, setConfig] = useState<VoipConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "voip")
      .maybeSingle();
    if (data?.value) {
      setConfig({ ...DEFAULT_CONFIG, ...(data.value as Partial<VoipConfig>) });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (next: VoipConfig) => {
    const { error } = await supabase
      .from("platform_settings")
      .upsert([{ key: "voip", value: next as unknown as never }]);
    if (error) throw error;
    setConfig(next);
  };

  return { config, loading, reload: load, save };
}

export function useVoip() {
  const dial = useCallback(async (number: string, clientId?: string) => {
    const { data, error } = await supabase.functions.invoke("voip-proxy", {
      body: { action: "dial", number, client_id: clientId },
    });
    if (error) {
      toast.error("VoIP dial failed", { description: error.message });
      return null;
    }
    if ((data as { error?: string })?.error) {
      toast.error("VoIP dial failed", { description: (data as { error: string }).error });
      return null;
    }
    toast.success("Call placed via PBX");
    return data as { ok: true; call_id: string | null };
  }, []);

  const hangup = useCallback(async (ext?: string) => {
    const { data, error } = await supabase.functions.invoke("voip-proxy", {
      body: { action: "hangup", ext },
    });
    if (error) toast.error("Hangup failed", { description: error.message });
    return data;
  }, []);

  const test = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("voip-proxy", {
      body: { action: "test" },
    });
    if (error) return { ok: false, message: error.message };
    const err = (data as { error?: string })?.error;
    if (err) return { ok: false, message: err };
    return { ok: true, message: "Connected to PBX successfully" };
  }, []);

  return { dial, hangup, test };
}