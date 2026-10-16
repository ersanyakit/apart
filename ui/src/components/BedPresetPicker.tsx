import { useState } from 'react';
import { BedDouble, Layers, Plus, ChevronDown } from 'lucide-react';
import { BED_PRESETS, type BedPreset } from '../lib/bed-presets';
import { TextField, InlineSelectField } from './fields';
import styles from './RoomRentalSetup.module.css';

const categories = { standard:'Standart yataklar', bunk:'Ranzalar', extra:'İlave yataklar', sofa_bed:'Açılır kanepeler', baby:'Bebek yatakları', special:'Özel yataklar' };
export function BedPresetPicker({ onSelect, disabled, adding = false, compact = false }: {
  onSelect: (preset: BedPreset) => void; disabled?: boolean; adding?: boolean; compact?: boolean;
}) {
  const [query,setQuery]=useState('');
  const [categoryFilter,setCategoryFilter]=useState('standard');
  const normalized=(value:string)=>value.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('ı','i');
  const presets=BED_PRESETS.filter(p=>(adding||p.physical_count===1)&&normalized(`${p.label} ${p.name_en}`).includes(normalized(query.trim())));
  return <div className="space-y-3">
    <TextField label="Yatak türü ara" type="search" value={query} onChange={setQuery} placeholder="Queen, ranza, kanepe…"/>
    {compact&&!query.trim()&&<InlineSelectField label="Yatak kategorisi" value={categoryFilter} onChange={setCategoryFilter} options={Object.entries(categories).map(([value,label])=>({value,label}))}/>}
    {Object.entries(categories).filter(([category])=>!compact||!!query.trim()||category===categoryFilter).map(([category,label])=>{
      const members=presets.filter(p=>p.category===category);
      if(!members.length)return null;
      return <details key={`${category}-${!!query.trim()}`} open={compact||!!query.trim()||category==='standard'?true:undefined} className="rounded-2xl border border-uni-border p-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">{label} <span className="flex items-center gap-2 text-xs text-uni-muted">{members.length}<ChevronDown size={16}/></span></summary>
        <div className={styles.presets}>
          {members.map(preset=>{
            const Icon=preset.structure==='bunk'?Layers:BedDouble;
            return <button key={preset.key} type="button" disabled={disabled} className={`uni-control ${styles.preset}`}
              aria-label={`${preset.label}${adding?' ekle':' seç'}`} onClick={()=>onSelect(preset)}>
              <Icon size={22} aria-hidden="true"/><span><strong>{preset.label}</strong><small>{preset.capacity} kişi · {preset.bed_places} yatak yeri{preset.physical_count>1?' · 2 ayrı yatak':''}</small></span>
              {adding&&<Plus size={16} aria-hidden="true"/>}
            </button>;
          })}
        </div>
      </details>;
    })}
    {!presets.length&&<p className="text-sm text-uni-muted">Bu aramayla eşleşen yatak türü yok.</p>}
    <p className="text-xs text-uni-muted">Ölçüler başlangıç değerleridir; fiziksel yatak ayrıntılarından değiştirilebilir.{!adding&&' Twin düzenini oda formundan iki ayrı yatak olarak ekleyin.'}</p>
  </div>;
}
