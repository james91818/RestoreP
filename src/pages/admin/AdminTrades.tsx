import { useEffect, useState, useCallback, useRef } from "react";
import { fetchLivePrices, computeLivePnl, deriveClosePriceFromPnl } from "@/lib/tradePnl";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRole, isAgentRole, isAdminOrManager as checkAdminOrManager } from "@/hooks/useRole";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Layers, Target, Tag, ArrowRight, CheckCircle2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import TablePagination from "@/components/admin/TablePagination";

const toLocalDateTimeInputValue = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const AdminTrades = () => {
  const { user } = useAuth();
  const { roleName } = useRole();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideOpen, setOverrideOpen] = useState<any>(null);
  const [overrideMode, setOverrideMode] = useState("none");
  const [targetValue, setTargetValue] = useState("");
  const [durationSec, setDurationSec] = useState(60);
  const [customDuration, setCustomDuration] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [manipulating, setManipulating] = useState<Record<string, boolean>>({});
  const [manipEndTime, setManipEndTime] = useState<Record<string, number>>({});
  const [countdownTick, setCountdownTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const activeTimersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const manipMetaRef = useRef<Record<string, { tradeId: string; userId: string; size: number; forcedPnl: number; targetPrice: number }>>({});

  const fetchTrades = async () => {
    // Fetch all open trades + a generous window of recent closed trades so staff
    // (incl. Manager Retention) can see activity across all clients, not just the
    // most recent 100 rows globally (which can be dominated by a single very active client).
    const [{ data: openRows }, { data: closedRows }] = await Promise.all([
      supabase
        .from("trades")
        .select("*, assets(symbol, name), trade_overrides(*)")
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1000),
      supabase
        .from("trades")
        .select("*, assets(symbol, name), trade_overrides(*)")
        .neq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1000),
    ]);
    const tradesData = [...(openRows ?? []), ...(closedRows ?? [])];

    if (tradesData && tradesData.length > 0) {
      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(tradesData.map((t) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, secondary_phone, display_id")
        .in("id", userIds);

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      const enriched = tradesData.map((t) => ({
        ...t,
        profiles: profileMap[t.user_id] || null,
      }));
      setTrades(enriched);
    } else {
      setTrades(tradesData ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTrades(); }, []);

  // Countdown tick for manipulation timers
  useEffect(() => {
    const hasActive = Object.values(manipulating).some(Boolean);
    if (!hasActive) return;
    const iv = setInterval(() => setCountdownTick(c => c + 1), 1000);
    return () => clearInterval(iv);
  }, [manipulating]);

  // Warn admin before leaving page during active manipulation
  useEffect(() => {
    const hasActive = Object.values(manipulating).some(Boolean);
    if (!hasActive) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Manipulation is still running. If you leave, the trade will keep its current intermediate P&L and the override will remain active for the client to use when closing.";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [manipulating]);

  // Realtime subscription for trade changes — update in-place for speed
  useEffect(() => {
    const channel = supabase
      .channel('admin-trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          setTrades(prev => {
            const idx = prev.findIndex((t: any) => t.id === updated.id);
            if (idx === -1) return prev;
            const existing = prev[idx];
            return [
              ...prev.slice(0, idx),
              { ...existing, ...updated, assets: existing.assets, profiles: existing.profiles, trade_overrides: existing.trade_overrides },
              ...prev.slice(idx + 1),
            ];
          });
        } else {
          fetchTrades();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch live prices for P&L every 2 seconds
  const refreshPrices = useCallback(async () => {
    const symbols = [...new Set(trades.map((t: any) => t.assets?.symbol).filter(Boolean))] as string[];
    if (symbols.length) {
      const prices = await fetchLivePrices(symbols);
      if (Object.keys(prices).length) setLivePrices(prices);
    }
  }, [trades]);

  useEffect(() => { refreshPrices(); }, [refreshPrices]);
  useEffect(() => {
    if (!trades.length) return;
    const interval = setInterval(() => {
      if (!document.hidden) refreshPrices();
    }, 3000);
    return () => clearInterval(interval);
  }, [trades, refreshPrices]);

  const closeTrade = async (trade: any, pnl: number) => {
    // Derive a realistic close price from the P&L so entry/close prices
    // make sense relative to the realized result (avoid equal entry==close).
    const symbol = trade.assets?.symbol;
    const livePrice = symbol ? livePrices[symbol] : undefined;
    const closePrice = pnl !== 0
      ? deriveClosePriceFromPnl(trade, pnl)
      : (livePrice && livePrice > 0 ? livePrice : Number(trade.entry_price));

    // Idempotent: only credit wallet if this call actually transitions
    // the trade from open → closed. Prevents double-credit if admin and
    // client (or two admin tabs) close the same trade simultaneously.
    const { data: updatedRows } = await supabase.from("trades").update({
      status: "closed",
      closed_at: new Date().toISOString(),
      current_price: closePrice,
      pnl,
    }).eq("id", trade.id).eq("status", "open").select("id");

    if (updatedRows && updatedRows.length > 0) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", trade.user_id)
        .eq("currency", "EUR")
        .maybeSingle();
      if (wallet) {
        await supabase.from("wallets").update({
          balance: Number(wallet.balance) + Number(trade.size) + pnl,
        }).eq("id", wallet.id);
      }
    }

    toast.success("Trade closed");
    fetchTrades();
  };

  // Calculate a realistic price movement for visual display during manipulation
  // The price moves by a believable % (0.5-3%) in the correct direction, NOT derived from P&L
  const calcRealisticTargetPrice = (trade: any, forcedPnl: number, currentPrice: number) => {
    const entry = Number(trade.entry_price);
    if (entry === 0) return entry;
    
    // Determine direction of price movement based on trade direction + win/loss
    const isBuy = trade.direction === "buy";
    const isWin = forcedPnl >= 0;
    const priceGoesUp = (isBuy && isWin) || (!isBuy && !isWin);
    
    // Calculate what the "real" target price would be from the P&L formula
    const size = Number(trade.size);
    const leverage = Number(trade.leverage);
    const realRatio = Math.abs(forcedPnl) / (size * leverage);
    
    // Cap the price movement to a realistic range (0.3% to 5% from current price)
    // Use the real ratio if it's within bounds, otherwise clamp it
    const maxRealisticMove = 0.05; // 5% max
    const minRealisticMove = 0.003; // 0.3% min
    const clampedRatio = Math.max(minRealisticMove, Math.min(realRatio, maxRealisticMove));
    
    return priceGoesUp
      ? currentPrice * (1 + clampedRatio)
      : currentPrice * (1 - clampedRatio);
  };

  const finishManipulation = async (tradeId: string, userId: string, size: number, forcedPnl: number, targetPrice: number) => {
    // Idempotent: conditional update on status='open' guarantees the wallet
    // credit only happens once even if this finisher fires multiple times
    // or races with a manual close.
    const { data: updatedRows } = await supabase.from("trades").update({
      status: "closed",
      closed_at: new Date().toISOString(),
      current_price: targetPrice,
      pnl: forcedPnl,
    }).eq("id", tradeId).eq("status", "open").select("id");

    await supabase.from("trade_overrides").update({ is_active: false }).eq("trade_id", tradeId);

    if (!updatedRows || updatedRows.length === 0) return; // already closed elsewhere

    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", userId)
      .eq("currency", "EUR")
      .maybeSingle();
    if (wallet) {
      await supabase.from("wallets").update({
        balance: Number(wallet.balance) + size + forcedPnl,
      }).eq("id", wallet.id);
    }
  };

  // Cleanup: when component unmounts, just clear the in-memory timers.
  // DO NOT auto-finish trades — the override (with finish_at) is persisted in the DB
  // and will be resumed on next mount for its REMAINING duration.
  useEffect(() => {
    return () => {
      for (const timer of Object.values(activeTimersRef.current)) {
        clearInterval(timer);
      }
      activeTimersRef.current = {};
      manipMetaRef.current = {};
    };
  }, []);

  // Auto-resume: on mount, re-schedule any active manipulations using their saved finish_at.
  // If finish_at is still in the future → restart the gradual timer for the remaining time
  // so the trade closes exactly when the agent originally scheduled (e.g. 4 hours later).
  useEffect(() => {
    const resumeStuckManipulations = async () => {
      const { data } = await supabase
        .from("trade_overrides")
        .select("trade_id, target_value, override_mode, finish_at, trades!inner(id, status, user_id, size, current_price, entry_price, direction, leverage, assets(symbol, name))")
        .eq("is_active", true)
        .in("override_mode", ["force_win", "force_loss"]);

      if (!data) return;
      for (const ov of data as any[]) {
        const trade = ov.trades;
        if (!trade || trade.status !== "open") continue;
        if (activeTimersRef.current[trade.id]) continue; // already running
        const forcedPnl = Number(ov.target_value ?? 0);

        // Legacy override without finish_at → leave alone, do not close early
        if (!ov.finish_at) continue;

        const remainingMs = new Date(ov.finish_at).getTime() - Date.now();
        if (remainingMs > 1000) {
          const remainingSec = Math.round(remainingMs / 1000);
          startGradualManipulation(trade, forcedPnl, remainingSec, new Date(ov.finish_at).getTime());
        } else {
          // Scheduled finish time already passed — close now
          const targetPrice = Number(trade.current_price ?? trade.entry_price);
          await finishManipulation(trade.id, trade.user_id, Number(trade.size), forcedPnl, targetPrice);
          fetchTrades();
        }
      }
    };
    resumeStuckManipulations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGradualManipulation = async (
    trade: any,
    forcedPnl: number,
    totalDurationSec: number,
    explicitEndMs?: number,
  ) => {
    const symbol = trade.assets?.symbol;
    const currentMarketPrice = livePrices[symbol] || Number(trade.current_price ?? trade.entry_price);
    const realisticTargetPrice = calcRealisticTargetPrice(trade, forcedPnl, currentMarketPrice);

    const steps = Math.max(Math.round(totalDurationSec / 3), 4);
    const intervalMs = (totalDurationSec * 1000) / steps;
    const priceStep = (realisticTargetPrice - currentMarketPrice) / steps;
    const pnlStep = forcedPnl / steps;

    const startTime = Date.now();
    const endTime = explicitEndMs ?? (startTime + totalDurationSec * 1000);

    setManipulating(prev => ({ ...prev, [trade.id]: true }));
    setManipEndTime(prev => ({ ...prev, [trade.id]: endTime }));

    // Store metadata for cleanup
    manipMetaRef.current[trade.id] = {
      tradeId: trade.id,
      userId: trade.user_id,
      size: Number(trade.size),
      forcedPnl,
      targetPrice: realisticTargetPrice,
    };

    // Persist override + finish_at so a page reload can resume the timer for the
    // remaining time instead of closing the trade immediately.
    if (!explicitEndMs) {
      await supabase.from("trade_overrides").upsert({
        trade_id: trade.id,
        override_mode: forcedPnl >= 0 ? "force_win" : "force_loss",
        target_value: forcedPnl,
        is_active: true,
        finish_at: new Date(endTime).toISOString(),
      }, { onConflict: "trade_id" });
    }

    // Set initial state without jumping pnl
    await supabase.from("trades").update({ 
      current_price: currentMarketPrice,
    }).eq("id", trade.id);

    const timer = setInterval(async () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const totalMs = totalDurationSec * 1000;
      const progress = Math.min(elapsed / totalMs, 1);
      const isLast = progress >= 1;

      const priceNoise = isLast ? 0 : (Math.random() - 0.5) * Math.abs(priceStep) * 0.3;
      const pnlNoise = isLast ? 0 : (Math.random() - 0.5) * Math.abs(pnlStep) * 0.15;
      
      const newPrice = isLast
        ? realisticTargetPrice 
        : +(currentMarketPrice + (realisticTargetPrice - currentMarketPrice) * progress + priceNoise).toFixed(currentMarketPrice < 1 ? 6 : 2);
      const newPnl = isLast
        ? forcedPnl
        : +(forcedPnl * progress + pnlNoise).toFixed(2);

      await supabase.from("trades").update({ 
        current_price: newPrice,
        pnl: newPnl,
      }).eq("id", trade.id);

      if (isLast) {
        clearInterval(timer);
        delete activeTimersRef.current[trade.id];
        delete manipMetaRef.current[trade.id];

        await finishManipulation(trade.id, trade.user_id, Number(trade.size), forcedPnl, realisticTargetPrice);

        setManipulating(prev => ({ ...prev, [trade.id]: false }));
        toast.success(`Manipulation complete — Trade closed with P&L €${forcedPnl.toFixed(2)}`);
        fetchTrades();
      }
    }, intervalMs);

    // Store timer ref for cleanup
    activeTimersRef.current[trade.id] = timer;
  };

  const setOverride = async (resolvedDuration?: number) => {
    if (!overrideOpen) return;
    const trade = overrideOpen;

    // Save the override record
    const existing = trade.trade_overrides;
    if (existing && existing.length > 0) {
      await supabase.from("trade_overrides").update({
        override_mode: overrideMode,
        target_value: targetValue ? Number(targetValue) : null,
        applied_by: user?.id,
        is_active: overrideMode !== "none",
      }).eq("id", existing[0].id);
    } else {
      await supabase.from("trade_overrides").insert({
        trade_id: trade.id,
        override_mode: overrideMode,
        target_value: targetValue ? Number(targetValue) : null,
        applied_by: user?.id,
        is_active: overrideMode !== "none",
      });
    }

    if (overrideMode !== "none") {
      let forcedPnl = 0;
      const size = Number(trade.size);
      if (overrideMode === "win") {
        forcedPnl = targetValue ? Math.abs(Number(targetValue)) : Math.abs(size * 0.15);
      } else if (overrideMode === "loss") {
        forcedPnl = targetValue ? -Math.abs(Number(targetValue)) : -(size * 0.15);
      } else if (overrideMode === "breakeven") {
        forcedPnl = 0;
      } else if (overrideMode === "custom") {
        forcedPnl = targetValue ? Number(targetValue) : 0;
      }

      if (trade.status === "open") {
        const usesExactFinishAt = customDuration === "custom" && !!endDateTime;
        const dur = resolvedDuration ?? (usesExactFinishAt
          ? Math.round((new Date(endDateTime).getTime() - Date.now()) / 1000)
          : durationSec);
        const finalDur = Math.max(5, dur);
        toast.info(`Starting manipulation — P&L will reach €${forcedPnl.toFixed(2)} over ${finalDur}s. Stay on this page.`);
        startGradualManipulation(trade, forcedPnl, finalDur);
      } else {
        // Already closed — update P&L directly
        const oldPnl = Number(trade.pnl ?? 0);
        const diff = forcedPnl - oldPnl;
        await supabase.from("trades").update({ pnl: forcedPnl }).eq("id", trade.id);
        if (diff !== 0) {
          const { data: wallet } = await supabase
            .from("wallets").select("id, balance")
            .eq("user_id", trade.user_id).eq("currency", "EUR").maybeSingle();
          if (wallet) {
            await supabase.from("wallets").update({
              balance: Number(wallet.balance) + diff,
            }).eq("id", wallet.id);
          }
        }
        toast.success(`Trade P&L updated to €${forcedPnl.toFixed(2)}`);
        fetchTrades();
      }
    } else {
      // Remove override — reset current_price and pnl so live calculation takes over
      await supabase.from("trades").update({ current_price: null, pnl: 0 }).eq("id", trade.id);
      toast.success("Override removed");
      fetchTrades();
    }

    setOverrideOpen(null);
  };

  const matchesSearch = (t: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const p = t.profiles;
    if (!p) return false;
    return (
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.secondary_phone && p.secondary_phone.toLowerCase().includes(q))
    );
  };

  const openTrades = trades.filter(t => t.status === "open" && matchesSearch(t));
  const closedTrades = trades.filter(t => t.status === "closed" && matchesSearch(t));

  const PAGE_SIZE = 50;
  const [openPage, setOpenPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  useEffect(() => { setOpenPage(1); }, [openTrades.length]);
  useEffect(() => { setClosedPage(1); }, [closedTrades.length]);
  const paginatedOpen = openTrades.slice((openPage - 1) * PAGE_SIZE, openPage * PAGE_SIZE);
  const paginatedClosed = closedTrades.slice((closedPage - 1) * PAGE_SIZE, closedPage * PAGE_SIZE);

  const editClosedPnl = async (trade: any, newPnl: number) => {
    // Update trade P&L
    await supabase.from("trades").update({ pnl: newPnl }).eq("id", trade.id);
    // Adjust wallet: remove old pnl, apply new
    const oldPnl = Number(trade.pnl ?? 0);
    const diff = newPnl - oldPnl;
    if (diff !== 0) {
      const { data: wallet } = await supabase
        .from("wallets").select("id, balance")
        .eq("user_id", trade.user_id).eq("currency", "EUR").maybeSingle();
      if (wallet) {
        await supabase.from("wallets").update({
          balance: Number(wallet.balance) + diff,
        }).eq("id", wallet.id);
      }
    }
    toast.success("Trade P&L updated");
    fetchTrades();
  };

  // Edit closed trade dialog
  const [editPnlOpen, setEditPnlOpen] = useState<any>(null);
  const [editPnlValue, setEditPnlValue] = useState("");

  // Delete trade dialog
  const [deleteOpen, setDeleteOpen] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const isAgent = isAgentRole(roleName);
  const isAdminOrManager = checkAdminOrManager(roleName);

  const deleteTrade = async (trade: any) => {
    setDeleting(true);
    try {
      const isClosed = trade.status === "closed";
      const size = Number(trade.size ?? 0);
      const pnl = Number(trade.pnl ?? 0);

      // Determine wallet adjustment — always refund the originally invested size on delete.
      //  - Open trade: size was deducted on open and never returned → refund +size
      //  - Closed trade: wallet was credited by (size + pnl) on close. To return only the
      //    original stake, reverse that credit and add size back: -(size+pnl) + size = -pnl
      let walletDelta = 0;
      if (isClosed) {
        walletDelta = -pnl;
      } else {
        walletDelta = size;
      }

      if (walletDelta !== 0) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("id, balance")
          .eq("user_id", trade.user_id)
          .eq("currency", "EUR")
          .maybeSingle();
        if (wallet) {
          await supabase.from("wallets").update({
            balance: Number(wallet.balance) + walletDelta,
          }).eq("id", wallet.id);
        }
      }

      // Remove any associated overrides first (FK)
      await supabase.from("trade_overrides").delete().eq("trade_id", trade.id);
      const { error } = await supabase.from("trades").delete().eq("id", trade.id);
      if (error) throw error;

      toast.success(
        walletDelta === 0
          ? "Trade deleted"
          : `Trade deleted · Wallet ${walletDelta >= 0 ? "+" : ""}€${walletDelta.toFixed(2)}`
      );
      setDeleteOpen(null);
      fetchTrades();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete trade");
    } finally {
      setDeleting(false);
    }
  };


  // Bulk trade creator — step wizard
  type BulkTradeRow = { asset_id: string; direction: string; size: string; leverage: string; pnl: string; closedAt: Date; entryPrice: string; status: "open" | "closed" };
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<"trade" | "clients" | "review">("trade");
  const [bulkUserIds, setBulkUserIds] = useState<string[]>([]);
  const [bulkUserSearch, setBulkUserSearch] = useState("");
  const [bulkUsers, setBulkUsers] = useState<any[]>([]);
  const [bulkAssets, setBulkAssets] = useState<any[]>([]);
  const [bulkRows, setBulkRows] = useState<BulkTradeRow[]>([]);
  const [bulkCurrentRow, setBulkCurrentRow] = useState<BulkTradeRow>({ asset_id: "", direction: "buy", size: "1000", leverage: "1", pnl: "50", closedAt: new Date(), entryPrice: "", status: "closed" });
  const [bulkSaving, setBulkSaving] = useState(false);

  const openBulkDialog = async () => {
    const [{ data: users }, { data: assets }, { data: staffRoles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, first_deposit_at")
        .not("first_deposit_at", "is", null)
        .order("full_name"),
      supabase.from("assets").select("id, symbol, name, type").eq("enabled", true).order("type").order("symbol"),
      supabase.from("user_roles").select("user_id, roles(name)"),
    ]);
    const staffIds = new Set(
      (staffRoles ?? [])
        .filter((r: any) => ["Admin", "Manager", "Agent"].includes(r.roles?.name))
        .map((r: any) => r.user_id)
    );
    setBulkUsers((users ?? []).filter(u => !staffIds.has(u.id)));
    setBulkAssets(assets ?? []);
    setBulkUserIds([]);
    setBulkUserSearch("");
    setBulkRows([]);
    setBulkCurrentRow({ asset_id: "", direction: "buy", size: "1000", leverage: "1", pnl: "50", closedAt: new Date(), entryPrice: "", status: "closed" });
    setBulkStep("trade");
    setBulkOpen(true);
  };

  const addCurrentTradeAndContinue = () => {
    if (!bulkCurrentRow.asset_id) { toast.error("Select an asset"); return; }
    if (!bulkCurrentRow.size) { toast.error("Enter a size"); return; }
    setBulkRows(prev => [...prev, { ...bulkCurrentRow }]);
    // Reset for next trade, keep same date for convenience
    setBulkCurrentRow({ asset_id: "", direction: "buy", size: "1000", leverage: "1", pnl: "50", closedAt: bulkCurrentRow.closedAt, entryPrice: "", status: bulkCurrentRow.status });
  };

  const finishAndReview = () => {
    const hasCurrentDraft = bulkCurrentRow.asset_id || bulkCurrentRow.entryPrice;
    // If user started filling the current row but didn't pick an asset, block
    if (!bulkCurrentRow.asset_id && bulkRows.length === 0) {
      toast.error("Please select an asset before continuing");
      return;
    }
    if (hasCurrentDraft && !bulkCurrentRow.asset_id) {
      toast.error("Please select an asset for this trade");
      return;
    }
    // If current row has a valid asset + size, add it
    if (bulkCurrentRow.asset_id) {
      if (!bulkCurrentRow.size) { toast.error("Please enter a size for this trade"); return; }
      setBulkRows(prev => [...prev, { ...bulkCurrentRow }]);
    }
    setBulkStep("clients");
  };




  const submitBulkTrades = async () => {
    if (!bulkUserIds.length) { toast.error("Select at least one client"); return; }
    const validRows = bulkRows.filter(r => r.asset_id && r.size && (r.status === "open" || r.pnl));
    if (!validRows.length) { toast.error("Add at least one valid trade"); return; }

    const assetSymbolById = new Map((bulkAssets ?? []).map((asset: any) => [asset.id, asset.symbol]));
    const missingEntrySymbols = [...new Set(
      validRows
        .filter((row) => !row.entryPrice)
        .map((row) => assetSymbolById.get(row.asset_id))
        .filter(Boolean)
    )] as string[];

    const fetchedEntryPrices = missingEntrySymbols.length
      ? await fetchLivePrices(missingEntrySymbols)
      : {};

    // Net wallet impact per client
    let projectedDelta = 0;
    for (const row of validRows) {
      const size = Number(row.size);
      if (row.status === "closed") projectedDelta += Number(row.pnl);
      else projectedDelta -= size;
    }

    setBulkSaving(true);
    let successClients = 0;
    let skippedInsufficient = 0;
    let totalTradesCreated = 0;
    const errors: string[] = [];

    for (const clientId of bulkUserIds) {
      // Per-client preflight balance check
      if (projectedDelta < 0) {
        const { data: walletCheck } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", clientId)
          .eq("currency", "EUR")
          .maybeSingle();
        const currentBalance = Number(walletCheck?.balance ?? 0);
        if (currentBalance + projectedDelta < 0) {
          skippedInsufficient += 1;
          continue;
        }
      }

      let walletDelta = 0;
      let clientAnySuccess = false;

      for (const row of validRows) {
        const symbol = assetSymbolById.get(row.asset_id);
        const liveEntryPrice = symbol ? (fetchedEntryPrices[symbol] ?? livePrices[symbol]) : undefined;
        const entryPrice = row.entryPrice ? Number(row.entryPrice) : Number(liveEntryPrice ?? 0);
        const size = Number(row.size);
        const isClosed = row.status === "closed";
        const pnl = isClosed ? Number(row.pnl) : 0;
        const leverage = Number(row.leverage) || 1;

        if (!(entryPrice > 0)) {
          errors.push(`Missing live entry price for ${symbol ?? "asset"}`);
          continue;
        }

        const { error } = await supabase.from("trades").insert({
          user_id: clientId,
          asset_id: row.asset_id,
          direction: row.direction,
          size,
          leverage,
          entry_price: entryPrice,
          current_price: isClosed
            ? deriveClosePriceFromPnl({ entry_price: entryPrice, size, leverage, direction: row.direction }, pnl)
            : null,
          pnl: isClosed ? pnl : null,
          status: isClosed ? "closed" : "open",
          opened_at: row.closedAt.toISOString(),
          closed_at: isClosed ? row.closedAt.toISOString() : null,
        });

        if (error) {
          errors.push(error.message);
          continue;
        }

        if (isClosed) walletDelta += pnl;
        else walletDelta -= size;
        totalTradesCreated += 1;
        clientAnySuccess = true;
      }

      if (clientAnySuccess) {
        if (walletDelta !== 0) {
          const { data: wallet } = await supabase.from("wallets").select("id, balance").eq("user_id", clientId).eq("currency", "EUR").maybeSingle();
          if (wallet) {
            await supabase.from("wallets").update({ balance: Number(wallet.balance) + walletDelta }).eq("id", wallet.id);
          }
        }
        successClients += 1;
      }
    }

    const parts: string[] = [];
    parts.push(`${totalTradesCreated} trade(s) created for ${successClients} client(s)`);
    if (skippedInsufficient) parts.push(`${skippedInsufficient} skipped (insufficient balance)`);
    if (errors.length) parts.push(`${errors.length} error(s)`);
    if (successClients > 0) toast.success(parts.join(" · "));
    else toast.error(parts.join(" · ") || "Nothing created");
    if (errors.length) {
      const unique = [...new Set(errors)].slice(0, 3);
      unique.forEach((msg) => toast.error(msg));
    }
    setBulkSaving(false);
    setBulkOpen(false);
    await fetchTrades();
    // Refresh prices a couple of times so the just-opened trades show a live, non-zero P&L quickly
    // (the first refresh seeds the ticker map; the second — a moment later — reflects market movement).
    await refreshPrices();
    setTimeout(() => { refreshPrices(); }, 2000);
    setTimeout(() => { refreshPrices(); }, 5000);
  };

  const renderTradeRow = (t: any, isClosed: boolean) => {
    const override = t.trade_overrides?.[0];
    const symbol = t.assets?.symbol;
    // Priority: 1) closed = stored pnl, 2) manipulation in progress = use DB pnl (intermediate value),
    // 3) active override (manipulation hasn't started ticking yet) = use DB pnl,
    // 4) admin-set current_price with stored pnl = stored pnl,
    // 5) live market calculation
    const hasActiveOverride = override?.is_active && override?.override_mode !== "none" && override?.target_value != null;
    const hasAdminLockedPnl = !isClosed && t.current_price != null && t.pnl != null;
    const pnl = isClosed
      ? Number(t.pnl ?? 0)
      : hasActiveOverride
        ? Number(t.pnl ?? 0)
        : hasAdminLockedPnl
          ? Number(t.pnl)
          : computeLivePnl(t, livePrices[symbol]);
    return (
      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
        <td className="p-3">
          <p className="font-medium text-xs">{t.profiles?.full_name || "—"}</p>
        </td>
        <td className="p-3">
          <span className="font-mono text-xs text-muted-foreground">#{t.display_id ?? t.id?.slice(0, 6)}</span>
        </td>
        <td className="p-3 font-medium">{symbol ?? "—"}</td>
        <td className="p-3">
          <Badge variant={t.direction === "buy" ? "default" : "destructive"} className="text-xs capitalize">
            {t.direction}
          </Badge>
        </td>
        <td className="p-3">€{Number(t.size).toLocaleString()}</td>
        <td className="p-3 text-muted-foreground">{Number(t.entry_price) > 0 ? (Number(t.size) / Number(t.entry_price)).toFixed(Number(t.entry_price) > 100 ? 6 : 4) : "—"} {symbol}</td>
        <td className="p-3">€{Number(t.entry_price).toFixed(2)}</td>
        <td className="p-3">{isClosed ? (t.current_price ? `€${Number(t.current_price).toFixed(2)}` : <span className="text-muted-foreground">—</span>) : (livePrices[symbol] ? `€${livePrices[symbol].toFixed(2)}` : t.current_price ? `€${Number(t.current_price).toFixed(2)}` : <span className="text-muted-foreground">—</span>)}</td>
        <td className="p-3">{t.leverage}×</td>
        <td className={`p-3 font-semibold ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
          {pnl >= 0 ? "+" : ""}€{pnl.toFixed(2)}
        </td>
        <td className="p-3">
          {override?.is_active ? (
            <Badge className="text-xs bg-warning/10 text-warning border-warning/30">
              {override.override_mode}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="p-3 text-right space-x-1">
          {manipulating[t.id] ? (() => {
            const secsLeft = Math.max(0, Math.round(((manipEndTime[t.id] ?? 0) - Date.now()) / 1000));
            const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0');
            const ss = String(secsLeft % 60).padStart(2, '0');
            return (
              <Badge className="text-xs bg-primary/10 text-primary border-primary/30 animate-pulse font-mono">
                Manipulating… {mm}:{ss}
              </Badge>
            );
          })() : (
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
              setOverrideOpen(t);
              setOverrideMode(override?.override_mode ?? "none");
              setTargetValue(override?.target_value?.toString() ?? "");
              setDurationSec(60);
              setCustomDuration("");
              const def = new Date(Date.now() + 60000);
              setEndDateTime(def.toISOString().slice(0, 16));
            }}>
              Override
            </Button>
          )}
          {!isClosed && (
            <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => closeTrade(t, pnl)}>
              Close
            </Button>
          )}
          {isClosed && (
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
              setEditPnlOpen(t);
              setEditPnlValue(String(Number(t.pnl ?? 0)));
            }}>
              Edit P&L
            </Button>
          )}
          {(isAdminOrManager || isAgent) && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(t)}
              title="Delete trade"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </td>
      </tr>
    );
  };

  const makeHeaders = (priceLabel: string) => (
    <tr className="border-b bg-muted/50">
      {["Client", "Trade ID", "Asset", "Buy/Sell", "Investment (€)", "Quantity", "Entry Price", priceLabel, "Leverage", "Profit / Loss", "Override", ""].map(h => (
        <th key={h} className={`p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider ${h === "" ? "text-right" : "text-left"}`}>{h || "Actions"}</th>
      ))}
    </tr>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Trades</h1>
          <p className="text-muted-foreground text-sm">View and manage all client trades</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button onClick={openBulkDialog} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Create Trades
          </Button>
        </div>
      </div>

      {/* Open Trades */}
      <div>
        <h2 className="text-base font-display font-semibold mb-2 flex items-center gap-2">
          Open Positions
          {openTrades.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5">{openTrades.length}</Badge>}
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>{makeHeaders("Live Price")}</thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : openTrades.length === 0 ? (
                    <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">No open trades</td></tr>
                  ) : (
                    paginatedOpen.map(t => renderTradeRow(t, false))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <TablePagination page={openPage} totalItems={openTrades.length} pageSize={PAGE_SIZE} onPageChange={setOpenPage} labelSingular="trade" labelPlural="trades" />
      </div>

      {/* Closed Trades */}
      <div>
        <h2 className="text-base font-display font-semibold mb-2 flex items-center gap-2">
          Closed Trades
          {closedTrades.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5">{closedTrades.length}</Badge>}
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>{makeHeaders("Close Price")}</thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : closedTrades.length === 0 ? (
                    <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">No closed trades</td></tr>
                  ) : (
                    paginatedClosed.map(t => renderTradeRow(t, true))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <TablePagination page={closedPage} totalItems={closedTrades.length} pageSize={PAGE_SIZE} onPageChange={setClosedPage} labelSingular="trade" labelPlural="trades" />
      </div>

      {/* Override Dialog */}
      <Dialog open={!!overrideOpen} onOpenChange={() => setOverrideOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Trade Override</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Control the outcome of this trade. The client will not see this override.
            </p>
            <div className="space-y-1">
              <Label>Override Mode</Label>
              <Select value={overrideMode} onValueChange={setOverrideMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (natural)</SelectItem>
                  <SelectItem value="win">Force Win</SelectItem>
                  <SelectItem value="loss">Force Loss</SelectItem>
                  <SelectItem value="breakeven">Breakeven</SelectItem>
                  <SelectItem value="custom">Custom P&L</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(overrideMode === "custom" || overrideMode === "win" || overrideMode === "loss") && (
              <div className="space-y-1">
                <Label>Target P&L (€)</Label>
                <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={overrideMode === "loss" ? "e.g. -200" : overrideMode === "win" ? "e.g. 500" : "e.g. 500 or -200"} />
                <p className="text-xs text-muted-foreground">
                  {overrideMode === "win" ? "Enter the profit amount the client should receive" : overrideMode === "loss" ? "Enter the loss amount (use negative, e.g. -200)" : "Positive for profit, negative for loss"}
                </p>
              </div>
            )}
            {overrideMode !== "none" && overrideOpen?.status === "open" && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" /> Duration / Finish At
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "5m", sec: 300 },
                    { label: "15m", sec: 900 },
                    { label: "30m", sec: 1800 },
                    { label: "1h", sec: 3600 },
                    { label: "2h", sec: 7200 },
                    { label: "4h", sec: 14400 },
                    { label: "8h", sec: 28800 },
                    { label: "24h", sec: 86400 },
                  ].map((preset) => {
                    const isActive = durationSec === preset.sec && !customDuration;
                    return (
                      <Button
                        key={preset.label}
                        type="button"
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        className="text-xs h-8 px-3"
                        onClick={() => {
                          setDurationSec(preset.sec);
                          setCustomDuration("");
                          const dt = new Date(Date.now() + preset.sec * 1000);
                          setEndDateTime(toLocalDateTimeInputValue(dt));
                        }}
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  <span>or pick exact date & time</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Input
                  type="datetime-local"
                  className="h-11"
                  value={endDateTime}
                  min={toLocalDateTimeInputValue(new Date())}
                  onChange={(e) => {
                    setEndDateTime(e.target.value);
                    const diffSec = Math.round((new Date(e.target.value).getTime() - Date.now()) / 1000);
                    setDurationSec(Math.max(5, diffSec));
                    setCustomDuration("custom");
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Trade will close at target P&L in
                  <span className="font-medium text-foreground ml-1">
                    {durationSec >= 3600 ? `${Math.floor(durationSec / 3600)}h ${Math.floor((durationSec % 3600) / 60)}m` : durationSec >= 60 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : `${durationSec}s`}
                  </span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(null)}>Cancel</Button>
            <Button onClick={() => setOverride()}>Apply Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Closed P&L Dialog */}
      <Dialog open={!!editPnlOpen} onOpenChange={() => setEditPnlOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Closed Trade P&L</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Change the final P&L of this closed trade. The client's wallet balance will be adjusted accordingly.
            </p>
            <div className="space-y-1">
              <Label>Current P&L</Label>
              <p className="text-sm font-semibold">€{Number(editPnlOpen?.pnl ?? 0).toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <Label>New P&L (€)</Label>
              <Input type="number" value={editPnlValue} onChange={(e) => setEditPnlValue(e.target.value)} placeholder="e.g. 500 or -200" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPnlOpen(null)}>Cancel</Button>
            <Button onClick={() => {
              if (editPnlOpen && editPnlValue) {
                editClosedPnl(editPnlOpen, Number(editPnlValue));
                setEditPnlOpen(null);
              }
            }}>Update P&L</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Trade Dialog */}
      <Dialog open={!!deleteOpen} onOpenChange={(o) => !o && setDeleteOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete trade?</DialogTitle>
            <DialogDescription>
              This will permanently remove the trade. The wallet adjustment depends on your role.
            </DialogDescription>
          </DialogHeader>
          {deleteOpen && (() => {
            const isClosed = deleteOpen.status === "closed";
            const size = Number(deleteOpen.size ?? 0);
            const pnl = Number(deleteOpen.pnl ?? 0);
            let walletDelta = 0;
            let explanation = "";
            if (isClosed) {
              if (isAdminOrManager) {
                walletDelta = -(size + pnl);
                explanation = `Full reversal: refund of size + P&L removed from wallet (${walletDelta >= 0 ? "+" : ""}€${walletDelta.toFixed(2)}).`;
              } else if (isAgent) {
                walletDelta = -Math.max(pnl, 0);
                explanation = pnl > 0
                  ? `Profit of €${pnl.toFixed(2)} will be removed from the client's wallet. Size and any losses stay applied.`
                  : `No wallet change. Client did not gain profit from this trade.`;
              }
            } else {
              walletDelta = size;
              explanation = `Open trade: refunding the position size (€${size.toFixed(2)}) back to the client's wallet.`;
            }
            return (
              <div className="space-y-3 text-sm">
                <div className="rounded-md border p-3 space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Asset</span><span className="font-medium">{deleteOpen.assets?.symbol ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{deleteOpen.status}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span className="font-medium">€{size.toFixed(2)}</span></div>
                  {isClosed && <div className="flex justify-between"><span className="text-muted-foreground">P&L</span><span className={`font-medium ${pnl >= 0 ? "text-success" : "text-destructive"}`}>{pnl >= 0 ? "+" : ""}€{pnl.toFixed(2)}</span></div>}
                </div>
                <div className="rounded-md bg-muted/50 p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wallet impact ({roleName})</p>
                  <p className={`font-semibold ${walletDelta >= 0 ? "text-success" : "text-destructive"}`}>
                    {walletDelta >= 0 ? "+" : ""}€{walletDelta.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{explanation}</p>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteOpen && deleteTrade(deleteOpen)} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete trade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Trade Creator — Step Wizard */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {bulkStep === "trade" ? `Step 1: Add Trade #${bulkRows.length + 1}` : bulkStep === "clients" ? "Step 2: Select Clients" : "Step 3: Review & Create"}
            </DialogTitle>
          </DialogHeader>

          {/* STEP 2: Select Clients (multi-select) */}
          {bulkStep === "clients" && (() => {
            const q = bulkUserSearch.trim().toLowerCase();
            const filtered = q
              ? bulkUsers.filter((u) => {
                  const hay = `${u.full_name ?? ""} ${u.email ?? ""}`.toLowerCase();
                  return hay.includes(q);
                })
              : bulkUsers;
            const allFilteredSelected = filtered.length > 0 && filtered.every((u) => bulkUserIds.includes(u.id));
            const toggle = (id: string) =>
              setBulkUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
            return (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pick one or many clients — the trade(s) will be applied to each.
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 h-10"
                      placeholder="Search name or email…"
                      value={bulkUserSearch}
                      onChange={(e) => setBulkUserSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (allFilteredSelected) {
                        const ids = new Set(filtered.map((u) => u.id));
                        setBulkUserIds((prev) => prev.filter((x) => !ids.has(x)));
                      } else {
                        setBulkUserIds((prev) => Array.from(new Set([...prev, ...filtered.map((u) => u.id)])));
                      }
                    }}
                    disabled={filtered.length === 0}
                  >
                    {allFilteredSelected ? "Unselect all" : "Select all"}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{filtered.length} client(s) shown</span>
                  <span className="font-semibold text-foreground">Selected: {bulkUserIds.length}</span>
                </div>

                <div className="max-h-[45vh] overflow-y-auto rounded-md border divide-y">
                  {filtered.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">No clients match.</div>
                  ) : (
                    filtered.map((u) => {
                      const checked = bulkUserIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40",
                            checked && "bg-primary/5"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={checked}
                            onChange={() => toggle(u.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{u.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setBulkStep("trade")}>← Back</Button>
                  <div className="flex-1" />
                  <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => {
                      if (!bulkUserIds.length) { toast.error("Select at least one client"); return; }
                      setBulkStep("review");
                    }}
                    disabled={!bulkUserIds.length}
                  >
                    Next →
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}

          {/* STEP 2: Add Trade */}
          {bulkStep === "trade" && (
            <div className="space-y-5">
              {bulkRows.length > 0 && (
                <div className="rounded-xl bg-success/5 border border-success/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <p className="text-sm font-semibold text-success">{bulkRows.length} trade(s) ready</p>
                  </div>
                  {bulkRows.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <span className="text-muted-foreground">
                        {bulkAssets.find(a => a.id === r.asset_id)?.symbol} · {r.direction.toUpperCase()} · €{r.size}
                        {r.status === "closed" ? ` · P&L €${r.pnl}` : " · OPEN"}
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10" onClick={() => setBulkRows(prev => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {/* Trade Status — Open or Closed */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-primary" /> Trade Status
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={bulkCurrentRow.status === "open" ? "default" : "outline"}
                      className="h-12 text-base font-semibold"
                      onClick={() => setBulkCurrentRow(r => ({ ...r, status: "open" }))}
                    >
                      Open Trade (still running)
                    </Button>
                    <Button
                      type="button"
                      variant={bulkCurrentRow.status === "closed" ? "default" : "outline"}
                      className="h-12 text-base font-semibold"
                      onClick={() => setBulkCurrentRow(r => ({ ...r, status: "closed" }))}
                    >
                      Closed Trade (with P&L)
                    </Button>
                  </div>
                </div>

                {/* Asset & Direction — big and obvious */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Tag className="h-4 w-4 text-primary" /> Asset
                    </Label>
                    <Select value={bulkCurrentRow.asset_id} onValueChange={v => setBulkCurrentRow(r => ({ ...r, asset_id: v }))}>
                      <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Pick asset..." /></SelectTrigger>
                      <SelectContent className="max-h-[60vh]">
                        {[
                          { type: "crypto", label: "🪙 Crypto" },
                          { type: "stock", label: "📈 Stocks" },
                          { type: "index", label: "🌐 Indices" },
                          { type: "commodity", label: "🛢️ Commodities" },
                        ].map(({ type, label }) => {
                          const group = bulkAssets.filter(a => a.type === type);
                          if (!group.length) return null;
                          return (
                            <SelectGroup key={type}>
                              <SelectLabel className="sticky top-0 z-10 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border-y border-primary/20 px-2 py-1.5">
                                {label} ({group.length})
                              </SelectLabel>
                              {group.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.symbol} — {a.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-primary" /> Direction
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={bulkCurrentRow.direction === "buy" ? "default" : "outline"}
                        className={cn("h-12 text-base font-semibold", bulkCurrentRow.direction === "buy" && "bg-success hover:bg-success/90 text-success-foreground")}
                        onClick={() => setBulkCurrentRow(r => ({ ...r, direction: "buy" }))}
                      >
                        <TrendingUp className="h-5 w-5 mr-2" /> BUY
                      </Button>
                      <Button
                        type="button"
                        variant={bulkCurrentRow.direction === "sell" ? "default" : "outline"}
                        className={cn("h-12 text-base font-semibold", bulkCurrentRow.direction === "sell" && "bg-destructive hover:bg-destructive/90 text-destructive-foreground")}
                        onClick={() => setBulkCurrentRow(r => ({ ...r, direction: "sell" }))}
                      >
                        <TrendingDown className="h-5 w-5 mr-2" /> SELL
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Size, Leverage (+ P&L when closed) */}
                <div className={cn("grid gap-4", bulkCurrentRow.status === "closed" ? "grid-cols-3" : "grid-cols-2")}>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-primary" /> Size (€)
                    </Label>
                    <Input className="h-12 text-base font-medium" type="number" value={bulkCurrentRow.size} onChange={e => setBulkCurrentRow(r => ({ ...r, size: e.target.value }))} placeholder="1000" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-primary" /> Leverage
                    </Label>
                    <Input className="h-12 text-base font-medium" type="number" value={bulkCurrentRow.leverage} onChange={e => setBulkCurrentRow(r => ({ ...r, leverage: e.target.value }))} min="1" placeholder="1" />
                  </div>
                  {bulkCurrentRow.status === "closed" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-primary" /> P&L (€)
                      </Label>
                      <Input className="h-12 text-base font-medium" type="number" value={bulkCurrentRow.pnl} onChange={e => setBulkCurrentRow(r => ({ ...r, pnl: e.target.value }))} placeholder="+50 or -100" />
                    </div>
                  )}
                </div>

                {/* Entry Price & (Close Date when closed / Open Date when open) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-muted-foreground" /> Entry Price
                      <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
                    </Label>
                    <Input className="h-12 text-base" type="number" value={bulkCurrentRow.entryPrice} onChange={e => setBulkCurrentRow(r => ({ ...r, entryPrice: e.target.value }))} placeholder="Auto from market" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      {bulkCurrentRow.status === "closed" ? "Close Date" : "Open Date"}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("h-12 w-full justify-start text-left text-base font-normal", !bulkCurrentRow.closedAt && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {bulkCurrentRow.closedAt ? format(bulkCurrentRow.closedAt, "PPP") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={bulkCurrentRow.closedAt} onSelect={d => d && setBulkCurrentRow(r => ({ ...r, closedAt: d }))} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Action buttons — big and clear */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="outline" onClick={() => setBulkOpen(false)} className="h-11">
                  Cancel
                </Button>
                <div className="flex-1" />
                <Button variant="secondary" onClick={addCurrentTradeAndContinue} className="h-11 text-sm font-semibold">
                  <Plus className="h-4 w-4 mr-1.5" /> Add & Next Trade
                </Button>
                <Button onClick={finishAndReview} className="h-11 text-sm font-semibold" disabled={bulkRows.length === 0 && !bulkCurrentRow.asset_id}>
                  Done <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {bulkStep === "review" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Applying <span className="font-semibold text-foreground">{bulkRows.length}</span> trade(s) to <span className="font-semibold text-foreground">{bulkUserIds.length} client(s)</span>
                <span className="text-xs text-muted-foreground"> — {bulkRows.length * bulkUserIds.length} total insert(s)</span>
              </p>
              {bulkUserIds.length > 0 && (
                <div className="rounded-md border p-2 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {bulkUserIds.map((id) => {
                      const u = bulkUsers.find((x) => x.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-xs gap-1">
                          {u?.full_name || u?.email || id.slice(0, 6)}
                          <button
                            type="button"
                            className="ml-1 text-muted-foreground hover:text-destructive"
                            onClick={() => setBulkUserIds((prev) => prev.filter((x) => x !== id))}
                            aria-label="Remove client"
                          >
                            ×
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="rounded-lg border divide-y">
                {bulkRows.map((r, i) => {
                  const assetSymbol = bulkAssets.find(a => a.id === r.asset_id)?.symbol ?? "—";
                  const pnlNum = Number(r.pnl);
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">#{i + 1}</span>
                        <span className="font-medium">{assetSymbol}</span>
                        <Badge variant={r.direction === "buy" ? "default" : "destructive"} className="text-xs capitalize">{r.direction}</Badge>
                        <Badge variant={r.status === "open" ? "secondary" : "outline"} className="text-xs uppercase">{r.status}</Badge>
                        <span className="text-muted-foreground">€{r.size} · {r.leverage}×</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.status === "closed" ? (
                          <span className={`font-semibold ${pnlNum >= 0 ? "text-success" : "text-destructive"}`}>
                            {pnlNum >= 0 ? "+" : ""}€{r.pnl}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Live P&L</span>
                        )}
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => {
                          setBulkRows(prev => prev.filter((_, j) => j !== i));
                          if (bulkRows.length <= 1) setBulkStep("trade");
                        }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-md bg-muted/50 p-2 text-sm">
                <span className="text-muted-foreground">Total wallet impact (closed only): </span>
                <span className="font-semibold">
                  €{bulkRows.filter(r => r.status === "closed").reduce((s, r) => s + Number(r.size) + Number(r.pnl), 0).toLocaleString()}
                </span>
              </div>
              <DialogFooter className="flex gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setBulkStep("trade")} size="sm">← Trades</Button>
                <Button variant="outline" onClick={() => setBulkStep("clients")} size="sm">← Clients</Button>
                <div className="flex-1" />
                <Button variant="outline" onClick={() => setBulkOpen(false)} size="sm">Cancel</Button>
                <Button onClick={submitBulkTrades} disabled={bulkSaving || bulkRows.length === 0 || bulkUserIds.length === 0} size="sm">
                  {bulkSaving ? "Creating..." : `Create ${bulkRows.length * bulkUserIds.length} Trade(s)`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTrades;
