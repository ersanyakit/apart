"use client";
import React,{useRef,useState} from 'react';
import { Wrench, CalendarX2 } from 'lucide-react';
import {command,messageOf,type APIRoom,type Booking} from '../lib/api';
import type { RoomStatus } from '../types';
import { RoomOperationDialog } from './RoomOperationDialog';
import { RoomStateEditor } from './RoomStateEditor';
import {TextAreaField,InlineSelectField} from './fields';
import {ErrorMessage,buttonStyle,secondaryStyle} from './FormKit';
import styles from './RoomOperationDialog.module.css';
export type ReasonOperation={kind:'cancel';booking:Booking}|{kind:'state';room:APIRoom;status:string}|{kind:'issue';rooms:APIRoom[]};
export function OperationReason({operation:o,onClose,onSaved}:{operation:ReasonOperation;onClose:()=>void;onSaved:()=>Promise<void>}){
 const [reason,setReason]=useState(''),[room,setRoom]=useState(o.kind==='issue'?(o.rooms[0]?.room_id||''):''),[priority,setPriority]=useState('normal'),[busy,setBusy]=useState(false),[error,setError]=useState('');const request=useRef({payload:'',id:''});
 if(o.kind==='state')return <RoomOperationDialog title="Oda durumunu değiştir" subtitle={`Oda ${o.room.code}`} icon={Wrench} busy={busy} onClose={onClose}><RoomStateEditor room={o.room} allowedStatuses={[o.status as RoomStatus]} initialStatus={o.status} onBusyChange={setBusy} onClose={onClose} onSaved={onSaved}/></RoomOperationDialog>;
 const cancel=o.kind==='cancel';
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;if(reason.trim().length<10||reason.trim().length>2000){setError('Gerekçeyi en az 10, en fazla 2000 karakterle açıklayın.');return}setBusy(true);setError('');try{if(o.kind==='cancel')await command('booking.transition',{branch_id:o.booking.branch_id,booking_id:o.booking.booking_id,action:'cancel',reason:reason.trim()});else{const payload={room_id:room,priority,description:reason.trim()},serialized=JSON.stringify(payload);if(request.current.payload!==serialized)request.current={payload:serialized,id:crypto.randomUUID()};await command('room.issue',{...payload,id:request.current.id})}await onSaved();onClose()}catch(e){setError(messageOf(e))}finally{setBusy(false)}};
 return <RoomOperationDialog title={cancel?'Rezervasyonu iptal et':'Arıza bildir'} subtitle={cancel?o.booking.guest_name:'Bakım ve teknik servis'} icon={cancel?CalendarX2:Wrench} busy={busy} onClose={onClose}>
   <form className={styles.form} onSubmit={submit}><fieldset disabled={busy}>
     <p className={styles.description}>{cancel?'Rezervasyon iptal edilecek. Mevcut tahsilatlar korunur; gerekiyorsa ayrıca iade işlemi kaydedilir.':'Açık bakım kaydı oluşturulur. Oda durumu ve mevcut konaklama değişmez.'}</p>
     {o.kind==='issue'&&<><InlineSelectField label="Arızanın bulunduğu birim" value={room} onChange={setRoom} options={o.rooms.map(r=>({value:r.room_id,label:r.code}))}/><InlineSelectField label="Öncelik" value={priority} onChange={setPriority} options={[['normal','Normal'],['high','Yüksek'],['urgent','Acil']].map(([value,label])=>({value,label}))}/></>}
     <TextAreaField label={cancel?'İptal gerekçesi (zorunlu)':'Arıza açıklaması (zorunlu)'} value={reason} onChange={setReason} placeholder="İşlemin nedenini açıkça yazın."/>
     <p className={styles.counter}>{reason.length} / 2000 · En az 10 karakter</p>
     <ErrorMessage message={error}/>
     <div className={styles.actions}><button type="button" className={secondaryStyle} onClick={onClose}>Vazgeç</button><button type="submit" className={buttonStyle} disabled={busy||(o.kind==='issue'&&!room)}>{busy?'Kaydediliyor…':cancel?'Gerekçeyle iptal et':'Arızayı bildir'}</button></div>
   </fieldset></form>
 </RoomOperationDialog>;
}
