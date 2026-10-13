import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCryptoPricesEur } from "@/lib/fetchCryptoPrices";
import { fetchLivePrices, computeLivePnl } from "@/lib/tradePnl";
import { useAuth } from "@/hooks/useAuth";

const FIAT_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD"];

interface BalanceContextType {
  totalBalanceEur: number | null;
  inTradesEur: number;
  openTradesPnlEur: number;
  stakingEur: number;
  copyTradingEur: number;
  projectedBalanceEur: number | null;
  wallets: any[];
  cryptoPricesEur: Record<string, number>;
  refreshBalance: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType>({
  totalBalanceEur: null,
  inTradesEur: 0,
  openTradesPnlEur: 0,
  stakingEur: 0,
  copyTradingEur: 0,
  projectedBalanceEur: null,
  wallets: [],
  cryptoPricesEur: {},
  refreshBalance: async () => {},
});

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<any[]>([]);
  const [cryptoPricesEur, setCryptoPricesEur] = useState<Record<string, number>>({});
  const [totalBalanceEur, setTotalBalanceEur] = useState<number | null>(null);
  const [inTradesEur, setInTradesEur] = useState<number>(0);
  const [openTradesPnlEur, setOpenTradesPnlEur] = useState<number>(0);
  const [stakingEur, setStakingEur] = useState<number>(0);
  const [copyTradingEur, setCopyTradingEur] = useState<number>(0);
  const openTradesRef = useRef<any[]>([]);

  const recomputePnl = useCallback(async () => {
    const trades = openTradesRef.current;
    if (!trades.length) {
      setOpenTradesPnlEur(0);
      return;
    }
    const symbols = Array.from(new Set(trades.map((t: any) => t.symbol).filter(Boolean)));
    const prices = symbols.length ? await fetchLivePrices(symbols as string[]) : {};
    const pnl = trades.reduce((acc: number, t: any) => {
      const live = computeLivePnl(
        {
          entry_price: Number(t.entry_price),
          size: Number(t.size),
          leverage: Number(t.leverage ?? 1),
          direction: t.direction,
          pnl: t.pnl,
          status: t.status,
        },
        prices[t.symbol]
      );
      return acc + (Number.isFinite(live) ? live : 0);
    }, 0);
    setOpenTradesPnlEur(pnl);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!user) return;
    const [{ data }, prices, { data: openTrades }, { data: stakes }, { data: copySubs }] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).order("currency"),
      fetchCryptoPricesEur(),
      supabase
        .from("trades")
        .select("size, entry_price, leverage, direction, pnl, status, asset:assets(symbol)")
        .eq("user_id", user.id)
        .eq("status", "open"),
      supabase
        .from("user_stakes")
        .select("amount, rewards_earned, claimed")
        .eq("user_id", user.id)
        .eq("claimed", false),
      supabase
        .from("copy_subscriptions")
        .select("invested_capital")
        .eq("user_id", user.id)
        .eq("is_active", true),
    ]);
    const w = data ?? [];
    setWallets(w);
    setCryptoPricesEur(prices);
    const total = w.reduce((sum: number, wallet: any) => {
      const bal = Number(wallet.balance);
      if (FIAT_CURRENCIES.includes(wallet.currency)) return sum + bal;
      const rate = prices[wallet.currency];
      return sum + (rate ? bal * rate : bal);
    }, 0);
    setTotalBalanceEur(total);
    const trades = (openTrades ?? []).map((t: any) => ({
      ...t,
      symbol: t.asset?.symbol ?? null,
    }));
    openTradesRef.current = trades;
    setInTradesEur(trades.reduce((s: number, t: any) => s + Number(t.size || 0), 0));
    setStakingEur((stakes ?? []).reduce((s: number, st: any) => s + Number(st.amount || 0) + Number(st.rewards_earned || 0), 0));
    setCopyTradingEur(((copySubs as any[]) ?? []).reduce((s, r) => s + Number(r.invested_capital || 0), 0));
    recomputePnl();
  }, [user, recomputePnl]);

  useEffect(() => {
    refreshBalance();
    const interval = setInterval(() => {
      if (!document.hidden) refreshBalance();
    }, 60000);

    // Recompute live P&L every 5s using cached open trades
    const pnlInterval = setInterval(() => {
      if (!document.hidden) recomputePnl();
    }, 5000);

    if (!user) {
      return () => {
        clearInterval(interval);
        clearInterval(pnlInterval);
      };
    }

    const channel = supabase
      .channel("balance-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        () => { refreshBalance(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trades", filter: `user_id=eq.${user.id}` },
        () => { refreshBalance(); }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      clearInterval(pnlInterval);
      supabase.removeChannel(channel);
    };
  }, [refreshBalance, recomputePnl, user]);

  const projectedBalanceEur =
    totalBalanceEur === null ? null : totalBalanceEur + inTradesEur + openTradesPnlEur + stakingEur + copyTradingEur;

  return (
    <BalanceContext.Provider
      value={{
        totalBalanceEur,
        inTradesEur,
        openTradesPnlEur,
        stakingEur,
        copyTradingEur,
        projectedBalanceEur,
        wallets,
        cryptoPricesEur,
        refreshBalance,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  return useContext(BalanceContext);
}
