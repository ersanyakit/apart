"use client";
import { BookingStatus as BookingState } from '../../lib/statuses.generated';

import React, {useEffect, useState} from 'react';
import {CalendarDays, ChevronDown, ChevronUp, MessageSquare, RefreshCw, ShieldAlert, Star} from 'lucide-react';
import {command, messageOf, bookingStatuses, type Snapshot} from '../../lib/api';
import {SettingsEditor} from '../SettingsEditor';
import {NavigationIcon} from '../NavigationIcon';
import {ErrorMessage, secondaryStyle, buttonStyle} from '../FormKit';
import {InlineSelectField} from '../fields';
import {Pagination} from '../Pagination';
import {CustomerComments, GuestAssessment, BlacklistNotice, assessmentDate, type Reputation, type AssessmentTarget} from '../GuestAssessment';
import type {Customer} from './CustomerList';
import styles from './ReportsView.module.css';
import {customerCountry} from './customer-format';
import {display} from './model';

const nil='00000000-0000-0000-0000-000000000000';
export type CustomerStay={daily_price_minor:number;currency:string;booking_nights:number;lodging_amount_minor:number;guest_id:string;name:string;booking_id:string;branch_id:string;branch_name:string;room_id:string;room_code:string;start:string;end:string;status:string;booking_notes:string;guest_note:string;cancellation_reason?:string;companions:{guest_id:string;name:string}[]};
type StayPage={items:CustomerStay[];total:number;page:number};
const date=(v:string)=>new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'medium',timeStyle:'short'}).format(new Date(v));


export function CustomerDetail({snapshot:s,customer,onClose}:{snapshot:Snapshot;customer:Customer;onClose:()=>void}) {
 const [section,setSection]=useState<'history'|'comments'>('history'),[revision,setRevision]=useState(0);
 const [target,setTarget]=useState<AssessmentTarget|null>(null);
 const [reputation,setReputation]=useState<Reputation|null>(null),[reputationError,setReputationError]=useState(''),[loading,setLoading]=useState(true);
 const [ratingPage,setRatingPage]=useState(1),[ratingSize,setRatingSize]=useState(25);
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  setLoading(true);setReputation(null);setReputationError('');
  command<Reputation>('guest.reputation',{hotel_id:s.hotel_id,branch_id:nil,guest_id:customer.guest_id,unique:true,page:ratingPage,page_size:ratingSize},undefined,controller.signal)
   .then(r=>{if(active){const last=Math.max(1,Math.ceil(r.rating_count/ratingSize));if(ratingPage>last)setRatingPage(last);else setReputation(r)}})
   .catch(e=>{if(active&&!controller.signal.aborted)setReputationError(messageOf(e))})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false;controller.abort()};
 },[s.hotel_id,customer.guest_id,revision,ratingPage,ratingSize]);
 return <>
  {target&&<GuestAssessment snapshot={s} target={target} backLabel="Müşteri detayına dön" onClose={()=>{setTarget(null);setRevision(v=>v+1)}}/>}
  <div hidden={!!target}>
   <SettingsEditor fullWidth title={customer.name} icon={<NavigationIcon name="guests"/>} description="Müşteri bilgileri, tüm tesislerinizdeki konaklama geçmişi ve personel değerlendirmeleri." backLabel="Müşteri listesine dön" onClose={onClose}>
    <div className="space-y-6">
     <CustomerIdentity customer={customer}/>
     <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-3 text-sm" aria-live="polite">
       <span className="flex items-center gap-2 rounded-full bg-[var(--color-uni-surface)] px-4 py-3"><Star size={17} aria-hidden="true"/>{loading?'Puan yükleniyor…':reputation?reputation.rating_count?`${reputation.average.toLocaleString('tr-TR',{maximumFractionDigits:1})} / 5 · ${reputation.rating_count} değerlendirme`:'Henüz puan verilmemiş':'Puan bilgisi alınamadı'}</span>
       {reputation&&<span className={`flex items-center gap-2 rounded-full px-4 py-3 ${reputation.blacklist.length?'bg-rose-50 text-rose-800':'bg-[var(--color-uni-surface)] text-uni-muted'}`}><ShieldAlert size={17} aria-hidden="true"/>{reputation.blacklist.length?`${reputation.blacklist.length} aktif kara liste kaydı`:'Aktif kara liste kaydı yok'}</span>}
      </div>
      <button type="button" className={secondaryStyle} disabled={loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={17}/>Yenile</button>
     </div>
     <ErrorMessage message={reputationError}/>
     {reputation&&<BlacklistNotice items={reputation.blacklist}/>}
     <div className="flex flex-wrap gap-2" role="group" aria-label="Müşteri detay bölümleri">
      <button type="button" className={section==='history'?buttonStyle:secondaryStyle} aria-pressed={section==='history'} onClick={()=>setSection('history')}><CalendarDays size={18}/>Konaklama geçmişi</button>
      <button type="button" className={section==='comments'?buttonStyle:secondaryStyle} aria-pressed={section==='comments'} onClick={()=>setSection('comments')}><MessageSquare size={18}/>Yorumlar ve puanlar{reputation?` (${reputation.rating_count})`:''}</button>
     </div>
     <div hidden={section!=='history'}><CustomerHistory snapshot={s} customer={customer} revision={revision} onAssess={setTarget}/></div>
     <section hidden={section!=='comments'} aria-label="Müşteri yorumları ve puanları" className="space-y-4">
      <p className="text-sm text-uni-muted">Otelinizdeki personelin bu müşteri için yazdığı yorumlar ve puanlar. Yeni yorum eklemek için konaklama geçmişindeki ilgili kaydı seçin.</p>
      {loading?<p role="status">Yorumlar yükleniyor…</p>:reputation&&<CustomerComments data={reputation}/>}
      <Pagination label="Müşteri yorum sayfaları" noun="yorum" page={ratingPage} pageSize={ratingSize} total={reputation?.rating_count??0} busy={loading||!reputation} onPageChange={setRatingPage} onPageSizeChange={n=>{setRatingPage(1);setRatingSize(n)}}/>
     </section>
    </div>
   </SettingsEditor>
  </div>
 </>;
}
export function CustomerIdentity({customer}:{customer:Customer}) {
 const fields=[['Ad soyad',customer.name],['Kimlik / pasaport',customer.national_id],['Telefon',customer.phone],['Uyruk',customerCountry(customer.nationality).label],['Adres',customer.address]];
 return <section aria-label="Müşteri bilgileri" className="rounded-3xl bg-[var(--color-uni-surface)] p-5"><h3 className="mb-4 font-semibold">Müşteri bilgileri</h3><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([label,value])=><div key={label} className={label==='Adres'?'sm:col-span-2':''}><dt className="text-xs text-uni-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{label==='Uyruk'?<span className={styles.country}><img src={customerCountry(customer.nationality).flagSrc} alt="" aria-hidden="true" width={24} height={24} className={styles.countryFlag}/>{value}</span>:value||'Belirtilmemiş'}</dd></div>)}</dl></section>;
}

function CustomerHistory({snapshot:s,customer,revision,onAssess}:{snapshot:Snapshot;customer:Customer;revision:number;onAssess:(target:AssessmentTarget)=>void}) {
 const [page,setPage]=useState(1),[size,setSize]=useState(25),[status,setStatus]=useState(''),[branch,setBranch]=useState('');
 const [data,setData]=useState<StayPage|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();let active=true;setBusy(true);setError('');setData(null);
  command<StayPage>('guest.stays',{hotel_id:s.hotel_id,branch_id:branch||nil,guest_id:customer.guest_id,unique:true,status,sort:'start',desc:true,page,page_size:size},undefined,controller.signal)
   .then(r=>{if(active){const last=Math.max(1,Math.ceil(r.total/size));if(page>last)setPage(last);else setData(r)}})
   .catch(e=>{if(active&&!controller.signal.aborted)setError(messageOf(e))})
   .finally(()=>{if(active)setBusy(false)});
  return()=>{active=false;controller.abort()};
 },[s.hotel_id,customer.guest_id,branch,status,page,size,revision]);
 return <section aria-label="Müşteri konaklama geçmişi" className="space-y-4">
  <div className={styles.filters}>
   <InlineSelectField label="Konaklamanın tesisi" value={branch} onChange={v=>{setBranch(v);setPage(1)}} options={[{value:'',label:'Tüm tesisler'},...s.branches.map(b=>({value:b.branch_id!,label:b.name}))]}/>
   <InlineSelectField label="Kayıt türü" value={status} onChange={v=>{setStatus(v);setPage(1)}} options={[{value:'',label:'Gerçekleşen tüm konaklamalar'},{value:BookingState.CheckedIn,label:'Şu an konaklayan'},{value:BookingState.Completed,label:'Çıkış yapmış'},{value:BookingState.Confirmed,label:'Planlanan rezervasyonlar'},{value:BookingState.Cancelled,label:'İptal edilen rezervasyonlar'}]}/>
  </div>
  <p className="text-xs text-uni-muted">En yeni kayıt önce gösterilir. Oda değişiklikleri ayrı hareketler olarak listelenir. Konaklama bedeli rezervasyonun tamamına aittir; aynı rezervasyonun hareketlerinde tekrar görünür. Ek hizmetler ve tahsilatlar dahil değildir.</p>
  <ErrorMessage message={error}/>
  {busy?<p className={styles.empty} role="status">Konaklama geçmişi yükleniyor…</p>:data&&!data.items.length?<p className={styles.empty}>Bu seçimde konaklama kaydı bulunamadı. Diğer kayıt türlerini veya tesisleri kontrol edebilirsiniz.</p>:data&&<CustomerHistoryTable items={data.items} onAssess={onAssess}/>}
  <Pagination label="Müşteri konaklama geçmişi sayfaları" noun="hareket" page={page} pageSize={size} total={data?.total??0} busy={busy||!data} onPageChange={setPage} onPageSizeChange={n=>{setSize(n);setPage(1)}}/>
 </section>;
}
export function CustomerHistoryTable({items,onAssess}:{items:CustomerStay[];onAssess:(target:AssessmentTarget)=>void}) {
 const [expanded,setExpanded]=useState<string|null>(null);
 return <div className={styles.customerPanel}><div className={styles.customerScroller} tabIndex={0} role="region" aria-label="Konaklama geçmişi tablosu; yatay kaydırılabilir"><table className={`${styles.table} ${styles.customerTable}`} style={{minWidth:1120}}>
  <thead><tr><th scope="col">Tesis / Oda</th><th scope="col">Giriş</th><th scope="col">Çıkış</th><th scope="col">Durum</th><th scope="col">Konaklama bedeli</th><th scope="col">Notlar ve detay</th><th scope="col">İşlem</th></tr></thead>
  <tbody>{items.map((stay,i)=>{const key=`${stay.booking_id}-${stay.guest_id}-${stay.start}-${i}`;return <CustomerStayRow key={key} tone={i%2===0?'light':'dark'} rowId={key} stay={stay} expanded={expanded===key} onToggle={()=>setExpanded(v=>v===key?null:key)} onAssess={onAssess}/>})}</tbody>
 </table></div></div>;
}
export function CustomerStayRow({stay:r,expanded,onToggle,onAssess,rowId,tone='light'}:{tone?:'light'|'dark';stay:CustomerStay;expanded:boolean;rowId:string;onToggle:()=>void;onAssess:(target:AssessmentTarget)=>void}) {
 const planned=[BookingState.Confirmed,BookingState.Cancelled].some(status=>status===r.status);
 const noteCount=[r.booking_notes,r.guest_note,r.cancellation_reason].filter(Boolean).length;
 return <>
  <tr className={styles.customerRow} data-tone={tone} onClick={onToggle}>
   <td><strong className="font-semibold">{r.room_code}</strong><p className="mt-1 text-xs text-uni-muted">{r.branch_name}</p></td>
   <td className="whitespace-nowrap"><time dateTime={r.start}>{date(r.start)}</time>{planned&&<p className="mt-1 text-xs text-uni-muted">Planlanan</p>}</td>
   <td className="whitespace-nowrap"><time dateTime={r.end}>{date(r.end)}</time>{(planned||r.status===BookingState.CheckedIn)&&<p className="mt-1 text-xs text-uni-muted">Planlanan</p>}</td>
   <td><span className="whitespace-nowrap text-xs font-medium">{bookingStatuses[r.status]||r.status}</span></td>
   <td className="tabular-nums whitespace-nowrap">{r.daily_price_minor>0?<><strong className="font-semibold">{display(r.lodging_amount_minor,'money',r.currency||'TRY')}</strong><p className="mt-1 whitespace-normal text-xs text-uni-muted">{display(r.daily_price_minor,'money',r.currency||'TRY')} / gece · {r.booking_nights} gece</p>{r.status===BookingState.Cancelled&&<p className="mt-1 text-xs text-uni-muted">İptal öncesi bedel</p>}</>:<span className="text-xs text-uni-muted">Fiyat girilmemiş</span>}</td>
   <td><button type="button" className={secondaryStyle} aria-expanded={expanded} aria-controls={`stay-${rowId}`} onClick={e=>{e.stopPropagation();onToggle()}}>{expanded?<ChevronUp size={16}/>:<ChevronDown size={16}/>} {noteCount?`${noteCount} not`:'Detay'}</button></td>
   <td><button type="button" className={`${secondaryStyle} whitespace-nowrap`} onClick={e=>{e.stopPropagation();onAssess({guest_id:r.guest_id,name:r.name,branch_id:r.branch_id,booking_id:r.booking_id})}}><MessageSquare size={16}/>Yorum / puan ekle</button></td>
  </tr>
  {expanded&&<tr id={`stay-${rowId}`} data-tone={tone} className={styles.customerExpanded}><td colSpan={7}>
   <dl className="grid gap-5 sm:grid-cols-2 text-sm">
    <div><dt className="text-xs font-semibold text-uni-muted">Müşteriye özel not</dt><dd className="mt-2 whitespace-pre-wrap break-words leading-6">{r.guest_note||'Not eklenmemiş.'}</dd></div>
    <div><dt className="text-xs font-semibold text-uni-muted">Rezervasyon notu</dt><dd className="mt-2 whitespace-pre-wrap break-words leading-6">{r.booking_notes||'Not eklenmemiş.'}</dd></div>
    <div><dt className="text-xs font-semibold text-uni-muted">Birlikte konaklayanlar</dt><dd className="mt-2 leading-6">{r.companions?.length?r.companions.map(c=>c.name).join(', '):'Birlikte konaklayan kaydı yok.'}</dd></div>
    {r.cancellation_reason&&<div><dt className="text-xs font-semibold text-uni-muted">İptal gerekçesi</dt><dd className="mt-2 whitespace-pre-wrap break-words leading-6">{r.cancellation_reason}</dd></div>}
   </dl>
  </td></tr>}
 </>;
}

export { CustomerComments } from "../GuestAssessment";
