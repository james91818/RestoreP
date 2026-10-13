import { useEffect, useState } from "react";
import { Download, Monitor, Apple, Smartphone, Loader2, Laptop, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import { useLanguage } from "@/hooks/useLanguage";
import rustdeskLogo from "@/assets/rustdesk-logo.png";

const RELEASE_TAG = "1.4.6";
const GITHUB_API = `https://api.github.com/repos/rustdesk/rustdesk/releases/tags/${RELEASE_TAG}`;
const CACHE_KEY = "rustdesk-release-cache-v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type GhAsset = { name: string; browser_download_url: string; size: number };
type Cached = { fetchedAt: number; assets: GhAsset[]; htmlUrl: string };

const FALLBACK_HTML_URL = `https://github.com/rustdesk/rustdesk/releases/tag/${RELEASE_TAG}`;

const findAsset = (assets: GhAsset[], matchers: RegExp[]): GhAsset | undefined => {
  for (const re of matchers) {
    const found = assets.find((a) => re.test(a.name));
    if (found) return found;
  }
  return undefined;
};

type Platform = {
  id: string;
  title: string;
  description: string;
  icon: typeof Monitor;
  matchers: RegExp[];
  appStoreUrl?: string;
};

const DownloadRustDesk = () => {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<Cached | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const computerPlatforms: Platform[] = [
    {
      id: "windows",
      title: t("Windows-Computer", "Windows Computer"),
      description: t("Für PCs und Laptops mit Windows 10 oder 11", "For PCs and laptops with Windows 10 or 11"),
      icon: Monitor,
      matchers: [/x86_64\.exe$/i, /windows.*\.exe$/i, /\.exe$/i],
    },
    {
      id: "mac",
      title: t("Apple Mac", "Apple Mac"),
      description: t("Für MacBook und iMac (Apple Silicon & Intel)", "For MacBook and iMac (Apple Silicon & Intel)"),
      icon: Apple,
      matchers: [/aarch64\.dmg$/i, /arm64\.dmg$/i, /\.dmg$/i],
    },
  ];

  const phonePlatforms: Platform[] = [
    {
      id: "android",
      title: t("Android-Handy oder Tablet", "Android Phone or Tablet"),
      description: t("Für Samsung, Huawei, Xiaomi und andere Android-Geräte", "For Samsung, Huawei, Xiaomi and other Android devices"),
      icon: Smartphone,
      matchers: [/universal\.apk$/i, /arm64.*\.apk$/i, /\.apk$/i],
    },
    {
      id: "ios",
      title: t("iPhone oder iPad", "iPhone or iPad"),
      description: t("Installation über den offiziellen Apple App Store", "Installation via the official Apple App Store"),
      icon: Apple,
      matchers: [],
      appStoreUrl: "https://apps.apple.com/app/rustdesk-remote-desktop/id1581225015",
    },
  ];

  useEffect(() => {
    const load = async () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed: Cached = JSON.parse(raw);
          if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
            setData(parsed);
            setLoading(false);
            return;
          }
        }
        const res = await fetch(GITHUB_API);
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        const json = await res.json();
        const assets: GhAsset[] = (json.assets || []).map((a: GhAsset) => ({
          name: a.name,
          browser_download_url: a.browser_download_url,
          size: a.size,
        }));
        const cached: Cached = {
          fetchedAt: Date.now(),
          assets,
          htmlUrl: json.html_url || FALLBACK_HTML_URL,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        setData(cached);
      } catch (e: any) {
        setError(e?.message || "Error loading");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    const formatted = mb.toFixed(1);
    return `${lang === "de" ? formatted.replace(".", ",") : formatted} MB`;
  };

  const renderCard = (p: Platform) => {
    const Icon = p.icon;
    const asset =
      p.id === "ios"
        ? undefined
        : data
        ? findAsset(data.assets, [...p.matchers])
        : undefined;

    const href =
      p.id === "ios"
        ? p.appStoreUrl!
        : asset?.browser_download_url || data?.htmlUrl || FALLBACK_HTML_URL;

    return (
      <Card key={p.id} className="border-2 border-border/60 hover:border-primary/60 transition-colors">
        <CardContent className="p-7 flex flex-col h-full">
          <div className="flex items-start gap-5 mb-5">
            <div className="h-16 w-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-9 w-9" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold text-xl md:text-2xl leading-tight">{p.title}</h3>
              <p className="text-base text-muted-foreground mt-1">{p.description}</p>
            </div>
          </div>
          {asset && (
            <p className="text-sm text-muted-foreground mb-5 break-all">
              {t("Datei", "File")}: {asset.name} · {formatSize(asset.size)}
            </p>
          )}
          {p.id === "ios" && (
            <p className="text-sm text-muted-foreground mb-5">
              {t("Sie werden zum Apple App Store weitergeleitet.", "You will be redirected to the Apple App Store.")}
            </p>
          )}
          <Button asChild className="mt-auto w-full text-base h-12" size="lg">
            <a href={href} target="_blank" rel="noopener noreferrer">
              <Download className="h-5 w-5 mr-2" />
              {t("Jetzt herunterladen", "Download now")}
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-10">
          <img
            src={rustdeskLogo}
            alt="RustDesk Logo"
            className="h-20 w-20 mx-auto mb-5 rounded-2xl shadow-lg"
          />
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t("RustDesk herunterladen", "Download RustDesk")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t(
              "Mit RustDesk kann unser Kundensupport Ihnen sicher aus der Ferne helfen. Wählen Sie unten einfach Ihr Gerät und klicken Sie auf ",
              "With RustDesk, our customer support can securely help you remotely. Simply select your device below and click "
            )}
            <strong>{t("„Jetzt herunterladen\"", "\"Download now\"")}</strong>.
          </p>
        </div>

        {/* How it works - simple 3 steps */}
        <Card className="bg-muted/30 border-border/60 mb-10">
          <CardContent className="p-6 md:p-8">
            <h2 className="font-display font-semibold text-xl mb-5 text-center">
              {t("So einfach geht's", "It's that simple")}
            </h2>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { n: "1", t: t("Gerät auswählen", "Select device"), d: t("Wählen Sie unten Ihren Computer oder Ihr Handy aus.", "Select your computer or phone below.") },
                { n: "2", t: t("Datei herunterladen", "Download file"), d: t('Klicken Sie auf den blauen Knopf „Jetzt herunterladen".', 'Click the blue "Download now" button.') },
                { n: "3", t: t("Datei öffnen", "Open file"), d: t("Öffnen Sie die heruntergeladene Datei und folgen Sie den Anweisungen.", "Open the downloaded file and follow the instructions.") },
              ].map((s) => (
                <div key={s.n} className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-lg">
                    {s.n}
                  </div>
                  <div>
                    <p className="font-semibold text-base mb-1">{s.t}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && (
          <>
            {/* Computer section */}
            <section className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <Laptop className="h-7 w-7 text-primary" />
                <h2 className="font-display font-bold text-2xl md:text-3xl">{t("Für Computer", "For Computer")}</h2>
              </div>
              <p className="text-base text-muted-foreground mb-5">
                {t("Wählen Sie diese Option, wenn Sie RustDesk auf Ihrem ", "Choose this option if you want to install RustDesk on your ")}
                <strong>{t("PC, Laptop oder Mac", "PC, laptop or Mac")}</strong>
                {t(" installieren möchten.", ".")}
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                {computerPlatforms.map(renderCard)}
              </div>
            </section>

            {/* Phone section */}
            <section className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <PhoneIcon className="h-7 w-7 text-primary" />
                <h2 className="font-display font-bold text-2xl md:text-3xl">{t("Für Handy & Tablet", "For Phone & Tablet")}</h2>
              </div>
              <p className="text-base text-muted-foreground mb-5">
                {t("Wählen Sie diese Option, wenn Sie RustDesk auf Ihrem ", "Choose this option if you want to use RustDesk on your ")}
                <strong>{t("Smartphone oder Tablet", "smartphone or tablet")}</strong>
                {t(" nutzen möchten.", ".")}
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                {phonePlatforms.map(renderCard)}
              </div>
            </section>
          </>
        )}

        {error && (
          <p className="text-center text-base text-muted-foreground mt-6">
            {t("Direktlinks konnten nicht geladen werden. Sie können RustDesk ", "Direct links could not be loaded. You can download RustDesk ")}
            <a
              href={FALLBACK_HTML_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              {t("hier", "here")}
            </a>{" "}
            {t("manuell von GitHub herunterladen.", "manually from GitHub.")}
          </p>
        )}

        {/* Help box */}
        <Card className="border-primary/30 bg-primary/5 mt-10">
          <CardContent className="p-6 text-center">
            <p className="text-base leading-relaxed">
              <strong>{t("Sie brauchen Hilfe?", "Need help?")}</strong>{" "}
              {t("Kein Problem — schreiben Sie uns einfach an ", "No problem — just write to us at ")}
              <a href="mailto:support@crypto-borse.com" className="text-primary font-semibold hover:underline whitespace-nowrap">
                support@crypto-borse.com
              </a>
              {t(" oder nutzen Sie den Live-Chat. Wir begleiten Sie Schritt für Schritt durch die Installation.", " or use the live chat. We'll guide you step by step through the installation.")}
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {t("Version", "Version")} {RELEASE_TAG} · {t("Offizielle Quelle", "Official source")}: github.com/rustdesk/rustdesk
        </p>
      </div>
      <PublicFooter />
    </div>
  );
};

export default DownloadRustDesk;
