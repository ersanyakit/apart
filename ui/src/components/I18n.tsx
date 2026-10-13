"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, LOCALES, LOCALE_STORAGE_KEY, resolveLocale, type Locale } from "../lib/i18n/config";
import { translate, type MessageKey } from "../lib/i18n/messages";

type I18n = {
  locale: Locale;
  direction: "ltr" | "rtl";
  setLocale: (locale: string) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Use the same initial locale on server and client to avoid hydration mismatches.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const setLocale = useCallback((value: string) => {
    const next = resolveLocale(value);
    setLocaleState(next);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch { /* Storage may be unavailable. */ }
  }, []);

  useEffect(() => {
    try { setLocaleState(resolveLocale(localStorage.getItem(LOCALE_STORAGE_KEY))); } catch { /* Keep the default. */ }
    const sync = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY || event.key === null) setLocaleState(resolveLocale(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const value = useMemo<I18n>(() => ({
    locale,
    direction: LOCALES[locale].direction,
    setLocale,
    t: (key, params) => translate(locale, key, params),
  }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n requires I18nProvider");
  return context;
}
