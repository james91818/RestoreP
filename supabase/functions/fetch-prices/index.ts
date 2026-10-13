import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Top 50 crypto symbols loaded into the platform. These are explicitly treated as
// crypto so they win over ambiguous Yahoo tickers (e.g. DAI = Daimler AG, CC = Cocoa).
const CRYPTO_SYMBOLS = new Set([
  "BTC", "ETH", "USDT", "BNB", "USDC", "XRP", "SOL", "TRX", "FIGR_HELOC", "HYPE",
  "DOGE", "USDS", "RAIN", "ZEC", "LEO", "WBT", "XLM", "XMR", "LINK", "ADA", "CC",
  "DAI", "BCH", "USD1", "USDE", "GRAM", "LTC", "USDG", "SUI", "USYC", "PYUSD",
  "HBAR", "AVAX", "CRO", "BUIDL", "NEAR", "SHIB", "XAUT", "USDY", "UNI", "TAO",
  "WLFI", "PAXG", "OKB", "ONDO", "ASTER", "HTX", "M", "DEXE", "RLUSD",
]);

// Valid Binance EUR spot pairs (kept in sync with the exchange)
const BINANCE_PAIRS: Record<string, string> = {
  BTC: "BTCEUR",
  ETH: "ETHEUR",
  SOL: "SOLEUR",
  XRP: "XRPEUR",
  BNB: "BNBEUR",
  DOGE: "DOGEEUR",
  ADA: "ADAEUR",
  DOT: "DOTEUR",
  LINK: "LINKEUR",
  AVAX: "AVAXEUR",
  LTC: "LTCEUR",
  ATOM: "ATOMEUR",
  NEAR: "NEAREUR",
  APT: "APTEUR",
  SUI: "SUIEUR",
  SHIB: "SHIBEUR",
  PEPE: "PEPEEUR",
  RENDER: "RENDEREUR",
  POL: "POLEUR",
  WLD: "WLDEUR",
  ICP: "ICPEUR",
  VET: "VETEUR",
  TRX: "TRXEUR",
  XLM: "XLMEUR",
  BCH: "BCHEUR",
  WLFI: "WLFIEUR",
  EGLD: "EGLDEUR",
  WIN: "WINEUR",
  SEUR: "SEUR",
};

const YAHOO_STOCK_SYMBOLS: Record<string, string> = {
  AAPL: "AAPL",
  MSFT: "MSFT",
  AMZN: "AMZN",
  GOOGL: "GOOGL",
  META: "META",
  TSLA: "TSLA",
  NVDA: "NVDA",
  JPM: "JPM",
  V: "V",
  JNJ: "JNJ",
  WMT: "WMT",
  PG: "PG",
  DIS: "DIS",
  NFLX: "NFLX",
  KO: "KO",
  PEP: "PEP",
  MCD: "MCD",
  VZ: "VZ",
  INTC: "INTC",
  AMD: "AMD",
  BA: "BA",
  IBM: "IBM",
  GE: "GE",
  F: "F",
  TSM: "TSM",
  BABA: "BABA",
  TCEHY: "TCEHY",
  SAP: "SAP.DE",
  SIE: "SIE.DE",
  DAI: "DAI.DE",
  AIR: "AIR.PA",
  MC: "MC.PA",
  OR: "OR.PA",
  NESN: "NESN.SW",
  ROG: "ROG.SW",
  UBS: "UBS",
  CS: "CSGN.SW",
  NVO: "NVO",
  ASML: "ASML",
  SHELL: "SHEL.L",
  BP: "BP",
  TTE: "TTE.PA",
  ENEL: "ENEL.MI",
  SAN: "SAN",
  BBVA: "BBVA",
  ISP: "ISP.MI",
  BNP: "BNP.PA",
};

const YAHOO_INDEX_SYMBOLS: Record<string, string> = {
  "SPX": "^GSPC",
  "SP500": "^GSPC",
  "US500": "^GSPC",
  "NDX": "^NDX",
  "US100": "^NDX",
  "NAS100": "^NDX",
  "DJI": "^DJI",
  "US30": "^DJI",
  "DAX": "^GDAXI",
  "DE40": "^GDAXI",
  "UK100": "^FTSE",
  "FTSE": "^FTSE",
  "FRA40": "^FCHI",
  "CAC": "^FCHI",
  "EU50": "^STOXX50E",
  "JP225": "^N225",
  "NIKKEI": "^N225",
  "HK50": "^HSI",
  "HSI": "^HSI",
  "AU200": "^AXJO",
  "ASX200": "^AXJO",
  "EURUSD": "EURUSD=X",
  "GBPUSD": "GBPUSD=X",
  "USDJPY": "USDJPY=X",
  "AUDUSD": "AUDUSD=X",
  "USDCHF": "USDCHF=X",
  "USDCAD": "USDCAD=X",
  "NZDUSD": "NZDUSD=X",
  "EURGBP": "EURGBP=X",
};

const YAHOO_COMMODITY_SYMBOLS: Record<string, string> = {
  GOLD: "GC=F",
  XAUUSD: "GC=F",
  SILVER: "SI=F",
  XAGUSD: "SI=F",
  PLATINUM: "PL=F",
  XPTUSD: "PL=F",
  PALLADIUM: "PA=F",
  XPDUSD: "PA=F",
  OIL: "CL=F",
  CRUDEOIL: "CL=F",
  WTI: "CL=F",
  BRENT: "BZ=F",
  NATGAS: "NG=F",
  COPPER: "HG=F",
  WHEAT: "ZW=F",
  CORN: "ZC=F",
  SOYBEAN: "ZS=F",
  SUGAR: "SB=F",
  COCOA: "CC=F",
  COTTON: "CT=F",
  COFFEE: "KC=F",
  LUMBER: "LBS=F",
  ORANGE: "OJ=F",
  ALI: "ALI=F",
};

const EUR_DENOMINATED_COMMODITIES = new Set([
  "GC=F", "SI=F", "PA=F", "PL=F", "CL=F", "BZ=F", "NG=F", "HG=F",
  "ZW=F", "ZC=F", "ZS=F", "SB=F", "CC=F", "CT=F", "KC=F", "LBS=F", "OJ=F",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanSymbol(symbol: string) {
  return symbol.replace(/\/.*$/, "").toUpperCase();
}

async function fetchUsdEur(): Promise<number> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1m&range=1d",
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return 1;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const close = result?.meta?.regularMarketPrice ?? result?.meta?.previousClose ?? 1;
    return Number(close) || 1;
  } catch (e) {
    console.error("USD/EUR fetch error", e);
    return 1;
  }
}

async function fetchCryptoPrice(symbol: string, pair: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return parseFloat(data.price);
  } catch (e) {
    console.error("Binance single price error", symbol, pair, e);
    return null;
  }
}

async function fetchBinancePrices(
  symbols: string[],
  usdEur: number,
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  // 1) EUR-denominated pairs
  const eurEntries = symbols
    .map((symbol) => {
      const base = cleanSymbol(symbol);
      const pair = BINANCE_PAIRS[base];
      return pair ? { symbol, base, pair } : null;
    })
    .filter((entry): entry is { symbol: string; base: string; pair: string } =>
      Boolean(entry)
    );

  if (eurEntries.length > 0) {
    const querySymbols = JSON.stringify(eurEntries.map((e) => e.pair));
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(querySymbols)}`,
        { headers: { Accept: "application/json" } },
      );
      if (res.ok) {
        const data = await res.json();
        for (const item of data) {
          const entry = eurEntries.find((e) => e.pair === item.symbol);
          if (entry) prices[entry.symbol] = parseFloat(item.price);
        }
      }
    } catch (e) {
      console.error("Binance EUR batch error", e);
    }

    const missing = eurEntries.filter((e) => !(e.symbol in prices));
    for (const entry of missing) {
      try {
        const price = await fetchCryptoPrice(entry.symbol, entry.pair);
        if (price !== null) prices[entry.symbol] = price;
      } catch (e) {
        console.error("Binance EUR single error", entry.symbol, e);
      }
    }
  }

  // 2) USDT fallback for symbols without a EUR pair
  const usdtCandidates = symbols
    .map((symbol) => ({ symbol, base: cleanSymbol(symbol) }))
    .filter((e) => !(e.symbol in prices) && !eurEntries.some((ee) => ee.symbol === e.symbol));

  for (const candidate of usdtCandidates) {
    try {
      const pair = `${candidate.base}USDT`;
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
        { headers: { Accept: "application/json" } },
      );
      if (res.ok) {
        const data = await res.json();
        const price = parseFloat(data.price);
        if (!isNaN(price)) prices[candidate.symbol] = price * usdEur;
      }
    } catch (e) {
      console.error("Binance USDT fallback error", candidate.symbol, e);
    }
  }

  return prices;
}

async function fetchYahooBatch(
  yahooSymbols: string[],
  usdEur: number,
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  if (yahooSymbols.length === 0) return prices;

  const maxChunk = 50;
  for (let i = 0; i < yahooSymbols.length; i += maxChunk) {
    const chunk = yahooSymbols.slice(i, i + maxChunk);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${chunk.join(",")}?interval=1m&range=1d`;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const data = await res.json();
      for (const result of data?.chart?.result ?? []) {
        const meta = result.meta;
        const yahooSymbol = meta.symbol;
        const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
        const currency = (meta.currency || "USD").toUpperCase();
        const needsConversion = currency === "USD" || currency === "GBP" || currency === "JPY" || currency === "CHF" || currency === "AUD" || currency === "CAD" || currency === "NZD";
        const converted = needsConversion ? price * usdEur : price;
        prices[yahooSymbol] = converted;
      }
    } catch (e) {
      console.error("Yahoo batch error", e);
    }
  }
  return prices;
}

async function fetchStockIndexPrices(
  symbols: string[],
  usdEur: number,
): Promise<Record<string, number>> {
  const yahooMap = new Map<string, string>();
  const yahooSymbols: string[] = [];
  for (const symbol of symbols) {
    const clean = cleanSymbol(symbol);
    const yahoo = YAHOO_STOCK_SYMBOLS[clean] || YAHOO_INDEX_SYMBOLS[clean];
    if (yahoo && !yahooMap.has(yahoo)) {
      yahooMap.set(yahoo, symbol);
      yahooSymbols.push(yahoo);
    }
  }
  const yahooPrices = await fetchYahooBatch(yahooSymbols, usdEur);
  const prices: Record<string, number> = {};
  for (const [yahoo, original] of yahooMap) {
    const price = yahooPrices[yahoo];
    if (price !== undefined) prices[original] = price;
  }
  return prices;
}

async function fetchCommodityPrices(
  symbols: string[],
  usdEur: number,
): Promise<Record<string, number>> {
  const yahooMap = new Map<string, string>();
  const yahooSymbols: string[] = [];
  for (const symbol of symbols) {
    const clean = cleanSymbol(symbol);
    const yahoo = YAHOO_COMMODITY_SYMBOLS[clean];
    if (yahoo && !yahooMap.has(yahoo)) {
      yahooMap.set(yahoo, symbol);
      yahooSymbols.push(yahoo);
    }
  }
  const yahooPrices = await fetchYahooBatch(yahooSymbols, usdEur);
  const prices: Record<string, number> = {};
  for (const [yahoo, original] of yahooMap) {
    const price = yahooPrices[yahoo];
    if (price !== undefined) prices[original] = price;
  }
  return prices;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();
    const symbolsArray = symbols ? [...new Set(symbols)] : [];

    const cryptoSymbols = symbolsArray.filter((s) => {
      const clean = cleanSymbol(s);
      if (CRYPTO_SYMBOLS.has(clean)) return true;
      return (
        !YAHOO_STOCK_SYMBOLS[clean] &&
        !YAHOO_INDEX_SYMBOLS[clean] &&
        !YAHOO_COMMODITY_SYMBOLS[clean]
      );
    });
    const stockSymbols = symbolsArray.filter(
      (s) => !cryptoSymbols.includes(s) && YAHOO_STOCK_SYMBOLS[cleanSymbol(s)],
    );
    const indexSymbols = symbolsArray.filter(
      (s) => !cryptoSymbols.includes(s) && YAHOO_INDEX_SYMBOLS[cleanSymbol(s)],
    );
    const commoditySymbols = symbolsArray.filter(
      (s) => !cryptoSymbols.includes(s) && YAHOO_COMMODITY_SYMBOLS[cleanSymbol(s)],
    );

    const hasNonEurCommodity = commoditySymbols.some(
      (s) => !EUR_DENOMINATED_COMMODITIES.has(YAHOO_COMMODITY_SYMBOLS[cleanSymbol(s)]),
    );
    const hasCryptoWithoutEurPair = cryptoSymbols.some(
      (s) => !BINANCE_PAIRS[cleanSymbol(s)],
    );
    const needsUsdEur =
      stockSymbols.length > 0 ||
      indexSymbols.length > 0 ||
      hasNonEurCommodity ||
      hasCryptoWithoutEurPair;
    const usdEur = needsUsdEur ? await fetchUsdEur() : 1;

    const results: Record<string, number> = {};
    if (cryptoSymbols.length > 0) {
      Object.assign(results, await fetchBinancePrices(cryptoSymbols, usdEur));
    }
    if (stockSymbols.length > 0 || indexSymbols.length > 0) {
      Object.assign(results, await fetchStockIndexPrices([...stockSymbols, ...indexSymbols], usdEur));
    }
    if (commoditySymbols.length > 0) {
      Object.assign(results, await fetchCommodityPrices(commoditySymbols, usdEur));
    }

    return new Response(JSON.stringify({ prices: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-prices error", error);
    return new Response(JSON.stringify({ prices: {}, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
