import { demoReport } from '../marketing/report-fixtures.mjs';
import { chromium } from '../../ui/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const facility={hotel_id:'demo-hotel',branch_id:'demo-branch',name:'Mavi Avlu Otel',description:{TR:'Örnek tesis'},address:'Örnek tesis',phone:'',email:'',tax_number:'',tax_office:'',logo_url:'',cover_url:'',assets:[],inventory:[],feature_assignments:[]};
const floors=[1,2].map(n=>({floor_id:'floor-'+n,branch_id:'demo-branch',code:String(n),label:{TR:n+'. Kat'},sort_order:n,width:16,height:10}));
const rooms=Array.from({length:12},(_,i)=>({room_id:'room-'+i,branch_id:'demo-branch',floor_id:'floor-'+(i<6?1:2),parent_id:null,kind:'room',capacity:2,effective_capacity:2,rentable:true,rental_mode:'room',bed_group:'',bed_level:0,position:{x:(i%3)*5,y:Math.floor(i%6/3)*5,width:4,height:4},code:String((i<6?100:200)+(i%6)+1),name:'Standart Oda',status:i===4?'Kirli':'Temiz',type:'Standart',description:{TR:'Çift kişilik oda'},assets:[],features:[],inventory_ids:[],check_in:'',check_out:'',guests:[],feature_assignments:[]}));
const catalog=JSON.parse(await fs.readFile('internal/domain/catalog/defaults.json','utf8'));
const registry={categories:catalog.categories.map(c=>({category_id:c.key,hotel_id:'demo-hotel',code:'catalog.'+c.key,label:c.label,sort_order:c.sort_order})),definitions:catalog.categories.flatMap(c=>c.groups.flatMap(g=>g.entries.map(e=>({feature_id:e.key,hotel_id:'demo-hotel',category_id:c.key,code:e.key,label:e.label,description:{},category:c.key,category_label:c.label,group_key:g.key,group_label:g.label,catalog_kind:e.kind,icon_key:e.icon_key,sort_order:c.sort_order*1000+e.sort_order,scopes:[e.scope],value_type:e.kind==='amenity'?'boolean':'integer',options:[],option_labels:{},filterable:true,min:0,max:null,unit:'',required:false,assets:[]}))))};
rooms.forEach((r,i)=>{r.bed_layout=i%2?'twin':'double';});
const now=new Date();const date=(offset)=>{const d=new Date(now);d.setDate(d.getDate()+offset);d.setHours(14,0,0,0);return d.toISOString();};
const bookings=[0,1,2,6,7,8].map((r,i)=>({booking_id:'booking-'+i,branch_id:'demo-branch',room_id:'room-'+r,guest_name:['Deniz Örnek','Ece Örnek','Can Örnek','Ada Örnek','Ege Örnek','İpek Örnek'][i],guest_count:2,daily_price_minor:250000,guests:[],notes:'Örnek rezervasyon',check_in:date(i<3?-2:1),check_out:date(i<3?2:4),actual_check_in:i<3?date(-2):null,status:i<3?'checked_in':'confirmed',allocations:[]}));
bookings[0].guests=[{id:'guest-1',name:'Deniz Örnek'},{id:'guest-2',name:'Selin Örnek'}];
bookings[0].currency='EUR';bookings[0].daily_price_minor=175000;bookings[0].created_by_name='Ayşe Yılmaz';bookings[0].checked_in_by_name='Ali Demir';bookings[1].status='completed';bookings[1].checked_in_by_name='Ece Yılmaz';bookings[1].checked_out_by_name='Deniz Kaya';bookings[2].status='cancelled';bookings[2].actual_check_in=null;bookings[2].cancelled_by_name='Ayşe Yılmaz';
rooms[1].status='Kirli';rooms[2].status='Tadilat';rooms[3].status='Arizali';rooms[4].status='Temiz';
const snapshot={application:'INTERACTIVEOTEL',user:{user_id:'demo-user',hotel_id:'demo-hotel',username:'demo',displayname:'Demo Yönetici',role:'admin',preferences:{theme:'blue'}},languages:['TR','EN'],floors,rooms,bookings,hotels:[facility],branches:[facility],hotel_id:'demo-hotel',branch_id:'demo-branch',server_time:now.toISOString(),feature_registry:registry};
const language=process.argv[2]||process.env.I18N_TEST_LOCALE||'en';snapshot.user.preferences.locale=language;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1,locale:'tr-TR',timezoneId:'Europe/Istanbul'});
page.on('console',m=>{if(m.type()==='error') console.log('CONSOLE',m.text().slice(0,500));});
page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
const writes=[];
await page.route('**/action*',async route=>{const req=route.request();const url=new URL(req.url());let body={};try{body=req.postDataJSON()||{}}catch{}const code=url.searchParams.get('code')||body.code;let data={};
if(code==='room.state'){writes.push(body.payload);const r=rooms.find(r=>r.room_id===body.payload.room_id);Object.assign(r,{status:body.payload.status,status_reason:body.payload.status_reason});data=r;}
else if(code==='room.cleaners')data=[{user_id:'cleaner-1',name:'Ayşe Temizlik',role:'housekeeping'}];
else if(code==='booking.transition'){writes.push(body.payload);data={};}
else if(code==='auth.properties')data=[{hotel_id:'demo-hotel',branch_id:'demo-branch',name:'Mavi Avlu Otel',location:'Örnek tesis',image:''}];
else if(code==='auth.people')data=[{user_id:'demo-user',name:'Demo Yönetici'}];
else if(code==='system.initial_sync')data=snapshot;
else if(code==='note.list') {const payload=body.payload||JSON.parse(url.searchParams.get('payload')||'{}');const status=payload.status||'todo';data={items:[{id:'note-'+status,hotel_id:'demo-hotel',branch_id:'demo-branch',title:{todo:'Akşam girişlerini hazırlayın',doing:'İkinci kat oda kontrolü',done:'Vardiya notları paylaşıldı'}[status]||'Günlük kontrol',body:'Örnek operasyon notu. Ekip ile güncel durumu paylaşın.',status,priority:'normal',archived:false,version:1,created_by:'demo-user',created_by_name:'Demo Yönetici',updated_by:'demo-user',updated_by_name:'Demo Yönetici',created_at:now.toISOString(),updated_at:now.toISOString()}],total:1,page:1};}
else if(code==='report.generate')data=demoReport(body.payload||JSON.parse(url.searchParams.get('payload')||'{}'),now.toISOString());
else if(code==='guest.reputation')data={ratings:[{id:'rating-1',score:4,actor_name:'Ayşe Yılmaz',hotel_name:'Mavi Avlu Otel',reason:'Odayı düzenli bıraktı, iletişimi iyiydi.',created_at:date(-3),updated_at:date(-3)}],blacklist:[],average:4,rating_count:1};
else if(code==='guest.stays'){const q=body.payload||JSON.parse(url.searchParams.get('payload')||'{}');data={items:[{guest_id:q.guest_id||'guest-1',name:q.guest_id==='guest-2'?'Selin Örnek':'Deniz Örnek',phone:'0555 000 00 00',booking_id:'booking-0',branch_id:'demo-branch',branch_name:'Mavi Avlu Otel',room_id:'room-0',room_code:'101',start:date(-2),end:date(2),status:'checked_in',daily_price_minor:175000,currency:'EUR',booking_nights:4,lodging_amount_minor:700000,guest_note:'Sessiz oda tercih ediyor.',booking_notes:'Geç varış talebi var.',companions:[{guest_id:'guest-2',name:'Selin Örnek'}]}],total:1};}
else if(code==='bed.list')data=[];
else if(code?.endsWith('.list'))data={items:[],total:0,page:1};
await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})});});
await page.goto('http://localhost:3000/login',{waitUntil:'networkidle'});
await page.getByRole('button',{name:/Mavi Avlu Otel/}).click();await page.getByRole('button',{name:/Demo Yönetici/}).click();await page.getByLabel('Şifre',{exact:true}).fill('demo-only');await page.getByRole('button',{name:/SİSTEME GİRİŞ YAP/i}).click();await page.waitForTimeout(1500); await page.addStyleTag({content:'nextjs-portal { display: none !important; }'});





const {default:assert}=await import('node:assert/strict');
const core=JSON.parse(await fs.readFile('ui/src/lib/i18n/application-core.json','utf8'))[language];
const dictionary={...JSON.parse(await fs.readFile(`ui/src/lib/i18n/marketing/${language}.json`,'utf8')),...JSON.parse(await fs.readFile(`ui/src/lib/i18n/application/${language}.json`,'utf8')),...core};
await page.waitForFunction(language=>document.documentElement.lang===language,language);
await page.getByRole('button',{name:core['Rezervasyon'],exact:true}).first().click();
const cards=page.locator('button').filter({has:page.locator('span[class*="description"]')});
const reports=JSON.parse(await fs.readFile('ui/src/lib/contracts.generated.json','utf8')).reports.filter(r=>r.key.startsWith('reservations.'));
for(const r of reports){await page.getByText(dictionary[r.name],{exact:true}).first().waitFor();await page.getByText(dictionary[r.description],{exact:true}).first().waitFor();}
await page.screenshot({path:`output/app-i18n/screenshots/${language}-reservations.png`});
const contracts=JSON.parse(await fs.readFile('ui/src/lib/contracts.generated.json','utf8'));
for(const group of contracts.report_groups){
 const label=core[group.name]||dictionary[group.name];assert.ok(label,`Missing group label ${group.name}`);
 await page.locator('aside').getByRole('button',{name:label,exact:true}).first().click();
 for(const report of contracts.reports.filter(r=>r.category===group.name)){await page.getByRole('button',{name:core[report.name]||dictionary[report.name],exact:true}).waitFor();await page.getByText(dictionary[report.description],{exact:true}).first().waitFor();}
}
await page.getByRole('button',{name:core['Olanak Tanımları'],exact:true}).first().click();
for(const c of catalog.categories)await page.getByText(dictionary[c.label.TR],{exact:true}).first().waitFor();
await page.getByRole('button',{name:dictionary['Özellik Ekle'],exact:true}).waitFor();
await page.screenshot({path:`output/app-i18n/screenshots/${language}-features.png`});
await page.getByRole('button',{name:core['Kurulum Sihirbazı'],exact:true}).first().click();
const steps=page.getByRole('navigation',{name:dictionary['Kurulum adımları']});
for(const label of ['İşletme','Tesis','Olanaklar','Katlar','Odalar','Personel','Kontrol'])assert.ok(await steps.getByRole('button',{name:new RegExp(dictionary[label]||core[label])}).count(),label);
await page.screenshot({path:`output/app-i18n/screenshots/${language}-setup.png`});
await page.locator('aside').getByRole('button',{name:core['Ayarlar'],exact:true}).click();
for(const label of ['Canlı önizleme','Hesap','Sayı biçimi'])await page.getByText(dictionary[label],{exact:true}).first().waitFor();
await page.getByRole('button',{name:dictionary['Detayları Gör'],exact:true}).click();
await page.getByText(dictionary['İkincil buton önizlemesi. Tema tüm uygulamaya uygulandı.'],{exact:true}).waitFor();
await page.screenshot({path:`output/app-i18n/screenshots/${language}-settings-translations.png`});
assert.ok(dictionary['Resepsiyon Notları'],'Reception navigation translation');
await page.locator('aside').getByRole('button',{name:dictionary['Resepsiyon Notları'],exact:true}).click();
await page.getByRole('button',{name:dictionary['Yeni not'],exact:true}).waitFor();
await page.getByText(dictionary['Ekip panosu · Bu tesisteki resepsiyon notları'],{exact:true}).waitFor();
await page.getByText(dictionary['Kartları sütunlar arasında sürükleyin veya kartın durum menüsünü kullanın. Notun tamamı için başlığına tıklayın.'],{exact:true}).waitFor();
await page.getByRole('button',{name:dictionary['Yeni not'],exact:true}).click();
for(const key of ['Yeni resepsiyon notu','Bu not, bu tesise yetkili yönetici ve resepsiyon personeli tarafından görülebilir ve güncellenebilir.'])await page.getByText(dictionary[key],{exact:true}).first().waitFor();
await page.getByPlaceholder(dictionary['Örn. 204 numaralı odanın geç çıkış talebi'],{exact:true}).waitFor();
await page.getByPlaceholder(dictionary['Vardiya arkadaşlarınızın bilmesi gerekenleri yazın…'],{exact:true}).waitFor();
await page.getByRole('button',{name:dictionary['Notu kaydet'],exact:true}).waitFor();
await page.screenshot({path:`output/app-i18n/screenshots/${language}-reception-note-translations.png`});
console.log('PASS',language,'all report cards and descriptions, catalog categories, setup steps, settings preview and reception note editor');
await browser.close();
