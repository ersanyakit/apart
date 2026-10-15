import contracts from '../../lib/contracts.generated.json';
import type { Definition, RecordKind } from './model';
export type ReportPageID = `report.${string}`;
const order=contracts.report_groups.map(group=>group.name);
// This directory uses guest.search with server pagination, rather than the
// date-based report.generate aggregation contract.
export const CUSTOMER_DIRECTORY: Definition = {key:'guests.customers',name:'Müşteri Listesi',category:'Misafir',description:'Tüm tarihlerdeki müşterilerinizi benzersiz olarak görüntüleyin; ad, kimlik veya telefonla arayın.'};
export const REPORTS: Definition[] = [...contracts.reports,CUSTOMER_DIRECTORY].sort((a,b)=>order.indexOf(a.category)-order.indexOf(b.category));
export const RECORD_KINDS: RecordKind[] = contracts.report_record_kinds;
export const reportPageID = (key:string):ReportPageID => `report.${key}`;
export const REPORT_PAGES = new Map(REPORTS.map(r=>[reportPageID(r.key),r]));
export function reportForPage(page:string) {return REPORT_PAGES.get(page as ReportPageID)}

export type ReportGroupPageID = `report-group.${string}`;
export const REPORT_GROUPS = contracts.report_groups.map(({key, name, description}) => ({
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
