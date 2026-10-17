const assert=require('node:assert/strict');
const {test,after}=require('node:test');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync,mkdirSync,copyFileSync,readdirSync}=require('node:fs');
const path=require('node:path'),os=require('node:os');
const ui=path.resolve(__dirname,'..'),output=mkdtempSync(path.join(os.tmpdir(),'otel-reports-'));
after(()=>rmSync(output,{recursive:true,force:true}));
execFileSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--skipLibCheck','--strict','--esModuleInterop','--resolveJsonModule','--jsx','react-jsx','--outDir',output,'src/components/reports/ReportsView.tsx','src/components/reports/CustomerDetail.tsx','src/components/Sidebar.tsx','node_modules/next/types/global.d.ts'],{cwd:ui,stdio:'pipe'});
process.env.NODE_PATH=path.join(ui,'node_modules');require('node:module').Module._initPaths();
mkdirSync(path.join(output,'components/reports'),{recursive:true});copyFileSync(path.join(ui,'src/components/reports/ReportsView.module.css'),path.join(output,'components/reports/ReportsView.module.css'));
copyFileSync(path.join(ui,'src/components/reports/ReportCharts.module.css'),path.join(output,'components/reports/ReportCharts.module.css'));
mkdirSync(path.join(output,'components/document-editor'),{recursive:true});copyFileSync(path.join(ui,'src/components/document-editor/DocumentEditor.module.css'),path.join(output,'components/document-editor/DocumentEditor.module.css'));
require.extensions['.css']=(module)=>{module.exports={}};
mkdirSync(path.join(output,'assets/flags'),{recursive:true});
for(const file of readdirSync(path.join(ui,'src/assets/flags')))if(/^[a-z]{2}\.svg$/.test(file))copyFileSync(path.join(ui,'src/assets/flags',file),path.join(output,'assets/flags',file));
require.extensions['.svg']=(module,filename)=>{module.exports={src:'/flags/'+path.basename(filename)}};
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {REPORTS,REPORT_GROUPS,reportPageID,reportForPage,reportSidebarPage}=require(path.join(output,'components/reports/navigation.js'));
const {SidebarItem}=require(path.join(output,'components/Sidebar.js'));
const {PageHeader}=require(path.join(output,'components/PageHeader.js'));
const {UserPreferencesProvider}=require(path.join(output,'components/UserPreferences.js'));
const {NotificationProvider}=require(path.join(output,'components/Toast.js'));
const wrap=child=>React.createElement(NotificationProvider,null,child);
const {ReportsView,DataTable}=require(path.join(output,'components/reports/ReportsView.js'));
const {csvCell,reportCSV,shiftDay,dayAt}=require(path.join(output,'components/reports/model.js'));
test('every report retains its category destination, header and independent collapse preference',()=>{
 assert.ok(REPORTS.length>=50);assert.equal(new Set(REPORTS.map(r=>r.key)).size,REPORTS.length);
 const group={id:'reports',label:'Raporlar',subItems:REPORT_GROUPS.map(r=>({id:r.id,label:r.name}))};
 for(const report of REPORTS){const id=reportPageID(report.key);assert.equal(reportForPage(id).name,report.name);
  const menu=renderToStaticMarkup(React.createElement(SidebarItem,{item:group,isOpen:true,activeTab:reportSidebarPage(id),onSelect(){}}));assert.equal((menu.match(/aria-current="page"/g)||[]).length,1);assert.ok(menu.includes(report.category));
  const render=prefs=>renderToStaticMarkup(wrap(React.createElement(UserPreferencesProvider,{initial:prefs},React.createElement(PageHeader,{pageId:id}))));
  const expanded=render({});assert.ok(expanded.includes(report.name));assert.equal((expanded.match(/<h2 /g)||[]).length,1);
  const collapsed=render({[`header.${id}`]:true});assert.match(collapsed,/class="page-header-details" hidden=""/);
  assert.ok(render({'header.report.other.unrelated':true}).includes('aria-expanded="true"'));
 }
});
test('a report screen has no combined catalogue picker and denies non-manager rendering',()=>{
 const snapshot={hotel_id:'h',branch_id:'b',server_time:'2026-10-14T12:00:00+03:00',rooms:[],bookings:[],branches:[],user:{role:'management'}};
 const markup=renderToStaticMarkup(wrap(React.createElement(ReportsView,{snapshot,reportKey:'finance.daily_revenue'})));
 assert.ok(markup.includes('Günlük gelir ve tahsilat'));assert.ok(!markup.includes('Rapor kategorileri'));assert.ok(!markup.includes('Kontrat bitişleri'));
 const denied=renderToStaticMarkup(React.createElement(ReportsView,{snapshot:{...snapshot,user:{role:'reception'}},reportKey:'finance.daily_revenue'}));assert.ok(denied.includes('yöneticilerine'));assert.ok(!denied.includes('CSV indir'));
});
test('CSV neutralizes formulas and preserves quoted multiline text',()=>{
 assert.equal(csvCell(' =HYPERLINK("bad")'),'"\' =HYPERLINK(""bad"")"');assert.equal(csvCell('a\nb'),'"a\nb"');
 const csv=reportCSV({key:'test',currency:'TRY',tables:[{title:'Test',columns:[{key:'name',label:'Ad'}],rows:[{name:'@SUM(1+1)'}]}]});assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'@SUM"));
});
test('report dates follow Istanbul and exported tables use explicit currency',()=>{
 assert.equal(dayAt('2026-10-13T22:30:00Z'),'2026-10-14');assert.equal(shiftDay('2028-02-28',1),'2028-02-29');
 const markup=renderToStaticMarkup(React.createElement(DataTable,{currency:'USD',table:{key:'test',title:'Tutar',columns:[{key:'amount',label:'Tutar',format:'money'}],rows:[{amount:12345}]}}));assert.ok(markup.includes('123,45'));assert.ok(markup.includes('$'));
});
const {CHARTS,chartPoints,pivotData}=require(path.join(output,'components/reports/charts.js'));
const {ChartCard}=require(path.join(output,'components/reports/ReportCharts.js'));
const {recordStatusOptions}=require(path.join(output,'components/reports/RecordEditor.js'));
test('all reports have explicit charts across five suitable chart types',()=>{
 assert.deepEqual(Object.keys(CHARTS).sort(),REPORTS.filter(r=>r.key!=='guests.customers').map(r=>r.key).sort());
 assert.deepEqual(new Set(Object.values(CHARTS).flat().map(s=>s.kind)),new Set(['line','bar','donut','pivot','funnel']));
 for(const [key,specs] of Object.entries(CHARTS))for(const spec of specs){assert.ok(spec.title&&spec.explanation,key);const row={[spec.group]:'Test',...Object.fromEntries(spec.values.map(v=>[v.key,10]))};if(spec.column)row[spec.column]='Tamamlandı';const markup=renderToStaticMarkup(React.createElement(ChartCard,{spec,rows:[row],currency:'TRY'}));assert.ok(markup.includes(`data-chart-kind="${spec.kind}"`),key);assert.ok(markup.includes(spec.title),key)}
});
test('pivot counts records by assignee/status and missing cash close stays unknown',()=>{
 const spec=CHARTS['staff.tasks'][1];const p=pivotData([{responsible:'Ayşe',status:'open'},{responsible:'Ayşe',status:'open'},{responsible:'Ali',status:'completed'}],spec);
 assert.equal(p.rows.find(r=>r.label==='Ayşe').values[p.columns.indexOf('Açık')],2);
 const cash=chartPoints([{reference:'Sabah',expected:10000,closing:null,difference:null}],CHARTS['staff.shifts'][0]);assert.deepEqual(cash[0].values,[10000,null,null]);
 assert.deepEqual(recordStatusOptions('refund').map(s=>s.value),['completed','pending']);assert.ok(!recordStatusOptions('maintenance').some(s=>s.value==='no_show'));
});

test('payroll, rent and expense distribution have separate pages and contextual expense forms',()=>{
 const snapshot={hotel_id:'h',branch_id:'b',server_time:'2026-10-14T12:00:00+03:00',rooms:[],bookings:[],branches:[],feature_registry:{definitions:[]},user:{role:'management'}};
 const {RecordEditor}=require(path.join(output,'components/reports/RecordEditor.js'));const {RECORD_KINDS}=require(path.join(output,'components/reports/navigation.js'));
 for(const [key,category,title] of [['finance.payroll','payroll','Personel Maaşları'],['finance.rent_expenses','rent','Kira Giderleri'],['finance.expenses','other','Gider Dağılımı']]){
  assert.equal(reportForPage(reportPageID(key)).name,title);assert.ok(CHARTS[key].length>=2);
  const page=renderToStaticMarkup(wrap(React.createElement(ReportsView,{snapshot,reportKey:key})));assert.ok(page.includes(title));
  const form=renderToStaticMarkup(wrap(React.createElement(RecordEditor,{snapshot,kinds:RECORD_KINDS,currency:'TRY',initialKind:'expense',initialCategory:category,skipKindSelection:true,onClose(){},onSaved(){}})));
  assert.ok(form.includes('Gider tarihi (rapor dönemi)'));
  if(category==='payroll'){assert.ok(form.includes('Maaşın ait olduğu personel (zorunlu)'));assert.ok(!form.includes('Misafir / firma / tedarikçi adı'));}
  if(category==='rent')assert.ok(form.includes('Kiraya veren kişi / firma'));
 }
});

 test('customer directory has its own report destination and no date restriction',()=>{
  const snapshot={hotel_id:'h',branch_id:'b',branches:[],user:{role:'management'}};
  const markup=renderToStaticMarkup(wrap(React.createElement(ReportsView,{snapshot,reportKey:'guests.customers'})));
  for(const label of ['Müşteri Listesi','Müşteri ara','Tüm tesisler','Tüm tarihler','Müşteri listesi sayfaları','Excel indir','PDF indir'])assert.ok(markup.includes(label),label);
  assert.ok(!markup.includes('Başlangıç'));assert.ok(!markup.includes('İşlem kaydı'));
  const {CustomerTable}=require(path.join(output,'components/reports/CustomerList.js'));
  const table=renderToStaticMarkup(React.createElement(CustomerTable,{onSelect(){},items:[{guest_id:'1',name:'Ayşe',national_id:'A',phone:'',nationality:'TR',address:''},{guest_id:'2',name:'Ayşe',national_id:'B',phone:'',nationality:'TR',address:''}]}));
  assert.equal((table.match(/>Ayşe<\/button>/g)||[]).length,2);assert.ok(table.includes('Kimlik / pasaport'));assert.ok(table.includes('Telefon'));
 });

 test('customer rows open by row click and native keyboard button; details expose notes and comments',()=>{
  const {CustomerTable}=require(path.join(output,'components/reports/CustomerList.js'));
  const {CustomerDetail,CustomerIdentity,CustomerStayRow,CustomerHistoryTable,CustomerComments}=require(path.join(output,'components/reports/CustomerDetail.js'));
  const customer={guest_id:'g',name:'Ayşe',national_id:'123',phone:'0555',nationality:'TR',address:'İstanbul'};
  let opened=null;
  let tree;function Host(){tree=CustomerTable({items:[customer],onSelect:c=>opened=c});return tree;}renderToStaticMarkup(React.createElement(Host));
  const descendants=(node)=>node&&typeof node==='object'?[node,...React.Children.toArray(node.props?.children).flatMap(descendants)]:[];
  const nodes=descendants(tree),row=nodes.find(n=>n.type==='tr'&&n.props.onClick),button=nodes.find(n=>n.type==='button');
  row.props.onClick();assert.equal(opened,customer);opened=null;
  let stopped=false;button.props.onClick({stopPropagation(){stopped=true}});assert.ok(stopped);assert.equal(opened,customer);assert.equal(button.props.type,'button');assert.match(button.props['aria-label'],/müşteri detayını aç/);
  const identity=renderToStaticMarkup(React.createElement(CustomerIdentity,{customer}));for(const text of ['Ayşe','123','0555','Türkiye','İstanbul'])assert.ok(identity.includes(text));
  const stay={daily_price_minor:123456,currency:'EUR',booking_nights:3,lodging_amount_minor:370368,guest_id:'old',name:'Ayşe',booking_id:'bk',branch_id:'branch2',branch_name:'İkinci tesis',room_code:'201',start:'2024-01-01T12:00:00Z',end:'2024-01-02T12:00:00Z',status:'completed',guest_note:'Müşteri notu',booking_notes:'Rezervasyon notu',companions:[{guest_id:'other',name:'Birlikte kalan'}]};
  let target=null,cardTree;function StayHost(){cardTree=CustomerStayRow({stay,expanded:true,rowId:'test',onToggle(){},onAssess:t=>target=t});return cardTree;}renderToStaticMarkup(React.createElement(StayHost));descendants(cardTree).filter(n=>n.type==='button')[1].props.onClick({stopPropagation(){}});assert.deepEqual(target,{guest_id:'old',name:'Ayşe',booking_id:'bk',branch_id:'branch2'});
  const historyTable=renderToStaticMarkup(React.createElement(CustomerHistoryTable,{items:[stay],onAssess(){}}));assert.ok(historyTable.includes('<table'));for(const heading of ['Tesis / Oda','Giriş','Çıkış','Durum','Notlar ve detay'])assert.ok(historyTable.includes(heading));assert.ok(historyTable.includes('aria-expanded="false"'));assert.ok(historyTable.includes('Konaklama bedeli'));assert.ok(historyTable.includes('3.703,68'));assert.ok(historyTable.includes('1.234,56'));assert.ok(historyTable.includes('€'));assert.ok(historyTable.includes('3 gece'));
  const unpriced=renderToStaticMarkup(React.createElement(CustomerHistoryTable,{items:[{...stay,daily_price_minor:0,lodging_amount_minor:0}],onAssess(){}}));assert.ok(unpriced.includes('Fiyat girilmemiş'));assert.ok(!unpriced.includes('3.703,68'));
  const card=renderToStaticMarkup(cardTree);for(const text of ['İkinci tesis','201','Müşteri notu','Rezervasyon notu','Birlikte kalan','Yorum / puan ekle'])assert.ok(card.includes(text),text);
  const comments=renderToStaticMarkup(React.createElement(CustomerComments,{data:{ratings:[{id:'a',actor_name:'Resepsiyon Ayla',hotel_name:'Otel',score:4,reason:'Düzenli misafir\nTekrar bekleriz',created_at:'2024-01-02T12:00:00Z',updated_at:'2024-01-03T12:00:00Z'}]}}));
  for(const text of ['Resepsiyon Ayla','Düzenli misafir','Tekrar bekleriz','4 / 5','Güncellendi'])assert.ok(comments.includes(text),text);
  const detail=renderToStaticMarkup(wrap(React.createElement(CustomerDetail,{snapshot:{hotel_id:'h',branches:[]},customer,onClose(){}})));
  assert.ok(detail.includes('settings-editor-full-width'));
  for(const text of ['Müşteri listesine dön','Konaklama geçmişi','Yorumlar ve puanlar','Müşteri yorum sayfaları','Müşteri konaklama geçmişi sayfaları'])assert.ok(detail.includes(text),text);
 });

 test('customer country cells show flags and names; numbered pages and export actions remain available',()=>{
  const {customerCountry}=require(path.join(output,'components/reports/customer-format.js'));
  assert.deepEqual(customerCountry('tr'),{code:'TR',label:'Türkiye',flagSrc:'/flags/tr.svg'});assert.equal(customerCountry('DE').flagSrc,'/flags/de.svg');assert.equal(customerCountry('').flagSrc,'/flags/xx.svg');assert.equal(customerCountry('XX').flagSrc,'/flags/xx.svg');
  const {CustomerTable}=require(path.join(output,'components/reports/CustomerList.js'));
  const table=renderToStaticMarkup(React.createElement(CustomerTable,{items:[{guest_id:'g',name:'Çağrı',national_id:'001',phone:'0555',nationality:'TR',address:'İstanbul'}],offset:25,sort:'name',desc:true,onSort(){},onSelect(){}}));
  assert.ok(table.includes('src="/flags/tr.svg"'));assert.ok(!table.includes('🇹🇷'));assert.ok(table.includes('Türkiye'));assert.ok(table.includes('>26</td>'));assert.ok(table.includes('aria-sort="descending"'));
 });

test('utility expenses have a dedicated report and clear existing expense entry fields',()=>{
 const {RecordEditor}=require(path.join(output,'components/reports/RecordEditor.js'));const {RECORD_KINDS}=require(path.join(output,'components/reports/navigation.js'));
 const key='finance.utility_expenses';assert.equal(reportForPage(reportPageID(key)).name,'Fatura Giderleri');assert.deepEqual(CHARTS[key].map(c=>c.kind),['donut','line']);
 const {categoriesFor}=require(path.join(output,'components/reports/options.js'));
 const categories=categoriesFor('expense');for(const code of ['electricity','water','internet','natural_gas','utilities'])assert.ok(categories.some(c=>c.value===code));
 const snapshot={hotel_id:'h',branch_id:'b',server_time:'2026-10-14T12:00:00+03:00',rooms:[],bookings:[],branches:[],user:{role:'management'},feature_registry:{definitions:[]}};
 const screen=renderToStaticMarkup(wrap(React.createElement(ReportsView,{snapshot,reportKey:key})));assert.ok(screen.includes('Fatura Giderleri'));assert.ok(screen.includes('Fatura gideri ekle'));
 const form=renderToStaticMarkup(wrap(React.createElement(RecordEditor,{snapshot,kinds:RECORD_KINDS,currency:'TRY',initialKind:'expense',initialCategory:'electricity',skipKindSelection:true,onClose(){},onSaved(){}})));
 for(const label of ['Fatura gideri ekle','Fatura tutarı','Fatura dönemi / açıklama','Fatura tedarikçisi','Fatura / referans numarası'])assert.ok(form.includes(label),label);
});
