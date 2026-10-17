import { RoomStatus as RoomState } from '../../lib/statuses.generated';
import { categoryLabels } from './options';
export type Definition = { key: string; name: string; category: string; description: string; unit?: string };
export type RecordKind = { key: string; name: string; money: boolean; hint: string };
export type Column = { key: string; label: string; format?: string };
export type Row = Record<string, string | number | null>;
export type ReportTable = { key: string; title: string; columns: Column[]; rows: Row[] };
export type ReportResult = { key: string; generated_at: string; currency: string; metrics: {key:string;label:string;value:number;format:string;note?:string}[]; tables: ReportTable[]; notes: string[] };
export function dayAt(value: string | Date) { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(new Date(value)); }
export function shiftDay(day: string, delta: number) { const d = new Date(`${day}T12:00:00+03:00`); d.setUTCDate(d.getUTCDate() + delta); return dayAt(d); }
const labels: Record<string,string> = {low:'Düşük',normal:'Normal',high:'Yüksek',urgent:'Acil',piece:'Adet',litre:'Litre',kg:'Kilogram',pack:'Paket',hour:'Saat',person:'Kişi',direct:'Resepsiyon / doğrudan',website:'İşletmenin web sitesi',phone:'Telefon',whatsapp:'WhatsApp',corporate:'Kurumsal anlaşma',confirmed:'Onaylı',checked_in:'Konaklıyor',completed:'Tamamlandı',cancelled:'İptal',open:'Açık',pending:'Bekliyor',quoted:'Teklif verildi',lost:'Kaybedildi',no_show:'Gelmedi',true:'Evet',false:'Hayır',bed:'Yatak',room:'Oda',apartment:'Daire',dormitory:'Yatakhane',cash:'Nakit',credit_card:'Kredi kartı',bank_transfer:'Banka havalesi',eft:'EFT',online:'Online ödeme',virtual_pos:'Sanal POS',agency:'Acente',Bos:'Boş',Temiz:RoomState.Clean,Kirli:RoomState.Dirty,Arizali:'Arızalı',Tadilat:RoomState.Maintenance};
export function display(value: unknown, format = '', currency = 'TRY', locale = 'tr-TR', translate: (source: string) => string = source => source) {
 if(value === null || value === undefined) return '—';
 if(format==='datetime') return new Intl.DateTimeFormat(locale,{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Istanbul'}).format(new Date(String(value)));
 if(format==='money') return new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:2}).format(Number(value)/100);
 if(format==='percent') return `${new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(Number(value))}%`;
 if(format==='number') return new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(Number(value));
 const label=labels[String(value)] ?? categoryLabels[String(value)];
 return label===undefined ? String(value) : translate(label);
}
// Prevent spreadsheet formula execution, including whitespace-prefixed payloads.
export function csvCell(value: unknown) { let s = String(value ?? ''); if (/^[\s]*[=+@-]/.test(s)) s = `'${s}`; return `"${s.replaceAll('"','""')}"`; }
export function reportCSV(report: ReportResult, locale = 'tr-TR', translate: (source: string) => string = source => source) {
 const rows: string[] = [`${csvCell(translate("Rapor"))};${csvCell(report.key)};${csvCell(report.currency)}`];
 for(const t of report.tables){ rows.push('',csvCell(translate(t.title)),t.columns.map(c=>csvCell(translate(c.label))).join(';')); for(const r of t.rows) rows.push(t.columns.map(c=>csvCell(display(r[c.key],c.format,report.currency,locale,translate))).join(';')); }
 return '\uFEFF'+rows.join('\r\n');
}
