"use client";
import { useI18n } from "../I18n";

import React,{useEffect,useState} from 'react';
import {FileText,Check} from 'lucide-react';
import {command,messageOf,type Snapshot} from '../../lib/api';
import {LOCALES} from '../../lib/i18n/config';
import {PageHeader} from '../PageHeader';
import {InlineSelectField,TextField} from '../fields';
import {ErrorMessage,buttonStyle,secondaryStyle} from '../FormKit';
import {useNotifications} from '../Toast';
import {confirmDialog} from '../ConfirmDialog';
import {DocumentEditor,DocumentPreview} from './DocumentEditor';
import {documentKinds,reportTemplateKinds,documentFields,reportFields,htmlTemplate,type Template} from './markup';
import styles from './TemplateSettings.module.css';
const allKinds={...documentKinds,...reportTemplateKinds};
const descriptions:Record<string,string>={
 rental_contract:'Konaklama koşulları, tarihler ve oda demirbaşları.',
 sale_contract:'Satış koşulları, bedel ve tarafların onayı.',
 reservation_receipt:'Misafir, giriş ve çıkış bilgileriyle rezervasyon özeti.',
 sale_receipt:'Tahsil edilen tutar ve ödeme bilgileri.',
 cancellation_receipt:'İptal edilen rezervasyonun kayıt belgesi.',
 report_summary:'Temel göstergelerle işletmenin genel durumu.',
 report_detail:'Tablolar ve göstergelerle ayrıntılı işletme sonuçları.',
 report_handover:'Vardiya sonunda devredilen işler ve durum bilgileri.',
};
const blank=(hotel_id:string,kind:string):Template=>({hotel_id,kind,title:{},body:{},format:'html'});
export function TemplateSettings({snapshot:s}:{snapshot:Snapshot}){
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const notify=useNotifications();const [templates,setTemplates]=useState<Template[]>([]),[defaults,setDefaults]=useState<Template[]>([]),[draft,setDraft]=useState<Template>(blank(s.hotel_id,'rental_contract')),[language,setLanguage]=useState('TR'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[dirty,setDirty]=useState(false),[preview,setPreview]=useState(false);
 useEffect(()=>{let active=true;setLoading(true);Promise.all([command<Template[]>('document.templates',{hotel_id:s.hotel_id}),command<Template[]>('document.template.defaults')]).then(([rows,defs])=>{if(active){setTemplates(rows);setDefaults(defs);setDraft(htmlTemplate(rows.find(t=>t.kind==='rental_contract')??blank(s.hotel_id,'rental_contract')));setDirty(false)}}).catch(e=>{if(active)setError(messageOf(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[s.hotel_id]);
 useEffect(()=>{if(!dirty)return;const handler=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler)},[dirty]);
 const update=(next:Template)=>{setDraft(next);setDirty(true)};
 const changeKind=async(kind:string)=>{if(dirty&&!await confirmDialog(_uiText("Kaydedilmemiş değişikliklerden vazgeçip başka şablona geçilsin mi?")))return;setDraft(htmlTemplate(templates.find(t=>t.kind===kind)??blank(s.hotel_id,kind)));setDirty(false);setPreview(false);setError('')};
 const loadDefault=async()=>{const t=defaults.find(t=>t.kind===draft.kind);if(!t)return;if(Object.values(draft.body).some(v=>v.trim())&&!await confirmDialog(_uiText("Bu şablonun metinleri hazır şablonla değiştirilsin mi? Kaydetmeden mevcut şablon değişmez.")))return;update({...htmlTemplate(t),hotel_id:s.hotel_id,template_id:draft.template_id});setPreview(false)};
 const languages=[...new Set(['TR',...s.languages,...Object.keys(draft.body),...Object.keys(draft.title)])];
 const isReport=draft.kind.startsWith('report_');
 return <form className="space-y-5" onSubmit={async e=>{e.preventDefault();if(busy||loading)return;setError('');const langs=new Set([...Object.keys(draft.title),...Object.keys(draft.body)]);const next={...draft,title:{...draft.title},body:{...draft.body}};for(const lang of langs){if(!(next.title[lang]??'').trim()&&!(next.body[lang]??'').replace(/<[^>]*>/g,'').trim()){delete next.title[lang];delete next.body[lang];continue}if(!next.title[lang]?.trim()||!next.body[lang]?.replace(/<[^>]*>/g,'').trim()){setError(`${lang} için başlık ve belge metnini birlikte doldurun.`);return}}setBusy(true);try{const saved=await command<Template>('document.template.save',next);setTemplates(rows=>[...rows.filter(t=>t.kind!==saved.kind),saved]);setDraft(htmlTemplate(saved));setDirty(false);notify("Şablon kaydedildi. Yeni belgelerde bu metin kullanılacak.")}catch(e){setError(messageOf(e))}finally{setBusy(false)}}}>
  <PageHeader pageId="templates"><div className="w-full sm:max-w-xs">
   <InlineSelectField label={_uiText("Düzenlenen dil")} value={language} onChange={setLanguage} options={languages.map(value=>({value,label:(LOCALES as Record<string,{label:string}>)[value.toLowerCase()]?.label??value}))}/>
  </div></PageHeader>
  <ErrorMessage message={error}/>
  <section aria-label={_uiText("Belge ve rapor şablonları")} className={styles.catalog}>
   {Object.entries(allKinds).map(([kind,title])=><button key={kind} type="button" disabled={busy||loading} aria-pressed={draft.kind===kind} className={`uni-control ${styles.card}`} onClick={()=>void changeKind(kind)}>
    <img src={`/images/template-icons-dott/${kind}.avif`} width={96} height={96} alt="" aria-hidden="true" className={styles.artwork} loading="lazy"/>
    <span className={styles.copy}><span className={styles.category}>{kind.startsWith('report_')?_uiText("Rapor şablonu"):_uiText("Belge şablonu")}</span><strong>{title}</strong><span className={styles.description}>{descriptions[kind]}</span></span>
    <span className={styles.selection} aria-hidden="true">{draft.kind===kind&&<Check size={14}/>}</span>
   </button>)}
  </section>
  {loading?<p className="text-sm text-uni-muted">{_uiText("Şablonlar yükleniyor…")}</p>:<>
   <div className={styles.editorHeading}>
    <img src={`/images/template-icons-dott/${draft.kind}.avif`} width={96} height={96} alt="" aria-hidden="true" className={styles.artwork}/><div className={styles.editorCopy}><h3>{allKinds[draft.kind]}</h3><p>{isReport?_uiText("Rapor ekranındaki “Belge hazırla” seçeneğiyle gerçek verilerle doldurulur."):_uiText("Hazır metni yükleyin, işletmenize göre düzenleyin ve kaydedin.")}</p></div>
    <button type="button" disabled={busy||!defaults.some(t=>t.kind===draft.kind)} className={secondaryStyle} onClick={()=>void loadDefault()}>{_uiText("Hazır şablonu kullan")}</button>
   </div>
   <TextField label={_uiText("Belge başlığı")} value={draft.title[language]??''} onChange={v=>update({...draft,title:{...draft.title,[language]:v}})} disabled={busy} maxLength={300}/>
   <div className="flex items-center justify-between gap-3"><p className="text-xs text-uni-muted">{dirty?_uiText("Kaydedilmemiş değişiklikler var."):_uiText("Her dilin metni ayrı kaydedilir.")}</p><button type="button" className={secondaryStyle} onClick={()=>setPreview(v=>!v)} aria-pressed={preview}><FileText size={16}/>{preview?_uiText("Düzenlemeye dön"):_uiText("Sayfa önizlemesi")}</button></div>
   {preview?<article className="rounded-[22px] bg-[var(--color-uni-surface)] p-6"><h2 className="text-xl mb-4">{draft.title[language]}</h2><DocumentPreview body={draft.body[language]??''} format="html" language={language}/></article>:<DocumentEditor key={`${draft.kind}-${language}`} value={draft.body[language]??''} onChange={v=>update({...draft,body:{...draft.body,[language]:v}})} language={language} fields={isReport?reportFields:documentFields} disabled={busy}/>}
   <div className="flex flex-wrap gap-3 items-center"><button className={buttonStyle} disabled={busy||!dirty}>{busy?_uiText("Kaydediliyor…"):_uiText("Şablonu kaydet")}</button><p className="text-xs text-uni-muted">{_uiText("Daha önce oluşturulmuş belgeler değişmez.")}</p></div>
  </>}
 </form>;
}
