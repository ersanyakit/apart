"use client";
import { useI18n } from "./I18n";

import React,{useRef,useState} from 'react';
import { Wrench, CalendarX2 } from 'lucide-react';
import {command,messageOf,type APIRoom,type Booking} from '../lib/api';
import { RoomOperationDialog } from './RoomOperationDialog';
import {TextAreaField,InlineSelectField} from './fields';
import {ErrorMessage,buttonStyle,secondaryStyle} from './FormKit';
import styles from './RoomOperationDialog.module.css';
export type ReasonOperation={kind:'cancel';booking:Booking}|{kind:'issue';rooms:APIRoom[]};
export function OperationReason({operation:o,onClose,onSaved}:{operation:ReasonOperation;onClose:()=>void;onSaved:()=>Promise<void>}){
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const [reason,setReason]=useState(''),[room,setRoom]=useState(o.kind==='issue'?(o.rooms[0]?.room_id||''):''),[priority,setPriority]=useState('normal'),[busy,setBusy]=useState(false),[error,setError]=useState('');const request=useRef({payload:'',id:''});
 const cancel=o.kind==='cancel';
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;if(reason.trim().length<10||reason.trim().length>2000){setError(_uiText("Gerekçeyi en az 10, en fazla 2000 karakterle açıklayın."));return}setBusy(true);setError('');try{if(o.kind==='cancel')await command('booking.transition',{branch_id:o.booking.branch_id,booking_id:o.booking.booking_id,action:'cancel',reason:reason.trim()});else{const payload={room_id:room,priority,description:reason.trim()},serialized=JSON.stringify(payload);if(request.current.payload!==serialized)request.current={payload:serialized,id:crypto.randomUUID()};await command('room.issue',{...payload,id:request.current.id})}await onSaved();onClose()}catch(e){setError(messageOf(e))}finally{setBusy(false)}};
 return <RoomOperationDialog title={cancel?_uiText("Rezervasyonu iptal et"):_uiText("Arıza bildir")} subtitle={cancel?o.booking.guest_name:_uiText("Bakım ve teknik servis")} icon={cancel?CalendarX2:Wrench} busy={busy} onClose={onClose}>
   <form className={styles.form} onSubmit={submit}><fieldset disabled={busy}>
     <p className={styles.description}>{cancel?_uiText("Rezervasyon iptal edilecek. Mevcut tahsilatlar korunur; gerekiyorsa ayrıca iade işlemi kaydedilir."):_uiText("Açık bakım kaydı oluşturulur. Oda durumu ve mevcut konaklama değişmez.")}</p>
     {o.kind==='issue'&&<><InlineSelectField label={_uiText("Arızanın bulunduğu birim")} value={room} onChange={setRoom} options={o.rooms.map(r=>({value:r.room_id,label:r.code}))}/><InlineSelectField label={_uiText("Öncelik")} value={priority} onChange={setPriority} options={[['normal','Normal'],['high','Yüksek'],['urgent','Acil']].map(([value,label])=>({value,label}))}/></>}
     <TextAreaField label={cancel?_uiText("İptal gerekçesi (zorunlu)"):_uiText("Arıza açıklaması (zorunlu)")} value={reason} onChange={setReason} placeholder={_uiText("İşlemin nedenini açıkça yazın.")}/>
     <p className={styles.counter}>{reason.length} {_uiText("/ 2000 · En az 10 karakter")}</p>
     <ErrorMessage message={error}/>
     <div className={styles.actions}><button type="button" className={secondaryStyle} onClick={onClose}>{_uiText("Vazgeç")}</button><button type="submit" className={buttonStyle} disabled={busy||(o.kind==='issue'&&!room)}>{busy?_uiText("Kaydediliyor…"):cancel?_uiText("Gerekçeyle iptal et"):_uiText("Arızayı bildir")}</button></div>
   </fieldset></form>
 </RoomOperationDialog>;
}
