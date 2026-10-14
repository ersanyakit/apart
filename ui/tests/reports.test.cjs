const assert=require('node:assert/strict');
const {test,after}=require('node:test');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync,mkdirSync,copyFileSync}=require('node:fs');
const path=require('node:path'),os=require('node:os');
const ui=path.resolve(__dirname,'..'),output=mkdtempSync(path.join(os.tmpdir(),'otel-reports-'));
after(()=>rmSync(output,{recursive:true,force:true}));
execFileSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--skipLibCheck','--strict','--esModuleInterop','--resolveJsonModule','--jsx','react-jsx','--outDir',output,'src/components/reports/ReportsView.tsx','src/components/Sidebar.tsx','node_modules/next/types/global.d.ts'],{cwd:ui,stdio:'pipe'});
process.env.NODE_PATH=path.join(ui,'node_modules');require('node:module').Module._initPaths();
mkdirSync(path.join(output,'components/reports'),{recursive:true});copyFileSync(path.join(ui,'src/components/reports/ReportsView.module.css'),path.join(output,'components/reports/ReportsView.module.css'));
copyFileSync(path.join(ui,'src/components/reports/ReportCharts.module.css'),path.join(output,'components/reports/ReportCharts.module.css'));
require.extensions['.css']=(module)=>{module.exports={}};
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {REPORTS,reportPageID,reportForPage}=require(path.join(output,'components/reports/navigation.js'));
const {SidebarItem}=require(path.join(output,'components/Sidebar.js'));
const {PageHeader}=require(path.join(output,'components/PageHeader.js'));
const {UserPreferencesProvider}=require(path.join(output,'components/UserPreferences.js'));
const {NotificationProvider}=require(path.join(output,'components/Toast.js'));
const wrap=child=>React.createElement(NotificationProvider,null,child);
const {ReportsView,DataTable}=require(path.join(output,'components/reports/ReportsView.js'));
const {csvCell,reportCSV,shiftDay,dayAt}=require(path.join(output,'components/reports/model.js'));
test('every report has its own sidebar destination, header and independent collapse preference',()=>{
 assert.ok(REPORTS.length>=50);assert.equal(new Set(REPORTS.map(r=>r.key)).size,REPORTS.length);
 const group={id:'reports',label:'Raporlamalar',subItems:REPORTS.map(r=>({id:reportPageID(r.key),label:r.name}))};
 for(const report of REPORTS){const id=reportPageID(report.key);assert.equal(reportForPage(id).name,report.name);
  const menu=renderToStaticMarkup(React.createElement(SidebarItem,{item:group,isOpen:true,activeTab:id,onSelect(){}}));assert.equal((menu.match(/aria-current="page"/g)||[]).length,1);assert.ok(menu.includes(report.name));
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
 assert.deepEqual(Object.keys(CHARTS).sort(),REPORTS.map(r=>r.key).sort());
 assert.deepEqual(new Set(Object.values(CHARTS).flat().map(s=>s.kind)),new Set(['line','bar','donut','pivot','funnel']));
 for(const [key,specs] of Object.entries(CHARTS))for(const spec of specs){assert.ok(spec.title&&spec.explanation,key);const row={[spec.group]:'Test',...Object.fromEntries(spec.values.map(v=>[v.key,10]))};if(spec.column)row[spec.column]='Tamamlandı';const markup=renderToStaticMarkup(React.createElement(ChartCard,{spec,rows:[row],currency:'TRY'}));assert.ok(markup.includes(`data-chart-kind="${spec.kind}"`),key);assert.ok(markup.includes(spec.title),key)}
});
test('pivot counts records by assignee/status and missing cash close stays unknown',()=>{
 const spec=CHARTS['staff.tasks'][1];const p=pivotData([{responsible:'Ayşe',status:'open'},{responsible:'Ayşe',status:'open'},{responsible:'Ali',status:'completed'}],spec);
 assert.equal(p.rows.find(r=>r.label==='Ayşe').values[p.columns.indexOf('Açık')],2);
 const cash=chartPoints([{reference:'Sabah',expected:10000,closing:null,difference:null}],CHARTS['staff.shifts'][0]);assert.deepEqual(cash[0].values,[10000,null,null]);
 assert.deepEqual(recordStatusOptions('refund').map(s=>s.value),['completed','pending']);assert.ok(!recordStatusOptions('maintenance').some(s=>s.value==='no_show'));
});
