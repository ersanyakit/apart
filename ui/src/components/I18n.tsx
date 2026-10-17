"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, LOCALES, resolveLocale, type Locale } from "../lib/i18n/config";
import { translate, type MessageKey } from "../lib/i18n/messages";

import { applicationText, coreDictionary, loadApplicationDictionary, type ApplicationDictionary, type MessageParams } from '../lib/i18n/application';
import { usePreference } from "./UserPreferences";

type I18n = {
  m: (source: string, params?: MessageParams) => string;
  loading: boolean;
  locale: Locale;
  direction: "ltr" | "rtl";
  setLocale: (locale: string) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children, initialLocale = DEFAULT_LOCALE, syncDocument = false }: { children: React.ReactNode; initialLocale?: Locale; syncDocument?: boolean }) {
  const [storedLocale, setLocaleState] = usePreference<Locale>("locale", initialLocale);
  const locale = resolveLocale(storedLocale);
  const [loaded,setLoaded]=useState<{locale:Locale;dictionary:ApplicationDictionary}|null>(null);
  useEffect(()=>{
    let active=true;
    loadApplicationDictionary(locale).then(dictionary=>{if(active)setLoaded({locale,dictionary});}).catch(()=>{if(active)setLoaded({locale,dictionary:coreDictionary(locale)});});
    return()=>{active=false};
  },[locale]);
  useEffect(()=>{
    if (!syncDocument) return;
    document.documentElement.lang=locale;
    document.documentElement.dir=LOCALES[locale].direction;
    document.cookie=`interactiveotel_locale=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.dispatchEvent(new Event('interactiveotel:locale'));
  },[locale,syncDocument]);
  useEffect(()=>{
    if(syncDocument)return;
    const update=()=>{const value=resolveLocale(document.documentElement.lang);setLocaleState(previous=>previous===value?previous:value);};
    window.addEventListener('interactiveotel:locale',update);
    update();
    return()=>window.removeEventListener('interactiveotel:locale',update);
  },[syncDocument,setLocaleState]);
  const dictionary=loaded?.locale===locale?loaded.dictionary:coreDictionary(locale);
  const setLocale = useCallback((value: string) => setLocaleState(resolveLocale(value)), [setLocaleState]);

  const value = useMemo<I18n>(() => ({
    m: (source,params) => applicationText(dictionary,source,params,locale),
    loading: loaded?.locale!==locale,
    locale,
    direction: LOCALES[locale].direction,
    setLocale,
    t: (key, params) => key==='language.description'
      ? applicationText(dictionary,'Uygulamanın dilini seçin.',params,locale)
      : applicationText(dictionary,translate(locale,key),params,locale),
  }), [locale, setLocale, dictionary, loaded]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  return context ?? {
    locale:DEFAULT_LOCALE,direction:LOCALES[DEFAULT_LOCALE].direction,loading:false,
    setLocale:()=>{},t:(key,params)=>translate(DEFAULT_LOCALE,key,params),
    m:(source,params)=>applicationText(coreDictionary(DEFAULT_LOCALE),source,params),
  };
}
