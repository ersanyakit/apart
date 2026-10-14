"use client";
import React,{useEffect,useState} from 'react';
import {FileText,LayoutTemplate} from 'lucide-react';
import {command,messageOf,type Snapshot} from '../../lib/api';
import {LOCALES} from '../../lib/i18n/config';
import {PageHeader} from '../PageHeader';
import {InlineSelectField,TextField} from '../fields';
import {ErrorMessage,buttonStyle,secondaryStyle} from '../FormKit';
import {useNotifications} from '../Toast';
import {confirmDialog} from '../ConfirmDialog';
import {DocumentEditor,DocumentPreview} from './DocumentEditor';
import {documentKinds,reportTemplateKinds,documentFields,reportFields,htmlTemplate,type Template} from './markup';
const allKinds={...documentKinds,...reportTemplateKinds};
const blank=(hotel_id:string,kind:string):Template=>({hotel_id,kind,title:{},body:{},format:'html'});
export function TemplateSettings({snapshot:s}:{snapshot:Snapshot}){
 const notify=useNotifications();const [templates,setTemplates]=useState<Template[]>([]),[defaults,setDefaults]=useState<Template[]>([]),[draft,setDraft]=useState<Template>(blank(s.hotel_id,'rental_contract')),[language,setLanguage]=useState('TR'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[dirty,setDirty]=useState(false),[preview,setPreview]=useState(false);
 useEffect(()=>{let active=true;setLoading(true);Promise.all([command<Template[]>('document.templates',{hotel_id:s.hotel_id}),command<Template[]>('document.template.defaults')]).then(([rows,defs])=>{if(active){setTemplates(rows);setDefaults(defs);setDraft(htmlTemplate(rows.find(t=>t.kind==='rental_contract')??blank(s.hotel_id,'rental_contract')));setDirty(false)}}).catch(e=>{if(active)setError(messageOf(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[s.hotel_id]);
 useEffect(()=>{if(!dirty)return;const handler=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler)},[dirty]);
 const update=(next:Template)=>{setDraft(next);setDirty(true)};
 const changeKind=async(kind:string)=>{if(dirty&&!await confirmDialog('Kaydedilmemiş değişikliklerden vazgeçip başka şablona geçilsin mi?'))return;setDraft(htmlTemplate(templates.find(t=>t.kind===kind)??blank(s.hotel_id,kind)));setDirty(false);setPreview(false);setError('')};
 const loadDefault=async()=>{const t=defaults.find(t=>t.kind===draft.kind);if(!t)return;if(Object.values(draft.body).some(v=>v.trim())&&!await confirmDialog('Bu şablonun metinleri hazır şablonla değiştirilsin mi? Kaydetmeden mevcut şablon değişmez.'))return;update({...htmlTemplate(t),hotel_id:s.hotel_id,template_id:draft.template_id});setPreview(false)};
 const languages=[...new Set(['TR',...s.languages,...Object.keys(draft.body),...Object.keys(draft.title)])];
 const isReport=draft.kind.startsWith('report_');
 return <form className="space-y-5" onSubmit={async e=>{e.preventDefault();if(busy||loading)return;setError('');const langs=new Set([...Object.keys(draft.title),...Object.keys(draft.body)]);const next={...draft,title:{...draft.title},body:{...draft.body}};for(const lang of langs){if(!(next.title[lang]??'').trim()&&!(next.body[lang]??'').replace(/<[^>]*>/g,'').trim()){delete next.title[lang];delete next.body[lang];continue}if(!next.title[lang]?.trim()||!next.body[lang]?.replace(/<[^>]*>/g,'').trim()){setError(`${lang} için başlık ve belge metnini birlikte doldurun.`);return}}setBusy(true);try{const saved=await command<Template>('document.template.save',next);setTemplates(rows=>[...rows.filter(t=>t.kind!==saved.kind),saved]);setDraft(htmlTemplate(saved));setDirty(false);notify('Şablon kaydedildi. Yeni belgelerde bu metin kullanılacak.')}catch(e){setError(messageOf(e))}finally{setBusy(false)}}}>
  <PageHeader pageId="templates"><div className="grid sm:grid-cols-2 gap-3">
   <InlineSelectField label="Şablon" value={draft.kind} disabled={busy||loading} onChange={v=>void changeKind(v)} options={Object.entries(allKinds).map(([value,label])=>({value,label:`${value.startsWith('report_')?'Rapor · ':'Belge · '}${label}`}))}/>
   <InlineSelectField label="Düzenlenen dil" value={language} onChange={setLanguage} options={languages.map(value=>({value,label:(LOCALES as Record<string,{label:string}>)[value.toLowerCase()]?.label??value}))}/>
  </div></PageHeader>
  <ErrorMessage message={error}/>
  {loading?<p className="text-sm text-uni-muted">Şablonlar yükleniyor…</p>:<>
   <div className="rounded-[22px] bg-[var(--color-uni-surface)] p-5 flex flex-wrap items-center gap-4">
    <LayoutTemplate size={24} className="text-blue-600"/><div className="flex-1 min-w-48"><h3 className="font-semibold text-sm">{allKinds[draft.kind]}</h3><p className="text-xs text-uni-muted mt-1">{isReport?'Rapor ekranındaki “Belge hazırla” seçeneğiyle gerçek verilerle doldurulur.':'Hazır metni yükleyin, işletmenize göre düzenleyin ve kaydedin.'}</p></div>
    <button type="button" disabled={busy||!defaults.some(t=>t.kind===draft.kind)} className={secondaryStyle} onClick={()=>void loadDefault()}>Hazır şablonu kullan</button>
   </div>
   <TextField label="Belge başlığı" value={draft.title[language]??''} onChange={v=>update({...draft,title:{...draft.title,[language]:v}})} disabled={busy} maxLength={300}/>
   <div className="flex items-center justify-between gap-3"><p className="text-xs text-uni-muted">{dirty?'Kaydedilmemiş değişiklikler var.':'Her dilin metni ayrı kaydedilir.'}</p><button type="button" className={secondaryStyle} onClick={()=>setPreview(v=>!v)} aria-pressed={preview}><FileText size={16}/>{preview?'Düzenlemeye dön':'Sayfa önizlemesi'}</button></div>
   {preview?<article className="rounded-[22px] bg-[var(--color-uni-surface)] p-6"><h2 className="text-xl mb-4">{draft.title[language]}</h2><DocumentPreview body={draft.body[language]??''} format="html" language={language}/></article>:<DocumentEditor key={`${draft.kind}-${language}`} value={draft.body[language]??''} onChange={v=>update({...draft,body:{...draft.body,[language]:v}})} language={language} fields={isReport?reportFields:documentFields} disabled={busy}/>}
   <div className="flex flex-wrap gap-3 items-center"><button className={buttonStyle} disabled={busy||!dirty}>{busy?'Kaydediliyor…':'Şablonu kaydet'}</button><p className="text-xs text-uni-muted">Daha önce oluşturulmuş belgeler değişmez.</p></div>
  </>}
 </form>;
}
