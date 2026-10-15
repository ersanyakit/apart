import React, { useState, useEffect } from 'react';
import { command, messageOf, type APIRoom } from '../lib/api';
import { BottomSheet } from './BottomSheet';
import { InlineSelectField, TextAreaField } from './fields';
import { ErrorMessage, buttonStyle, secondaryStyle } from './FormKit';

export function RoomCleaning({ room, onClose, onSaved }: {
  room: APIRoom; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [cleaner, setCleaner] = useState('');
  const [people,setPeople]=useState<{user_id:string;name:string;role:string}[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;command<{user_id:string;name:string;role:string}[]>('room.cleaners',{room_id:room.room_id}).then(items=>{if(active)setPeople(items)}).catch(error=>{if(active)setError(messageOf(error))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[room.room_id]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!people.some(person=>person.user_id===cleaner) || note.trim().length > 2000) {
      setError('Temizliği yapan personeli seçin. Not en fazla 2000 karakter olabilir.'); return;
    }
    setBusy(true); setError('');
    try {
      await command('room.state', { room_id: room.room_id, status: 'Temiz', last_cleaning: { cleaner_id: cleaner, note: note.trim() } });
      await onSaved(); onClose();
    } catch (error) { setError(messageOf(error)); }
    finally { setBusy(false); }
  };
  return <BottomSheet open title={`${room.code} · Temizlik kaydı`} onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={submit} className="space-y-5 pb-5">
      <p className="text-sm text-uni-muted">Temizliği yapan personeli seçin. Kaydettiğinizde oda durumu Temiz olarak güncellenecek.</p>
      <fieldset disabled={busy} className="space-y-5">
        <InlineSelectField label="Temizliği yapan personel" value={cleaner} onChange={setCleaner} options={[{value:'',label:loading?'Personel yükleniyor…':'Personel seçin'},...people.map(person=>({value:person.user_id,label:person.name}))]} />
        {!loading && !people.length && !error && <p className="text-sm text-uni-muted">Bu tesise atanmış personel bulunamadı. Personel tanımlarından tesis yetkisi olan bir personel ekleyin.</p>}
        <TextAreaField label="Temizlik notu (isteğe bağlı)" value={note} onChange={setNote} placeholder="Yapılan temizlik ve iletmek istediğiniz bilgiler" />
        <ErrorMessage message={error}/>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={`${secondaryStyle} !rounded-full`} onClick={onClose}>Vazgeç</button>
          <button type="submit" className={`${buttonStyle} !rounded-full`} disabled={busy || loading || !cleaner}>{busy ? 'Kaydediliyor…' : 'Temiz olarak kaydet'}</button>
        </div>
      </fieldset>
    </form>
  </BottomSheet>;
}
