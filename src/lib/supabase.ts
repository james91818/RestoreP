import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { BACKOFFICE_HOSTS } from '@/lib/hosts';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isBackoffice =
  typeof window !== 'undefined' &&
  (BACKOFFICE_HOSTS.includes(window.location.hostname) ||
   window.location.pathname.startsWith('/backoffice'));

const storageKey = isBackoffice
  ? 'sb-admin-auth-token'
  : undefined; // default key for client

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    ...(storageKey ? { storageKey } : {}),
  },
});
