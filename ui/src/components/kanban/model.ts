export const COLUMNS = [
 {value:'todo',label:'Yapılacak',description:'Yeni notlar ve bekleyen işler'},
 {value:'doing',label:'Devam ediyor',description:'İlgilenilen işler ve takip notları'},
 {value:'done',label:'Tamamlandı',description:'Sonuçlanan işler ve teslim notları'},
] as const;
export type Status = typeof COLUMNS[number]['value'];
export type Note = {id:string;hotel_id:string;branch_id:string;booking_id:string|null;booking_auto:boolean;title:string;body:string;status:Status;priority:'normal'|'urgent';archived:boolean;version:number;created_by:string;created_by_name:string;updated_by:string;updated_by_name:string;created_at:string;updated_at:string};
export type NoteInput = Pick<Note,'id'|'hotel_id'|'branch_id'|'booking_id'|'booking_auto'|'title'|'body'|'status'|'priority'|'archived'|'version'>;
export type NotePage = {items:Note[];total:number;page:number};
export function noteInput(note:NoteInput):NoteInput {const {id,hotel_id,branch_id,booking_id,booking_auto,title,body,status,priority,archived,version}=note;return {id,hotel_id,branch_id,booking_id:booking_id??null,booking_auto:booking_auto??false,title,body,status,priority,archived,version};}
export const noteDate=(value:string)=>new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Istanbul'}).format(new Date(value));
