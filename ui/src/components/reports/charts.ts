import { display, type ReportResult, type Row } from './model';
export type ChartKind='line'|'bar'|'donut'|'pivot'|'funnel';
export type ChartSpec={kind:ChartKind;table:string;title:string;explanation:string;group:string;values:{key:string;label:string;format?:string}[];column?:string;count?:boolean;separate?:boolean;suffix?:string[]};
const v=(key:string,label:string,format='number')=>({key,label,format});
const c=(kind:ChartKind,table:string,title:string,explanation:string,group:string,values:ChartSpec['values'],extra:Partial<ChartSpec>={}):ChartSpec=>({kind,table,title,explanation,group,values,...extra});
const revenue=()=>c('line','finance','Gelir ve tahsilatın seyri','Konaklama geliri hizmetin oluştuğu dönemi, tahsilat paranın alındığı dönemi gösterir. İkisi ayrı izlenir.','date',[v('lodging','Konaklama geliri','money'),v('receipts','Tahsilat','money')]);
const occupancy=()=>c('line','capacity','Doluluk nasıl değişiyor?','Dolu veya rezerve birimlerin satılabilir kapasiteye oranı. Gelecek tarihler mevcut rezervasyonları gösterir.','date',[v('rate','Satılabilir doluluk','percent'),v('physical_rate','Fiziksel doluluk','percent')]);
const units=()=>c('bar','units','Hangi birim ne kadar gelir üretiyor?','Her satır bir birimdir. Konaklama geliri ve doğrudan giderler karşılaştırılır.','unit',[v('revenue','Konaklama geliri','money'),v('expenses','Doğrudan gider','money')]);
const recordCount=(title:string,group='status')=>c('donut','records',title,'Seçilen dönemdeki kayıtların dağılımı. Her kayıt bir kez sayılır.',group,[v('count','Kayıt')],{count:true});
export const CHARTS:Record<string,ChartSpec[]>={
 'management.dashboard':[revenue(),occupancy()],
 'management.properties':[c('pivot','properties','Tesis performans matrisi','Tesislerin gelir, gider ve tahsilatını aynı para biriminde karşılaştırın.','branch',[v('revenue','Konaklama','money'),v('expenses','Gider','money'),v('receipts','Tahsilat','money')])],
 'management.records':[recordCount('Hangi işlemler kaydedildi?','kind')],
 'finance.daily_revenue':[revenue()],
 'finance.income_expense':[c('bar','finance','Gelir ve gider karşılaştırması','Konaklama, ek hizmet gelirleri ve faaliyet giderleri ayrı gösterilir.','date',[v('lodging','Konaklama','money'),v('extra','Ek gelir','money'),v('expenses','Gider','money')])],
 'finance.payment_methods':[c('donut','methods','Tahsilatların ödeme yöntemleri','Yalnızca gerçekleşen tahsilatlar. İade ve ödemeler aşağıdaki tabloda ayrı gösterilir.','method',[v('receipts','Tahsilat','money')])],
 'finance.receivables':[c('donut','balances','Alacakların vade dağılımı','Rezervasyonlardan kalan tutarlar, çıkış tarihi esas alınarak yaşlandırılır.','age',[v('balance','Kalan alacak','money')]),c('bar','accounts','Diğer alacaklar ve tedarikçi borçları','Açık hesap bakiyeleri, kayıtlı tahsilat ve ödemeler düşüldükten sonraki tutarlardır.','type',[v('amount','Açık bakiye','money')])],
 'finance.refunds':[c('bar','cancellations','Kanallara göre iptal edilen satış','Bu tutar gerçekleşmiş gelir değildir; iptal edilen rezervasyonların sözleşme bedelidir.','channel',[v('amount','İptal edilen satış','money')]),c('donut','records','İadelerin durumu','Bekleyen ve gerçekleşen iade tutarları.','status',[v('amount','İade tutarı','money')])],
 'finance.profitability':[c('pivot','units','Birim gelir ve gider matrisi','Dağıtılmamış giderler ayrıca görünür. Sonuç vergi sonrası net kâr değildir.','unit',[v('revenue','Konaklama','money'),v('extra','Ek gelir','money'),v('expenses','Doğrudan gider','money'),v('result','Sonuç','money')])],
 'occupancy.daily':[occupancy()], 'occupancy.history':[occupancy()], 'occupancy.forecast':[occupancy()],
 'occupancy.capacity':[c('bar','capacity','Satılabilir ve kapalı kapasite','Birim-gece cinsinden fiziksel kapasitenin satışa açık ve kapalı kısımları.','date',[v('sellable','Satılabilir birim-gece'),v('closed','Kapalı birim-gece')])],
 'occupancy.performance':[units()],
 'reservations.summary':[c('donut','bookings','Rezervasyonların durum dağılımı','Seçilen dönemde oluşturulan rezervasyonların güncel durumları.','group',[v('count','Rezervasyon')])],
 'reservations.channels':[c('bar','bookings','Kanal geliri ve komisyon','Satış tutarı ile komisyon sonrası kalan tutarı karşılaştırın.','group',[v('sales','Sözleşme tutarı','money'),v('net','Komisyon sonrası','money')])],
 'reservations.conversion':[c('funnel','funnel','Satış talepleri hangi aşamada?','Her talep yalnızca güncel aşamasında sayılır; bu kümülatif bir satış hunisi değildir.','status',[v('count','Talep')])],
 'reservations.future':[c('bar','arrivals','Günlük beklenen girişler','Seçili listedeki rezervasyonlar, giriş gününe göre gruplandırılır.','start',[v('count','Misafir')])],
 'reservations.length':[c('donut','bookings','Konaklamalar ne kadar sürüyor?','Rezervasyonların 1–7, 8–27 ve 28+ gece dağılımı.','group',[v('count','Rezervasyon')])],
 'pricing.metrics':[c('line','capacity','Gerçekleşen konaklama geliri','Seçilen ürün türünün hizmet günü geliri. ADR ve RevPAR hesapları üstteki göstergelerdedir.','date',[v('revenue','Konaklama geliri','money')])],
 'pricing.performance':[c('pivot','prices','Fiyat performans matrisi','Ürün türü, kaynak, gün türü ve aya göre satılan gece ve ortalama fiyat. Ortalama fiyatlar toplanmaz.','group',[v('nights','Gece'),v('average','Ortalama gecelik','money'),v('sales','Satış','money')],{separate:true})],
 'pricing.forecast':[c('line','forecast','Rezervasyonlara bağlı beklenen gelir','Yalnızca mevcut rezervasyonların gelecek geceleri. Yeni satışlar ve iptaller sonucu değiştirebilir.','date',[v('forecast','Beklenen gelir','money')])],
 'pricing.competitors':[c('bar','records','Rakip fiyat gözlemleri','Her gözlem ayrı gösterilir; kaynak ve gözlem tarihi detay tablosundadır.','label',[v('amount','Gecelik fiyat','money')],{separate:true,suffix:['party','date']})],
 'guests.profile':[c('donut','guest_profile','Misafirlerin ülke dağılımı','İlk misafirin ülkesine göre rezervasyon sayısı; kimlik bilgileri grafikte gösterilmez.','country',[v('bookings','Rezervasyon')])],
 'guests.repeat':[c('bar','guests','En sık konaklayan misafirler','Kimliği eşleştirilebilen misafirlerin ziyaret sayıları.','guest',[v('visits','Ziyaret')])],
 'guests.satisfaction':[c('bar','ratings','Platformlara göre memnuniyet','Kayıtlı değerlendirmelerin ortalama puanı; ölçek 1–5.','platform',[v('score','Ortalama puan / 5')])],
 'guests.complaints':[recordCount('Şikâyetlerin nedenleri','category'),c('pivot','records','Şikâyet durumu matrisi','Her kategori için açık ve çözülen şikâyet sayısını karşılaştırın.','category',[v('count','Şikâyet')],{column:'status',count:true})],
 'staff.performance':[c('pivot','staff','Personel işlem ve görev matrisi','İşlem hacimleri ve görev sayıları; tek başına performans puanı değildir.','staff',[v('bookings','Rezervasyon'),v('checkouts','Çıkış'),v('tasks','Görev'),v('completed','Tamamlanan'),v('hours','Fazla mesai saati')])],
 'staff.shifts':[c('bar','shifts','Beklenen kasa ve sayılan kasa','Kapanış yapılmamış vardiyalarda sayılan kasa gösterilmez.','reference',[v('expected','Beklenen kasa','money'),v('closing','Sayılan kasa','money'),v('difference','Kasa farkı','money')])],
 'staff.tasks':[recordCount('Görevlerin tamamlanma durumu'),c('pivot','records','Sorumlu personele göre görevler','Personel ve görev durumuna göre kayıt sayıları.','responsible',[v('count','Görev')],{column:'status',count:true})],
 'operations.housekeeping':[c('donut','readiness','Birimlerin temizlik durumu','Birimlerin şu anki durumu. Tarih filtresinden bağımsız güncel görünüm.','status',[v('count','Birim')],{count:true})],
 'operations.maintenance':[c('bar','records','Bakım maliyetleri nerede oluşuyor?','Birimlere atanmış kayıtlı bakım maliyetleri.','unit',[v('amount','Bakım maliyeti','money')]),recordCount('Bakım işlerinin durumu')],
 'operations.inventory':[c('pivot','stock','Stok ve tüketim matrisi','Her ürün kendi ölçü birimiyle gösterilir; farklı ürünlerin miktarları birbiriyle toplanmaz.','item',[v('in','Giriş'),v('used','Tüketim'),v('balance','Kalan'),v('threshold','Sipariş eşiği')],{separate:true,suffix:['measure']})],
 'operations.damage':[c('donut','records','Hasar maliyetlerinin kaynağı','Kayıtlı onarım veya değiştirme maliyetleri.','category',[v('amount','Maliyet','money')])],
 'apart.income':[units()], 'apart.occupancy':[occupancy()],
 'apart.long_stays':[c('bar','arrivals','Uzun süreli konaklamalar','Her rezervasyonun planlanan gece sayısı.','guest',[v('nights','Gece')])],
 'apart.rent':[c('pivot','records','Kira ve tahsilat hareketleri','Kontrat ve ödeme kalemleri ayrı sütunlardadır; kira bedeli tahsilat anlamına gelmez.','party',[v('amount','Tutar','money')],{column:'kind'})],
 'apart.costs':[c('donut','records','Daire giderlerinin dağılımı','Seçili dönemde kaydedilmiş giderler, kategori bazında.','category',[v('amount','Gider','money')])],
 'apart.maintenance':[c('bar','records','Dairelerin bakım maliyeti','Yalnızca dairelere bağlanmış bakım kayıtları.','unit',[v('amount','Bakım','money')])],
 'apart.profitability':[c('pivot','units','Daire faaliyet sonucu matrisi','Konaklama, ek gelir ve doğrudan giderleri birlikte inceleyin.','unit',[v('revenue','Konaklama','money'),v('extra','Ek gelir','money'),v('expenses','Gider','money'),v('result','Sonuç','money')])],
 'apart.contracts':[c('bar','records','Yaklaşan kontrat bitişleri','Seçilen dönemde sona eren kontrat sayıları.','date',[v('count','Kontrat')],{count:true})],
 'apart.deposits':[c('bar','deposits','İade edilmemiş güvence tutarları','Güvence depozitoları konaklama geliri olarak sayılmaz.','party',[v('balance','Güvence bakiyesi','money')])],
 'hostel.occupancy':[occupancy()],
 'hostel.bunks':[c('donut','bunks','Ranza katlarına göre yataklar','Her fiziksel yatak birimi bir kez sayılır.','level',[v('count','Yatak')],{count:true})],
 'hostel.revenue':[units()],
 'hostel.types':[c('bar','bookings','Yatakhane türlerine göre satış','Tür bazında toplam rezervasyon satış tutarı.','group',[v('sales','Satış tutarı','money')])],
 'hostel.moves':[c('pivot','moves','Birim değişim matrisi','Satırlar önceki birim, sütunlar yeni birimdir; hücreler değişim sayısıdır.','from',[v('count','Değişim')],{column:'to',count:true})],
 'hostel.groups':[c('bar','bookings','Grupların kapasite kullanımı','Grup adına göre misafir ve gece sayıları.','group',[v('guests','Misafir'),v('nights','Gece')])],
 'hostel.common_areas':[c('bar','records','Ortak alan kullanımı','Kaydedilen kullanım miktarları, alan adına göre.','category',[v('quantity','Kullanım')])],
 'hostel.short_stays':[c('donut','arrivals','Kısa konaklamaların gece dağılımı','1–7 gecelik rezervasyonların gece sayısına göre dağılımı.','nights',[v('count','Rezervasyon')],{count:true})],
 'hostel.extras':[c('donut','records','Ek hizmet gelirleri nereden geliyor?','Ek hizmetlerden doğan gelir; tahsilat ayrıca takip edilir.','category',[v('amount','Ek gelir','money')])],
 'hostel.readiness':[c('donut','readiness','Yatakların hazırlık durumu','Yatakların güncel temizlik ve kullanım hazırlığı.','status',[v('count','Yatak')],{count:true})],
};
export type Point={key?:string;label:string;values:(number|null)[]};
export function groupLabel(value:unknown){if(value===null||value===undefined||value==='')return 'Belirtilmemiş';const s=String(value);if(/^\d{4}-\d{2}-\d{2}T/.test(s))return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(new Date(s));return display(s)}
export function chartPoints(rows:Row[],spec:ChartSpec):Point[]{
 if(spec.separate)return rows.map((row,index)=>({key:String(row.id??index),label:[groupLabel(row[spec.group]),...(spec.suffix??[]).map(k=>groupLabel(row[k]))].join(' · '),values:spec.values.map(v=>row[v.key]===null||row[v.key]===undefined?null:Number(row[v.key]))}));
 const map=new Map<string,Point>();
 for(const row of rows){const label=groupLabel(row[spec.group]);let p=map.get(label);if(!p){p={label,values:spec.values.map(()=>null)};map.set(label,p)};spec.values.forEach((v,i)=>{const raw=spec.count?1:row[v.key];if(raw!==null&&raw!==undefined&&Number.isFinite(Number(raw)))p!.values[i]=(p!.values[i]??0)+Number(raw)})}
 let points=[...map.values()];if(spec.kind==='line')return points.sort((a,b)=>a.label.localeCompare(b.label));
 if(spec.kind==='funnel'){const order=['Açık','Teklif verildi','Onaylı','Kaybedildi'];return points.sort((a,b)=>order.indexOf(a.label)-order.indexOf(b.label))}
 points.sort((a,b)=>Math.abs(b.values[0]??0)-Math.abs(a.values[0]??0));if(points.length>12&&spec.kind!=='pivot'){const tail=points.slice(11);points=[...points.slice(0,11),{label:`Diğer (${tail.length} grup)`,values:spec.values.map((_,i)=>tail.reduce((sum,p)=>sum+(p.values[i]??0),0))}]};return points;
}
export function pivotData(rows:Row[],spec:ChartSpec){
 if(!spec.column)return {columns:spec.values.map(v=>v.label),formats:spec.values.map(v=>v.format),rows:chartPoints(rows,spec)};
 const cols=Array.from(new Set(rows.map(r=>groupLabel(r[spec.column!])))).sort();const cells=new Map<string,(number|null)[]>();
 for(const r of rows){const label=groupLabel(r[spec.group]);const values=cells.get(label)??cols.map(()=>null);const i=cols.indexOf(groupLabel(r[spec.column]));const n=spec.count?1:Number(r[spec.values[0].key]??0);values[i]=(values[i]??0)+n;cells.set(label,values)}
 return {columns:cols,formats:cols.map(()=>spec.values[0].format),rows:[...cells].map(([label,values])=>({label,values}))};
}
export function chartsFor(report:ReportResult){return (CHARTS[report.key]??[]).map(spec=>({spec,rows:report.tables.find(t=>t.key===spec.table)?.rows??[]}))}
