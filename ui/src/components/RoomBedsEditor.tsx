import React, { useEffect, useState } from 'react';
import { BedDouble, Plus, Trash2 } from 'lucide-react';
import { command, messageOf } from '../lib/api';
import { BED_PRESETS, applyBedPreset, type Bed } from '../lib/bed-presets';
import { InlineSelectField, TextField } from './fields';
export type RoomBedChoice = { id: string; preset: string; count: number };
export function roomBedsPayload(choices: RoomBedChoice[], code: string, branch: string): Bed[] {
  return choices.flatMap(choice => Array.from({ length: choice.count }, (_, i) => {
    const preset = BED_PRESETS.find(p => p.key === choice.preset)!;
    const bedCode = `${code.slice(0,12)}-Y${choice.id.slice(0,8)}-${i+1}`.toUpperCase();
    const bed = applyBedPreset({ branch_id: branch, room_id: null, floor_id: null, code: bedCode, type: 'single', structure: 'standard', width_cm: 90, length_cm: 200, levels: 1, places: [] }, preset);
    return { ...bed, places: bed.places.map(p => ({ ...p, rentable: false })) };
  }));
}
export function RoomBedsEditor({ roomId, branchId, value, onChange, disabled, rentalMode = "" }: {
  roomId?: string; branchId: string; value: RoomBedChoice[]; onChange: (value: RoomBedChoice[]) => void; disabled: boolean; rentalMode?: "" | "room" | "beds";
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
  const count = value.reduce((sum, v) => sum + v.count, 0);
  return <section className="space-y-3" aria-label="Odadaki yataklar">
    <h3 className="flex items-center gap-2 text-base font-uninav-book"><BedDouble size={20} />Odadaki yataklar</h3>
    <p className="text-sm text-uni-muted">Yatak türünü ve adedini seçin. Odayla birlikte kaydedilir ve 3 boyutlu görünümde gösterilir.</p>
    {error && <p role="alert" className="text-sm text-red-600">Mevcut yataklar alınamadı: {error}</p>}
    {existing.length > 0 && <div className="rounded-2xl bg-uni-surface p-4 space-y-2"><p className="text-xs text-uni-muted">Kayıtlı yataklar · ayrıntıları Yataklar bölümünden düzenleyebilirsiniz.</p>{existing.map(b => <p key={b.bed_id} className="text-sm">{b.code} · {BED_PRESETS.find(p => p.type === b.type && p.levels === b.levels)?.label || b.type} · {b.width_cm} × {b.length_cm} cm</p>)}</div>}
    <fieldset disabled={disabled} className="space-y-3">
      {value.map(choice => <div key={choice.id} className="flex items-start gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px] flex-1 gap-3">
          <InlineSelectField label="Yatak türü" value={choice.preset} disabled={disabled} options={BED_PRESETS.map(p => ({ value: p.key, label: p.label }))} onChange={preset => onChange(value.map(v => v.id === choice.id ? { ...v, preset } : v))} />
          <TextField label="Adet" type="number" value={String(choice.count)} onChange={raw => { const n = Number(raw); if (Number.isInteger(n) && n >= 1 && n <= 100 && count - choice.count + n <= 100) onChange(value.map(v => v.id === choice.id ? { ...v, count: n } : v)); }} />
        </div>
        <button type="button" className="nav-icon-button" aria-label="Eklenen yatak türünü kaldır" onClick={() => onChange(value.filter(v => v.id !== choice.id))}><Trash2 size={18} /></button>
      </div>)}
      {!value.length ? <InlineSelectField label="Yatak türü" value="" disabled={disabled} options={[{ value: '', label: 'Yatak türünü seçin' }, ...BED_PRESETS.map(p => ({ value: p.key, label: p.label }))]} onChange={preset => { if (preset) onChange([{ id: crypto.randomUUID(), preset, count: 1 }]); }} /> :
        <button type="button" disabled={disabled || count >= 100} className="uni-button uni-button-secondary rounded-full" onClick={() => onChange([...value, { id: crypto.randomUUID(), preset: 'single', count: 1 }])}><Plus size={18} />Başka yatak türü ekle</button>}
    </fieldset>
    {!!count && <p className="text-xs text-uni-muted">{count} fiziksel yatak eklenecek. {rentalMode === "beds" ? "Yataklar ayrı ayrı satışa açılacak." : rentalMode === "room" ? "Yataklar yalnızca odayla birlikte kiralanacak." : "Satış ayarı seçtiğiniz kiralama şekline göre uygulanacak."}</p>}
  </section>;
}
