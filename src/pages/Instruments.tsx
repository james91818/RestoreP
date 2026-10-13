import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PageHero from "@/components/layout/PageHero";
import { LineChart } from "lucide-react";
import PublicFooter from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import TradingViewScreener from "@/components/tradingview/TradingViewScreener";
import TradingViewHeatmap from "@/components/tradingview/TradingViewHeatmap";

const typeLabels: Record<string, string> = {
  crypto: "Krypto",
  stock: "Aktien",
  index: "Indizes",
  commodity: "Rohstoffe",
};

const Instruments = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("assets").select("*").eq("enabled", true).order("symbol");
      setAssets(data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const types = [...new Set(assets.map(a => a.type))];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <PageHero
        kicker="Live Marktdaten"
        icon={LineChart}
        title="Handels"
        highlight="platz"
        description="Entdecken Sie alle handelbaren Vermögenswerte auf unserer Plattform."
        compact
      />
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {loading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <Tabs defaultValue={types[0] || "crypto"}>
            <TabsList className="mb-4">
              {types.map(t => (
                <TabsTrigger key={t} value={t} className="capitalize">{typeLabels[t] || t}</TabsTrigger>
              ))}
            </TabsList>
            {types.map(t => (
              <TabsContent key={t} value={t}>
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      {typeLabels[t] || t}-Instrumente
                      <Badge variant="secondary" className="ml-2">{assets.filter(a => a.type === t).length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium text-muted-foreground">Symbol</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Max. Hebel</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Handelszeiten</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assets.filter(a => a.type === t).map(a => (
                            <tr key={a.id} className="border-b last:border-0">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {a.icon_url && <img src={a.icon_url} alt={a.symbol} className="h-5 w-5 rounded-full" />}
                                  <span className="font-semibold">{a.symbol}</span>
                                </div>
                              </td>
                              <td className="p-3 text-muted-foreground">{a.name}</td>
                              <td className="p-3"><Badge variant="outline">1:{a.leverage_max}</Badge></td>
                              <td className="p-3 text-muted-foreground text-xs">
                                {a.market_hours_start && a.market_hours_end
                                  ? `${a.market_hours_start.slice(0, 5)} – ${a.market_hours_end.slice(0, 5)}`
                                  : "24/7"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Live Screener */}
        <div className="mt-12 space-y-8">
          <div>
            <h2 className="text-2xl font-display font-bold mb-4 text-center">Krypto-Screener</h2>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <TradingViewScreener market="crypto" height={500} />
              </CardContent>
            </Card>
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold mb-4 text-center">Krypto-Heatmap</h2>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <TradingViewHeatmap type="crypto" height={450} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="text-center mt-12">
          <Button size="lg" asChild className="rounded-full px-8">
            <Link to="/signup">Jetzt mit dem Handel starten</Link>
          </Button>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
};

export default Instruments;
