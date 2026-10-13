import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

import { useLanguage } from "@/hooks/useLanguage";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import {
  Phone, Mail, MapPin, Building2, Headphones, BadgeCheck,
  Menu, X, Bitcoin, BarChart3, Layers, Coins, Shield, Rocket, Users, PartyPopper, Image as ImageIcon, User, Globe,
} from "lucide-react";
import logoLightAsset from "@/assets/crypto-boerse-logo.png.asset.json";

const PublicNav = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      {/* Top utility bar — always light themed */}
      <div className="bg-[#f1f5f9] text-slate-600 text-sm py-2.5 border-b border-slate-200">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-6">
            <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-[#3b82f6]" /> support@crypto-borse.com</span>
            <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#3b82f6]" /> Wien · Berlin · Zürich</span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <button
              onClick={() => setLang(lang === "de" ? "en" : "de")}
              className="flex items-center gap-1.5 text-slate-600 hover:text-[#3b82f6] transition-colors"
              title={lang === "de" ? "Switch to English" : "Auf Deutsch wechseln"}
            >
              <Globe className="h-3.5 w-3.5 text-[#3b82f6]" />
              {lang === "de" ? "Deutsch" : "English"}
            </button>
            <Link to="/support-center" className="text-slate-600 hover:text-[#3b82f6] transition-colors">{t("Hilfe & Support", "Help & Support")}</Link>
            <Link to="/contact" className="text-slate-600 hover:text-[#3b82f6] transition-colors">{t("Kontakt", "Contact")}</Link>
          </div>
        </div>
      </div>

      {/* Main Nav — always light themed */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto flex h-18 items-center justify-between px-4 py-2">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center">
              <img src={logoLightAsset.url} alt="Crypto-Börse" className="h-10 md:h-11 w-auto" />
            </Link>
            <div className="hidden lg:flex items-center gap-0 text-[13px] text-slate-800 font-medium whitespace-nowrap">
              <Link to="/" className="px-2.5 py-2 rounded-md hover:text-[#3b82f6] transition-colors">
                Home
              </Link>
              <Link to="/account-types" className="px-2.5 py-2 rounded-md hover:text-[#3b82f6] transition-colors">
                {t("Kontotypen", "Account Types")}
              </Link>
              <Link to="/cards" className="px-2.5 py-2 rounded-md hover:text-[#3b82f6] transition-colors">
                {t("Karten", "Cards")}
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-2.5 py-2 rounded-md hover:text-[#3b82f6] transition-colors">
                  {t("Investitionen", "Investments")}
                  <svg className="h-3.5 w-3.5 text-[#3b82f6] transition-transform group-hover:rotate-180" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-[hsl(var(--l-bg-alt))] border border-[#3b82f6]/15 rounded-xl shadow-2xl shadow-black/40 py-2 min-w-[220px]">
                    <Link to="/investments" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><BarChart3 className="h-4 w-4 text-[#3b82f6]/50" />{t("Alle Anlageprodukte", "All Investment Products")}</Link>
                    <div className="border-t border-[#3b82f6]/10 my-1" />
                    <Link to="/investments/bitcoin-blue-chips" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><Bitcoin className="h-4 w-4 text-[#3b82f6]/50" />{t("Bitcoin & Blue Chips", "Bitcoin & Blue Chips")}</Link>
                    <Link to="/investments/altcoins" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><Layers className="h-4 w-4 text-[#3b82f6]/50" />{t("Altcoins", "Altcoins")}</Link>
                    <Link to="/investments/defi" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><Coins className="h-4 w-4 text-[#3b82f6]/50" />{t("DeFi", "DeFi")}</Link>
                    <Link to="/investments/staking" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><Shield className="h-4 w-4 text-[#3b82f6]/50" />{t("Staking", "Staking")}</Link>
                    <Link to="/investments/icos" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><Rocket className="h-4 w-4 text-[#3b82f6]/50" />{t("ICOs & Neue Projekte", "ICOs & New Projects")}</Link>
                    <Link to="/investments/daos" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><Users className="h-4 w-4 text-[#3b82f6]/50" />{t("DAOs & Governance", "DAOs & Governance")}</Link>
                    <Link to="/investments/memecoins" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><PartyPopper className="h-4 w-4 text-[#3b82f6]/50" />{t("Memecoins", "Memecoins")}</Link>
                    <Link to="/investments/nfts" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><ImageIcon className="h-4 w-4 text-[#3b82f6]/50" />{t("NFTs", "NFTs")}</Link>
                    <div className="border-t border-[#3b82f6]/10 my-1" />
                    <Link to="/krypto-vorsorge" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><Shield className="h-4 w-4 text-[#3b82f6]/50" />{t("Krypto-Vorsorge", "Crypto Pension")}</Link>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-2.5 py-2 rounded-md hover:text-[#3b82f6] transition-colors">
                  {t("Über uns", "About Us")}
                  <svg className="h-3.5 w-3.5 text-[#3b82f6] transition-transform group-hover:rotate-180" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-[hsl(var(--l-bg-alt))] border border-[#3b82f6]/15 rounded-xl shadow-2xl shadow-black/40 py-2 min-w-[220px]">
                    <Link to="/about" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><Building2 className="h-4 w-4 text-[#3b82f6]/50" />{t("Über uns", "About Us")}</Link>
                    <Link to="/contact" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><Phone className="h-4 w-4 text-[#3b82f6]/50" />{t("Kontakt", "Contact")}</Link>
                    <Link to="/support-center" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><Headphones className="h-4 w-4 text-[#3b82f6]/50" />{t("Hilfecenter", "Help Center")}</Link>
                    <Link to="/impressum" className="flex items-center gap-3 px-4 py-2.5 text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"><BadgeCheck className="h-4 w-4 text-[#3b82f6]/50" />{t("Impressum", "Legal Notice")}</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                  <Avatar className="h-9 w-9 border-2 border-[#3b82f6]/40">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-bold">
                      {initials || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[14px] font-semibold text-[hsl(var(--secondary-foreground))]">{profile?.full_name || t("Mein Konto", "My Account")}</span>
                </Link>
                <Button size="lg" asChild className="rounded-lg px-7 bg-gradient-to-r from-[#3b82f6] to-[#1e40af] text-white hover:from-[#60a5fa] hover:to-[#3b82f6] text-[15px] font-bold shadow-lg shadow-[#3b82f6]/20">
                  <Link to="/dashboard">{t("Mein Portfolio", "My Portfolio")}</Link>
                </Button>
                <Button variant="outline" size="lg" onClick={handleSignOut} className="rounded-lg border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/10 bg-transparent text-[15px]">
                  {t("Abmelden", "Sign Out")}
                </Button>
              </div>
            ) : (
              <>
                <Button size="lg" asChild className="rounded-lg px-7 bg-gradient-to-r from-[#3b82f6] to-[#1e40af] text-white hover:from-[#60a5fa] hover:to-[#3b82f6] text-[15px] font-bold shadow-lg shadow-[#3b82f6]/20">
                  <Link to="/signup">{t("Konto eröffnen", "Open Account")}</Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="rounded-lg border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-900 bg-transparent text-[15px]">
                  <Link to="/login">{t("Anmelden", "Sign In")}</Link>
                </Button>
              </>
            )}
          </div>
          <button className="lg:hidden text-[hsl(var(--secondary-foreground))]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="lg:hidden bg-[hsl(var(--l-bg))] border-t border-[#3b82f6]/10 px-4 py-6 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto"
          >
            <p className="text-xs text-[#3b82f6]/50 uppercase tracking-widest font-semibold mb-1">{t("Märkte", "Markets")}</p>
            <Link to="/handelsplatz" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">{t("Alle Instrumente", "All Instruments")}</Link>
            <Link to="/trading-hours" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">{t("Handelszeiten", "Trading Hours")}</Link>
            <Link to="/cards" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">{t("Karten", "Cards")}</Link>
            <div className="border-t border-[#3b82f6]/10 my-3" />
            <p className="text-xs text-[#3b82f6]/50 uppercase tracking-widest font-semibold mb-1">{t("Investitionen", "Investments")}</p>
            <Link to="/investments" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">{t("Alle Anlageprodukte", "All Investment Products")}</Link>
            <Link to="/investments/bitcoin-blue-chips" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">Bitcoin & Blue Chips</Link>
            <Link to="/investments/altcoins" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">Altcoins</Link>
            <Link to="/investments/defi" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">DeFi</Link>
            <Link to="/investments/staking" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">Staking</Link>
            <Link to="/investments/icos" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">{t("ICOs & Neue Projekte", "ICOs & New Projects")}</Link>
            <Link to="/investments/daos" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">{t("DAOs & Governance", "DAOs & Governance")}</Link>
            <Link to="/investments/memecoins" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">Memecoins</Link>
            <Link to="/investments/nfts" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">NFTs</Link>
            <Link to="/krypto-vorsorge" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">{t("Krypto-Vorsorge", "Crypto Pension")}</Link>
            <div className="border-t border-[#3b82f6]/10 my-3" />
            <p className="text-xs text-[#3b82f6]/50 uppercase tracking-widest font-semibold mb-1">{t("Über uns", "About Us")}</p>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">{t("Über uns", "About Us")}</Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">{t("Kontakt", "Contact")}</Link>
            <Link to="/support-center" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">{t("Hilfecenter", "Help Center")}</Link>
            <Link to="/impressum" onClick={() => setMobileMenuOpen(false)} className="block text-lg text-[hsl(var(--l-fg-mid))] hover:text-[#3b82f6] py-1.5 pl-2">{t("Impressum", "Legal Notice")}</Link>
            <div className="pt-4 flex flex-col gap-3">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 py-2">
                  <Avatar className="h-8 w-8 border-2 border-[#3b82f6]/40">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-bold">
                      {initials || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[15px] font-semibold text-[hsl(var(--l-fg))]">{profile?.full_name || t("Mein Konto", "My Account")}</span>
                </Link>
                <Button asChild className="w-full bg-gradient-to-r from-[#3b82f6] to-[#1e40af] text-white font-bold">
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>{t("Zum Kundenbereich", "Go to Dashboard")}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="w-full bg-gradient-to-r from-[#3b82f6] to-[#1e40af] text-white font-bold">
                  <Link to="/signup">{t("Konto eröffnen", "Open Account")}</Link>
                </Button>
                <Button variant="outline" asChild className="w-full border-[hsl(var(--l-card-border)/0.15)] text-[hsl(var(--l-fg))]">
                  <Link to="/login">{t("Anmelden", "Sign In")}</Link>
                </Button>
              </>
            )}
            </div>
          </motion.div>
        )}
      </nav>
    </>
  );
};

export default PublicNav;
