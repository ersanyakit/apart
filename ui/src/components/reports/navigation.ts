import contracts from '../../lib/contracts.generated.json';
import type { Definition, RecordKind } from './model';
export type ReportPageID = `report.${string}`;
const order=['Yönetim','Finans','Doluluk','Rezervasyon','Gelir yönetimi','Misafir','Personel','Operasyon','Apart','Hostel'];
export const REPORTS: Definition[] = [...contracts.reports].sort((a,b)=>order.indexOf(a.category)-order.indexOf(b.category));
export const RECORD_KINDS: RecordKind[] = contracts.report_record_kinds;
export const reportPageID = (key:string):ReportPageID => `report.${key}`;
export const REPORT_PAGES = new Map(REPORTS.map(r=>[reportPageID(r.key),r]));
export function reportForPage(page:string) {return REPORT_PAGES.get(page as ReportPageID)}
