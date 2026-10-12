"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

export type FontSizeId = "compact" | "normal" | "large" | "xlarge";

export interface FontSizeOption {
  id: FontSizeId;
  label: string;
  hint: string;
  /** Kök font-size (px). Tüm rem tipografi + uni-* utility'leri orantılı ölçeklenir. */
  rootPx: number;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { id: "compact", label: "Kompakt", hint: "Daha fazla içerik", rootPx: 14 },
  { id: "normal", label: "Normal", hint: "Varsayılan", rootPx: 16 },
  { id: "large", label: "Büyük", hint: "Daha okunaklı", rootPx: 18 },
  { id: "xlarge", label: "Çok Büyük", hint: "En okunaklı", rootPx: 20 },
];

const STORAGE_KEY = "interactiveotel-font-size";

const FontSizeContext = createContext<{
  size: FontSizeId;
  setSize: (size: FontSizeId) => void;
}>({ size: "normal", setSize: () => {} });

export const useFontSize = () => useContext(FontSizeContext);

/** Kök font-size'ı Ayarlar → Yazı Boyutu seçimine bağlar (localStorage kalıcı). */
export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [size, setSizeState] = useState<FontSizeId>("normal");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as FontSizeId | null;
      if (saved && FONT_SIZE_OPTIONS.some((o) => o.id === saved)) {
        setSizeState(saved);
      }
    } catch {
      /* depolama yoksa varsayılanda kal */
    }
  }, []);

  useEffect(() => {
    const opt =
      FONT_SIZE_OPTIONS.find((o) => o.id === size) ?? FONT_SIZE_OPTIONS[1];
    document.documentElement.style.fontSize = `${opt.rootPx}px`;
  }, [size]);

  const setSize = (next: FontSizeId) => {
    setSizeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Oturum içinde çalışmaya devam et. */ }
  };

  return (
    <FontSizeContext.Provider value={{ size, setSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}
