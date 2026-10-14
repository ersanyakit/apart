// Fictional report data for screenshots only; no API/database writes.
export function demoReport(payload, generatedAt) {
 const {key,currency='TRY',start_date,end_date}=payload;
 const start=new Date(`${start_date}T12:00:00Z`), end=new Date(`${end_date}T12:00:00Z`);
 const count=Math.max(1,Math.min(31,Math.round((end-start)/86400000)+1));
 const occupied=[7,8,8,9,10,11,9,8,9,10,8,9,11,10,9];
 const rows=Array.from({length:count},(_,i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);const sold=occupied[i%occupied.length];return {date:d.toISOString().slice(0,10),lodging:sold*250000,extra:50000+i%3*25000,expenses:180000+i%4*40000,receipts:sold*250000+(i%3-1)*100000,refunds:0,forecast:0,physical:12,sellable:12,closed:0,occupied:sold,free:12-sold,physical_rate:sold/12*100,rate:sold/12*100};});
 const cols=entries=>entries.map(([key,label,format='number'])=>({key,label,format}));
 if(key==='finance.payment_methods')return {key,generated_at:generatedAt,currency,metrics:[],tables:[{key:'methods',title:'Ödeme yöntemleri',columns:cols([['method','Yöntem',''],['receipts','Tahsilat','money'],['refunds','İade','money'],['payments','Ödeme','money']]),rows:[{method:'credit_card',receipts:18000000,refunds:100000,payments:0},{method:'bank_transfer',receipts:9500000,refunds:0,payments:3000000},{method:'cash',receipts:4500000,refunds:50000,payments:800000},{method:'online',receipts:2000000,refunds:0,payments:0}]}],notes:['Örnek otel için kurgusal tanıtım verileri. Gerçek işletme verisi içermez.']};
 const finance={key:'finance',title:'Gelir ve nakit hareketleri',columns:cols([['date','Dönem',''],['lodging','Konaklama','money'],['extra','Ek gelir','money'],['expenses','Gider','money'],['receipts','Tahsilat','money'],['refunds','İade','money']]),rows};
 const capacity={key:'capacity',title:'Kapasite · oda',columns:cols([['date','Tarih',''],['physical','Fiziksel birim-gece'],['sellable','Satılabilir birim-gece'],['occupied','Dolu / rezerve birim-gece'],['free','Boş'],['rate','Satılabilir doluluk','percent'],['physical_rate','Fiziksel doluluk','percent']]),rows};
 const sum=k=>rows.reduce((total,row)=>total+row[k],0);
 const money=[{key:'lodging',label:'Konaklama geliri',value:sum('lodging'),format:'money'},{key:'receipts',label:'Tahsilat',value:sum('receipts'),format:'money'}];
 const occupancy=[{key:'occupancy',label:'Satılabilir doluluk',value:sum('occupied')/sum('sellable')*100,format:'percent'},{key:'occupied',label:'Dolu birim-gece',value:sum('occupied'),format:'number'}];
 return {key,generated_at:generatedAt,currency,metrics:key==='management.dashboard'?[...money,...occupancy]:key==='occupancy.daily'?occupancy:money,tables:key==='management.dashboard'?[finance,capacity]:key==='occupancy.daily'?[capacity]:[finance],notes:['Örnek otel için kurgusal tanıtım verileri. Gerçek işletme verisi içermez.']};
}
