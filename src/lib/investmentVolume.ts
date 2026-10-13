import { useEffect, useRef, useState } from "react";

// Global, deterministic investment-volume counter.
// Every visitor computes the same value from the same formula, so the
// number shown in the hero, About page, Thank-You page and stats grid
// all stay in sync — and it climbs by exactly €1.000.000.000 every
// 14 days from a fixed anchor.

export const VOLUME_ANCHOR_ISO = "2026-07-21T00:00:00Z";
export const VOLUME_ANCHOR_MS = Date.parse(VOLUME_ANCHOR_ISO);
export const VOLUME_ANCHOR_AMOUNT = 2_400_000_000; // €2,4 Mrd. baseline

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const RATE_PER_MS = 1_000_000_000 / TWO_WEEKS_MS; // ≈ 0.827 EUR / ms

export function getInvestmentVolumeAt(ts: number = Date.now()): number {
  const elapsed = Math.max(0, ts - VOLUME_ANCHOR_MS);
  return VOLUME_ANCHOR_AMOUNT + elapsed * RATE_PER_MS;
}

/**
 * Hook that returns the live-updating global investment volume.
 * Re-renders roughly every `intervalMs` (default 1s) so the display
 * ticks smoothly. The underlying value is deterministic — no random
 * drift between tabs or users.
 */
export function useInvestmentVolume(intervalMs = 1000): number {
  const [value, setValue] = useState(() => getInvestmentVolumeAt());
  useEffect(() => {
    const id = window.setInterval(() => setValue(getInvestmentVolumeAt()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return value;
}

/**
 * Hook that produces the volume as an animated integer along with a
 * stream of "+€X" bumps whenever the target advances. The advance is
 * still deterministic (from the global formula) — the bumps are just
 * visual flair for the hero counter.
 */
export interface VolumeBump {
  id: number;
  value: number;
  size: "small" | "medium" | "large";
}

export function useAnimatedInvestmentVolume(): {
  amount: number;
  bumps: VolumeBump[];
  flash: boolean;
} {
  const [amount, setAmount] = useState(() => Math.floor(getInvestmentVolumeAt()));
  const [bumps, setBumps] = useState<VolumeBump[]>([]);
  const [flash, setFlash] = useState(false);
  const displayedRef = useRef(amount);

  // Advance the displayed amount toward the deterministic target using
  // irregular, deposit-shaped jumps — like real client transactions
  // landing in the book. Each jump is a plausible deposit size (a few
  // hundred to a few hundred thousand euros) with random pauses between
  // them, so the number never crawls linearly but climbs the way a real
  // order book does.
  useEffect(() => {
    let timeoutId = 0;
    let cancelled = false;

    const scheduleNext = () => {
      // Pause between deposits: mostly quick, occasionally a lull.
      const wait = 400 + Math.random() * 2200;
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        const target = Math.floor(getInvestmentVolumeAt());
        const prev = displayedRef.current;
        const gap = target - prev;
        if (gap > 0) {
          // Pick a deposit-shaped increment.
          const roll = Math.random();
          let step: number;
          if (roll < 0.5) step = 200 + Math.floor(Math.random() * 4_800);         // 200 – 5k
          else if (roll < 0.82) step = 5_000 + Math.floor(Math.random() * 20_000); // 5k – 25k
          else if (roll < 0.96) step = 25_000 + Math.floor(Math.random() * 75_000);// 25k – 100k
          else step = 100_000 + Math.floor(Math.random() * 400_000);              // 100k – 500k
          // Round to a realistic amount.
          step = Math.round(step / 100) * 100;
          // Never overshoot the deterministic global target; if we're far
          // behind (e.g. tab was hidden), close the gap in a single jump.
          if (gap > step * 40) step = gap;
          const next = Math.min(target, prev + step);
          displayedRef.current = next;
          setAmount(next);
        }
        scheduleNext();
      }, wait);
    };
    scheduleNext();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  // Emit occasional bump chips so the counter feels alive.
  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      const wait = 9000 + Math.random() * 11000;
      window.setTimeout(() => {
        if (cancelled) return;
        const roll = Math.random();
        let increment: number;
        let size: VolumeBump["size"];
        if (roll < 0.55) {
          increment = Math.floor(500 + Math.random() * 11_500);
          size = "small";
        } else if (roll < 0.85) {
          increment = Math.floor(12_000 + Math.random() * 63_000);
          size = "medium";
        } else if (roll < 0.97) {
          increment = Math.floor(75_000 + Math.random() * 175_000);
          size = "large";
        } else {
          increment = Math.floor(250_000 + Math.random() * 250_000);
          size = "large";
        }
        increment = Math.round(increment / 100) * 100;
        const id = Date.now() + Math.random();
        setBumps((b) => [...b, { id, value: increment, size }]);
        setFlash(true);
        window.setTimeout(() => setFlash(false), 700);
        window.setTimeout(() => {
          setBumps((b) => b.filter((x) => x.id !== id));
        }, 2600);
        schedule();
      }, wait);
    };
    schedule();
    return () => {
      cancelled = true;
    };
  }, []);

  return { amount, bumps, flash };
}

/** Format the volume as an exact Euro string, e.g. "€2.400.000.000". */
export function formatVolumeFull(value: number, locale = "de-DE"): string {
  return "€" + Math.floor(value).toLocaleString(locale);
}

/**
 * Format as "€2,41 Mrd." (de) / "€2.41B" (en) — used in stats grids
 * and inline copy so those mentions grow together with the counter.
 */
export function formatVolumeMrd(value: number, lang: "de" | "en" = "de"): string {
  const bn = value / 1_000_000_000;
  if (lang === "en") {
    return "€" + bn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "B";
  }
  return "€" + bn.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Mrd.";
}

/** Same as `formatVolumeMrd` but with the "Milliarden" long form. */
export function formatVolumeMilliarden(value: number, lang: "de" | "en" = "de"): string {
  const bn = value / 1_000_000_000;
  if (lang === "en") {
    return "€" + bn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " billion";
  }
  return "€" + bn.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Milliarden";
}