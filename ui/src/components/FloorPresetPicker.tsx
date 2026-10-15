import { contracts, localized, type Floor } from '../lib/api';
import { useI18n } from './I18n';
import { InlineSelectField } from './fields';

export function FloorPresetPicker({ value, floors, onChange, disabled }: {
 value:string; floors:Floor[]; disabled:boolean;
 onChange:(id:string, preset?:Pick<Floor,'code'|'label'|'sort_order'>)=>void;
}) {
 const {locale}=useI18n();
 return <InlineSelectField label="Kat seçimi" value={value} disabled={disabled}
  options={[{value:'',label:'Hazır kat seçin'},{value:'custom',label:'Özel kat / Elle gir'},...contracts.floor_presets.map(p=>({value:p.id,label:`${localized(p.label,locale.toUpperCase())} · ${p.code}`}))]}
  onChange={id=>{
   const p=contracts.floor_presets.find(p=>p.id===id);
   onChange(id,p?{code:p.code,label:p.label,sort_order:p.kind==='roof'?Math.max(0,...floors.filter(f=>f.code!=='RF').map(f=>f.sort_order))+1:p.sort_order}:undefined);
  }}/>
}
