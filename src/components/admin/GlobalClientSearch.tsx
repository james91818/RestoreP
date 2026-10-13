import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Search, User, Loader2 } from "lucide-react";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  is_lead: boolean | null;
}

const GlobalClientSearch = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staffIdsRef = useRef<Set<string> | null>(null);
  const reqIdRef = useRef(0);

  const searchClients = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    // Escape PostgREST .or() reserved chars: , ( ) and wildcards
    const safe = term.replace(/[,()*%]/g, " ").replace(/\s+/g, " ").trim();
    if (!safe) {
      setResults([]);
      setLoading(false);
      return;
    }
    const reqId = ++reqIdRef.current;
    setLoading(true);

    // Cache staff ids across searches
    if (!staffIdsRef.current) {
      const { data: urData } = await supabase.from("user_roles").select("user_id");
      staffIdsRef.current = new Set((urData ?? []).map((ur: any) => ur.user_id));
    }

    // Phones are stored digits-only (e.g. "4915261570") — strip non-digits from the term
    const phoneDigits = safe.replace(/\D/g, "");
    const orParts = [
      `full_name.ilike.%${safe}%`,
      `email.ilike.%${safe}%`,
    ];
    if (phoneDigits.length >= 2) {
      orParts.push(`phone.ilike.%${phoneDigits}%`);
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, country, is_lead")
      .or(orParts.join(","))
      .limit(50);

    if (reqId !== reqIdRef.current) return; // stale
    if (error) {
      console.error("Client search failed:", error);
      setResults([]);
      setLoading(false);
      return;
    }

    const staffIds = staffIdsRef.current!;
    const filtered = (profiles ?? []).filter((p: any) => !staffIds.has(p.id)) as SearchResult[];
    setResults(filtered);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchClients(query);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchClients]);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (userId: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    navigate(`/backoffice/users/${userId}`);
  };

  const leads = results.filter(r => r.is_lead !== false);
  const depositors = results.filter(r => r.is_lead === false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:border-ring/40 hover:bg-accent/50 transition-colors"
      >
        <Search className="h-4 w-4 shrink-0 opacity-50" />
        <span className="flex-1 text-left">Search clients...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background text-muted-foreground hover:border-ring/40 hover:bg-accent/50 transition-colors"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search by name, email or phone..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}
          {!loading && query.trim().length < 2 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>No clients found</CommandEmpty>
          )}
          {!loading && depositors.length > 0 && (
            <CommandGroup heading="Depositors">
              {depositors.map((r) => (
                <CommandItem
                  key={r.id}
                  onSelect={() => handleSelect(r.id)}
                  className="flex items-center gap-3"
                >
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium">
                      {r.full_name || r.email || "Unnamed"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {r.email} {r.phone ? `· ${r.phone}` : ""}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    {r.country && (
                      <img
                        src={`https://flagcdn.com/w20/${r.country.toLowerCase()}.png`}
                        srcSet={`https://flagcdn.com/w40/${r.country.toLowerCase()}.png 2x`}
                        width={20}
                        height={15}
                        alt={r.country}
                        className="rounded-sm shadow-sm"
                        loading="lazy"
                      />
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                      Depositor
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {!loading && leads.length > 0 && (
            <CommandGroup heading="Leads">
              {leads.map((r) => (
                <CommandItem
                  key={r.id}
                  onSelect={() => handleSelect(r.id)}
                  className="flex items-center gap-3"
                >
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium">
                      {r.full_name || r.email || "Unnamed"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {r.email} {r.phone ? `· ${r.phone}` : ""}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    {r.country && (
                      <img
                        src={`https://flagcdn.com/w20/${r.country.toLowerCase()}.png`}
                        srcSet={`https://flagcdn.com/w40/${r.country.toLowerCase()}.png 2x`}
                        width={20}
                        height={15}
                        alt={r.country}
                        className="rounded-sm shadow-sm"
                        loading="lazy"
                      />
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/30">
                      Lead
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalClientSearch;
