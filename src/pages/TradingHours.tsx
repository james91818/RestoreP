import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PageHero from "@/components/layout/PageHero";
import { Clock as ClockIcon } from "lucide-react";
import PublicFooter from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const TradingHours = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("assets").select("symbol, name, type, market_hours_start, market_hours_end, market_days").eq("enabled", true).order("type").order("symbol");
      setAssets(data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const typeLabels: Record<string, string> = {
    crypto: "Krypto",
    stock: "Aktien",
    index: "Indizes",
    commodity: "Rohstoffe",
  };

  const grouped = assets.reduce<Record<string, any[]>>((acc, a) => {
    const key = typeLabels[a.type] || (a.type.charAt(0).toUpperCase() + a.type.slice(1));
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <PageHero
        kicker="Marktöffnungszeiten"
        icon={ClockIcon}
        title="Handels"
        highlight="zeiten"
        description="Marktöffnungszeiten für alle verfügbaren Instrumente."
        compact
      />
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {loading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([type, items]) => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" /> {type}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground">Symbol</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Zeiten</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Handelstage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((a: any) => (
                          <tr key={a.symbol} className="border-b last:border-0">
                            <td className="p-3 font-semibold">{a.symbol}</td>
                            <td className="p-3 text-muted-foreground">{a.name}</td>
                            <td className="p-3">
                              {a.market_hours_start && a.market_hours_end
                                ? `${a.market_hours_start.slice(0, 5)} – ${a.market_hours_end.slice(0, 5)} MEZ`
                                : <Badge variant="outline" className="text-xs">24/7</Badge>}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                {(a.market_days ?? [1,2,3,4,5]).map((d: number) => (
                                  <span key={d} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{dayNames[d]}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <PublicFooter />
    </div>
  );
};

export default TradingHours;
