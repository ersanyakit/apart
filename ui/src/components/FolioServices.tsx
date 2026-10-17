"use client";
import { useI18n } from "./I18n";

import React,{useRef,useState} from 'react';
import {Plus} from 'lucide-react';
import {command,messageOf,type Booking} from '../lib/api';
import {TextField,StepperField,MoneyField,InlineSelectField,TextAreaField,CURRENCIES, localizedCurrencies} from './fields';
import {ErrorMessage,buttonStyle,secondaryStyle} from './FormKit';
import {useNotifications} from './Toast';
import {categoriesFor} from './reports/options';
export function FolioServices({booking,onSaved,onBusyChange,compact=false}:{booking:Booking;onSaved:()=>void;onBusyChange?:(busy:boolean)=>void;compact?:boolean}){
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const notify=useNotifications();const [open,setOpen]=useState(false),[label,setLabel]=useState(''),[category,setCategory]=useState('service'),[quantity,setQuantity]=useState(1),[price,setPrice]=useState(0),[currency,setCurrency]=useState('TRY'),[notes,setNotes]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const retry=useRef<{payload:string;id:string}|null>(null);
 if(!['confirmed','checked_in'].includes(booking.status))return <p className="text-xs text-uni-muted">{_uiText("Bu konaklama kapalı; folyo geçmişi görüntülenebilir.")}</p>;
 const amount=Number(quantity)*price,valid=Number.isInteger(Number(quantity))&&Number(quantity)>0&&Number(quantity)<=10000&&price>0&&price<=1000000000&&amount<=999999999999;
 return <section className={compact?"space-y-4":"rounded-3xl bg-[var(--color-uni-surface)] p-5 space-y-4"}>
  <div className="flex flex-wrap items-center justify-between gap-3">{!compact&&<div><h3 className="font-semibold">{_uiText("Odaya hizmet ekle")}</h3><p className="mt-1 text-xs text-uni-muted">{_uiText("Hizmet tutarı oda borcuna eklenir. Tahsilat ayrı kaydedilir.")}</p></div>}<button type="button" className={secondaryStyle} disabled={busy} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Plus size={16}/>{open?_uiText("Formu kapat"):_uiText("Hizmet kalemi ekle")}</button></div>
  {open&&<form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(!valid||busy)return;setBusy(true);onBusyChange?.(true);setError('');const input={branch_id:booking.branch_id,booking_id:booking.booking_id,label:label.trim(),category,quantity:Number(quantity),unit_price_minor:price,currency,notes:notes.trim()};const payload=JSON.stringify(input);if(retry.current?.payload!==payload)retry.current={payload,id:crypto.randomUUID()};try{await command('booking.folio.service',{...input,id:retry.current.id});retry.current=null;setLabel('');setPrice(0);setQuantity(1);setNotes('');notify(_uiText("Hizmet oda folyosuna eklendi."));onSaved()}catch(e){setError(messageOf(e))}finally{setBusy(false);onBusyChange?.(false)}}}>
   <ErrorMessage message={error}/><div className="flex flex-wrap gap-2">{[['Kahvaltı','food'],['Çamaşırhane','laundry'],['Mini bar','food'],['Ek yatak','extra_bed'],['Transfer','service'],['Erken giriş','early_late'],['Geç çıkış','early_late']].map(([text,cat])=><button type="button" key={text} className={secondaryStyle} disabled={busy} onClick={()=>{setLabel(text);setCategory(cat)}}>{text}</button>)}</div>
   <div className="grid sm:grid-cols-2 gap-3"><TextField label={_uiText("Hizmet adı")} value={label} onChange={setLabel} maxLength={200} required disabled={busy}/><InlineSelectField label={_uiText("Gelir kategorisi")} value={category} onChange={setCategory} options={categoriesFor('income')} disabled={busy}/><StepperField label={_uiText("Adet")} value={quantity} onChange={setQuantity} min={1} max={10000} disabled={busy}/><MoneyField label={_uiText("Birim fiyat")} valueMinor={price} onChange={setPrice} disabled={busy}/><InlineSelectField label={_uiText("Para birimi")} value={currency} onChange={setCurrency} options={localizedCurrencies(_uiLocale).map(c=>({value:c.id,label:c.label}))} disabled={busy}/></div>
   <TextAreaField label={_uiText("Açıklama (isteğe bağlı)")} value={notes} onChange={v=>setNotes(v.slice(0,2000))} disabled={busy}/>
   <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{_uiText("Kalem toplamı:")} <strong>{valid?new Intl.NumberFormat(_uiLocale,{style:'currency',currency}).format(amount/100):_uiText("Adet ve fiyat girin")}</strong></p><button type="submit" className={buttonStyle} disabled={busy||!valid||!label.trim()}>{busy?_uiText("Ekleniyor…"):_uiText("Folyoya ekle")}</button></div>
  </form>}
 </section>;
}
export function VoidFolioService({id,booking,onSaved}:{id:string;booking:Booking;onSaved:()=>void}){
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const [open,setOpen]=useState(false),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);const notify=useNotifications();
 return <div className="mt-3">{!open?<button type="button" className={secondaryStyle} onClick={()=>setOpen(true)}>{_uiText("Kalemi iptal et")}</button>:<form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await command('booking.folio.service.void',{id,branch_id:booking.branch_id,booking_id:booking.booking_id,reason});notify(_uiText("Hizmet kalemi gerekçesiyle iptal edildi."));onSaved()}catch(e){setError(messageOf(e))}finally{setBusy(false)}}}><ErrorMessage message={error}/><TextField label={_uiText("İptal gerekçesi")} value={reason} onChange={setReason} minLength={3} maxLength={500} required disabled={busy}/><div className="flex gap-2"><button className={secondaryStyle} disabled={busy||reason.trim().length<3}>{_uiText("İptali kaydet")}</button><button type="button" className={secondaryStyle} disabled={busy} onClick={()=>setOpen(false)}>{_uiText("Vazgeç")}</button></div></form>}</div>
}
