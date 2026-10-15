import { Layers, Pencil, Trash2, DoorOpen } from 'lucide-react';
import { localized, type Floor, type APIRoom } from '../lib/api';
import { useI18n } from './I18n';
import { Button } from './Button';

export function FloorList({floors,rooms,busy,onEdit,onDelete,onRooms}: {
 floors:Floor[];rooms:APIRoom[];busy:boolean;
 onEdit:(floor:Floor)=>void;onDelete:(floor:Floor)=>void;onRooms:(floor:Floor)=>void;
}) {
 const {locale}=useI18n();
 return <section aria-label="Kat yönetimi" className="space-y-3">
  <p className="text-sm text-uni-muted">{floors.length} kat · Düzenleme ve silme işlemlerini ilgili katın yanından yapabilirsiniz.</p>
  {!floors.length&&<div className="rounded-2xl bg-uni-surface p-6 text-sm text-uni-muted">Henüz kat eklenmedi. Üstteki “Kat Ekle” düğmesiyle hazır katlardan birini seçin.</div>}
  {[...floors].sort((a,b)=>a.sort_order-b.sort_order||a.code.localeCompare(b.code)).map(f=>{
   const units=rooms.filter(r=>r.floor_id===f.floor_id);
   const roomCount=units.filter(r=>r.kind!=='bed').length;
   const bedCount=units.filter(r=>r.kind==='bed').length;
   const name=localized(f.label,locale.toUpperCase())||f.code;
   return <article key={f.floor_id} aria-label={name} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-uni-border p-4">
    <div className="flex min-w-0 items-center gap-3">
     <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-uni-surface text-brand-blue-600"><Layers size={21}/></span>
     <div className="min-w-0"><h3 className="break-words text-sm font-semibold">{name} <span className="ml-2 text-xs font-normal text-uni-muted">{f.code}</span></h3>
      <p className="mt-1 text-xs text-uni-muted">{roomCount} oda / birim{bedCount>0?` · ${bedCount} yatak yeri`:''}</p>
      {!!units.length&&<p className="mt-1 text-xs text-uni-muted">Silmek için önce bu kattaki birimleri taşıyın veya kaldırın.</p>}
     </div>
    </div>
    <div className="flex flex-wrap gap-2">
     <Button variant="secondary" onClick={()=>onRooms(f)} aria-label={`${name} birimlerini göster`}><DoorOpen size={18}/>Birimler</Button>
     <Button variant="secondary" disabled={busy} onClick={()=>onEdit(f)} aria-label={`${name} düzenle`}><Pencil size={18}/>Düzenle</Button>
     <Button variant="secondary" disabled={busy||units.length>0} onClick={()=>onDelete(f)} aria-label={`${name} sil`}><Trash2 size={18}/>Sil</Button>
    </div>
   </article>;
  })}
 </section>;
}
