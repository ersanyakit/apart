const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync, copyFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const output = mkdtempSync(path.join(tmpdir(), 'otel-stays-'));
after(() => rmSync(output, { recursive: true, force: true }));
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--skipLibCheck', '--strict', '--esModuleInterop', '--resolveJsonModule', '--jsx', 'react-jsx', '--outDir', output, 'src/components/stays-scheduler/model.ts', 'src/components/stays-scheduler/StaysScheduler.tsx', 'node_modules/next/types/global.d.ts'], {cwd:path.resolve(__dirname,'..'),stdio:'pipe'});
const {DAY,dayTime,dayOf,shiftDay,monthBands,segmentsFor,layoutSegments,resourceGroups} = require(path.join(output,'components/stays-scheduler/model.js'));
const booking = (props={}) => ({booking_id:'b',room_id:'101',branch_id:'branch',guest_name:'Misafir',guest_count:2,status:'checked_in',check_in:'2026-10-12T14:00:00+03:00',check_out:'2026-10-16T11:00:00+03:00',allocations:[],...props});

test('timeline uses property time across UTC midnight and month/leap boundaries',()=>{
 assert.equal(dayOf('2026-10-13T22:00:00Z'),'2026-10-14');
 assert.equal(shiftDay('2028-02-28',1),'2028-02-29');
 assert.equal(shiftDay('2028-02-29',1),'2028-03-01');
 assert.equal(dayTime('2026-10-14'),Date.parse('2026-10-13T21:00:00Z'));
 assert.deepEqual(monthBands(['2026-10-30','2026-10-31','2026-11-01']),[
  {month:'2026-10',start:0,count:2},{month:'2026-11',start:2,count:1},
 ]);
});
test('moved stays keep per-room history and actual checkout time',()=>{
 const b=booking({status:'completed',actual_check_in:'2026-10-12T15:00:00+03:00',actual_check_out:'2026-10-15T10:00:00+03:00',allocations:[
  {room_id:'101',start:'2026-10-12T14:00:00+03:00',end:'2026-10-14T12:00:00+03:00'},
  {room_id:'102',start:'2026-10-14T12:00:00+03:00',end:'2026-10-16T11:00:00+03:00'},
 ]});
 const rows=segmentsFor([b],'2026-10-18T12:00:00+03:00');
 assert.deepEqual(rows.map(s=>s.roomId),['101','102']);
 assert.equal(rows[0].start,Date.parse(b.actual_check_in));
 assert.equal(rows[1].end,Date.parse(b.actual_check_out));
});
test('overdue checked-in stays remain visible; cancelled and invalid intervals do not',()=>{
 const now='2026-10-18T12:00:00+03:00';
 const rows=segmentsFor([booking(),booking({booking_id:'cancel',status:'cancelled'}),booking({booking_id:'invalid',check_in:'invalid'})],now);
 assert.equal(rows.length,1);assert.ok(rows[0].end>Date.parse(now));
});
test('lanes separate overlap and reuse a lane exactly at checkout',()=>{
 const start=dayTime('2026-10-14'),end=start+DAY;
 const event=(id,from,to)=>({id,roomId:'101',booking:booking(),start:start+from*3600000,end:start+to*3600000});
 const layout=layoutSegments([event('a',-12,12),event('b',6,18),event('c',12,30),event('d',-24,0),event('e',24,48)],start,end);
 assert.equal(layout.length,3);
 const a=layout.find(x=>x.segment.id==='a'),b=layout.find(x=>x.segment.id==='b'),c=layout.find(x=>x.segment.id==='c');
 assert.equal(a.left,0);assert.equal(a.width,50);assert.equal(a.continuesBefore,true);
 assert.notEqual(a.lane,b.lane);assert.equal(a.lane,c.lane);
 assert.equal(c.left,50);assert.equal(c.width,50);assert.equal(c.continuesAfter,true);
});
test('resource groups inherit parent floor and order units naturally',()=>{
 const floors=[{floor_id:'floor',code:'1',sort_order:1}];
 const rooms=[
  {room_id:'r10',code:'10',floor_id:'floor'},
  {room_id:'bed',code:'B',parent_id:'r2'},
  {room_id:'r2',code:'2',floor_id:'floor'},
  {room_id:'unknown',code:'X',floor_id:'missing'},
 ];
 const groups=resourceGroups(rooms,floors);
 assert.deepEqual(groups[0].rooms.map(x=>x.room.room_id),['r2','bed','r10']);
 assert.equal(groups[0].rooms[1].depth,1);
 assert.equal(groups[1].id,'unassigned');
 assert.equal(groups[1].rooms[0].room.room_id,'unknown');
});
test('damaged parent cycles cannot hang resource layout',()=>{
 const groups=resourceGroups([{room_id:'a',code:'A',parent_id:'b'},{room_id:'b',code:'B',parent_id:'a'}],[]);
 assert.equal(groups[0].rooms.length,2);
 assert.ok(groups[0].rooms.every(x=>x.depth===1));
});

test('short stays keep readable labels without overlapping or falsifying their duration',()=>{
 const start=dayTime('2026-10-14'),end=start+7*DAY;
 const segments=[0,1,2].map(i=>({id:String(i),roomId:'101',booking:booking(),start:start+i*60000,end:start+(i+1)*60000}));
 const cards=layoutSegments(segments,start,end,20);
 assert.deepEqual(cards.map(c=>c.lane),[0,1,2]);
 assert.ok(cards.every(c=>c.cardWidth===20 && c.width<.01));
 const edge=layoutSegments([{...segments[0],start:end-60000,end}],start,end,20)[0];
 assert.equal(edge.cardLeft,80);assert.equal(edge.cardLeft+edge.cardWidth,100);
 assert.ok(edge.left>99);
});

// Server-render the real component to catch empty initial views and inaccessible
// stay buttons independently of the calendar geometry helpers.
process.env.NODE_PATH=path.resolve(__dirname,'../node_modules');
require('node:module').Module._initPaths();
copyFileSync(path.resolve(__dirname,'../src/components/stays-scheduler/StaysScheduler.module.css'),path.join(output,'components/stays-scheduler/StaysScheduler.module.css'));
require.extensions['.css']=(module)=>{module.exports=new Proxy({}, {get:(_,key)=>key==='__esModule'?false:String(key)});};
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {I18nProvider}=require(path.join(output,'components/I18n.js'));
const {StaysScheduler}=require(path.join(output,'components/stays-scheduler/StaysScheduler.js'));
const {UserPreferencesProvider}=require(path.join(output,'components/UserPreferences.js'));
const {NotificationProvider}=require(path.join(output,'components/Toast.js'));
const {PageHeader,PAGE_HEADERS}=require(path.join(output,'components/PageHeader.js'));
const {reportGroupForPage}=require(path.join(output,'components/reports/navigation.js'));
const withPreferences=(initial,child)=>React.createElement(NotificationProvider,null,
 React.createElement(UserPreferencesProvider,{userId:'test-user',initial},React.createElement(I18nProvider,null,child)));

test('every sidebar page shares an accessible header with independently saved disclosure state',()=>{
 for(const [pageId,[title]] of Object.entries(PAGE_HEADERS)) {
  const render=initial=>renderToStaticMarkup(withPreferences(initial,React.createElement(PageHeader,{pageId,actions:React.createElement('button',null,'İşlem')})));
  const expanded=render({});
  const collapsed=render({[`header.${pageId}`]:true});
  assert.equal((expanded.match(/<h2/g)||[]).length,1);
  assert.ok(expanded.includes(reportGroupForPage(pageId)?.name || title));
  assert.ok(expanded.includes('aria-expanded="true"'));
  assert.ok(collapsed.includes('aria-expanded="false"'));
  assert.match(collapsed,/class="page-header-details" hidden=""/);
  assert.ok(render({'header.unrelated':true}).includes('aria-expanded="true"'));
  // A second user's empty preferences must not inherit the first user's collapse.
  assert.ok(render({}).includes('aria-expanded="true"'));
 }
});

test('stays search filters collapse with the header while grid controls remain visible',()=>{
 const props={rooms:[],floors:[],bookings:[],serverTime:'2026-10-14T11:00:00+03:00',onDetails(){}};
 const markup=renderToStaticMarkup(withPreferences({'header.stays':true},React.createElement(StaysScheduler,props)));
 const headerEnd=markup.indexOf('</header>');
 assert.ok(headerEnd>0);
 assert.ok(markup.slice(0,headerEnd).includes('aria-expanded="false"'));
 const header=markup.slice(0,headerEnd);
 const hiddenStart=header.indexOf('class="page-header-details" hidden=""');
 assert.ok(hiddenStart>0);
 const grid=markup.slice(headerEnd);
 for(const label of ['Birim veya misafir ara','>Tüm katlar<','Çizelge başlangıcı']) {
  assert.ok(header.indexOf(label)>hiddenStart,label);
  assert.ok(!grid.includes(label),label);
 }
 for(const label of ['Önceki dönem','Bugün','Görünen gün sayısı','Konaklama durumu','Boş birimleri göster']) {
  assert.ok(grid.includes(label),label);
 }
 assert.ok(!grid.includes('hidden=""'));
 const expanded=renderToStaticMarkup(withPreferences({'header.stays':false},React.createElement(StaysScheduler,props)));
 assert.ok(expanded.includes('aria-expanded="true"'));
 assert.ok(!expanded.includes('class="page-header-details" hidden=""'));
});
test('initial stays screen shows real completed and reserved records when nobody is checked in',()=>{
 const props={rooms:[{room_id:'101',branch_id:'branch',code:'101',name:'Oda',kind:'room',floor_id:'floor',parent_id:null,status:'Temiz'}],floors:[{floor_id:'floor',code:'1',label:{TR:'Birinci kat'},sort_order:1}],bookings:[
  booking({booking_id:'reserved',guest_name:'Beklenen Misafir',status:'confirmed'}),
  booking({booking_id:'finished',guest_name:'Ayrılan Misafir',status:'completed',actual_check_out:'2026-10-14T10:00:00+03:00'}),
 ],serverTime:'2026-10-14T11:00:00+03:00',onDetails(){}};
 const markup=renderToStaticMarkup(React.createElement(I18nProvider,null,React.createElement(StaysScheduler,props)));
 assert.ok(markup.includes('Beklenen Misafir'));
 assert.ok(markup.includes('Ayrılan Misafir'));
 assert.ok(markup.includes('Birinci kat'));
 assert.ok(markup.includes('aria-label="101 · Beklenen Misafir'));
 assert.ok(markup.includes('aria-pressed="true">Tüm kayıtlar'));
 assert.ok(!markup.includes('konaklama bulunmuyor'));
 assert.ok(!markup.includes('Taşı / Değiştir'));
});

test('whole-room sales hide non-rentable beds but historical bed stays remain reachable',()=>{
 const rooms=[{room_id:'101',branch_id:'branch',code:'WHOLE-ROOM',kind:'room',rentable:true}, {room_id:'bed',branch_id:'branch',parent_id:'101',code:'PRIVATE-BED',kind:'bed',rentable:false}];
 const props={rooms,floors:[],bookings:[],serverTime:'2026-10-14T11:00:00+03:00',onDetails(){}};
 const render=bookings=>renderToStaticMarkup(withPreferences({'stays_show_empty':true},React.createElement(StaysScheduler,{...props,bookings})));
 const empty=render([]); assert.ok(empty.includes('WHOLE-ROOM')); assert.ok(!empty.includes('PRIVATE-BED'));
 const history=render([booking({room_id:'bed',status:'completed',actual_check_out:'2026-10-14T10:00:00+03:00'})]);
 assert.ok(history.includes('PRIVATE-BED')); assert.ok(history.includes('Misafir'));
});
