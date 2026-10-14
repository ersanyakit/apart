"use client";

import React, { createContext, useCallback, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, LOCALES, resolveLocale, type Locale } from "../lib/i18n/config";
import { translate, type MessageKey } from "../lib/i18n/messages";

import { usePreference } from "./UserPreferences";

type I18n = {
  locale: Locale;
  direction: "ltr" | "rtl";
  setLocale: (locale: string) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children, initialLocale = DEFAULT_LOCALE }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [storedLocale, setLocaleState] = usePreference<Locale>("locale", initialLocale);
  const locale = resolveLocale(storedLocale);
  const setLocale = useCallback((value: string) => setLocaleState(resolveLocale(value)), [setLocaleState]);

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
