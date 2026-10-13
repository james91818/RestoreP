const TRADINGVIEW_SYMBOL_MAP: Record<string, string> = {
  "BTC/EUR": "BITSTAMP:BTCEUR",
  "ETH/EUR": "BITSTAMP:ETHEUR",
  "SOL/EUR": "BINANCE:SOLEUR",
  "XRP/EUR": "KRAKEN:XRPEUR",
  "BNB/EUR": "BINANCE:BNBEUR",
  "DOGE/EUR": "BINANCE:DOGEEUR",
  "ADA/EUR": "KRAKEN:ADAEUR",
  "DOT/EUR": "KRAKEN:DOTEUR",
  "LINK/EUR": "BINANCE:LINKEUR",
  "AVAX/EUR": "BINANCE:AVAXEUR",
  "APT/EUR": "BINANCE:APTEUR",
  "LTC/EUR": "BITSTAMP:LTCEUR",
  "MATIC/EUR": "BINANCE:POLEUR",
  "POL/EUR": "BINANCE:POLEUR",
  "SHIB/EUR": "BINANCE:SHIBEUR",
  "TRX/EUR": "BINANCE:TRXEUR",
  "ATOM/EUR": "KRAKEN:ATOMEUR",
  "UNI/EUR": "KRAKEN:UNIEUR",
  "XLM/EUR": "KRAKEN:XLMEUR",
  "BCH/EUR": "BITSTAMP:BCHEUR",
  "ETC/EUR": "KRAKEN:ETCEUR",
  "FIL/EUR": "KRAKEN:FILEUR",
  "NEAR/EUR": "KRAKEN:NEAREUR",
  "ARB/EUR": "BINANCE:ARBEUR",
  "OP/EUR": "BINANCE:OPEUR",
  "SUI/EUR": "BINANCE:SUIEUR",
  "ICP/EUR": "KRAKEN:ICPEUR",
  "ALGO/EUR": "KRAKEN:ALGOEUR",
  "AAVE/EUR": "KRAKEN:AAVEEUR",
  "MKR/EUR": "KRAKEN:MKREUR",
  "SAND/EUR": "BINANCE:SANDEUR",
  "MANA/EUR": "KRAKEN:MANAEUR",
  "AXS/EUR": "BINANCE:AXSEUR",
  "PEPE/EUR": "BINANCE:PEPEEUR",
  "WIF/EUR": "BINANCE:WIFEUR",
  "BONK/EUR": "BINANCE:BONKEUR",
  "INJ/EUR": "BINANCE:INJEUR",
  "TIA/EUR": "BINANCE:TIAEUR",
  "RNDR/EUR": "BINANCE:RNDREUR",
  "RENDER/EUR": "BINANCE:RENDEREUR",
  "FET/EUR": "BINANCE:FETEUR",
  "LDO/EUR": "BINANCE:LDOEUR",
  "IMX/EUR": "BINANCE:IMXEUR",
  "GRT/EUR": "KRAKEN:GRTEUR",
  BTC: "BITSTAMP:BTCEUR",
  LTC: "BITSTAMP:LTCEUR",
  LITECOIN: "BITSTAMP:LTCEUR",
  MATIC: "BINANCE:POLEUR",
  POL: "BINANCE:POLEUR",
  POLYGON: "BINANCE:POLEUR",
  SHIB: "BINANCE:SHIBEUR",
  SHIBA: "BINANCE:SHIBEUR",
  TRX: "BINANCE:TRXEUR",
  TRON: "BINANCE:TRXEUR",
  ATOM: "KRAKEN:ATOMEUR",
  COSMOS: "KRAKEN:ATOMEUR",
  UNI: "KRAKEN:UNIEUR",
  UNISWAP: "KRAKEN:UNIEUR",
  XLM: "KRAKEN:XLMEUR",
  STELLAR: "KRAKEN:XLMEUR",
  BCH: "BITSTAMP:BCHEUR",
  ETC: "KRAKEN:ETCEUR",
  FIL: "KRAKEN:FILEUR",
  FILECOIN: "KRAKEN:FILEUR",
  NEAR: "KRAKEN:NEAREUR",
  ARB: "BINANCE:ARBEUR",
  ARBITRUM: "BINANCE:ARBEUR",
  OP: "BINANCE:OPEUR",
  OPTIMISM: "BINANCE:OPEUR",
  SUI: "BINANCE:SUIEUR",
  ICP: "KRAKEN:ICPEUR",
  ALGO: "KRAKEN:ALGOEUR",
  ALGORAND: "KRAKEN:ALGOEUR",
  AAVE: "KRAKEN:AAVEEUR",
  MKR: "KRAKEN:MKREUR",
  MAKER: "KRAKEN:MKREUR",
  SAND: "BINANCE:SANDEUR",
  SANDBOX: "BINANCE:SANDEUR",
  MANA: "KRAKEN:MANAEUR",
  DECENTRALAND: "KRAKEN:MANAEUR",
  AXS: "BINANCE:AXSEUR",
  PEPE: "BINANCE:PEPEEUR",
  WIF: "BINANCE:WIFEUR",
  BONK: "BINANCE:BONKEUR",
  INJ: "BINANCE:INJEUR",
  INJECTIVE: "BINANCE:INJEUR",
  TIA: "BINANCE:TIAEUR",
  CELESTIA: "BINANCE:TIAEUR",
  RNDR: "BINANCE:RNDREUR",
  RENDER: "BINANCE:RENDEREUR",
  FET: "BINANCE:FETEUR",
  LDO: "BINANCE:LDOEUR",
  IMX: "BINANCE:IMXEUR",
  GRT: "KRAKEN:GRTEUR",
  ETH: "BITSTAMP:ETHEUR",
  SOL: "BINANCE:SOLEUR",
  XRP: "KRAKEN:XRPEUR",
  BNB: "BINANCE:BNBEUR",
  DOGE: "BINANCE:DOGEEUR",
  ADA: "KRAKEN:ADAEUR",
  DOT: "KRAKEN:DOTEUR",
  LINK: "BINANCE:LINKEUR",
  AVAX: "BINANCE:AVAXEUR",
  APT: "BINANCE:APTEUR",
  APTOS: "BINANCE:APTEUR",
  AAPL: "NASDAQ:AAPL",
  TSLA: "NASDAQ:TSLA",
  NVDA: "NASDAQ:NVDA",
  AMZN: "NASDAQ:AMZN",
  MSFT: "NASDAQ:MSFT",
  GOOGL: "NASDAQ:GOOGL",
  META: "NASDAQ:META",
  AMD: "NASDAQ:AMD",
  NFLX: "NASDAQ:NFLX",
  JPM: "NYSE:JPM",
  V: "NYSE:V",
  DIS: "NYSE:DIS",
  WMT: "NYSE:WMT",
  COIN: "NASDAQ:COIN",
  COINBASE: "NASDAQ:COIN",
  MSTR: "NASDAQ:MSTR",
  PYPL: "NASDAQ:PYPL",
  INTC: "NASDAQ:INTC",
  ORCL: "NYSE:ORCL",
  CRM: "NYSE:CRM",
  BA: "NYSE:BA",
  KO: "NYSE:KO",
  PEP: "NASDAQ:PEP",
  MCD: "NYSE:MCD",
  NKE: "NYSE:NKE",
  SBUX: "NASDAQ:SBUX",
  UBER: "NYSE:UBER",
  ABNB: "NASDAQ:ABNB",
  SHOP: "NYSE:SHOP",
  SNOW: "NYSE:SNOW",
  SNOWFLAKE: "NYSE:SNOW",
  PLTR: "NASDAQ:PLTR",
  XYZ: "NYSE:XYZ",
  BLOCK: "NYSE:XYZ",
  SQ: "NYSE:XYZ",
  GOLD: "OANDA:XAUUSD",
  SILVER: "OANDA:XAGUSD",
  XAU: "OANDA:XAUUSD",
  XAG: "OANDA:XAGUSD",
  "XAU/EUR": "OANDA:XAUEUR",
  "XAG/EUR": "OANDA:XAGEUR",
  "XPT/EUR": "TVC:PLATINUM",
  "XPD/EUR": "TVC:PALLADIUM",
  XPT: "TVC:PLATINUM",
  XPD: "TVC:PALLADIUM",
  WTI: "TVC:USOIL",
  OIL: "TVC:USOIL",
  USOIL: "TVC:USOIL",
  "WTI ÖL": "TVC:USOIL",
  UKOIL: "TVC:UKOIL",
  BRENT: "TVC:UKOIL",
  "BRENT ÖL": "TVC:UKOIL",
  GAS: "CAPITALCOM:NATURALGAS",
  ERDGAS: "CAPITALCOM:NATURALGAS",
  NATGAS: "CAPITALCOM:NATURALGAS",
  KUPFER: "CAPITALCOM:COPPER",
  COPPER: "CAPITALCOM:COPPER",
  PLATIN: "TVC:PLATINUM",
  PLATINUM: "TVC:PLATINUM",
  PALLADIUM: "TVC:PALLADIUM",
  WEIZEN: "CAPITALCOM:WHEAT",
  WHEAT: "CAPITALCOM:WHEAT",
  CORN: "CAPITALCOM:CORN",
  MAIS: "CAPITALCOM:CORN",
  KAFFEE: "CAPITALCOM:COFFEE",
  COFFEE: "CAPITALCOM:COFFEE",
  ZUCKER: "CAPITALCOM:SUGARNY",
  SUGAR: "CAPITALCOM:SUGARNY",
  BAUMWOLLE: "CAPITALCOM:COTTON",
  COTTON: "CAPITALCOM:COTTON",
  SPX500: "TVC:SPX",
  SP500: "TVC:SPX",
  SPX: "TVC:SPX",
  "S&P 500": "TVC:SPX",
  "S&P500": "TVC:SPX",
  NAS100: "NASDAQ:NDX",
  NAS100EUR: "NASDAQ:NDX",
  "NASDAQ 100": "NASDAQ:NDX",
  NASDAQ100: "NASDAQ:NDX",
  NDX: "NASDAQ:NDX",
  US100: "NASDAQ:NDX",
  "OANDA:NAS100EUR": "NASDAQ:NDX",
  "INDEX:NDX": "NASDAQ:NDX",
  "TVC:NDX": "NASDAQ:NDX",
  DAX40: "INDEX:DEU40",
  DAX: "INDEX:DEU40",
  DEU40: "INDEX:DEU40",
  GER40: "INDEX:DEU40",
  DE40: "INDEX:DEU40",
  "DAX 40": "INDEX:DEU40",
  "INDEX:DEU40": "INDEX:DEU40",
  "TVC:DEU40": "INDEX:DEU40",
  DOW: "TVC:DJI",
  DJI: "TVC:DJI",
  FTSE100: "FTSE:UKX",
  FTSE: "FTSE:UKX",
  UK100: "FTSE:UKX",
  UKX: "FTSE:UKX",
  "FTSE 100": "FTSE:UKX",
  "INDEX:UKX": "FTSE:UKX",
  "TVC:UKX": "FTSE:UKX",
  NI225: "INDEX:NKY",
  NIKKEI: "INDEX:NKY",
  NIKKEI225: "INDEX:NKY",
  NKY: "INDEX:NKY",
  "JAPAN 225": "INDEX:NKY",
  "JAPAN225": "INDEX:NKY",
  "INDEX:NKY": "INDEX:NKY",
  CAC40: "FXOPEN:FCHI",
  CAC: "FXOPEN:FCHI",
  FCHI: "FXOPEN:FCHI",
  "CAC 40": "FXOPEN:FCHI",
  "TVC:CAC40": "FXOPEN:FCHI",
  "INDEX:CAC40": "FXOPEN:FCHI",
  STOXX50: "INDEX:STOXX50E",
  STOXX: "INDEX:STOXX50E",
  SX5E: "INDEX:STOXX50E",
  EUROSTOXX50: "INDEX:STOXX50E",
  "EURO STOXX 50": "INDEX:STOXX50E",
  "INDEX:STOXX50E": "INDEX:STOXX50E",
  "TVC:SX5E": "INDEX:STOXX50E",
};

const CRYPTO_EXCHANGE_PREFIXES = new Set([
  "BITSTAMP",
  "BINANCE",
  "KRAKEN",
  "COINBASE",
  "BYBIT",
  "OKX",
  "KUCOIN",
  "GATEIO",
  "MEXC",
]);

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\s+/g, " ");
}

function stripQuoteSuffix(symbol: string) {
  return symbol.replace(/[\/_:\-.]?(EUR|USD|USDT)$/i, "").trim();
}

function extractBaseTicker(symbol: string) {
  const stripped = stripQuoteSuffix(symbol);
  const parts = stripped
    .toUpperCase()
    .split(/[\s/:._-]+/)
    .filter(Boolean);

  return parts[0] ?? stripped.toUpperCase().trim();
}

export function resolveTradingViewSymbol(symbol: string): string {
  const normalized = normalizeSymbol(symbol);
  const stripped = normalizeSymbol(stripQuoteSuffix(symbol));
  const qualifiedPrefix = normalized.includes(":")
    ? normalizeSymbol(normalized.split(":")[0] ?? "")
    : "";
  const qualifiedSymbol = normalized.includes(":")
    ? normalizeSymbol(normalized.split(":").slice(-1)[0] ?? "")
    : "";
  const strippedQualified = qualifiedSymbol ? normalizeSymbol(stripQuoteSuffix(qualifiedSymbol)) : "";
  const compact = symbol.trim().toUpperCase().replace(/[\s/]+/g, "");
  const baseTicker = extractBaseTicker(symbol).replace(/[^A-Z0-9]/g, "");
  const qualifiedBaseTicker = qualifiedSymbol
    ? extractBaseTicker(qualifiedSymbol).replace(/[^A-Z0-9]/g, "")
    : "";
  const fallbackTicker = qualifiedBaseTicker || baseTicker;
  const allowQualifiedPassthrough =
    /^[A-Z0-9!._-]+:[A-Z0-9!._-]+$/.test(normalized) &&
    !(
      qualifiedPrefix &&
      CRYPTO_EXCHANGE_PREFIXES.has(qualifiedPrefix) &&
      /^[A-Z]{1,5}$/.test(fallbackTicker)
    );

  // Safer fallback: route unknown alphabetic tickers to NASDAQ instead of BITSTAMP (which is crypto-only)
  const fallback = /^[A-Z]{1,5}$/.test(fallbackTicker) ? `NASDAQ:${fallbackTicker}` : compact;

  return (
    TRADINGVIEW_SYMBOL_MAP[normalized] ||
    TRADINGVIEW_SYMBOL_MAP[stripped] ||
    TRADINGVIEW_SYMBOL_MAP[qualifiedSymbol] ||
    TRADINGVIEW_SYMBOL_MAP[strippedQualified] ||
    TRADINGVIEW_SYMBOL_MAP[qualifiedBaseTicker] ||
    TRADINGVIEW_SYMBOL_MAP[baseTicker] ||
    (allowQualifiedPassthrough ? normalized : "") ||
    fallback
  );
}
