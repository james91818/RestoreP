import { useState, useEffect, createContext, useContext } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const APP_PATH_PREFIXES = [
  "/dashboard", "/trading", "/wallet", "/staking", "/watchlist",
  "/pnl", "/calendar", "/backoffice",
  "/notifications", "/support", "/settings",
];

const isAppRoute = (path: string) =>
  APP_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

const getStorageKey = (path: string) =>
  isAppRoute(path) ? "crypto-boerse-theme-app" : "crypto-boerse-theme-public";

const getDefaultTheme = (_path: string): Theme => "light";

const readTheme = (path: string): Theme => {
  const key = getStorageKey(path);
  const stored = localStorage.getItem(key);
  if (stored === "light" || stored === "dark") return stored;
  // Backward-compat: migrate legacy single key
  const legacy = localStorage.getItem("crypto-boerse-theme");
  if (legacy === "light" || legacy === "dark") return legacy;
  return getDefaultTheme(path);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    readTheme(typeof window !== "undefined" ? window.location.pathname : "/")
  );

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    const key = getStorageKey(window.location.pathname);
    localStorage.setItem(key, theme);
  }, [theme]);

  // React to route changes: switch to that context's stored/default theme
  useEffect(() => {
    let lastPath = window.location.pathname;
    const sync = () => {
      const path = window.location.pathname;
      if (path === lastPath) return;
      lastPath = path;
      setThemeState(readTheme(path));
    };
    window.addEventListener("popstate", sync);
    // Patch history methods to detect SPA navigations
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args) {
      const r = origPush.apply(this, args as any);
      sync();
      return r;
    };
    history.replaceState = function (...args) {
      const r = origReplace.apply(this, args as any);
      sync();
      return r;
    };
    return () => {
      window.removeEventListener("popstate", sync);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState(prev => (prev === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
