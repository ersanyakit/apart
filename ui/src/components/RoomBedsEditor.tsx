import React, { useEffect, useState } from 'react';
import { BedDouble, Plus, Minus, Trash2 } from 'lucide-react';
import { command, messageOf } from '../lib/api';
import { BED_PRESETS, applyBedPreset, matchBedPreset, type Bed } from '../lib/bed-presets';
import { BedPresetPicker } from './BedPresetPicker';
import styles from './RoomRentalSetup.module.css';
export {roomBedsPayload,type RoomBedChoice} from '../lib/room-beds';
import type {RoomBedChoice} from '../lib/room-beds';
export function RoomBedsEditor({ roomId, branchId, value, onChange, disabled, rentalMode = "", compact = false }: {
  roomId?: string; branchId: string; value: RoomBedChoice[]; onChange: (value: RoomBedChoice[]) => void; disabled: boolean; rentalMode?: "" | "room" | "beds"; compact?: boolean;
}) {
  const [existing, setExisting] = useState<Bed[]>([]), [error, setError] = useState('');
  useEffect(() => {
    if (!roomId) return;
    const controller = new AbortController();
    command<Bed[]>('bed.list', { branch_id: branchId }, undefined, controller.signal)
      .then(beds => { if (!controller.signal.aborted) setExisting((beds || []).filter(b => b.room_id === roomId)); })
      .catch(e => { if (!controller.signal.aborted) setError(messageOf(e)); });
    return () => controller.abort();
  }, [roomId, branchId]);
  const count = value.reduce((sum, v) => sum + v.count * BED_PRESETS.find(p=>p.key===v.preset)!.physical_count, 0);
  return <section className="space-y-3" aria-label="Odadaki yataklar">
    <h3 className="flex items-center gap-2 text-base font-uninav-book"><BedDouble size={20} />Odadaki yataklar</h3>
    <p className="text-sm text-uni-muted">Yatak türünü ve adedini seçin. Odayla birlikte kaydedilir ve 3 boyutlu görünümde gösterilir.</p>
    {error && <p role="alert" className="text-sm text-red-600">Mevcut yataklar alınamadı: {error}</p>}
    {existing.length > 0 && <div className="rounded-2xl bg-uni-surface p-4 space-y-2"><p className="text-xs text-uni-muted">Kayıtlı yataklar · ayrıntıları Yataklar bölümünden düzenleyebilirsiniz.</p>{existing.map(b => <p key={b.bed_id} className="text-sm">{b.code} · {matchBedPreset(b)?.label || b.type} · {b.width_cm} × {b.length_cm} cm</p>)}</div>}
    <fieldset disabled={disabled} className="min-w-0 space-y-3">
      <BedPresetPicker compact={compact} adding disabled={disabled || count >= 100} onSelect={preset => {
        if (count + preset.physical_count > 100) return;
        const found = value.find(v => v.preset === preset.key);
        onChange(found ? value.map(v => v.id === found.id ? { ...v, count:v.count+1 } : v) : [...value,{id:crypto.randomUUID(),preset:preset.key,count:1}]);
      }}/>
      {value.map(choice => {
        const preset = BED_PRESETS.find(p => p.key === choice.preset)!;
        return <div key={choice.id} className={styles.row}>
          <span>{preset.label}<small>{choice.count * preset.bed_places} yatak yeri · {choice.count * preset.capacity} kişi</small></span>
          <div className={styles.counter}>
            <button type="button" className="uni-control nav-icon-button" disabled={disabled || choice.count<=1} aria-label={`${preset.label} azalt`} onClick={()=>onChange(value.map(v=>v.id===choice.id?{...v,count:v.count-1}:v))}><Minus size={16}/></button>
            <output aria-label={`${preset.label} adedi`}>{choice.count}</output>
            <button type="button" className="uni-control nav-icon-button" disabled={disabled || count+ preset.physical_count>100} aria-label={`${preset.label} artır`} onClick={()=>onChange(value.map(v=>v.id===choice.id?{...v,count:v.count+1}:v))}><Plus size={16}/></button>
            <button type="button" disabled={disabled} className="uni-control nav-icon-button" aria-label={`${preset.label} kaldır`} onClick={()=>onChange(value.filter(v=>v.id!==choice.id))}><Trash2 size={16}/></button>
          </div>
        </div>;
      })}
    </fieldset>
    {(count>0 || existing.length>0) && <div className={styles.summary} role="status" aria-label="Yatak düzeni özeti">
      {existing.length+count} fiziksel yatak · {existing.reduce((n,b)=>n+b.places.filter(p=>p.is_active).length,0)+value.reduce((n,v)=>n+v.count*BED_PRESETS.find(p=>p.key===v.preset)!.bed_places,0)} yatak yeri · {existing.reduce((n,b)=>n+b.places.filter(p=>p.is_active).reduce((sum,p)=>sum+p.capacity,0),0)+value.reduce((n,v)=>{const p=BED_PRESETS.find(p=>p.key===v.preset)!;return n+v.count*p.capacity;},0)} kişilik yatak kapasitesi.
      <br/>{rentalMode==='beds'?'Her yatak yeri ayrı rezervasyon alabilir. Ranzanın her katı ayrı bir yatak yeridir.':rentalMode==='room'?'Tüm yataklar aynı oda rezervasyonuna dahildir.':'Satışa açılma şekli için kiralama tercihini seçin.'}
      {(value.some(v=>BED_PRESETS.find(p=>p.key===v.preset)!.place_capacities.some(c=>c>1))||existing.some(b=>b.places.some(p=>p.capacity>1)))&&<p>Birden çok kişilik tek yatak yüzeyi, bağımsız rezervasyonlara bölünmez.</p>}
    </div>}

  </section>;
}
