"use client";
import React, { createContext, useContext, useEffect } from "react";

import { usePreference } from "./UserPreferences";

export type ThemeId = "blue" | "pink" | "green" | "orange" | "purple" | "fuchsia";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  hint: string;
  /** Seçenekteki renk noktası (sabit önizleme rengi). */
  color: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "blue", label: "Mavi", hint: "Varsayılan", color: "#2ABDFF" },
  { id: "pink", label: "Pembe", hint: "Uniswap Wallet", color: "#FF37C7" },
  { id: "green", label: "Yeşil", hint: "Liquidity", color: "#00C3A0" },
  { id: "orange", label: "Turuncu", hint: "Trading API", color: "#FF4D00" },
  { id: "purple", label: "Mor", hint: "UniswapX", color: "#8251FB" },
  { id: "fuchsia", label: "Fuşya", hint: "Unichain", color: "#F50DB4" },
];


export type BackgroundId = "white" | "gray";

export interface BackgroundOption {
  id: BackgroundId;
  label: string;
  hint: string;
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: "white", label: "Beyaz", hint: "Varsayılan" },
  { id: "gray", label: "Açık gri", hint: "Klasik" },
];

const ThemeContext = createContext<{
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  background: BackgroundId;
  setBackground: (background: BackgroundId) => void;
}>({ theme: "blue", setTheme: () => {}, background: "white", setBackground: () => {} });

export const useTheme = () => useContext(ThemeContext);

/**
 * `brand-blue-*` tokenlarını html[data-theme] üzerinden değiştirir
 * (index.css'teki override'lar). Tüm uygulama — butonlar, sidebar aktif
 * durumlar, tab çizgisi, rozetler — sayfa yenilemeden temayı alır.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = usePreference<ThemeId>("theme", "blue");
  const [background, setBackground] = usePreference<BackgroundId>("background", "white");

  useEffect(() => {
    if (theme === "blue") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    if (background === "white") {
      document.documentElement.removeAttribute("data-background");
    } else {
      document.documentElement.setAttribute("data-background", background);
    }
  }, [background]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, background, setBackground }}>
      {children}
    </ThemeContext.Provider>
  );
}
