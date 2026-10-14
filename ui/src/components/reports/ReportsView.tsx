"use client";
import React, { useEffect, useState } from 'react';
import { Download, Plus, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { command, messageOf, type Snapshot } from '../../lib/api';
import { PageHeader } from '../PageHeader';
import { DateField, InlineSelectField, TextField, Switch, CURRENCIES } from '../fields';
import { ErrorMessage, buttonStyle, secondaryStyle } from '../FormKit';
import { Pagination } from '../Pagination';
import { usePreference } from '../UserPreferences';
import { useNotifications } from '../Toast';
import { ReportCharts } from './ReportCharts';
import { RecordEditor } from './RecordEditor';
import { display, dayAt, shiftDay, reportCSV, type ReportResult, type ReportTable } from './model';
import styles from './ReportsView.module.css';
import { sourceOptions, paymentOptions } from './options';
import { REPORTS, RECORD_KINDS, reportPageID } from './navigation';
export function ReportsView({snapshot,reportKey}:{snapshot:Snapshot;reportKey:string}) {
 if(!['admin','management'].includes(snapshot.user.role)) return <p className="p-8 text-uni-muted">Raporlama yalnızca işletme yöneticilerine açıktır.</p>;
 return <ReportsPanel snapshot={snapshot} reportKey={reportKey}/>;
}
function ReportsPanel({snapshot:s,reportKey:key}:{snapshot:Snapshot;reportKey:string}) {
 const today=dayAt(s.server_time), notify=useNotifications();
 const catalog=REPORTS,kinds=RECORD_KINDS;
 const [start,setStart]=useState(today.slice(0,8)+'01'),[end,setEnd]=useState(today),[branch,setBranch]=useState(s.branch_id);
 const [currency,setCurrency]=useState('TRY'),[unit,setUnit]=useState('room'),[group,setGroup]=useState('day'),[room,setRoom]=useState(''),[channel,setChannel]=useState(''),[type,setType]=useState('');
 const [data,setData]=useState<ReportResult|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[revision,setRevision]=useState(0),[editor,setEditor]=useState(false),[customize,setCustomize]=useState(false);
 const [finance,setFinance]=usePreference<boolean>('reports_kpi_finance',true),[capacity,setCapacity]=usePreference<boolean>('reports_kpi_capacity',true),[operations,setOperations]=usePreference<boolean>('reports_kpi_operations',true);
 const current=catalog.find(x=>x.key===key);
 const [voidId,setVoidId]=useState(''),[voidReason,setVoidReason]=useState(''),[voidBusy,setVoidBusy]=useState(false),[voidError,setVoidError]=useState('');

 useEffect(()=>{
  const c=new AbortController();let active=true;setBusy(true);setError('');setData(null);
  const timeout=setTimeout(()=>c.abort(),45000);
  command<ReportResult>('report.generate',{key,hotel_id:s.hotel_id,branch_id:branch||'00000000-0000-0000-0000-000000000000',start_date:start,end_date:end,currency,unit,group_by:group,room_ids:room?[room]:[],room_types:type?[type]:[],channels:channel?[channel]:[]},undefined,c.signal)
   .then(r=>{if(active)setData(r)}).catch(e=>{if(active)setError(messageOf(e))}).finally(()=>{clearTimeout(timeout);if(active)setBusy(false)});
  return()=>{active=false;clearTimeout(timeout);c.abort()};
 },[key,s.hotel_id,branch,start,end,currency,unit,group,room,channel,type,revision]);

 const preset=(mode:string)=>{if(mode==='today'){setStart(today);setEnd(today)}else if(mode==='month'){setStart(today.slice(0,8)+'01');setEnd(today)}else{setStart(today);setEnd(shiftDay(today,Number(mode)-1))}};
 const download=()=>{if(!data)return;const url=URL.createObjectURL(new Blob([reportCSV(data)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${key}-${start}-${end}-${currency}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Rapor CSV olarak indirildi.')};
 if(editor) return <RecordEditor snapshot={s} kinds={kinds} currency={currency} initialKind={key.includes("maintenance")?"maintenance":key.includes("complaint")?"complaint":key.includes("satisfaction")?"review":key.includes("inventory")?"stock_in":key.includes("task")||key.includes("housekeeping")||key.includes("readiness")?"task":key.includes("expense")||key.includes("costs")?"expense":key.includes("contract")||key.includes("rent")?"contract":key.includes("deposit")?"deposit_in":key.includes("conversion")?"lead":key.includes("competitor")?"competitor":key.includes("damage")?"damage":key.includes("common_area")?"common_area":key.includes("channels")?"booking_details":"receipt"} onClose={()=>setEditor(false)} onSaved={()=>{setEditor(false);setRevision(v=>v+1);notify('Rapor kaydı kaydedildi.')}}/>;
 return <div className={styles.layout}>
  <PageHeader pageId={reportPageID(key)} actions={<>
   <button type="button" className={secondaryStyle} onClick={()=>setCustomize(v=>!v)} aria-expanded={customize}><SlidersHorizontal size={17}/>Görünüm</button>
   <button type="button" className={secondaryStyle} disabled={busy||!data} onClick={download}><Download size={17}/>CSV indir</button>
   <button type="button" className={buttonStyle} disabled={!kinds.length} onClick={()=>setEditor(true)}><Plus size={17}/>İşlem kaydı</button>
  </>}>
   <div className={styles.filters}>
    <InlineSelectField label="Tesis" value={branch} onChange={v=>{setBranch(v);setRoom('');setType('')}} options={[{value:'',label:'Tüm tesisler'},...s.branches.map(b=>({value:b.branch_id!,label:b.name}))]}/>
    <DateField label="Başlangıç" value={start} onChange={setStart} withTime={false}/>
    <DateField label="Bitiş (dahil)" value={end} onChange={setEnd} withTime={false} min={start}/>
    <InlineSelectField label="Para birimi" value={currency} onChange={setCurrency} options={CURRENCIES.map(c=>({value:c.id,label:c.label}))}/>
    <InlineSelectField label="Analiz birimi" value={current?.unit||unit} onChange={setUnit} disabled={!!current?.unit} options={[{value:'room',label:'Oda / oda-gece'},{value:'bed',label:'Yatak / yatak-gece'},{value:'apartment',label:'Daire / daire-gece'},{value:'dormitory',label:'Yatakhane / gece'}]}/>
    <InlineSelectField label="Dönem gruplaması" value={group} onChange={setGroup} options={[{value:'day',label:'Günlük'},{value:'week',label:'Haftalık'},{value:'month',label:'Aylık'}]}/>
   </div>
   <div className="flex flex-wrap gap-2 mt-3">
    {[['today','Bugün'],['month','Bu ay'],['7','Gelecek 7 gün'],['30','Gelecek 30 gün'],['90','Gelecek 90 gün']].map(([v,l])=><button key={v} className={secondaryStyle} onClick={()=>preset(v)}>{l}</button>)}
    <button className="nav-icon-button" aria-label="Raporu yenile" disabled={busy} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={18}/></button>
   </div>
   <details className="mt-3 text-sm text-uni-muted"><summary className="cursor-pointer py-2">Birim, tür ve kanal filtreleri</summary><div className={`${styles.filters} mt-3`}>
    <InlineSelectField label="Birim" value={room} onChange={setRoom} options={[{value:'',label:'Tüm birimler'},...s.rooms.filter(r=>r.branch_id===branch).map(r=>({value:r.room_id,label:r.code}))]}/>
    <InlineSelectField label="Birim türü" value={type} onChange={setType} options={[{value:'',label:'Tüm türler'},...Array.from(new Set(s.rooms.filter(r=>r.branch_id===branch).map(r=>r.type))).filter(Boolean).map(v=>({value:v,label:v}))]}/>
    <InlineSelectField label="Kanal" value={channel} onChange={setChannel} options={[{value:"",label:"Tüm kanallar"},...sourceOptions,...paymentOptions.filter(p=>!sourceOptions.some(s=>s.value===p.value))]}/>
   </div></details>
  </PageHeader>
  {customize&&<div className={`${styles.filters} ${styles.notes}`}><Switch label="Finans göstergeleri" checked={finance} onChange={setFinance}/><Switch label="Kapasite göstergeleri" checked={capacity} onChange={setCapacity}/><Switch label="Operasyon göstergeleri" checked={operations} onChange={setOperations}/></div>}
  <ErrorMessage message={error}/>
  {busy&&<div className={styles.empty} role="status">Rapor hesaplanıyor…</div>}
  {!busy&&data&&<>
   <div className={styles.metrics}>{data.metrics.filter(m=>m.key.includes('occupancy')?capacity:['arrivals','departures','dirty','maintenance'].includes(m.key)?operations:finance).map(m=><article className={styles.metric} key={m.key}><p>{m.label}</p><strong>{display(m.value,m.format,data.currency)}</strong>{m.note&&<p>{m.note}</p>}</article>)}</div>
   <ReportCharts report={data}/>
   {data.tables.map(t=><DataTable key={`${key}-${start}-${end}-${branch}-${currency}-${room}-${type}-${channel}-${revision}-${t.key}`} table={t} currency={data.currency} onVoid={key==='management.records'?id=>{setVoidId(id);setVoidReason('');setVoidError('')}:undefined}/>)}
   {voidId&&<form className={styles.notes} onSubmit={async e=>{e.preventDefault();setVoidBusy(true);setVoidError('');try{await command('report.void',{hotel_id:s.hotel_id,id:voidId,reason:voidReason});setVoidId('');setRevision(v=>v+1);notify('Kayıt gerekçesiyle iptal edildi.')}catch(e){setVoidError(messageOf(e))}finally{setVoidBusy(false)}}}>
    <p className="mb-3">İptal edilen kayıt hesaplamalardan çıkarılır; işlem geçmişi korunur.</p><ErrorMessage message={voidError}/><TextField label="İptal gerekçesi" value={voidReason} onChange={setVoidReason} required minLength={3} maxLength={500}/><div className="flex gap-2 mt-3"><button className={buttonStyle} disabled={voidBusy}>Kaydı iptal et</button><button type="button" className={secondaryStyle} onClick={()=>setVoidId('')} disabled={voidBusy}>Vazgeç</button></div>
   </form>}
   <details className={styles.notes}><summary>Hesaplama yöntemi ve veri kapsamı</summary>{data.notes.map(n=><p className="mt-3" key={n}>{n}</p>)}<p className="mt-3">Hesaplama zamanı: {display(data.generated_at,'datetime')}</p></details>
  </>}
 </div>;
}
export function DataTable({table:t,currency,onVoid}:{table:ReportTable;currency:string;onVoid?:(id:string)=>void}){
 const [page,setPage]=useState(1),[size,setSize]=useState(25);
 const rows=t.rows.slice((page-1)*size,page*size);

 return <section className={styles.card} aria-label={t.title}>
  <div className={styles.cardHead}><h3>{t.title}</h3><span className="text-xs text-uni-muted">{t.rows.length} kayıt</span></div>

  {rows.length?<div className={styles.scroller}><table className={styles.table}><thead><tr>{t.columns.map(c=><th scope="col" key={c.key}>{c.label}</th>)}{onVoid&&<th scope="col">İşlem</th>}</tr></thead><tbody>{rows.map((r,i)=><tr key={String(r.id??i)}>{t.columns.map(c=><td key={c.key} data-numeric={['money','number','percent'].includes(c.format??'')}>{display(r[c.key],c.format,currency)}</td>)}{onVoid&&<td><button type="button" className={secondaryStyle} onClick={()=>onVoid(String(r.id))}>İptal et</button></td>}</tr>)}</tbody></table></div>:<p className={styles.empty}>Bu filtrede kayıt bulunamadı. Tarih aralığını kontrol edin veya ilgili işlem kaydını ekleyin.</p>}
  {t.rows.length>25&&<Pagination label={`${t.title} sayfaları`} page={page} pageSize={size} total={t.rows.length} busy={false} onPageChange={setPage} onPageSizeChange={v=>{setSize(v);setPage(1)}}/>}
 </section>;
}
