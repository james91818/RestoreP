import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export const AGENT_ROLES = ["Agent", "Agent Conversion", "Agent Retention"];
export const MANAGER_ROLES = ["Manager", "Manager Conversion", "Manager Retention"];
const STAFF_ROLES = ["Admin", ...MANAGER_ROLES, ...AGENT_ROLES];

export const isAgentRole = (name: string | null | undefined) =>
  !!name && AGENT_ROLES.includes(name);
export const isManagerRole = (name: string | null | undefined) =>
  !!name && MANAGER_ROLES.includes(name);
export const isAdminOrManager = (name: string | null | undefined) =>
  name === "Admin" || isManagerRole(name);

export async function getStaffRoleName(userId: string): Promise<string | null> {
  try {
    const result = await Promise.race([
      supabase
        .from("user_roles")
        .select("role_id, roles(name)")
        .eq("user_id", userId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Role check timed out")), 5000)
      ),
    ]);

    if ((result as any).error) {
      console.error("Role check error:", (result as any).error.message);
      return null;
    }

    const rows = ((result as any).data ?? []) as Array<{ roles: { name: string } | { name: string }[] | null }>;
    // Pick the first staff role found across all assignments (a user may have multiple)
    for (const row of rows) {
      const r = row.roles;
      const candidates = Array.isArray(r) ? r.map(x => x?.name) : [r?.name];
      for (const name of candidates) {
        if (name && STAFF_ROLES.includes(name)) {
          return name;
        }
      }
    }
    return null;
  } catch (err: any) {
    console.error("Role check failed:", err?.message);
    return null;
  }
}

export function useRole() {
  const { user } = useAuth();
  const [isStaff, setIsStaff] = useState(false);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setIsStaff(false);
      setRoleName(null);
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);

    const fetchRole = async () => {
      const name = await getStaffRoleName(user.id);
      if (cancelled) return;

      setRoleName(name);
      setIsStaff(Boolean(name));
      setLoading(false);
    };

    void fetchRole();

    return () => { cancelled = true; };
  }, [user]);

  return { isStaff, roleName, loading };
}
