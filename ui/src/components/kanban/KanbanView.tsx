"use client";
import React,{useEffect,useRef,useState} from 'react';
import {Archive,ArchiveRestore,ArrowRight,BedDouble,CheckCheck,GripVertical,Plus,RefreshCw,StickyNote} from 'lucide-react';
import {command,messageOf,type Booking,type Snapshot} from '../../lib/api';
import {boardDate} from '../../lib/room-board';
import {PageHeader} from '../PageHeader';
import {TextField,FieldCard,FieldCaption,InlineSelectField,Switch} from '../fields';
import {UniSelect} from '../UniSelect';
import {buttonStyle,secondaryStyle,ErrorMessage} from '../FormKit';
import {useNotifications} from '../Toast';
import {confirmDialog} from '../ConfirmDialog';
import {COLUMNS,noteDate,noteInput,type Note,type NoteInput,type NotePage,type Status} from './model';
import styles from './KanbanView.module.css';
import {NoteModal} from './NoteModal';

export function KanbanView({snapshot,onOpenBooking}:{snapshot:Snapshot;onOpenBooking?:(booking:Booking)=>void}) {
 if(!['admin','management','reception'].includes(snapshot.user.role))return <p className="text-uni-muted p-6">Resepsiyon notlarına yalnızca yönetici ve resepsiyon personeli erişebilir.</p>;
 if(!snapshot.branch_id)return <p className="text-uni-muted p-6">Not panosunu açmak için bir tesis seçin.</p>;
 return <KanbanBoard key={`${snapshot.hotel_id}:${snapshot.branch_id}:${snapshot.user.user_id}`} snapshot={snapshot} onOpenBooking={onOpenBooking}/>;
}
function KanbanBoard({snapshot:s,onOpenBooking}:{snapshot:Snapshot;onOpenBooking?:(booking:Booking)=>void}) {
 const notify=useNotifications(),saving=useRef(false);
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[archived,setArchived]=useState(false),[revision,setRevision]=useState(0);
 const [draft,setDraft]=useState<NoteInput|null>(null),[original,setOriginal]=useState<NoteInput|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [dragged,setDragged]=useState<Note|null>(null),[over,setOver]=useState<Status|null>(null);
 useEffect(()=>{const timer=setTimeout(()=>setQuery(search.trim()),250);return()=>clearTimeout(timer)},[search]);
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible'&&!saving.current)setRevision(v=>v+1)};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}},[]);
 const open=async(note?:Note,status:Status='todo')=>{
  if(busy)return;
  if(draft&&JSON.stringify(draft)!==JSON.stringify(original)&&!(await confirmDialog('Kaydedilmemiş not değişikliklerinden vazgeçilsin mi?')))return;
   const next=note?noteInput(note):{id:crypto.randomUUID(),hotel_id:s.hotel_id,branch_id:s.branch_id,booking_id:null,booking_auto:false,title:'',body:'',status,priority:'normal' as const,archived:false,version:0};
  setDraft(next);setOriginal(next);setError('');
 };
 const close=()=>{if(busy)return;setDraft(null);setOriginal(null);setError('')};
 const save=async(input:NoteInput,fromEditor=false)=>{
  if(saving.current)return;saving.current=true;setBusy(true);setError('');
  try {await command<Note>('note.save',noteInput(input));if(fromEditor){setDraft(null);setOriginal(null);if(input.version===0){setArchived(false);setSearch('')}}setRevision(v=>v+1);notify(input.archived?'Not arşive taşındı.':input.version===0?'Not panoya eklendi.':'Not güncellendi.')}
  catch(e){setError(messageOf(e));setRevision(v=>v+1)}finally{saving.current=false;setBusy(false);setDragged(null);setOver(null)}
 };
 const move=(note:Note,status:Status)=>{if(note.status!==status&&!busy&&!draft)void save({...noteInput(note),status})};
 const archive=async(note:Note)=>{if(busy||draft)return;if(!note.archived&&!(await confirmDialog(`“${note.title}” arşive taşınsın mı? Notu arşivden geri alabilirsiniz.`)))return;void save({...noteInput(note),archived:!note.archived})};
 return <div className={styles.layout}>
  <PageHeader pageId="kanban" actions={<><button type="button" className={buttonStyle} disabled={busy} onClick={()=>void open()}><Plus size={18}/>Yeni not</button><button type="button" className="nav-icon-button" aria-label="Not panosunu yenile" disabled={busy} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={18}/></button></>}>
   <div className={styles.filters}><TextField label="Notlarda ara" value={search} onChange={setSearch} placeholder="Başlık, not veya personel adı" maxLength={200}/><Switch label="Arşivdeki notları göster" checked={archived} onChange={setArchived}/></div>
  </PageHeader>
  <div className={styles.context}><span>{archived?'Arşiv · Geri alınabilir notlar':'Ekip panosu · Bu tesisteki resepsiyon notları'}</span><span>30 saniyede bir yenilenir</span></div>
  {!draft&&<ErrorMessage message={error}/>}
  {draft&&<NoteModal title={draft.version?'Notu düzenle':'Yeni resepsiyon notu'} busy={busy} dirty={JSON.stringify(draft)!==JSON.stringify(original)} onClose={close}>{requestClose=><form onSubmit={e=>{e.preventDefault();void save(draft,true)}}>
   <div className="mb-4"><ErrorMessage message={error}/></div>
   <fieldset disabled={busy} className={styles.form}>
    <TextField label="Başlık" value={draft.title} required maxLength={160} onChange={title=>setDraft({...draft,title})} placeholder="Örn. 204 numaralı odanın geç çıkış talebi"/>
    <FieldCard><label className="block"><FieldCaption>Not</FieldCaption><textarea className={styles.bodyInput} aria-label="Not" rows={5} maxLength={8000} value={draft.body} placeholder="Vardiya arkadaşlarınızın bilmesi gerekenleri yazın…" onChange={e=>setDraft({...draft,body:e.target.value})}/></label><p className="mt-2 text-xs text-uni-muted">{draft.body.length} / 8000</p></FieldCard>
    <div className={styles.filters}><InlineSelectField label="Durum" value={draft.status} options={[...COLUMNS]} onChange={status=>setDraft({...draft,status:status as Status})}/><InlineSelectField label="Öncelik" value={draft.priority} options={[{value:'normal',label:'Normal'},{value:'urgent',label:'Acil'}]} onChange={priority=>setDraft({...draft,priority:priority as Note['priority']})}/></div>
    <p className="text-xs text-uni-muted">Bu not, bu tesise yetkili yönetici ve resepsiyon personeli tarafından görülebilir ve güncellenebilir.</p>
    <div className={styles.actions}><button type="button" className={secondaryStyle} onClick={requestClose}>Vazgeç</button><button className={buttonStyle} disabled={busy||!draft.title.trim()}>{busy?'Kaydediliyor…':'Notu kaydet'}</button></div>
   </fieldset>
  </form>}</NoteModal>}
  <p className="text-xs text-uni-muted">{draft?'Notu kaydettikten veya düzenlemeyi kapattıktan sonra kartları taşıyabilirsiniz.':'Kartları sütunlar arasında sürükleyin veya kartın durum menüsünü kullanın. Notun tamamı için başlığına tıklayın.'}</p>
  <div className={styles.board} aria-label={archived?'Arşivlenmiş resepsiyon notları':'Resepsiyon Kanban panosu'}>
   {COLUMNS.map(column=><section key={column.value} className={styles.column} data-over={over===column.value} aria-label={column.label}
    onDragOver={e=>{if(dragged&&!busy&&!draft&&!archived){e.preventDefault();e.dataTransfer.dropEffect='move';setOver(column.value)}}}
    onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOver(null)}}
    onDrop={e=>{e.preventDefault();setOver(null);if(dragged)move(dragged,column.value);setDragged(null)}}>
    <KanbanColumn key={`${column.value}:${query}:${archived}`} column={column} snapshot={s} search={query} archived={archived} revision={revision} disabled={busy||!!draft}
     onNew={()=>void open(undefined,column.value)} onOpen={note=>void open(note)} onMove={move} onArchive={note=>void archive(note)}
     onOpenBooking={onOpenBooking}
     onDrag={note=>setDragged(note)} onDragEnd={()=>{setDragged(null);setOver(null)}}/>
   </section>)}
  </div>
 </div>;
}
type ColumnProps={column:typeof COLUMNS[number];snapshot:Snapshot;search:string;archived:boolean;revision:number;disabled:boolean;onNew:()=>void;onOpen:(note:Note)=>void;onMove:(note:Note,status:Status)=>void;onArchive:(note:Note)=>void;onOpenBooking?:(booking:Booking)=>void;onDrag:(note:Note)=>void;onDragEnd:()=>void};
function KanbanColumn(p:ColumnProps){
 const [pages,setPages]=useState(1),[data,setData]=useState<NotePage|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();let active=true;setLoading(true);setError('');
  const load=async()=>{const get=(page:number)=>command<NotePage>('note.list',{hotel_id:p.snapshot.hotel_id,branch_id:p.snapshot.branch_id,status:p.column.value,search:p.search,archived:p.archived,page},undefined,controller.signal);
   const first=await get(1);const count=Math.min(pages,Math.max(1,Math.ceil(first.total/25)));const rest=await Promise.all(Array.from({length:count-1},(_,i)=>get(i+2)));
   if(active)setData({...first,items:Array.from(new Map([first,...rest].flatMap(page=>page.items).map(note=>[note.id,note])).values())});
  };void load().catch(e=>{if(active&&!controller.signal.aborted)setError(messageOf(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false;controller.abort()};
 },[p.snapshot.hotel_id,p.snapshot.branch_id,p.column.value,p.search,p.archived,p.revision,pages,retry]);
 return <><header className={styles.columnHeader}><div><div className={styles.columnTitle}><span className={styles.dot} data-status={p.column.value}/><h3>{p.column.label}</h3><span className={styles.count}>{data?.total??'…'}</span></div><p>{p.column.description}</p></div>{!p.archived&&<button type="button" className="nav-icon-button" aria-label={`${p.column.label}: not ekle`} disabled={p.disabled} onClick={p.onNew}><Plus size={18}/></button>}</header>
  {error&&<div className="px-3"><ErrorMessage message={error}/><button type="button" className={secondaryStyle} onClick={()=>setRetry(v=>v+1)}>Tekrar dene</button></div>}
   <div className={styles.cards} aria-busy={loading}>{data?.items.map(note=>{const booking=note.booking_id?p.snapshot.bookings.find(b=>b.booking_id===note.booking_id):undefined;const roomCode=booking?p.snapshot.rooms.find(r=>r.room_id===booking.room_id)?.code:undefined;return <NoteCard key={note.id} note={note} disabled={p.disabled} booking={booking} roomCode={roomCode} onOpen={()=>p.onOpen(note)} onMove={status=>p.onMove(note,status)} onArchive={()=>p.onArchive(note)} onOpenBooking={booking&&p.onOpenBooking?()=>p.onOpenBooking!(booking):undefined} onDrag={()=>p.onDrag(note)} onDragEnd={p.onDragEnd}/>})}
   {!data&&loading?<p className={styles.empty} role="status">Notlar yükleniyor…</p>:!error&&!data?.items.length?<div className={styles.empty}><StickyNote size={24} aria-hidden="true"/><p>{p.search?'Aramanızla eşleşen not yok.':p.archived?'Bu sütunda arşivlenmiş not yok.':'Bu sütunda henüz not yok.'}</p></div>:null}
  </div>
  {data&&data.items.length<data.total&&<button type="button" className={`${secondaryStyle} mx-3 mb-3 !rounded-full`} disabled={loading} onClick={()=>setPages(v=>v+1)}>{loading?'Yükleniyor…':`Daha fazla göster (${data.total-data.items.length})`}</button>}
 </>;
}
export function NoteCard({note,disabled,booking,roomCode,onOpen,onMove,onArchive,onOpenBooking,onDrag,onDragEnd}:{note:Note;disabled:boolean;booking?:Booking;roomCode?:string;onOpen:()=>void;onMove:(status:Status)=>void;onArchive:()=>void;onOpenBooking?:()=>void;onDrag:()=>void;onDragEnd:()=>void}){
 return <article className={styles.card} draggable={!disabled&&!note.archived} onDragStart={e=>{if(disabled||note.archived){e.preventDefault();return}e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-hotel-note',note.id);onDrag()}} onDragEnd={onDragEnd}>
  <div className={styles.cardMeta}><span className={note.priority==='urgent'?styles.urgent:styles.normal}>{note.priority==='urgent'?'Acil':'Normal'}</span><GripVertical size={16} aria-hidden="true"/></div>
  <button type="button" className={styles.noteOpen} onClick={onOpen} aria-label={`${note.title}: notu aç`}><h4>{note.title}</h4><p>{note.body||'Açıklama eklenmemiş.'}</p></button>
  {booking&&<button type="button" className={styles.bookingGo} onClick={onOpenBooking} aria-label={`${booking.guest_name} rezervasyonunu aç`}>
   <span className={styles.bookingLine}><BedDouble size={15} aria-hidden="true"/><span>{roomCode?`Oda ${roomCode} · `:''}{boardDate(booking.check_in)} → {boardDate(booking.check_out)}</span></span>
   <span className={styles.bookingCta}>Rezervasyona git<ArrowRight size={15} aria-hidden="true"/></span>
  </button>}
  <div className={styles.author}><span>{note.created_by_name}</span><time dateTime={note.created_at}>{noteDate(note.created_at)}</time></div>
  {note.version>1&&<p className={styles.updated}>Son işlem: {note.updated_by_name} · {noteDate(note.updated_at)}</p>}
  <div className={styles.cardFooter}><fieldset disabled={disabled} className="min-w-0"><UniSelect caption="" icon={<CheckCheck size={15}/>} ariaLabel={`${note.title}: durum`} value={note.status} options={[...COLUMNS]} onChange={value=>onMove(value as Status)}/></fieldset><button type="button" className="nav-icon-button" disabled={disabled} onClick={onArchive} title={note.archived?'Arşivden geri al':'Arşive taşı'} aria-label={`${note.title}: ${note.archived?'arşivden geri al':'arşive taşı'}`}>{note.archived?<ArchiveRestore size={17}/>:<Archive size={17}/>}</button></div>
 </article>;
}
