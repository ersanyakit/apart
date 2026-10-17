import { RoomCondition, RoomConditionIcon } from './RoomCondition';
import {roomRequiresReason} from "../lib/statuses";
import { RoomStatus as RoomState } from '../lib/statuses.generated';
import React, { useEffect, useState } from 'react';
import { command, messageOf, type APIRoom } from '../lib/api';
import { STATUS_PALETTE, roomStatusKey } from '../lib/status-palette';
import type { RoomStatus } from '../lib/statuses.generated';
import { InlineSelectField, TextAreaField } from './fields';
import { ErrorMessage, buttonStyle, secondaryStyle } from './FormKit';
import styles from './RoomOperationDialog.module.css';

export function RoomStateEditor({room, allowedStatuses, initialStatus, onSaved, onClose, onBusyChange}: {
  room: APIRoom; allowedStatuses: RoomStatus[]; initialStatus?: string;
  onSaved: () => Promise<void>; onClose: () => void; onBusyChange?: (busy: boolean) => void;
}) {
  const [selected,setSelected]=useState(initialStatus || '');
  const [drafts,setDrafts]=useState<Record<string,string>>({[room.status]:room.status_reason || ''});
  const [cleaner,setCleaner]=useState('');
  const [people,setPeople]=useState<{user_id:string;name:string}[]>([]);
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const note=drafts[selected] || '';
  const clean=selected===RoomState.Clean, required=roomRequiresReason(selected);
  const palette=STATUS_PALETTE[roomStatusKey(selected)];
  useEffect(()=>{
    if(!clean)return;
    let active=true;setLoading(true);
    command<{user_id:string;name:string}[]>('room.cleaners',{room_id:room.room_id}).then(rows=>{if(active)setPeople(rows)}).catch(e=>{if(active)setError(messageOf(e))}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[clean,room.room_id]);
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(busy||!allowedStatuses.includes(selected as RoomStatus))return;
    if(note.trim().length>2000||(required&&note.trim().length<10)){setError(required?'Açıklamayı en az 10, en fazla 2000 karakterle yazın.':'Açıklama en fazla 2000 karakter olabilir.');return;}
    if(clean&&!people.some(p=>p.user_id===cleaner)){setError('Temizliği yapan personeli seçin.');return;}
    setBusy(true);onBusyChange?.(true);setError('');
    try{
      await command('room.state',{room_id:room.room_id,status:selected,...(clean?{last_cleaning:{cleaner_id:cleaner,note:note.trim()}}:{status_reason:note.trim()})});
      await onSaved();onClose();
    }catch(e){setError(messageOf(e));}finally{setBusy(false);onBusyChange?.(false);}
  };
  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.context}><strong>Oda {room.code}</strong><span>Mevcut durum: {<RoomCondition status={room.status}/>}</span></div>
    <fieldset disabled={busy}>
      <div className={styles.masters} role="group" aria-label="Yeni oda durumu">
        {allowedStatuses.map(status=>{const color=STATUS_PALETTE[roomStatusKey(status)];return <button key={status} type="button" aria-pressed={selected===status} style={{'--state-accent':color.accent,'--state-background':color.background,'--state-text':color.text} as React.CSSProperties} onClick={()=>{setSelected(status);setError('');}}><RoomConditionIcon status={status} size={48}/>{color.label}</button>})}
      </div>
      {!selected ? <p className={styles.description}>Detaylarını girmek için yeni oda durumunu seçin. Değişiklik yalnızca kaydettiğinizde uygulanır.</p> : <section className={styles.detail} aria-label={`${palette.label} detayları`}>
        <div><h3>{clean?'Temizlik kaydı':`${palette.label} · Durum açıklaması`}</h3><p>{clean?'Temizliği yapan personeli seçin ve varsa temizlik notunu ekleyin.':selected===RoomState.Dirty?'Temizlik ekibine iletmek istediğiniz bilgileri yazabilirsiniz.':selected===RoomState.Maintenance?'Yapılacak tadilatı ve oda kullanımıyla ilgili bilgileri açıklayın.':'Arızayı, etkilediği alanı ve gerekli müdahaleyi açıklayın.'}</p></div>
        {clean&&<><InlineSelectField label="Temizliği yapan personel" value={cleaner} onChange={setCleaner} options={[{value:'',label:loading?'Personel yükleniyor…':'Personel seçin'},...people.map(p=>({value:p.user_id,label:p.name}))]}/>{!loading&&!people.length&&!error&&<p className={styles.description}>Bu tesise atanmış personel bulunamadı.</p>}</>}
        <TextAreaField label={clean?'Temizlik notu (isteğe bağlı)':required?'Açıklama (zorunlu)':'Açıklama (isteğe bağlı)'} value={note} onChange={value=>setDrafts(previous=>({...previous,[selected]:value}))} placeholder={selected===RoomState.Dirty?'Örn. Banyo ve havluların kontrol edilmesi gerekiyor.':'İşlemle ilgili bilgileri yazın.'}/>
        <p className={styles.counter}>{note.length} / 2000{required?' · En az 10 karakter':''}</p>
      </section>}
      <ErrorMessage message={error}/>
      <div className={styles.actions}><button type="button" className={secondaryStyle} onClick={onClose}>Vazgeç</button><button type="submit" className={buttonStyle} disabled={!selected||busy||(clean&&(loading||!cleaner))}>{busy?'Kaydediliyor…':clean?'Temiz olarak kaydet':'Durumu kaydet'}</button></div>
    </fieldset>
  </form>;
}
