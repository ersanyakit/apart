import contracts from './contracts.generated.json';
import { bookingStatuses, unitKinds } from './api';
import type { AuditDetails } from './audit-location';
export type AuditEntry = { action: string; entity: string; details?: AuditDetails };
export const auditActions: Record<string,string> = { archive:'Arşive taşındı',restore:'Arşivden geri alındı',create:'Oluşturuldu',update:'Güncellendi',delete:'Silindi',check_in:'Misafir girişi yapıldı',check_out:'Misafir çıkışı yapıldı',cancel:'Rezervasyon iptal edildi',move:'Oda değiştirildi',swap:'Odalar takas edildi',login:'Oturum açıldı',logout:'Oturum kapatıldı',assign:'Özellik atandı' };
export const auditEntities: Record<string,string> = {reception_notes:'Resepsiyon notu',report_records:'Rapor işlem kaydı',guest_assessments:'Misafir değerlendirmesi',bookings:'Rezervasyon',rooms:'Birim',branches:'Tesis',hotels:'Otel',users:'Personel',guest_profiles:'Misafir',beds:'Yatak',floors:'Kat',assets:'Medya',feature_categories:'Özellik kategorisi',feature_definitions:'Özellik',document_templates:'Belge şablonu',documents:'Belge'};
const fields: Record<string,string> = {body:'Not metni',archived:'Arşivde',guest_name:'Misafir',name:'Ad',display_name:'Görünen ad',code:'Birim / kayıt kodu',kind:'Tür',title:'Başlık',status:'Durum',guest_count:'Misafir sayısı',capacity:'Kapasite',rentable:'Satışa açık',inactive:'Pasif',role:'Yetki',user_role:'Yetki',daily_price_minor:'Gecelik fiyat',unit_price_minor:'Birim fiyat',amount_minor:'Tutar',deposit_minor:'Kapora',currency:'Para birimi',deposit_channel:'Kapora yöntemi',check_in:'Planlanan giriş',check_out:'Planlanan çıkış',actual_check_in:'Gerçek giriş',actual_check_out:'Gerçek çıkış',cancelled_at:'İptal zamanı',cancellation_reason:'İptal gerekçesi',status_reason:'Durum değişikliği gerekçesi',reason:'Açıklama / gerekçe',score:'Misafir puanı',revoked_at:'Kara listeden çıkarılma',revoke_reason:'Kara listeden çıkarma gerekçesi',hotel_name:'Kaydı ekleyen otel',actor_name:'İşlemi yapan',responsible_name:'Sorumlu personel',label:'İşlem açıklaması',notes:'Not',quantity:'Miktar',priority:'Öncelik',shift_code:'Vardiya',format:'Belge biçimi'};
const labels: Record<string,string> = {...Object.fromEntries(contracts.report_record_kinds.map(k=>[k.key,k.name])),...bookingStatuses,todo:'Yapılacak',doing:'Devam ediyor',done:'Tamamlandı',...unitKinds,Temiz:'Temiz',Kirli:'Kirli',Bos:'Boş',Arizali:'Arızalı',Tadilat:'Tadilatta',rating:'Puanlama',blacklist:'Kara liste',admin:'Sistem yöneticisi',management:'Yönetici',reception:'Resepsiyonist',housekeeping:'Kat hizmetleri',technical:'Teknik personel',cash:'Nakit',card:'Kart',credit_card:'Kredi kartı',bank_transfer:'Banka havalesi',plain:'Düz metin',html:'Biçimlendirilmiş belge',rental_contract:'Kira sözleşmesi',sale_contract:'Satış sözleşmesi',reservation_receipt:'Rezervasyon dekontu',sale_receipt:'Tahsilat dekontu',cancellation_receipt:'İptal belgesi',report_summary:'Rapor özeti',report_detail:'Ayrıntılı rapor',report_handover:'Vardiya teslim raporu',receipt:'Tahsilat',expense:'Gider',income:'Gelir',refund:'İade',task:'Görev',maintenance:'Arıza / bakım',open:'Açık',completed:'Tamamlandı',pending:'Bekliyor',low:'Düşük',normal:'Normal',high:'Yüksek',urgent:'Acil'};
function value(key:string,v:unknown,currency:unknown): string {
 if(v===null||v===undefined||v==='')return '—';
 if(typeof v==='boolean')return v?'Evet':'Hayır';
 if(key==='title'&&typeof v==='string'){try {v=JSON.parse(v)} catch { /* A historic plain title stays plain. */ }}
 if(key==='title'&&v!==null&&typeof v==='object'&&!Array.isArray(v))return Object.entries(v).filter(([,text])=>typeof text==='string').map(([lang,text])=>`${lang}: ${text}`).join(' · ')||'—';
 if(typeof v==='object')return '—';
 if(key.endsWith('_minor')&&Number.isFinite(Number(v))){const code=typeof currency==='string'&&/^[A-Z]{3}$/.test(currency)?currency:'TRY';return new Intl.NumberFormat('tr-TR',{style:'currency',currency:code}).format(Number(v)/100)+(currency?'':' (TRY)');}
 if(['check_in','check_out','actual_check_in','actual_check_out','cancelled_at','revoked_at'].includes(key)){const d=new Date(String(v));return Number.isFinite(d.getTime())?d.toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}):'Tarih kaydedilmemiş';}
 if(key==='score')return Number(v)>0?`${v} / 5`:'—';
 return labels[String(v)]??String(v);
}
export function auditChanges(entry:AuditEntry){
 const before=entry.details?.before??{},after=entry.details?.after??{};
 return Object.entries(fields).flatMap(([key,label])=>{
  if(!(key in before)&&!(key in after))return [];
  if(entry.action!=='create'&&entry.action!=='delete'&&JSON.stringify(before[key])===JSON.stringify(after[key]))return [];
  const a=value(key,before[key],before.currency??after.currency),b=value(key,after[key],after.currency??before.currency);
  return a==='—'&&b==='—'?[]:[{key,label,before:a,after:b}];
 });
}
export function auditSummary(entry:AuditEntry){
 const d=entry.details?.after??entry.details?.before??{};
 const subject=[entry.entity==='reception_notes'?d.title:undefined,d.guest_name,d.name,d.display_name,d.label,d.code].find(v=>typeof v==='string'&&v.trim());
 const action=entry.entity==='report_records'&&entry.action==='delete'?'Kayıt iptal edildi':auditActions[entry.action]??'İşlem kaydedildi';
 return `${subject?`${subject} · `:''}${action}`;
}
