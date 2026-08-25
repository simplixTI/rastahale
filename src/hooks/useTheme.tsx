import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";

// Tema claro/escuro. O escuro é o tema base (variáveis em :root no index.css);
// o claro é aplicado adicionando a classe `light` no <html>.
// Padrão: claro. "system" segue o prefers-color-scheme do aparelho.
export type Theme = "dark" | "light" | "system";

const THEME_KEY = "rasta_theme";

function systemTheme(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme): "dark" | "light" {
  const resolved = theme === "system" ? systemTheme() : theme;
  document.documentElement.classList.toggle("light", resolved === "light");
  // Barra de status acompanha o tema: conteúdo escuro no claro, claro no escuro.
  if (Capacitor.isNativePlatform()) {
    SystemBars.setStyle({
      style: resolved === "light" ? SystemBarsStyle.Light : SystemBarsStyle.Dark,
    }).catch(() => { /* plataforma sem suporte */ });
  }
  return resolved;
}

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === "dark" || saved === "system" ? saved : "light";
    } catch {
      return "light";
    }
  });
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() => applyTheme(theme));

  useEffect(() => {
    setResolvedTheme(applyTheme(theme));
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch { /* ignore */ }

    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setResolvedTheme(applyTheme("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
