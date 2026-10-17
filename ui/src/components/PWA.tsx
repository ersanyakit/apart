"use client";
import { useI18n } from "./I18n";

import React,{createContext,useContext,useEffect,useState} from 'react';
import {buttonStyle} from './FormKit';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
type InstallState={install:()=>Promise<void>;available:boolean;installed:boolean;secure:boolean;error:string};
const Context=createContext<InstallState>({install:async()=>{},available:false,installed:false,secure:true,error:''});
export function PWAProvider({children}:{children:React.ReactNode}){
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const [prompt,setPrompt]=useState<InstallEvent|null>(null),[installed,setInstalled]=useState(false),[offline,setOffline]=useState(false),[secure,setSecure]=useState(true),[error,setError]=useState('');
 useEffect(()=>{const media=window.matchMedia('(display-mode: standalone)');const update=()=>setInstalled(media.matches||!!(navigator as Navigator&{standalone?:boolean}).standalone);update();setSecure(window.isSecureContext);setOffline(!navigator.onLine);
  const before=(e:Event)=>{e.preventDefault();setPrompt(e as InstallEvent)},done=()=>{setInstalled(true);setPrompt(null)},online=()=>setOffline(false),lost=()=>setOffline(true);
  window.addEventListener('beforeinstallprompt',before);window.addEventListener('appinstalled',done);window.addEventListener('online',online);window.addEventListener('offline',lost);media.addEventListener('change',update);
  if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>setError("Uygulama desteği başlatılamadı. Bağlantınızı kontrol edip sayfayı yenileyin."));
  return()=>{window.removeEventListener('beforeinstallprompt',before);window.removeEventListener('appinstalled',done);window.removeEventListener('online',online);window.removeEventListener('offline',lost);media.removeEventListener('change',update)};
 },[]);
 const install=async()=>{if(!prompt)return;try{await prompt.prompt();await prompt.userChoice;setPrompt(null)}catch{setError("Kurulum açılamadı. Tarayıcının uygulama yükleme menüsünü kullanabilirsiniz.")}};
 return <Context.Provider value={{install,available:!!prompt,installed,secure,error}}>{offline&&<div role="status" className="fixed inset-x-3 bottom-24 z-[100] mx-auto max-w-lg rounded-3xl bg-amber-100 px-5 py-3 text-center text-sm text-amber-950 shadow-lg">{_uiText("Bağlantı yok. İşlemler kaydedilemez; bağlantınızı kontrol edin.")}</div>}{children}</Context.Provider>;
}
export function InstallAppPanel(){
  const {m: _uiText, locale: _uiLocale} = useI18n();
const p=useContext(Context);return <section className="rounded-3xl bg-[var(--color-uni-surface)] p-5 space-y-3"><h3 className="font-semibold">{_uiText("Uygulama olarak kullan")}</h3><p className="text-sm text-slate-500">{p.installed?_uiText("Uygulama ayrı pencerede kullanılıyor."):!p.secure?_uiText("Kurulum için HTTPS bağlantısını veya bu cihazda localhost adresini kullanın."):_uiText("Telefonunuzun ana ekranına veya bilgisayarınıza ekleyebilirsiniz. Rezervasyon ve ödeme işlemleri internet bağlantısı gerektirir.")}</p>{p.available&&!p.installed?<button type="button" className={`${buttonStyle} !rounded-full`} onClick={()=>void p.install()}>{_uiText("Uygulamayı yükle")}</button>:!p.installed&&p.secure&&<p className="text-sm text-slate-500">{_uiText("iPhone / iPad: Safari paylaş menüsü → Ana Ekrana Ekle. Diğer tarayıcılar: menüde Uygulamayı yükle veya Ana ekrana ekle seçeneği.")}</p>}{p.error&&<p role="alert" className="text-sm text-rose-700">{_uiText(p.error)}</p>}</section>}
