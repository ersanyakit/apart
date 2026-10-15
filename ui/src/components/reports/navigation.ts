import contracts from '../../lib/contracts.generated.json';
import type { Definition, RecordKind } from './model';
export type ReportPageID = `report.${string}`;
const order=['Yönetim','Finans','Doluluk','Rezervasyon','Gelir yönetimi','Misafir','Personel','Operasyon','Apart','Hostel'];
// This directory uses guest.search with server pagination, rather than the
// date-based report.generate aggregation contract.
export const CUSTOMER_DIRECTORY: Definition = {key:'guests.customers',name:'Müşteri Listesi',category:'Misafir',description:'Tüm tarihlerdeki müşterilerinizi benzersiz olarak görüntüleyin; ad, kimlik veya telefonla arayın.'};
export const REPORTS: Definition[] = [...contracts.reports,CUSTOMER_DIRECTORY].sort((a,b)=>order.indexOf(a.category)-order.indexOf(b.category));
export const RECORD_KINDS: RecordKind[] = contracts.report_record_kinds;
export const reportPageID = (key:string):ReportPageID => `report.${key}`;
export const REPORT_PAGES = new Map(REPORTS.map(r=>[reportPageID(r.key),r]));
export function reportForPage(page:string) {return REPORT_PAGES.get(page as ReportPageID)}

export type ReportGroupPageID = `report-group.${string}`;
const groupDefinitions = [
  ['management', 'Yönetim', 'İşletmenizin genel durumunu, performansını ve önemli göstergelerini inceleyin.'],
  ['finance', 'Finans', 'Tahsilatları, ödemeleri, bakiyeleri ve finansal hareketleri takip edin.'],
  ['occupancy', 'Doluluk', 'Oda ve yatak kullanımını, müsaitliği ve doluluk eğilimlerini inceleyin.'],
  ['reservations', 'Rezervasyon', 'Rezervasyon akışını, giriş ve çıkışları, iptalleri takip edin.'],
  ['pricing', 'Gelir yönetimi', 'Gelir performansını ve fiyatlandırma göstergelerini karşılaştırın.'],
  ['guests', 'Misafir', 'Müşterilerinizi, misafir profilini ve konaklama geçmişini inceleyin.'],
  ['staff', 'Personel', 'Personel faaliyetlerini ve ekip performansını takip edin.'],
  ['operations', 'Operasyon', 'Temizlik, bakım ve günlük operasyon kayıtlarını inceleyin.'],
  ['apart', 'Apart', 'Apart işletmenizin konaklama ve tahsilat durumunu takip edin.'],
  ['hostel', 'Hostel', 'Hostelinizin yatak kullanımını ve konaklama performansını inceleyin.'],
] as const;
export const REPORT_GROUPS = groupDefinitions.map(([key, name, description]) => ({
  id: `report-group.${key}` as ReportGroupPageID, name, description,
  reports: REPORTS.filter(report => report.category === name),
}));
export type ReportGroup = typeof REPORT_GROUPS[number];
export function reportGroupForPage(page: string) {
  const report = reportForPage(page === 'reports' ? 'report.management.dashboard' : page);
  return REPORT_GROUPS.find(group => group.id === page || (report && group.name === report.category));
}
export function reportSidebarPage(page: string) {
  return reportGroupForPage(page)?.id ?? page;
}
