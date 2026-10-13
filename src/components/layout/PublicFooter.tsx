import { Link } from "react-router-dom";

import { useLanguage } from "@/hooks/useLanguage";
import logoAsset from "@/assets/crypto-boerse-logo-white.png.asset.json";

const PublicFooter = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-[hsl(var(--hero-bg))] border-t border-[#3b82f6]/10 pt-14 pb-6 text-[hsl(var(--hero-foreground))]">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-4 mb-12">
          <div className="space-y-4">
            <img src={logoAsset.url} alt="Crypto-Börse" className="h-11 w-auto" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "Ihr vertrauenswürdiger Partner für Vermögensverwaltung — mit Sitz in Wien, Berlin und Zürich.",
                "Your trusted partner for wealth management — headquartered in Vienna, Berlin and Zurich."
              )}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-[1px]">
                <div className="w-4 h-[4px] bg-black rounded-t-sm" />
                <div className="w-4 h-[4px] bg-[#DD0000]" />
                <div className="w-4 h-[4px] bg-[#FFCE00] rounded-b-sm" />
              </div>
              <div className="flex flex-col gap-[1px]">
                <div className="w-4 h-[4px] bg-red-700 rounded-t-sm" />
                <div className="w-4 h-[4px] bg-white" />
                <div className="w-4 h-[4px] bg-red-700 rounded-b-sm" />
              </div>
              <div className="w-4 h-[12px] bg-red-600 rounded-sm relative flex items-center justify-center">
                <div className="absolute w-[9px] h-[2px] bg-white rounded-[1px]" />
                <div className="absolute w-[2px] h-[9px] bg-white rounded-[1px]" />
              </div>
              <span className="text-xs text-muted-foreground">{t("DACH-Region", "DACH Region")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-[12px] bg-[#003399] rounded-sm relative flex items-center justify-center overflow-hidden">
                {/* EU stars ring (simplified) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[6px] h-[6px] rounded-full border border-[#FFCC00]" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground italic">
                {t("Tätig in ganz Europa", "Active across all of Europe")}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold text-sm mb-4">{t("Handeln", "Trading")}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/handelsplatz" className="hover:text-[#3b82f6] transition-colors">{t("Handelsplatz", "Marketplace")}</Link></li>
              <li><Link to="/investments" className="hover:text-[#3b82f6] transition-colors">{t("Investitionen", "Investments")}</Link></li>
              <li><Link to="/account-types" className="hover:text-[#3b82f6] transition-colors">{t("Kontotypen", "Account Types")}</Link></li>
             <li><Link to="/cards" className="hover:text-[#3b82f6] transition-colors">{t("Karten", "Cards")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-sm mb-4">{t("Rechtliches", "Legal")}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/privacy-policy" className="hover:text-[#3b82f6] transition-colors">{t("Datenschutz", "Privacy Policy")}</Link></li>
              
              
              <li><Link to="/terms-conditions" className="hover:text-[#3b82f6] transition-colors">{t("Allgemeine Geschäftsbedingungen", "Terms & Conditions")}</Link></li>
              <li><Link to="/impressum" className="hover:text-[#3b82f6] transition-colors">{t("Impressum", "Legal Notice")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-sm mb-4">{t("Kontakt", "Contact")}</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-[#3b82f6] transition-colors">{t("Über uns", "About Us")}</Link></li>
              <li><Link to="/contact" className="hover:text-[#3b82f6] transition-colors">{t("Kontakt", "Contact")}</Link></li>
              <li><Link to="/support-center" className="hover:text-[#3b82f6] transition-colors">{t("Hilfecenter", "Help Center")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#3b82f6]/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Crypto-Börse. {t("Alle Rechte vorbehalten.", "All rights reserved.")}
          </p>
          <p className="text-[10px] text-muted-foreground max-w-xl text-center md:text-right leading-relaxed">
            {t(
              "Risikohinweis: CFDs und Kryptowährungen sind komplexe Instrumente und bergen ein hohes Verlustrisiko. Investieren Sie nur Kapital, dessen Verlust Sie verkraften können.",
              "Risk Warning: CFDs and cryptocurrencies are complex instruments and carry a high risk of loss. Only invest capital you can afford to lose."
            )}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
