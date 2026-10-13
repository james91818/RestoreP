// Default timezones used across the app
export const STAFF_DEFAULT_TZ = "Asia/Jerusalem";
export const CLIENT_DEFAULT_TZ = "Europe/Berlin";

/** Returns the staff member's preferred timezone (Israel by default). */
export const getStaffTz = (): string =>
  localStorage.getItem("staff_timezone") || STAFF_DEFAULT_TZ;

/** Returns the timezone we display client-side times in (Germany by default). */
export const getClientTz = (): string => CLIENT_DEFAULT_TZ;

/**
 * Converts a date (yyyy-MM-dd) + time (HH:mm) interpreted in `tz`
 * to a real UTC ISO string. Works without external deps by using the
 * difference between the wall-clock time and the same instant rendered in `tz`.
 */
export function zonedDateTimeToUTC(dateStr: string, timeStr: string, tz: string): string {
  // Build a date as if the wall-clock values were UTC.
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const utcGuess = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0);

  // What does that instant look like when rendered in `tz`? Compute the offset.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcGuess));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  const asUtcOfTz = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offsetMs = asUtcOfTz - utcGuess;

  return new Date(utcGuess - offsetMs).toISOString();
}

/** Format an ISO string as HH:mm in the given timezone. */
export function formatTimeInTz(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit",
  });
}

/** Calendar day key (yyyy-MM-dd) of an instant, as seen in the given timezone. */
export function dateKeyInTz(iso: string, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Short tz label, e.g. "Jerusalem" from "Asia/Jerusalem". */
export const tzLabel = (tz: string) => tz.split("/").pop()?.replace(/_/g, " ") ?? tz;

/** Format an ISO string as dd.MM.yyyy HH:mm (24h) in the given timezone. */
export function formatDateTimeInTz(iso: string, tz: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("de-DE", {
    timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric",
  });
  return `${date} ${formatTimeInTz(iso, tz)}`;
}

/** Format an ISO string as a long weekday date (24h aware) in the given timezone. */
export function formatLongDateInTz(iso: string, tz: string, locale = "de-DE"): string {
  return new Date(iso).toLocaleDateString(locale, {
    timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
