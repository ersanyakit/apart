"use client";
import { useI18n } from "./I18n";

import React,{useEffect,useState} from 'react';
import {command,messageOf,type Booking} from '../lib/api';
import {FolioDetails,type Folio} from './CheckoutFolio';
import {FolioServices} from './FolioServices';
import {ErrorMessage,secondaryStyle} from './FormKit';
export function RoomFolio({booking,onDocuments,onPayment,refreshKey}:{booking:Booking;onDocuments:()=>void;onPayment?:()=>void;refreshKey?:number}){
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const [folio,setFolio]=useState<Folio|null>(null),[revision,setRevision]=useState(0),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;setLoading(true);setError('');command<Folio>('booking.folio',{branch_id:booking.branch_id,booking_id:booking.booking_id}).then(f=>{if(active)setFolio(f)}).catch(e=>{if(active)setError(messageOf(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[booking.booking_id,booking.branch_id,revision,refreshKey]);
 return <div className="space-y-5"><ErrorMessage message={error}/><div className="flex flex-wrap gap-2"><button type="button" className={secondaryStyle} onClick={onDocuments}>{_uiText("Sözleşme ve Dekontlar")}</button>{onPayment&&<button type="button" className={secondaryStyle} onClick={onPayment}>{_uiText("Tahsilat al")}</button>}<button type="button" className={secondaryStyle} disabled={loading} onClick={()=>setRevision(v=>v+1)}>{_uiText("Folyoyu yenile")}</button></div>{loading?<p role="status">{_uiText("Oda hesabı yükleniyor…")}</p>:folio&&<><FolioDetails folio={folio} onChanged={()=>setRevision(v=>v+1)}/><FolioServices compact booking={folio.booking} onSaved={()=>setRevision(v=>v+1)}/></>}</div>
}
