import { Building2, Hotel, Pencil, Plus, MapPin, Phone, Mail, ChevronDown, Archive } from 'lucide-react';
import type { Facility, Selection, Snapshot } from '../lib/api';
import { localized } from '../lib/api';
import { PageHeader } from './PageHeader';
import { UniSelect } from './UniSelect';
import { buttonStyle, secondaryStyle } from './FormKit';
import { CatalogIcon, catalogLabel } from './CatalogFields';
import { useI18n } from './I18n';
import styles from './FacilityView.module.css';

export function FacilityView({snapshot:s,onEdit,onCreate,onSelect,onArchive}: {
 snapshot:Snapshot;onEdit:(kind:'hotel'|'branch')=>void;onCreate:(kind:'hotel'|'branch')=>void;
 onSelect:(selection:Selection)=>void;onArchive:(id:string,name:string)=>void;
}) {
 const {locale}=useI18n();
 const company=s.hotels.find(h=>h.hotel_id===s.hotel_id);
 const properties=s.branches.filter(b=>b.hotel_id===s.hotel_id);
 const property=properties.find(b=>b.branch_id===s.branch_id);
 const amenities=(property?.feature_assignments||[]).flatMap(a=>{
  const definition=s.feature_registry.definitions.find(d=>d.code===a.code&&d.scopes.includes('property'));
  if(!definition||a.value===false||a.value===0||a.value===''||(Array.isArray(a.value)&&!a.value.length))return [];
  const value=typeof a.value==='boolean'?'':Array.isArray(a.value)?a.value.map(v=>catalogLabel(definition.option_labels?.[v],locale)||v).join(', '):catalogLabel(definition.option_labels?.[String(a.value)],locale)||String(a.value);
  return [{code:a.code,icon:definition.icon_key,label:catalogLabel(definition.label,locale),value,quantity:typeof a.value==='number'&&definition.catalog_kind!=='amenity'&&!!definition.catalog_kind?a.value:undefined}];
 });
 const manager=['admin','management'].includes(s.user.role);
 const contact=(data:Facility)=><div className={styles.contact}>
  {data.address&&<span><MapPin size={16}/>{data.address}</span>}
  {data.phone&&<span><Phone size={16}/>{data.phone}</span>}
  {data.email&&<span><Mail size={16}/>{data.email}</span>}
 </div>;
 return <div className={styles.page}>
  <PageHeader pageId="facility"/>
  <section className={styles.company} aria-label="Şirket bilgileri">
   <div className={styles.heading}><span className={styles.icon}><Building2 size={22}/></span><div><p>Şirket</p><h3>{company?.name||'Şirket seçilmedi'}</h3></div>
    {manager&&company&&<button type="button" className={`uni-control ${secondaryStyle}`} onClick={()=>onEdit('hotel')}><Pencil size={15}/>Şirketi düzenle</button>}
   </div>
   {company&&contact(company)}
   {company&&(company.tax_number||company.tax_office)&&<p className={styles.tax}>{[company.tax_office&&`${company.tax_office} Vergi Dairesi`,company.tax_number&&`Vergi no: ${company.tax_number}`].filter(Boolean).join(' · ')}</p>}
  </section>
  <div className={styles.relation}><span/><span>Bu şirkete bağlı oteller ve tesisler</span></div>
  <section className={styles.property} aria-label="Otel ve tesis bilgileri">
   <div className={styles.heading}><span className={styles.icon}><Hotel size={22}/></span><div><p>Otel / Tesis</p><h3>{property?.name||'Henüz tesis seçilmedi'}</h3></div>
    {manager&&property&&<button type="button" className={`uni-control ${secondaryStyle}`} onClick={()=>onEdit('branch')}><Pencil size={15}/>Oteli düzenle</button>}
   </div>
   {properties.length>1&&<UniSelect icon={<Hotel size={18}/>} variant="field" caption="Şirketin otelleri / tesisleri" ariaLabel="Şirketin otelleri / tesisleri" value={s.branch_id} options={properties.map(b=>({value:b.branch_id||'',label:b.name}))} onChange={branch_id=>onSelect({hotel_id:s.hotel_id,branch_id})}/>}
   {property? <>{contact(property)}
    {!!amenities.length&&<section className={styles.amenities} aria-label="Tesis olanakları">
     <h4>Tesis olanakları</h4>
     <ul>{amenities.map(a=><li key={a.code}><CatalogIcon iconKey={a.icon} featureCode={a.code} artwork artworkSize={96}/><div className={styles.amenityContent}><span className={styles.amenityLabel}>{a.label}</span>{a.quantity===undefined&&a.value&&<span className={styles.amenityValue}>{a.value}</span>}{a.quantity!==undefined&&<span className={styles.quantity} aria-label={`${a.quantity} adet`}>{a.quantity} adet</span>}</div></li>)}</ul>
    </section>}
    <details className={styles.details}><summary>Diğer bilgiler ve görseller<ChevronDown size={16}/></summary>
     {localized(property.description)&&<p>{localized(property.description)}</p>}
     {(property.tax_office||property.tax_number)&&<p>{[property.tax_office,property.tax_number].filter(Boolean).join(' · ')}</p>}
     {!!property.assets?.length&&<div className={styles.media}>{property.assets.map((a,i)=>a.kind==='image'?<img key={i} src={a.url} alt={localized(a.alt_text)||property.name} loading="lazy"/>:<video key={i} src={a.url} controls preload="none"/>)}</div>}
     {!localized(property.description)&&!property.assets?.length&&<p>Tanıtım bilgilerini ve görselleri “Oteli düzenle” bölümünden ekleyebilirsiniz.</p>}
     {manager&&<button type="button" className={`uni-control ${secondaryStyle}`} onClick={()=>property.branch_id&&onArchive(property.branch_id,property.name)}><Archive size={16}/>Tesisi arşive kaldır</button>}
    </details>
   </>:<p className={styles.empty}>Şirketinize ait ilk oteli, apartı veya hosteli ekleyin.</p>}
   {manager&&<div className={styles.footer}><span>{properties.length} otel / tesis</span><button type="button" disabled={!company} className={`uni-control ${buttonStyle}`} onClick={()=>onCreate('branch')}><Plus size={17}/>Otel / tesis ekle</button></div>}
  </section>
  {s.user.role==='admin'&&<div className={styles.newCompany}><p>Başka bir şirketin otellerini mi yöneteceksiniz?</p><button type="button" className={`uni-control ${secondaryStyle}`} onClick={()=>onCreate('hotel')}><Plus size={16}/>Şirket ekle</button></div>}
 </div>;
}
