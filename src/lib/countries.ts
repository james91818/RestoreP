// Country list with ISO-2 code, English name, and flag emoji.
// Stored value in DB is the English name (e.g. "Germany") to keep it human-readable.
// `normalizeCountry` accepts a legacy 2-letter code or any name and returns the canonical English name.

export type Country = { code: string; name: string; flag: string };

export const COUNTRIES: Country[] = [
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "LI", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
];

const byCode = new Map(COUNTRIES.map(c => [c.code.toUpperCase(), c]));
const byName = new Map(COUNTRIES.map(c => [c.name.toLowerCase(), c]));

export function findCountry(value?: string | null): Country | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (v.length === 2) return byCode.get(v.toUpperCase());
  return byName.get(v.toLowerCase());
}

export function normalizeCountry(value?: string | null): string {
  return findCountry(value)?.name ?? (value ?? "");
}

export function countryFlag(value?: string | null): string {
  return findCountry(value)?.flag ?? "";
}

export function countryLabel(value?: string | null): string {
  const c = findCountry(value);
  if (c) return `${c.flag} ${c.name}`;
  return value ?? "";
}
