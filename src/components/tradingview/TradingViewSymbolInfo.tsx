import { memo } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  symbol: string;
  name?: string;
  type?: string;
  iconUrl?: string | null;
  currentPrice?: number;
  priceChange?: number;
  marketOpen?: boolean;
  leverageMax?: number;
}

const TradingViewSymbolInfo = memo(({ symbol, name, type, iconUrl, currentPrice, priceChange, marketOpen = true, leverageMax }: Props) => {
  const initials = symbol.slice(0, 2).toUpperCase();
  const formattedPrice = typeof currentPrice === "number"
    ? currentPrice.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";
  const formattedChange = typeof priceChange === "number"
    ? `${priceChange >= 0 ? "+" : ""}${priceChange.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    : "—";

  return (
    <section className="min-h-[300px] rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start gap-4">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={symbol}
            className="h-14 w-14 rounded-full object-contain bg-primary/10 p-1"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = "none";
              const fb = img.nextElementSibling as HTMLElement | null;
              if (fb) fb.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary"
          style={{ display: iconUrl ? "none" : "flex" }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-semibold text-foreground">{symbol}</div>
          <div className="text-sm text-muted-foreground">{name ?? symbol}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-border bg-background px-2 py-1 text-foreground">{type ?? "Asset"}</span>
            <span className={`rounded-md border px-2 py-1 ${marketOpen ? "border-success/20 bg-success/10 text-success" : "border-destructive/20 bg-destructive/10 text-destructive"}`}>
              {marketOpen ? "Markt offen" : "Markt geschlossen"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <div className="text-xs text-muted-foreground">Aktueller Kurs</div>
          <div className="mt-1 text-lg font-semibold text-foreground tabular-nums">{formattedPrice}</div>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <div className="text-xs text-muted-foreground">Tagesbewegung</div>
          <div className={`mt-1 text-lg font-semibold tabular-nums ${typeof priceChange === "number" && priceChange >= 0 ? "text-success" : "text-destructive"}`}>
            {formattedChange}
          </div>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <div className="text-xs text-muted-foreground">Max. Hebel</div>
          <div className="mt-1 text-lg font-semibold text-foreground tabular-nums">{leverageMax ? `${leverageMax}×` : "—"}</div>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <div className="text-xs text-muted-foreground">Verfügbarkeit</div>
          <div className="mt-1 text-lg font-semibold text-foreground">Handelbar</div>
        </div>
      </div>
    </section>
  );
});

TradingViewSymbolInfo.displayName = "TradingViewSymbolInfo";
export default TradingViewSymbolInfo;
