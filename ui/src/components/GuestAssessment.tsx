"use client";
import { useI18n } from "./I18n";

import React, { useEffect, useRef, useState } from "react";
import { Star, ShieldAlert } from "lucide-react";
import { command, messageOf, type Snapshot } from "../lib/api";
import { TextAreaField, Switch } from "./fields";
import { ErrorMessage, buttonStyle, secondaryStyle } from "./FormKit";
import { SettingsEditor } from "./SettingsEditor";
import { useNotifications } from "./Toast";

export type Assessment = { id:string; hotel_id:string; name:string; identity_hint:string; kind:string; score:number; reason:string; actor_id:string; actor_name:string; hotel_name:string; created_at:string; updated_at:string; revoked_at:string|null; revoke_reason:string; revoked_by_name:string; can_revoke:boolean };
export type Reputation = { ratings:Assessment[]; blacklist:Assessment[]; average:number; rating_count:number };
export type AssessmentTarget = { guest_id:string; booking_id:string; branch_id:string; name:string };
export const assessmentDate=(v:string)=>new Date(v).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"medium",timeStyle:"short"});
export function BlacklistNotice({items}:{items:Assessment[]}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 if(!items.length)return null;
 return <section className="rounded-3xl bg-rose-50 p-5 space-y-3" role="status" aria-label={_uiText("Ortak kara liste kayıtları")}>
  <h3 className="flex items-center gap-2 font-semibold text-rose-800"><ShieldAlert size={20}/>{_uiText("Ortak kara listede kayıt var")}</h3>
  {items.map(item=><article key={item.id} className="space-y-1 text-sm"><p className="font-medium">{item.name} · {item.hotel_name}</p><p className="whitespace-pre-wrap break-words text-rose-900">{item.reason}</p><p className="text-xs text-slate-500">{item.actor_name} · {assessmentDate(item.created_at)}</p></article>)}
 </section>;
}
export function GuestAssessment({snapshot:s,target,onClose,backLabel="Listeye dön"}:{snapshot:Snapshot;target:AssessmentTarget;onClose:()=>void;backLabel?:string}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const notify=useNotifications(),requestID=useRef("");
 const [kind,setKind]=useState<"rating"|"blacklist">("rating"),[score,setScore]=useState(0),[reason,setReason]=useState(""),[shared,setShared]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[data,setData]=useState<Reputation|null>(null),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setData(null);command<Reputation>("guest.reputation",{hotel_id:s.hotel_id,branch_id:target.branch_id,guest_id:target.guest_id}).then(v=>{if(active){setData(v);setError("")}}).catch(e=>{if(active)setError(messageOf(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[s.hotel_id,target.branch_id,target.guest_id,revision]);
 const change=()=>{requestID.current="";setError("")};
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(reason.trim().length<10){setError(_uiText("En az 10 karakterlik somut bir açıklama yazın."));return}if(kind==="rating"&&!score){setError(_uiText("1 ile 5 arasında bir puan seçin."));return}if(kind==="blacklist"&&!shared){setError(_uiText("Kaydın tüm oteller tarafından görüleceğini onaylayın."));return}setBusy(true);setError("");requestID.current||=crypto.randomUUID();try{await command("guest.assess",{id:requestID.current,hotel_id:s.hotel_id,branch_id:target.branch_id,booking_id:target.booking_id,guest_id:target.guest_id,kind,score:kind==="rating"?score:0,reason:reason.trim()});notify(kind==="rating"?"Misafir puanı kaydedildi.":"Misafir ortak kara listeye eklendi.");setReason("");setScore(0);setShared(false);requestID.current="";setRevision(v=>v+1)}catch(e){setError(messageOf(e))}finally{setBusy(false)}};
 return <SettingsEditor title={_uiText("{value1} · Misafir değerlendirmesi", {value1: String(target.name)})} description={_uiText("Puanlar otelinizde tutulur. Kara liste kayıtları sisteme bağlı tüm otellerin yönetici ve resepsiyon personeli tarafından görülebilir.")} onClose={onClose} backLabel={backLabel}>
  <div className="space-y-5">
   {loading&&<p role="status">{_uiText("Misafir kayıtları yükleniyor…")}</p>}
   {data&&<><BlacklistNotice items={data.blacklist}/><p className="text-sm text-slate-600">{_uiText("Otelinizdeki puanı:")} <strong>{data.rating_count?_uiText("{value1} / 5 · {value2} değerlendirme", {value1: String(data.average.toFixed(1)), value2: String(data.rating_count)}):_uiText("Henüz değerlendirilmedi")}</strong></p></>}
   <form onSubmit={save} className="space-y-5"><fieldset disabled={busy||loading} className="space-y-5">
    <div className="flex flex-wrap gap-2" role="group" aria-label={_uiText("Değerlendirme türü")}>{([['rating','Misafire puan ver'],['blacklist','Kara listeye ekle']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={kind===value} className={`${kind===value?buttonStyle:secondaryStyle} !rounded-full`} onClick={()=>{change();setKind(value)}}>{label}</button>)}</div>
    {kind==="rating"?<fieldset><legend className="mb-2 text-sm font-medium">{_uiText("Konaklama deneyimi · 1 sorunlu, 5 çok iyi")}</legend><div className="flex flex-wrap gap-2">{[1,2,3,4,5].map(n=><button key={n} type="button" aria-label={_uiText("{value1} puan", {value1: String(n)})} aria-pressed={score===n} onClick={()=>{change();setScore(n)}} className={`uni-control flex h-12 min-w-12 items-center justify-center gap-1 rounded-full px-3 ${score>=n?"bg-amber-100 text-amber-800":"bg-[var(--color-uni-surface)] text-slate-500"}`}><Star size={18} fill={score>=n?"currentColor":"none"}/>{n}</button>)}</div><p className="mt-2 text-xs text-slate-500">{_uiText("Aynı rezervasyona verdiğiniz yeni puan, önceki puanınızı günceller.")}</p></fieldset>:<p className="text-sm text-slate-600">{_uiText("Kimlik/pasaport numarası ve ülke bilgisi misafir kaydında bulunmalıdır. Somut olayı ve nedenini açıklayın.")}</p>}
    <TextAreaField label={kind==="rating"?_uiText("Puanın açıklaması (zorunlu)"):_uiText("Kara listeye ekleme gerekçesi (zorunlu)")} value={reason} onChange={v=>{change();setReason(v)}} placeholder={_uiText("Ne oldu, ne zaman oldu ve nasıl sonuçlandı?")}/>
    {kind==="blacklist"&&<Switch label={_uiText("Bu gerekçe, adım ve otelimin adı tüm otellere açık olacak")} checked={shared} onChange={setShared}/>}
    <ErrorMessage message={error}/><div className="flex flex-wrap justify-end gap-2"><button type="button" className={`${secondaryStyle} !rounded-full`} onClick={onClose}>{backLabel}</button><button className={`${buttonStyle} !rounded-full`} disabled={busy||loading||!data||(kind==="blacklist"&&!shared)}>{busy?_uiText("Kaydediliyor…"):kind==="rating"?_uiText("Puanı kaydet"):_uiText("Ortak kara listeye ekle")}</button></div>
   </fieldset></form>
   {data&&data.ratings.length>0&&<section className="space-y-3"><h3 className="font-semibold">{_uiText("Otelinizdeki son değerlendirmeler")}</h3>{data.ratings.map(r=><article key={r.id} className="rounded-3xl bg-[var(--color-uni-surface)] p-4"><p className="text-sm font-medium">{r.score} / 5 · {r.actor_name}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{r.reason}</p><p className="mt-2 text-xs text-slate-500">{assessmentDate(r.updated_at)}</p></article>)}</section>}
  </div>
 </SettingsEditor>;
}
// Exact identity matching is independent from a hotel's own guest IDs.
export function BookingBlacklistCheck({nationalID,nationality}:{nationalID:string;nationality:string}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const [items,setItems]=useState<Assessment[]>([]),[state,setState]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setItems([]);setState("");if(nationalID.trim().length<4||nationality.length!==2)return;setState("Kara liste kontrol ediliyor…");const timer=setTimeout(()=>{command<{items:Assessment[]}>("blacklist.list",{national_id:nationalID,nationality,page:1,page_size:25}).then(v=>{if(active){setItems(v.items);setState(v.items.length?"":"Ortak kara listede eşleşme yok.")}}).catch(()=>{if(active)setState("Kara liste kontrol edilemedi.")})},400);return()=>{active=false;clearTimeout(timer)}},[nationalID,nationality,retry]);
 return <div className="space-y-2"><BlacklistNotice items={items}/>{state&&<p role="status" className="text-xs text-slate-500">{state}{state.includes("edilemedi")&&<button type="button" className={`${secondaryStyle} ml-2 !rounded-full`} onClick={()=>setRetry(v=>v+1)}>{_uiText("Tekrar dene")}</button>}</p>}</div>;
}

export function CustomerComments({data}:{data:Reputation}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 if(!data.ratings.length)return <p className="rounded-2xl bg-uni-surface p-5 text-sm text-uni-muted">{_uiText("Bu müşteri için henüz yorum veya puan kaydedilmemiş.")}</p>;
 return <div className="space-y-3">{data.ratings.map(r=><article key={r.id} className="rounded-3xl bg-[var(--color-uni-surface)] p-5"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium text-sm">{r.actor_name||_uiText("Personel")} · {r.hotel_name}</p><span className="flex items-center gap-1 text-sm"><Star size={16} aria-hidden="true"/>{r.score} / 5</span></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{r.reason}</p><p className="mt-3 text-xs text-uni-muted">{assessmentDate(r.created_at)}{r.updated_at!==r.created_at?_uiText(" · Güncellendi: {value1}", {value1: String(assessmentDate(r.updated_at))}):''}</p></article>)}</div>;
}
