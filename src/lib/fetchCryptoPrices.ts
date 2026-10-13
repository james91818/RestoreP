/**
 * Fetch crypto prices in EUR via the fetch-prices edge function (Binance).
 * Returns a map like { BTC: 63000, ETH: 2500, ... }
 */
const PRICES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-prices`;

const CRYPTO_SYMBOLS = [
  "BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "DOT", "LINK", "AVAX",
  "LTC", "ATOM", "NEAR", "APT", "SUI", "UNI",
];

export async function fetchCryptoPricesEur(
  symbols: string[] = CRYPTO_SYMBOLS,
): Promise<Record<string, number>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(PRICES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeout);
    if (!res || !res.ok) return {};
    const data = await res.json().catch(() => null) as
      | { prices?: Record<string, number>; fallback?: boolean }
      | null;
    return data?.prices ?? {};
  } catch {
    return {};
  }
}
