export const escapeHTML = (text:unknown) => String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const plainHTML = (text:string) => `<p>${escapeHTML(text).replace(/\r?\n/g,'<br>')}</p>`;
const tags=new Set('p br strong b em i u s h1 h2 h3 h4 ul ol li blockquote table thead tbody tfoot tr th td hr span'.split(' '));
const blocked=new Set('script style iframe object embed svg math template noscript'.split(' '));
// Rebuild a small text-only DOM. Never copy arbitrary attributes, URLs or CSS.
export function sanitizeMarkup(source:string):string {
 if(typeof window==='undefined')return '';
 const parsed=new DOMParser().parseFromString(source,'text/html');
 const output=document.createElement('div');
 const append=(node:Node,parent:Node)=>{
  if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.textContent??''));return;}
  if(!(node instanceof Element))return;
  const tag=node.localName;if(blocked.has(tag))return;
  let target=parent;
  if(tags.has(tag)){
   const element=document.createElement(tag),align=node instanceof HTMLElement?node.style.textAlign:'';
   if(['left','right','center','justify'].includes(align))element.style.textAlign=align;
   if(['ltr','rtl'].includes(node.getAttribute('dir')??''))element.setAttribute('dir',node.getAttribute('dir')!);
   if(tag==='td'||tag==='th')for(const attr of ['colspan','rowspan']){const v=Number(node.getAttribute(attr));if(Number.isInteger(v)&&v>=1&&v<=20)element.setAttribute(attr,String(v));}
   parent.appendChild(element);target=element;
  }
  node.childNodes.forEach(child=>append(child,target));
 };
 parsed.body.childNodes.forEach(node=>append(node,output));return output.innerHTML;
}
export type Template = { template_id?:string;hotel_id:string;kind:string;format?:string;title:Record<string,string>;body:Record<string,string> };
export const documentKinds:Record<string,string>={rental_contract:'Kira Sözleşmesi',sale_contract:'Satış Sözleşmesi',reservation_receipt:'Rezervasyon Dekontu',sale_receipt:'Satış / Tahsilat Dekontu',cancellation_receipt:'İptal Belgesi'};
export const reportTemplateKinds:Record<string,string>={report_summary:'Yönetim Raporu Özeti',report_detail:'Ayrıntılı İşletme Raporu',report_handover:'Vardiya Teslim Raporu'};
export const documentFields:Record<string,string>={hotel_name:'Otel adı',branch_name:'Tesis adı',room_code:'Oda / daire',guest_name:'Misafir adı',guest_names:'Tüm misafirler',id_numbers:'Kimlik numaraları',phones:'Telefonlar',relationships:'Yakınlık bilgileri',check_in:'Giriş tarihi',check_out:'Çıkış tarihi',inventory:'Demirbaş listesi',amount:'Tutar',currency:'Para birimi',payment_method:'Ödeme yöntemi',payment_reference:'Ödeme referansı',paid_at:'Ödeme tarihi',booking_id:'Rezervasyon numarası'};
export const reportFields:Record<string,string>={report_title:'Rapor adı',hotel_name:'Otel adı',branch_name:'Tesis adı',report_period:'Rapor dönemi',currency:'Para birimi',report_metrics:'Rapor göstergeleri',report_tables:'Rapor tabloları',report_notes:'Hesaplama açıklamaları',prepared_by:'Hazırlayan personel',generated_at:'Hesaplama zamanı'};
export function htmlTemplate(t:Template):Template{return {...t,format:'html',title:{...t.title},body:Object.fromEntries(Object.entries(t.body).map(([lang,body])=>[lang,t.format==='html'?body:plainHTML(body)]))};}
