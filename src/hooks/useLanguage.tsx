import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "de" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (de: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "de",
  setLang: () => {},
  t: (de) => de,
});

const isAdminPath = () =>
  typeof window !== "undefined" && window.location.pathname.startsWith("/backoffice");

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [storedLang, setStoredLang] = useState<Language>(() => {
    const stored = localStorage.getItem("crypto-boerse-lang");
    return (stored === "en" ? "en" : "de") as Language;
  });

  // Force English on backoffice/admin routes regardless of user preference
  const [isAdmin, setIsAdmin] = useState<boolean>(isAdminPath);

  useEffect(() => {
    const update = () => setIsAdmin(isAdminPath());
    window.addEventListener("popstate", update);
    // Patch pushState/replaceState to detect SPA navigations
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    window.history.pushState = function (...args) {
      const r = origPush.apply(this, args as any);
      update();
      return r;
    } as typeof window.history.pushState;
    window.history.replaceState = function (...args) {
      const r = origReplace.apply(this, args as any);
      update();
      return r;
    } as typeof window.history.replaceState;
    return () => {
      window.removeEventListener("popstate", update);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, []);

  const lang: Language = isAdmin ? "en" : storedLang;

  const setLang = (l: Language) => {
    setStoredLang(l);
    localStorage.setItem("crypto-boerse-lang", l);
  };

  const t = (de: string, en: string) => (lang === "en" ? en : de);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
