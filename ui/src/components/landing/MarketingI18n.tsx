"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '../I18n';
import { LOCALES, LOCALE_STORAGE_KEY, type Locale } from '../../lib/i18n/config';
import { loadMarketingDictionary, marketingText, MARKETING_LOCALE_COOKIE, type MarketingDictionary } from '../../lib/i18n/marketing';

type MarketingI18n = {
 locale: Locale;
 m: (source: string, params?: Record<string, string | number>) => string;
 selectLocale: (value: Locale) => Promise<void>;
 loading: boolean;
 error: boolean;
};
const Context = createContext<MarketingI18n | null>(null);
export function MarketingI18nProvider({children,initialDictionary}: {children:ReactNode;initialDictionary:MarketingDictionary}) {
 const {locale,setLocale}=useI18n();
 const router=useRouter();
 const [dictionary,setDictionary]=useState(initialDictionary);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState(false);
 const request=useRef(0);
 useEffect(()=>{
  let active=true;
  loadMarketingDictionary(locale).then(next=>{if(active)setDictionary(next);}).catch(()=>{});
  return()=>{active=false};
 },[locale]);
 const m=useCallback((source:string,params?:Record<string,string|number>)=>marketingText(dictionary,source,params),[dictionary]);
 const selectLocale=async (value:Locale)=>{
  const current=++request.current;setLoading(true);setError(false);
  try {
   const next=await loadMarketingDictionary(value);
   if(current!==request.current)return;
   setDictionary(next);setLocale(value);
   document.cookie=`${MARKETING_LOCALE_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
   try{localStorage.setItem(LOCALE_STORAGE_KEY,value);}catch{}
   document.documentElement.lang=value;
   document.documentElement.dir=LOCALES[value].direction;
   router.refresh();
  } catch {if(current===request.current)setError(true);}
  finally {if(current===request.current)setLoading(false);}
 };
 return <Context.Provider value={{locale,m,selectLocale,loading,error}}>{children}</Context.Provider>;
}
export function useMarketingI18n(){const value=useContext(Context);if(!value)throw new Error('MarketingI18nProvider is required');return value;}
