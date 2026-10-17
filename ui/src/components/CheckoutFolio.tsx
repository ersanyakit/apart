"use client";
import { useI18n } from "./I18n";

import { BookingStatus as BookingState } from '../lib/statuses.generated';

import React,{useEffect,useId,useState} from "react";
import {command,messageOf,type Booking} from "../lib/api";
import {FolioServices,VoidFolioService} from "./FolioServices";
import {ChevronDown,ChevronUp,ReceiptText} from "lucide-react";
import {NavigationIcon} from "./NavigationIcon";
import {ResponsiveDialog} from "./BottomSheet";
import {Switch} from "./fields";
import {ErrorMessage,buttonStyle,secondaryStyle} from "./FormKit";
import {paymentOptions} from "./reports/options";
type Line={quantity?:number;unit_price_minor?:number;id:string;label:string;kind:string;currency:string;amount_minor:number;at:string;actor:string;channel:string;status:string;notes:string};
export type Folio={booking:Booking;room:string;token:string;lines:Line[];totals:{currency:string;charges:number;paid:number;refunds:number;balance:number;security_deposit:number;pending_refunds:number}[];notes:string[];needs_acknowledgement:boolean};
const money=(n:number,c:string,locale='tr-TR')=>new Intl.NumberFormat(locale,{style:'currency',currency:c}).format(n/100);
const date=(v:string,locale='tr-TR')=>new Date(v).toLocaleString(locale,{timeZone:'Europe/Istanbul',dateStyle:'medium',timeStyle:'short'});
const kinds:Record<string,string>={charge:'Konaklama borcu',income:'Ek hizmet borcu',receipt:'Alınan ödeme',refund:'Misafire iade',deposit_in:'Güvence alındı',deposit_out:'Güvence iade edildi'};
export function FolioDetails({folio:f,onChanged}:{folio:Folio;onChanged?:()=>void}){
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const [expanded,setExpanded]=useState(false),detailsId=useId();
 return <div className="space-y-4">
  <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-uni-surface)]"><NavigationIcon name="folio"/></span><div><p className="font-semibold">{f.booking.guest_name}</p><p className="text-sm text-uni-muted">{f.room} {_uiText("· Oda hesabı")}</p></div></div>
  {f.totals.map(t=><section key={t.currency} aria-label={_uiText("Hesap özeti · {value1}", {value1: String(t.currency)})} className="space-y-4 rounded-3xl bg-[var(--color-uni-surface)] p-5">
   <p className="text-xs text-uni-muted">{t.currency}</p><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-medium">{t.balance<0?_uiText("Misafirin alacağı"):t.balance>0?_uiText("Misafirin kalan borcu"):_uiText("Kalan borç yok")}</h3><strong className="text-2xl tabular-nums">{money(Math.abs(t.balance),t.currency, _uiLocale)}</strong></div>
   <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-uni-muted">{_uiText("Toplam ücret")}</dt><dd className="mt-1 font-semibold">{money(t.charges,t.currency, _uiLocale)}</dd></div><div><dt className="text-xs text-uni-muted">{_uiText("Alınan ödeme / kapora")}</dt><dd className="mt-1 font-semibold">{money(t.paid,t.currency, _uiLocale)}</dd></div></dl>
   {t.refunds!==0&&<p className="flex justify-between gap-3 text-sm"><span>{_uiText("Yapılmış iade")}</span><strong>{money(t.refunds,t.currency, _uiLocale)}</strong></p>}
   {t.security_deposit!==0&&<p className="flex justify-between gap-3 text-sm"><span>{_uiText("Eldeki güvence depozitosu")}</span><strong>{money(t.security_deposit,t.currency, _uiLocale)}</strong></p>}
   {t.pending_refunds!==0&&<p className="flex justify-between gap-3 text-sm"><span>{_uiText("Bekleyen iade")}</span><strong>{money(t.pending_refunds,t.currency, _uiLocale)}</strong></p>}
  </section>)}
  <button type="button" className={`${secondaryStyle} w-full !rounded-full`} aria-expanded={expanded} aria-controls={detailsId} onClick={()=>setExpanded(v=>!v)}>{expanded?<ChevronUp size={18}/>:<ChevronDown size={18}/>} {expanded?_uiText("Detayları gizle"):_uiText("Detayları göster")} · {f.lines.length} {_uiText("hareket")}</button>
  <div id={detailsId} hidden={!expanded} className="space-y-4">
   <div className="text-xs text-uni-muted"><p>{_uiText("Planlanan:")} {date(f.booking.check_in, _uiLocale)} — {date(f.booking.check_out, _uiLocale)}</p>{f.booking.actual_check_in&&<p className="mt-1">{_uiText("Gerçek giriş:")} {date(f.booking.actual_check_in, _uiLocale)}</p>}</div>
   <section className="space-y-2" aria-label={_uiText("Borç ve ödeme hareketleri")}>
    {f.lines.length===0&&<p className="text-sm text-uni-muted">{_uiText("Henüz hareket bulunmuyor.")}</p>}
    {f.lines.map(line=><article key={line.id} className="rounded-2xl bg-[var(--color-uni-surface)] p-4"><div className="flex justify-between gap-3"><h4 className="text-sm font-medium">{line.label}</h4><strong className="whitespace-nowrap text-sm">{money(line.amount_minor,line.currency, _uiLocale)}</strong></div><p className="mt-1 text-xs text-uni-muted">{kinds[line.kind]||line.kind}{line.status==='pending'?_uiText(" · Bekliyor"):''}{line.channel?_uiText(" · {value1}", {value1: String(paymentOptions.find(p=>p.value===line.channel)?.label||line.channel)}):''}</p>{(line.unit_price_minor??0)>0&&<p className="mt-2 text-xs text-uni-muted">{line.quantity} {line.kind==='charge'?_uiText("gece"):_uiText("adet")} × {money(line.unit_price_minor!,line.currency, _uiLocale)}</p>}<p className="mt-2 text-xs text-uni-muted">{date(line.at, _uiLocale)}{line.actor?_uiText(" · {value1}", {value1: String(line.actor)}):''}</p>{line.notes&&<p className="mt-2 text-xs whitespace-pre-wrap break-words">{line.notes}</p>}{onChanged&&line.kind==='income'&&(line.unit_price_minor??0)>0&&[BookingState.Confirmed,BookingState.CheckedIn].some(status=>status===f.booking.status)&&<VoidFolioService id={line.id} booking={f.booking} onSaved={onChanged}/>}</article>)}
   </section>
   {f.notes.length>0&&<ul className="list-disc space-y-2 pl-5 text-xs leading-5 text-uni-muted">{f.notes.map(note=><li key={note}>{note}</li>)}</ul>}
  </div>
 </div>;
}
export function CheckoutFolio({booking,onClose,onSaved}:{booking:Booking;onClose:()=>void;onSaved:()=>Promise<void>}){
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const [folio,setFolio]=useState<Folio|null>(null),[loading,setLoading]=useState(true),[serviceBusy,setServiceBusy]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[accept,setAccept]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setAccept(false);setFolio(null);command<Folio>('booking.folio',{branch_id:booking.branch_id,booking_id:booking.booking_id}).then(f=>{if(active){setFolio(f);setError('')}}).catch(e=>{if(active)setError(messageOf(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[booking.booking_id,booking.branch_id,revision]);
 const complete=async()=>{if(!folio)return;setBusy(true);setError('');try{await command('booking.transition',{branch_id:booking.branch_id,booking_id:booking.booking_id,action:'check_out',folio_token:folio.token,accept_balance:accept});await onSaved();onClose()}catch(e){setError(messageOf(e))}finally{setBusy(false)}};
 return <ResponsiveDialog open title={_uiText("Çıkış öncesi oda folyosu")} subtitle={_uiText("{value1}", {value1: String(booking.guest_name)})} icon={ReceiptText} busy={busy||serviceBusy} onClose={()=>{if(!busy&&!serviceBusy)onClose()}}><div className="space-y-5 pb-5"><ErrorMessage message={error}/>{loading?<p role="status">{_uiText("Folyo ve güncel bakiyeler yükleniyor…")}</p>:folio&&<><FolioDetails folio={folio} onChanged={()=>setRevision(v=>v+1)}/><FolioServices compact booking={folio.booking} onBusyChange={setServiceBusy} onSaved={()=>setRevision(v=>v+1)}/></>}{folio?.needs_acknowledgement&&<Switch label={_uiText("Açık borç, iade ve güvence bakiyelerini inceledim; bu bakiyeler korunarak çıkışı onaylıyorum")} checked={accept} onChange={setAccept} disabled={busy}/>}
 <div className="flex flex-wrap gap-2 justify-end"><button type="button" className={`${secondaryStyle} !rounded-full`} disabled={busy||serviceBusy||loading} onClick={()=>setRevision(v=>v+1)}>{_uiText("Folyoyu yenile")}</button><button type="button" className={`${secondaryStyle} !rounded-full`} disabled={busy||serviceBusy} onClick={onClose}>{_uiText("Vazgeç")}</button><button type="button" className={`${buttonStyle} !rounded-full`} disabled={busy||serviceBusy||loading||!folio||folio.booking.status!==BookingState.CheckedIn||!!folio.needs_acknowledgement&&!accept} onClick={complete}>{busy?_uiText("Çıkış tamamlanıyor…"):_uiText("Çıkışı tamamla")}</button></div></div></ResponsiveDialog>;
}
