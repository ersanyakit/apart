import { useI18n } from "./I18n";
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
  const {m: _uiText, locale: _uiLocale} = useI18n();

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
    if(note.trim().length>2000||(required&&note.trim().length<10)){setError(required?_uiText("Açıklamayı en az 10, en fazla 2000 karakterle yazın."):_uiText("Açıklama en fazla 2000 karakter olabilir."));return;}
    if(clean&&!people.some(p=>p.user_id===cleaner)){setError(_uiText("Temizliği yapan personeli seçin."));return;}
    setBusy(true);onBusyChange?.(true);setError('');
    try{
      await command('room.state',{room_id:room.room_id,status:selected,...(clean?{last_cleaning:{cleaner_id:cleaner,note:note.trim()}}:{status_reason:note.trim()})});
      await onSaved();onClose();
    }catch(e){setError(messageOf(e));}finally{setBusy(false);onBusyChange?.(false);}
  };
  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.context}><strong>{_uiText("Oda")} {room.code}</strong><span>{_uiText("Mevcut durum:")} {<RoomCondition status={room.status}/>}</span></div>
    <fieldset disabled={busy}>
      <div className={styles.masters} role="group" aria-label={_uiText("Yeni oda durumu")}>
        {allowedStatuses.map(status=>{const color=STATUS_PALETTE[roomStatusKey(status)];return <button key={status} type="button" aria-pressed={selected===status} style={{'--state-accent':color.accent,'--state-background':color.background,'--state-text':color.text} as React.CSSProperties} onClick={()=>{setSelected(status);setError('');}}><RoomConditionIcon status={status} size={48}/>{_uiText(color.label)}</button>})}
      </div>
      {!selected ? <p className={styles.description}>{_uiText("Detaylarını girmek için yeni oda durumunu seçin. Değişiklik yalnızca kaydettiğinizde uygulanır.")}</p> : <section className={styles.detail} aria-label={_uiText("{value1} detayları", {value1: String(palette.label)})}>
        <div><h3>{clean?_uiText("Temizlik kaydı"):_uiText("{value1} · Durum açıklaması", {value1: String(palette.label)})}</h3><p>{clean?_uiText("Temizliği yapan personeli seçin ve varsa temizlik notunu ekleyin."):selected===RoomState.Dirty?_uiText("Temizlik ekibine iletmek istediğiniz bilgileri yazabilirsiniz."):selected===RoomState.Maintenance?_uiText("Yapılacak tadilatı ve oda kullanımıyla ilgili bilgileri açıklayın."):_uiText("Arızayı, etkilediği alanı ve gerekli müdahaleyi açıklayın.")}</p></div>
        {clean&&<><InlineSelectField label={_uiText("Temizliği yapan personel")} value={cleaner} onChange={setCleaner} options={[{value:'',label:loading?_uiText("Personel yükleniyor…"):_uiText("Personel seçin")},...people.map(p=>({value:p.user_id,label:p.name}))]}/>{!loading&&!people.length&&!error&&<p className={styles.description}>{_uiText("Bu tesise atanmış personel bulunamadı.")}</p>}</>}
        <TextAreaField label={clean?_uiText("Temizlik notu (isteğe bağlı)"):required?_uiText("Açıklama (zorunlu)"):_uiText("Açıklama (isteğe bağlı)")} value={note} onChange={value=>setDrafts(previous=>({...previous,[selected]:value}))} placeholder={selected===RoomState.Dirty?_uiText("Örn. Banyo ve havluların kontrol edilmesi gerekiyor."):_uiText("İşlemle ilgili bilgileri yazın.")}/>
        <p className={styles.counter}>{note.length} / 2000{required?_uiText(" · En az 10 karakter"):''}</p>
      </section>}
      <ErrorMessage message={error}/>
      <div className={styles.actions}><button type="button" className={secondaryStyle} onClick={onClose}>{_uiText("Vazgeç")}</button><button type="submit" className={buttonStyle} disabled={!selected||busy||(clean&&(loading||!cleaner))}>{busy?_uiText("Kaydediliyor…"):clean?_uiText("Temiz olarak kaydet"):_uiText("Durumu kaydet")}</button></div>
    </fieldset>
  </form>;
}
