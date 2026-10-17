"use client";
import { useI18n } from "../I18n";

import React,{useEffect,useState,useRef} from 'react';
import {Printer,Download} from 'lucide-react';
import {command,messageOf,type Snapshot} from '../../lib/api';
import {SettingsEditor} from '../SettingsEditor';
import {InlineSelectField,TextField} from '../fields';
import {ErrorMessage,buttonStyle,secondaryStyle} from '../FormKit';
import {confirmDialog} from '../ConfirmDialog';
import {useNotifications} from '../Toast';
import {DocumentEditor} from './DocumentEditor';
import {reportTemplateKinds,type Template} from './markup';
import {reportDocument,printableHTML} from './report-document';
import {applicationText,loadApplicationDictionary} from '../../lib/i18n/application';
import {resolveLocale} from '../../lib/i18n/config';
import type {ReportResult} from '../reports/model';
export function ReportDocumentEditor({snapshot:s,report,name,period,branch,onClose}:{snapshot:Snapshot;report:ReportResult;name:string;period:string;branch:string;onClose:()=>void}){
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const [templates,setTemplates]=useState<Template[]>([]),[kind,setKind]=useState('report_summary'),[language,setLanguage]=useState('TR'),[body,setBody]=useState(''),[title,setTitle]=useState(name),[error,setError]=useState(''),[loading,setLoading]=useState(true),[dirty,setDirty]=useState(false),[omitted,setOmitted]=useState(0);const notify=useNotifications();
 const context={title:name,hotel:s.hotels.find(h=>h.hotel_id===s.hotel_id)?.name??'',branch,period,author:s.user.displayname||s.user.username};
 const generation=useRef(0);
 const apply=async(rows:Template[],k:string,lang:string)=>{const version=++generation.current;const locale=resolveLocale(lang);const dictionary=await loadApplicationDictionary(locale);if(version!==generation.current)return;const t=rows.find(t=>t.kind===k);if(!t)throw new Error('Şablon bulunamadı.');const result=reportDocument(t,lang,report,context,(source,params)=>applicationText(dictionary,source,params,locale));setBody(result.body);setTitle(result.title);setOmitted(result.omitted);setDirty(false);setKind(k);setLanguage(lang)};
 useEffect(()=>{let active=true;Promise.all([command<Template[]>('document.templates',{hotel_id:s.hotel_id}),command<Template[]>('document.template.defaults')]).then(async([custom,defaults])=>{if(!active)return;const rows=Object.keys(reportTemplateKinds).map(k=>custom.find(t=>t.kind===k)??defaults.find(t=>t.kind===k)).filter((t):t is Template=>!!t);setTemplates(rows);await apply(rows,'report_summary','TR')}).catch(e=>{if(active)setError(messageOf(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false;generation.current++}},[s.hotel_id]);
 const change=async(k:string,lang:string)=>{if(dirty&&!await confirmDialog(_uiText("Yazdığınız metinler seçilen şablonla yeniden oluşturulsun mu?")))return;setError('');try{await apply(templates,k,lang)}catch(e){setError(messageOf(e))}};
 const content=()=>printableHTML(title,body,language);
 return <SettingsEditor title={_uiText("Rapor belgesi hazırla")} description={_uiText("Şablon seçin, gerçek rapor verilerini kontrol edin ve açıklamalarınızı ekleyin. Düzenlenen metin rapor hesaplarını değiştirmez.")} backLabel="Rapora dön" onClose={async()=>{if(!dirty||await confirmDialog(_uiText("Belgedeki düzenlemeleri indirmediyseniz kaybolur. Rapora dönülsün mü?")))onClose()}}>
  <div className="space-y-5"><ErrorMessage message={error}/><div className="grid sm:grid-cols-2 gap-3"><InlineSelectField label={_uiText("Hazır rapor şablonu")} disabled={loading} value={kind} options={Object.entries(reportTemplateKinds).map(([value,label])=>({value,label:_uiText(label)}))} onChange={v=>void change(v,language)}/><InlineSelectField label={_uiText("Şablon dili")} disabled={loading} value={language} options={Object.keys(templates.find(t=>t.kind===kind)?.body??{TR:''}).map(value=>({value,label:value}))} onChange={v=>void change(kind,v)}/></div>
   <p className="text-xs text-uni-muted">{_uiText(name)} · {branch} · {period} · {report.currency}{_uiText(". Raporun mevcut filtreleri uygulanmıştır. Rapor başlıkları seçilen belge dilinde gösterilir.")}</p>
   {omitted>0&&kind!=='report_summary'&&<p role="status" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{_uiText("Belgeyi rahat düzenleyebilmeniz için en fazla 1.000 tablo satırı alınır.")} {omitted} {_uiText("ek satır tam CSV dökümünde bulunur.")}</p>}
   {loading?<p>{_uiText("Şablonlar yükleniyor…")}</p>:<><TextField label={_uiText("Belge başlığı")} value={title} onChange={v=>{setTitle(v);setDirty(true)}} maxLength={300}/><DocumentEditor value={body} language={language} onChange={v=>{setBody(v);setDirty(true)}}/>
    <div className="flex flex-wrap gap-3"><button type="button" disabled={!body||!title.trim()} className={buttonStyle} onClick={()=>{const iframe=document.createElement('iframe');iframe.title='Rapor yazdırma';iframe.setAttribute('sandbox','allow-same-origin allow-modals');iframe.style.cssText='position:fixed;left:-10000px;width:1100px;height:800px';iframe.srcdoc=content();iframe.onload=()=>{try{iframe.contentWindow?.focus();iframe.contentWindow?.print()}catch{setError(_uiText("Yazdırma açılamadı. Belgeyi indirip tarayıcıda açabilirsiniz."))}};document.body.appendChild(iframe);setTimeout(()=>iframe.remove(),60000)}}><Printer size={16}/>{_uiText("Yazdır / PDF kaydet")}</button>
    <button type="button" disabled={!body||!title.trim()} className={secondaryStyle} onClick={()=>{const url=URL.createObjectURL(new Blob([content()],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`rapor-${report.key}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(_uiText("Rapor belgesi indirildi."));setDirty(false)}}><Download size={16}/>{_uiText("Belgeyi indir")}</button></div><p className="text-xs text-uni-muted">{_uiText("Belgeyi HTML olarak indirebilir veya yazdırma penceresinden PDF kaydedebilirsiniz. Kalıcı şablon metinleri Belge Şablonları ekranından düzenlenir.")}</p>
   </>}
  </div>
 </SettingsEditor>;
}
