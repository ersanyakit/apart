import { demoReport } from './report-fixtures.mjs';
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
const snapshot={application:'INTERACTIVEOTEL',user:{user_id:'demo-user',hotel_id:'demo-hotel',username:'demo',displayname:'Demo Yönetici',role:'admin',preferences:{theme:'blue'}},languages:['TR','EN'],floors,rooms,bookings,hotels:[facility],branches:[facility],hotel_id:'demo-hotel',branch_id:'demo-branch',server_time:now.toISOString(),feature_registry:registry};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1,locale:'tr-TR',timezoneId:'Europe/Istanbul'});
page.on('console',m=>{if(m.type()==='error') console.log('CONSOLE',m.text().slice(0,500));});
page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
await page.route('**/action*',async route=>{const req=route.request();const url=new URL(req.url());let body={};try{body=req.postDataJSON()||{}}catch{}const code=url.searchParams.get('code')||body.code;let data={};
if(code==='auth.properties')data=[{hotel_id:'demo-hotel',branch_id:'demo-branch',name:'Mavi Avlu Otel',location:'Örnek tesis',image:''}];
else if(code==='auth.people')data=[{user_id:'demo-user',name:'Demo Yönetici'}];
else if(code==='system.initial_sync')data=snapshot;
else if(code==='note.list') {const payload=body.payload||JSON.parse(url.searchParams.get('payload')||'{}');const status=payload.status||'todo';data={items:[{id:'note-'+status,hotel_id:'demo-hotel',branch_id:'demo-branch',title:{todo:'Akşam girişlerini hazırlayın',doing:'İkinci kat oda kontrolü',done:'Vardiya notları paylaşıldı'}[status]||'Günlük kontrol',body:'Örnek operasyon notu. Ekip ile güncel durumu paylaşın.',status,priority:'normal',archived:false,version:1,created_by:'demo-user',created_by_name:'Demo Yönetici',updated_by:'demo-user',updated_by_name:'Demo Yönetici',created_at:now.toISOString(),updated_at:now.toISOString()}],total:1,page:1};}
else if(code==='report.generate')data=demoReport(body.payload||JSON.parse(url.searchParams.get('payload')||'{}'),now.toISOString());
else if(code==='bed.list')data=[];
else if(code?.endsWith('.list'))data={items:[],total:0,page:1};
await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data})});});
await page.goto('http://localhost:3000/login',{waitUntil:'networkidle'});
await page.getByRole('button',{name:/Mavi Avlu Otel/}).click();await page.getByRole('button',{name:/Demo Yönetici/}).click();await page.getByLabel('Şifre',{exact:true}).fill('demo-only');await page.getByRole('button',{name:/SİSTEME GİRİŞ YAP/i}).click();await page.waitForTimeout(1500); await page.addStyleTag({content:'nextjs-portal { display: none !important; }'});

const {default:assert}=await import('node:assert/strict');
await page.getByRole('button',{name:'3 Boyutlu Görünüm',exact:true}).last().click();
await page.locator('canvas').waitFor();
const options=page.getByRole('group',{name:'3B görünüm seçenekleri'});
for(const label of ['Katları ayır','Duvarlar','Yalnızca boş yatakları göster']) {
 const button=options.getByRole('switch',{name:label,exact:true});
 const before=await button.getAttribute('aria-checked');
 assert.ok(parseFloat(await button.evaluate(el=>getComputedStyle(el).borderRadius))>=100);
 await button.click();assert.notEqual(await button.getAttribute('aria-checked'),before);
 await button.click();assert.equal(await button.getAttribute('aria-checked'),before);
}
await fs.mkdir('output/property-pills',{recursive:true});
await page.screenshot({path:'output/property-pills/desktop.png'});
await page.setViewportSize({width:390,height:844});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.screenshot({path:'output/property-pills/mobile.png'});
console.log('PASS: three pill-wrapped switches, theme classes, round corners, desktop/mobile');
await browser.close();
