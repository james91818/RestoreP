const AUSTRIA_TOKENS = new Set(["at", "aut", "austria", "osterreich"]);
const GEO_SUCCESS_CACHE_KEY = "welcome:is-austrian-geo";

const normalizeCountryValue = (value?: string | null) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

export const matchesAustria = (value?: string | null) =>
  AUSTRIA_TOKENS.has(normalizeCountryValue(value));

export const getImmediateAustriaHint = () => {
  if (typeof window === "undefined") return false;

  const atOverride = new URLSearchParams(window.location.search).get("at") === "1";
  if (atOverride) return true;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezone === "Europe/Vienna") return true;

  const locales = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
  return locales.some((locale) => /(?:^|[-_])AT(?:$|[-_])/i.test(locale));
};

let geoLookupPromise: Promise<boolean> | null = null;
let cachedGeoResult: boolean | null = null;

const fetchWithTimeout = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`Location lookup failed: ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const detectAustriaByGeo = async () => {
  if (typeof window === "undefined") return false;

  try {
    if (window.sessionStorage.getItem(GEO_SUCCESS_CACHE_KEY) === "1") return true;
  } catch {
    // Ignore storage access issues.
  }

  const providers = [
    async () => {
      const data = await fetchWithTimeout("https://ipapi.co/json/");
      return matchesAustria(data?.country_code) || matchesAustria(data?.country_name) || matchesAustria(data?.country);
    },
    async () => {
      const data = await fetchWithTimeout("https://ipwho.is/");
      return matchesAustria(data?.country_code) || matchesAustria(data?.country);
    },
  ];

  for (const provider of providers) {
    try {
      const isAustrian = await provider();
      if (isAustrian) {
        try {
          window.sessionStorage.setItem(GEO_SUCCESS_CACHE_KEY, "1");
        } catch {
          // Ignore storage access issues.
        }
        return true;
      }
    } catch {
      // Try the next provider.
    }
  }

  return false;
};

export const detectAustria = async (country?: string | null) => {
  // URL override always wins (testing / explicit AT link)
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("at") === "1") {
    return true;
  }
  // Profile country says AT → AT version
  if (matchesAustria(country)) return true;

  // Browser hints (timezone Europe/Vienna, *-AT locale) → AT version
  if (getImmediateAustriaHint()) return true;

  // Fall back to IP-based geo lookup so AT visitors who landed via a non-AT
  // affiliate (or with no country on file) still get redirected to the AT version.
  if (cachedGeoResult !== null) return cachedGeoResult;

  if (!geoLookupPromise) {
    geoLookupPromise = detectAustriaByGeo().then((result) => {
      cachedGeoResult = result;
      geoLookupPromise = null;
      return result;
    });
  }

  return geoLookupPromise;
};