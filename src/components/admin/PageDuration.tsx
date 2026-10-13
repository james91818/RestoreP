import { useEffect, useState } from "react";

/**
 * Renders a live "time on page" counter that ticks every second WITHOUT
 * forcing the parent component to re-render. Keep this isolated so heavy
 * pages (like AdminUserDetail) don't reflow inputs/dropdowns every second.
 */
const PageDuration = ({ sinceIso }: { sinceIso: string | null }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!sinceIso) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [sinceIso]);

  if (!sinceIso) return null;

  const secs = Math.max(0, Math.floor((Date.now() - new Date(sinceIso).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const text = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;

  return <span className="opacity-75">· {text}</span>;
};

export default PageDuration;
