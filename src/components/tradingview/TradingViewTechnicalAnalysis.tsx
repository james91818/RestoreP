import { memo, useMemo } from "react";

type Candle = { time: string; o: number; h: number; l: number; c: number };

interface Props {
  symbol: string;
  candles: Candle[];
  timeframe?: string;
  currentPrice?: number;
}

function calculateEma(values: number[], period: number) {
  if (!values.length) return null;
  const multiplier = 2 / (period + 1);
  let ema = values[0];

  for (let i = 1; i < values.length; i += 1) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

function calculateRsi(values: number[], period = 14) {
  if (values.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = values.length - period; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function formatValue(value: number | null, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getSignalLabel(score: number) {
  if (score >= 2) return { label: "Kaufen", tone: "text-success", bg: "bg-success/10 border-success/20" };
  if (score <= -2) return { label: "Verkaufen", tone: "text-destructive", bg: "bg-destructive/10 border-destructive/20" };
  return { label: "Neutral", tone: "text-muted-foreground", bg: "bg-muted border-border" };
}

const TradingViewTechnicalAnalysis = memo(({ symbol, candles, timeframe = "1D", currentPrice }: Props) => {
  const analysis = useMemo(() => {
    if (!candles.length) return null;

    const closes = candles.map((c) => c.c);
    const highs = candles.map((c) => c.h);
    const lows = candles.map((c) => c.l);
    const lastClose = currentPrice ?? closes[closes.length - 1];
    const firstClose = closes[0];
    const ema9 = calculateEma(closes, 9);
    const ema21 = calculateEma(closes, 21);
    const rsi = calculateRsi(closes, 14);
    const resistance = Math.max(...highs.slice(-20));
    const support = Math.min(...lows.slice(-20));
    const momentum = ((lastClose - firstClose) / firstClose) * 100;
    const rangePct = support > 0 ? ((resistance - support) / support) * 100 : 0;

    let score = 0;
    if (ema9 != null && ema21 != null) score += ema9 > ema21 ? 1 : -1;
    if (rsi != null) {
      if (rsi < 35) score += 1;
      else if (rsi > 65) score -= 1;
    }
    score += momentum >= 0 ? 1 : -1;

    const signal = getSignalLabel(score);
    const trendText = ema9 != null && ema21 != null
      ? ema9 > ema21
        ? "Kurzfristiger Aufwärtstrend"
        : "Kurzfristiger Abwärtstrend"
      : "Trend wird berechnet";

    const rsiText = rsi == null
      ? "RSI wird berechnet"
      : rsi < 30
        ? "Überverkauft"
        : rsi > 70
          ? "Überkauft"
          : "Ausgeglichen";

    return {
      signal,
      trendText,
      rsiText,
      lastClose,
      ema9,
      ema21,
      rsi,
      support,
      resistance,
      momentum,
      rangePct,
    };
  }, [candles, currentPrice]);

  if (!analysis) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-border bg-card px-6 text-sm text-muted-foreground">
        Analyse wird geladen …
      </div>
    );
  }

  return (
    <section className="min-h-[300px] rounded-lg border border-border bg-card px-5 py-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Technische Analyse für {symbol}</h3>
          <p className="text-sm text-muted-foreground">Live-Auswertung auf Basis des aktuellen {timeframe}-Kursverlaufs</p>
        </div>
        <div className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${analysis.signal.bg} ${analysis.signal.tone}`}>
          {analysis.signal.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <div className="text-xs text-muted-foreground">Letzter Kurs</div>
          <div className="mt-1 text-lg font-semibold text-foreground tabular-nums">{formatValue(analysis.lastClose)}</div>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <div className="text-xs text-muted-foreground">Momentum</div>
          <div className={`mt-1 text-lg font-semibold tabular-nums ${analysis.momentum >= 0 ? "text-success" : "text-destructive"}`}>
            {analysis.momentum >= 0 ? "+" : ""}{formatValue(analysis.momentum)}%
          </div>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <div className="text-xs text-muted-foreground">RSI 14</div>
          <div className="mt-1 text-lg font-semibold text-foreground tabular-nums">{formatValue(analysis.rsi)}</div>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <div className="text-xs text-muted-foreground">Spanne</div>
          <div className="mt-1 text-lg font-semibold text-foreground tabular-nums">{formatValue(analysis.rangePct)}%</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-background px-3 py-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Trendbild</div>
          <div className="text-sm font-medium text-foreground">{analysis.trendText}</div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">EMA 9</span>
            <span className="font-medium text-foreground tabular-nums">{formatValue(analysis.ema9)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">EMA 21</span>
            <span className="font-medium text-foreground tabular-nums">{formatValue(analysis.ema21)}</span>
          </div>
        </div>

        <div className="rounded-md border border-border bg-background px-3 py-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Marktstatus</div>
          <div className="text-sm font-medium text-foreground">{analysis.rsiText}</div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Unterstützung</span>
            <span className="font-medium text-foreground tabular-nums">{formatValue(analysis.support)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Widerstand</span>
            <span className="font-medium text-foreground tabular-nums">{formatValue(analysis.resistance)}</span>
          </div>
        </div>
      </div>
    </section>
  );
});

TradingViewTechnicalAnalysis.displayName = "TradingViewTechnicalAnalysis";

export default TradingViewTechnicalAnalysis;