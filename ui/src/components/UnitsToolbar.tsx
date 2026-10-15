import { useI18n } from "./I18n";
import { Layers, Plus, BedDouble, Map, DoorOpen, ChevronDown } from 'lucide-react';
import type { Floor } from '../lib/api';
import { localized } from '../lib/api';
import { UniSelect } from './UniSelect';
import { Button } from './Button';

export function UnitsToolbar({ floors, floor, mode, busy, onFloorChange, onModeChange, onAdd, onAddBed, onBulk, onCreateFloor }: {
  floors: Floor[]; floor: string; mode: string; busy: boolean;
  onFloorChange: (id:string)=>void; onModeChange:(mode:string)=>void; onAdd:()=>void; onAddBed:()=>void;
  onBulk:()=>void; onCreateFloor:()=>void;
}) {
 const {locale}=useI18n();
 return <div className="space-y-3">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div className="flex flex-wrap gap-1 rounded-2xl bg-uni-surface p-1" role="group" aria-label="Birim görünümü">
    {[{id:'floors',label:'Katlar',Icon:Layers},{id:'rooms',label:'Odalar',Icon:DoorOpen},{id:'beds',label:'Yataklar',Icon:BedDouble},{id:'plan',label:'Kat planı',Icon:Map}].map(({id,label,Icon})=><button key={id} type="button" aria-pressed={mode===id}
     disabled={id==='plan'&&!floor} onClick={()=>onModeChange(id)} title={id==='plan'&&!floor?'Plan için bir kat seçin':undefined}
     className={`uni-control inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm ${mode===id?'bg-white text-brand-blue-600 shadow-sm':'text-uni-muted'} disabled:opacity-40`}><Icon size={17}/>{label}</button>)}
   </div>
   <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Yeni kayıt ekle">
    <Button variant="secondary" onClick={onCreateFloor}><Plus size={18} strokeWidth={1.8} aria-hidden="true"/>Kat Ekle</Button>
    <Button onClick={onAdd}><Plus size={18} strokeWidth={1.8} aria-hidden="true"/>Oda / Birim Ekle</Button>
    {mode==='beds'&&<Button variant="secondary" onClick={onAddBed}><Plus size={18} strokeWidth={1.8} aria-hidden="true"/>Fiziksel Yatak Ekle</Button>}
   </div>
  </div>
  {mode!=='floors'&&<div className="flex flex-wrap items-center justify-between gap-3">
   <UniSelect caption="Kat" icon={<Layers size={18}/>} ariaLabel="Kat filtresi" value={floor} onChange={onFloorChange}
    options={[{value:'',label:'Tüm katlar'},...floors.map(f=>({value:f.floor_id,label:localized(f.label,locale.toUpperCase())||f.code}))]}/>
   <details className="relative">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-sm text-uni-muted hover:bg-uni-surface [&::-webkit-details-marker]:hidden">Diğer işlemler<ChevronDown size={15}/></summary>
    <div className="absolute right-0 z-20 mt-2 grid min-w-60 gap-1 rounded-2xl border border-uni-border bg-white p-2 shadow-lg">
     <Button variant="secondary" onClick={onBulk}>Toplu Oda / Yatak Ekle</Button>

    </div>
   </details>
  </div>}
 </div>;
}
