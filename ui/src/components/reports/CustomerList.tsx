"use client";
import { useI18n } from "../I18n";

import React, {useEffect, useState} from 'react';
import {RefreshCw, ChevronRight, FileSpreadsheet, FileText, ArrowDown, ArrowUp, ArrowUpDown} from 'lucide-react';
import {command, downloadCommand, messageOf, type Snapshot} from '../../lib/api';
import {PageHeader} from '../PageHeader';
import {TextField, InlineSelectField} from '../fields';
import {ErrorMessage, secondaryStyle} from '../FormKit';
import {Pagination} from '../Pagination';
import {CUSTOMER_DIRECTORY, reportPageID} from './navigation';
import styles from './ReportsView.module.css';
import {customerCountry} from './customer-format';
import {useNotifications} from '../Toast';

export type Customer = {guest_id:string;name:string;national_id:string;phone:string;address:string;nationality:string};
type CustomerPage = {items:Customer[];total:number;page:number};
const columns = [['name','Ad soyad'],['national_id','Kimlik / pasaport'],['phone','Telefon'],['nationality','Uyruk'],['address','Adres']] as const;

export function CustomerList({snapshot:s,onOpenCustomer}:{snapshot:Snapshot;onOpenCustomer:(customer:Customer)=>void}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const notify=useNotifications();
 const [sort,setSort]=useState('name'),[desc,setDesc]=useState(false),[exporting,setExporting]=useState(''),[exportError,setExportError]=useState('');
 const [search,setSearch]=useState(''),[branch,setBranch]=useState(''),[page,setPage]=useState(1),[size,setSize]=useState(25),[revision,setRevision]=useState(0);
 const [data,setData]=useState<CustomerPage|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  setBusy(true);setError('');setData(null);
  const timer=setTimeout(()=>{
   command<CustomerPage>('guest.search',{hotel_id:s.hotel_id,branch_id:branch||'00000000-0000-0000-0000-000000000000',search:search.trim(),page,page_size:size,unique:true,sort,desc},undefined,controller.signal)
    .then(result=>{if(active){const last=Math.max(1,Math.ceil(result.total/size));if(page>last)setPage(last);else setData(result)}})
    .catch(e=>{if(active&&!controller.signal.aborted)setError(messageOf(e))})
    .finally(()=>{if(active)setBusy(false)});
  },250);
  return()=>{active=false;clearTimeout(timer);controller.abort()};
 },[s.hotel_id,branch,search,page,size,revision,sort,desc]);
 const download=async(format:'xlsx'|'pdf')=>{
  setExporting(format);setExportError('');
  try {await downloadCommand('guest.customers.export',{hotel_id:s.hotel_id,branch_id:branch||'00000000-0000-0000-0000-000000000000',search:search.trim(),sort,desc,format},`musteri-listesi.${format}`);notify(_uiText("{value1} müşteri listesi indirildi.", {value1: String(format==='xlsx'?'Excel':'PDF')}))}catch(e){setExportError(messageOf(e))}finally{setExporting('')}
 };
 const changeSort=(key:string)=>{setPage(1);setSort(key);setDesc(sort===key?!desc:false)};
 return <div className={styles.layout}>
  <PageHeader pageId={reportPageID(CUSTOMER_DIRECTORY.key)} actions={<button type="button" className={secondaryStyle} disabled={busy} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={17}/>{"Yenile"}</button>}>
   <div className={styles.filters}><TextField label={_uiText("Müşteri ara")} value={search} maxLength={200} onChange={v=>{setSearch(v);setPage(1)}}/><InlineSelectField label={_uiText("Tesis")} value={branch} onChange={v=>{setBranch(v);setPage(1)}} options={[{value:'',label:"Tüm tesisler"},...s.branches.map(b=>({value:b.branch_id!,label:b.name}))]}/></div>
  </PageHeader>
  <ErrorMessage message={error}/><ErrorMessage message={exportError}/>
  <section className={styles.customerPanel} aria-label={_uiText("Benzersiz müşteri listesi")} aria-busy={busy}>
   <div className={styles.customerToolbar}><div className="flex items-center gap-2"><h3>{_uiText("Müşteriler")}</h3><span className={styles.customerCount}>{data?.total??'…'}</span><span className="hidden sm:inline text-xs text-uni-muted">{_uiText("Tüm tarihler")}</span></div><div className="flex flex-wrap gap-2">
    <button type="button" className={`${secondaryStyle} !rounded-full`} disabled={busy||!!exporting||!data?.total} onClick={()=>download('xlsx')}><FileSpreadsheet size={17}/>{exporting==='xlsx'?_uiText("Hazırlanıyor…"):_uiText("Excel indir")}</button>
    <button type="button" className={`${secondaryStyle} !rounded-full`} disabled={busy||!!exporting||!data?.total} onClick={()=>download('pdf')}><FileText size={17}/>{exporting==='pdf'?_uiText("Hazırlanıyor…"):_uiText("PDF indir")}</button>
   </div></div>
   {busy?<p className={styles.empty} role="status">{_uiText("Müşteriler yükleniyor…")}</p>:data&&<CustomerTable items={data.items} offset={(page-1)*size} sort={sort} desc={desc} onSort={changeSort} onSelect={onOpenCustomer}/>}
   <div className={styles.customerFooter}><Pagination compact label={_uiText("Müşteri listesi sayfaları")} noun="müşteri" page={page} pageSize={size} total={data?.total??0} busy={busy||!data} onPageChange={setPage} onPageSizeChange={n=>{setSize(n);setPage(1)}}/></div>
  </section>
  <p className="text-xs leading-5 text-uni-muted">{_uiText("Her müşteri tek satırda gösterilir. Aynı kimlik ve uyruğa sahip kayıtlar birleştirilir. Kimlik bilgisi olmayan farklı müşteri kartları, yalnızca adları aynı olduğu için birleştirilmez.")}</p>
 </div>;
}
export function CustomerTable({items,onSelect,offset=0,sort='name',desc=false,onSort}:{items:Customer[];onSelect:(customer:Customer)=>void;offset?:number;sort?:string;desc?:boolean;onSort?:(key:string)=>void}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

 if(!items.length)return <p className={styles.empty}>{_uiText("Müşteri bulunamadı. Aramanızı veya tesis seçimini değiştirebilirsiniz.")}</p>;
 return <div className={styles.customerScroller} tabIndex={0} role="region" aria-label={_uiText("Müşteri bilgileri; yatay kaydırılabilir")}><table className={`${styles.table} ${styles.customerTable} ${styles.directoryTable}`}>
  <colgroup><col style={{width:52}}/><col style={{width:'23%'}}/><col style={{width:'17%'}}/><col style={{width:'16%'}}/><col style={{width:'15%'}}/><col/><col style={{width:44}}/></colgroup>
  <thead><tr><th scope="col" className={styles.rowNumber}>#</th>{columns.map(([key,label])=><th key={key} scope="col" aria-sort={sort===key?(desc?"descending":"ascending"):"none"}>{onSort?<button type="button" className={styles.columnSort} onClick={()=>onSort(key)}>{label}{sort===key?(desc?<ArrowDown size={13}/>:<ArrowUp size={13}/>):<ArrowUpDown size={13}/>}</button>:label}</th>)}<th scope="col"><span className="sr-only">{_uiText("Detay")}</span></th></tr></thead>
  <tbody>{items.map((customer,index)=>{const nationality=customerCountry(customer.nationality);return <tr key={customer.guest_id} data-tone={index%2===0?"light":"dark"} className={styles.customerRow} onClick={()=>onSelect(customer)}>
   <td className={styles.rowNumber}>{offset+index+1}</td>
   <td><button type="button" className={styles.customerName} title={customer.name} aria-label={_uiText("{value1}: müşteri detayını aç", {value1: String(customer.name)})} onClick={e=>{e.stopPropagation();onSelect(customer)}}>{customer.name||_uiText("İsimsiz müşteri")}</button></td>
   <td className={styles.customerIdentifier}><span title={customer.national_id}>{customer.national_id||'—'}</span></td>
   <td className={styles.customerIdentifier}><span>{customer.phone||'—'}</span></td>
   <td><span className={styles.country} title={nationality.label}><img src={nationality.flagSrc} alt="" aria-hidden="true" width={24} height={24} loading="lazy" className={styles.countryFlag}/><span>{nationality.label}</span></span></td>
   <td><span className={styles.customerAddress} title={customer.address}>{customer.address||'—'}</span></td>
   <td aria-hidden="true" className={styles.rowAction}><ChevronRight size={16}/></td>
  </tr>})}</tbody>
 </table></div>;
}
