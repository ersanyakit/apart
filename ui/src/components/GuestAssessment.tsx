"use client";
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
 if(!items.length)return null;
 return <section className="rounded-3xl bg-rose-50 p-5 space-y-3" role="status" aria-label="Ortak kara liste kayıtları">
  <h3 className="flex items-center gap-2 font-semibold text-rose-800"><ShieldAlert size={20}/>Ortak kara listede kayıt var</h3>
  {items.map(item=><article key={item.id} className="space-y-1 text-sm"><p className="font-medium">{item.name} · {item.hotel_name}</p><p className="whitespace-pre-wrap break-words text-rose-900">{item.reason}</p><p className="text-xs text-slate-500">{item.actor_name} · {assessmentDate(item.created_at)}</p></article>)}
 </section>;
}
export function GuestAssessment({snapshot:s,target,onClose}:{snapshot:Snapshot;target:AssessmentTarget;onClose:()=>void}) {
 const notify=useNotifications(),requestID=useRef("");
 const [kind,setKind]=useState<"rating"|"blacklist">("rating"),[score,setScore]=useState(0),[reason,setReason]=useState(""),[shared,setShared]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[data,setData]=useState<Reputation|null>(null),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setData(null);command<Reputation>("guest.reputation",{hotel_id:s.hotel_id,branch_id:target.branch_id,guest_id:target.guest_id}).then(v=>{if(active){setData(v);setError("")}}).catch(e=>{if(active)setError(messageOf(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[s.hotel_id,target.branch_id,target.guest_id,revision]);
 const change=()=>{requestID.current="";setError("")};
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(reason.trim().length<10){setError("En az 10 karakterlik somut bir açıklama yazın.");return}if(kind==="rating"&&!score){setError("1 ile 5 arasında bir puan seçin.");return}if(kind==="blacklist"&&!shared){setError("Kaydın tüm oteller tarafından görüleceğini onaylayın.");return}setBusy(true);setError("");requestID.current||=crypto.randomUUID();try{await command("guest.assess",{id:requestID.current,hotel_id:s.hotel_id,branch_id:target.branch_id,booking_id:target.booking_id,guest_id:target.guest_id,kind,score:kind==="rating"?score:0,reason:reason.trim()});notify(kind==="rating"?"Misafir puanı kaydedildi.":"Misafir ortak kara listeye eklendi.");setReason("");setScore(0);setShared(false);requestID.current="";setRevision(v=>v+1)}catch(e){setError(messageOf(e))}finally{setBusy(false)}};
 return <SettingsEditor title={`${target.name} · Misafir değerlendirmesi`} description="Puanlar otelinizde tutulur. Kara liste kayıtları sisteme bağlı tüm otellerin yönetici ve resepsiyon personeli tarafından görülebilir." onClose={onClose}>
  <div className="space-y-5">
   {loading&&<p role="status">Misafir kayıtları yükleniyor…</p>}
   {data&&<><BlacklistNotice items={data.blacklist}/><p className="text-sm text-slate-600">Otelinizdeki puanı: <strong>{data.rating_count?`${data.average.toFixed(1)} / 5 · ${data.rating_count} değerlendirme`:"Henüz değerlendirilmedi"}</strong></p></>}
   <form onSubmit={save} className="space-y-5"><fieldset disabled={busy||loading} className="space-y-5">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Değerlendirme türü">{([['rating','Misafire puan ver'],['blacklist','Kara listeye ekle']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={kind===value} className={`${kind===value?buttonStyle:secondaryStyle} !rounded-full`} onClick={()=>{change();setKind(value)}}>{label}</button>)}</div>
    {kind==="rating"?<fieldset><legend className="mb-2 text-sm font-medium">Konaklama deneyimi · 1 sorunlu, 5 çok iyi</legend><div className="flex flex-wrap gap-2">{[1,2,3,4,5].map(n=><button key={n} type="button" aria-label={`${n} puan`} aria-pressed={score===n} onClick={()=>{change();setScore(n)}} className={`uni-control flex h-12 min-w-12 items-center justify-center gap-1 rounded-full px-3 ${score>=n?"bg-amber-100 text-amber-800":"bg-[var(--color-uni-surface)] text-slate-500"}`}><Star size={18} fill={score>=n?"currentColor":"none"}/>{n}</button>)}</div><p className="mt-2 text-xs text-slate-500">Aynı rezervasyona verdiğiniz yeni puan, önceki puanınızı günceller.</p></fieldset>:<p className="text-sm text-slate-600">Kimlik/pasaport numarası ve ülke bilgisi misafir kaydında bulunmalıdır. Somut olayı ve nedenini açıklayın.</p>}
    <TextAreaField label={kind==="rating"?"Puanın açıklaması (zorunlu)":"Kara listeye ekleme gerekçesi (zorunlu)"} value={reason} onChange={v=>{change();setReason(v)}} placeholder="Ne oldu, ne zaman oldu ve nasıl sonuçlandı?"/>
    {kind==="blacklist"&&<Switch label="Bu gerekçe, adım ve otelimin adı tüm otellere açık olacak" checked={shared} onChange={setShared}/>}
    <ErrorMessage message={error}/><div className="flex flex-wrap justify-end gap-2"><button type="button" className={`${secondaryStyle} !rounded-full`} onClick={onClose}>Listeye dön</button><button className={`${buttonStyle} !rounded-full`} disabled={busy||loading||!data||(kind==="blacklist"&&!shared)}>{busy?"Kaydediliyor…":kind==="rating"?"Puanı kaydet":"Ortak kara listeye ekle"}</button></div>
   </fieldset></form>
   {data&&data.ratings.length>0&&<section className="space-y-3"><h3 className="font-semibold">Otelinizdeki son değerlendirmeler</h3>{data.ratings.map(r=><article key={r.id} className="rounded-3xl bg-[var(--color-uni-surface)] p-4"><p className="text-sm font-medium">{r.score} / 5 · {r.actor_name}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{r.reason}</p><p className="mt-2 text-xs text-slate-500">{assessmentDate(r.updated_at)}</p></article>)}</section>}
  </div>
 </SettingsEditor>;
}
// Exact identity matching is independent from a hotel's own guest IDs.
export function BookingBlacklistCheck({nationalID,nationality}:{nationalID:string;nationality:string}) {
 const [items,setItems]=useState<Assessment[]>([]),[state,setState]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setItems([]);setState("");if(nationalID.trim().length<4||nationality.length!==2)return;setState("Kara liste kontrol ediliyor…");const timer=setTimeout(()=>{command<{items:Assessment[]}>("blacklist.list",{national_id:nationalID,nationality,page:1,page_size:25}).then(v=>{if(active){setItems(v.items);setState(v.items.length?"":"Ortak kara listede eşleşme yok.")}}).catch(()=>{if(active)setState("Kara liste kontrol edilemedi.")})},400);return()=>{active=false;clearTimeout(timer)}},[nationalID,nationality,retry]);
 return <div className="space-y-2"><BlacklistNotice items={items}/>{state&&<p role="status" className="text-xs text-slate-500">{state}{state.includes("edilemedi")&&<button type="button" className={`${secondaryStyle} ml-2 !rounded-full`} onClick={()=>setRetry(v=>v+1)}>Tekrar dene</button>}</p>}</div>;
}
