"use client";
import React, { createContext, useContext, useEffect } from "react";

import { usePreference } from "./UserPreferences";

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


const FontSizeContext = createContext<{
  size: FontSizeId;
  setSize: (size: FontSizeId) => void;
}>({ size: "normal", setSize: () => {} });

export const useFontSize = () => useContext(FontSizeContext);

/** Kök font-size'ı Ayarlar → Yazı Boyutu seçimine bağlar (kullanıcı hesabında kalıcı). */
export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [size, setSize] = usePreference<FontSizeId>("font_size", "normal");

  useEffect(() => {
    const opt =
      FONT_SIZE_OPTIONS.find((o) => o.id === size) ?? FONT_SIZE_OPTIONS[1];
    document.documentElement.style.fontSize = `${opt.rootPx}px`;
  }, [size]);

  return (
    <FontSizeContext.Provider value={{ size, setSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}
