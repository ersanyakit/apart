const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ui = path.resolve(__dirname, '..');
const output = mkdtempSync(path.join(tmpdir(), 'otel-room-board-'));
after(() => rmSync(output, { recursive: true, force: true }));
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--skipLibCheck', '--strict', '--esModuleInterop', '--resolveJsonModule', '--jsx', 'react-jsx', '--outDir', output, 'src/components/RoomStatusCard.tsx','node_modules/next/types/global.d.ts'], { cwd: ui, stdio: 'pipe' });
process.env.NODE_PATH = path.join(ui, 'node_modules');
require('node:module').Module._initPaths();
const { occupancy } = require(path.join(output, 'lib/api.js'));
const { roomBoardState, roomMenuOperation, bookingCanCheckIn } = require(path.join(output, 'lib/room-board.js'));
require('node:fs').copyFileSync(path.join(ui,'src/components/RoomStatusCard.module.css'),path.join(output,'components/RoomStatusCard.module.css'));require.extensions['.css']=(module)=>{module.exports={}};
require('./helpers/flag-assets.cjs')(output);

const { RoomStatusCard } = require(path.join(output, 'components/RoomStatusCard.js'));
const room = { room_id:'r1', branch_id:'b1', code:'101', kind:'room', status:'Temiz' };
const now = '2026-10-13T15:30:00Z';
const booking = (patch={}) => ({ booking_id:'booking1', branch_id:'b1', room_id:'r1', guest_name:'Deniz Test', guest_count:2, daily_price_minor:125000, guests:[{ name:'Ece Test' }], status:'confirmed', check_in:'2026-10-13T18:00:00+03:00', check_out:'2026-10-14T11:00:00+03:00', allocations:[{ room_id:'r1', start:'2026-10-13T18:00:00+03:00', end:'2026-10-14T11:00:00+03:00' }], ...patch });

test('timezone offsets represent instants, not lexicographic order', () => {
  const b = booking();
  assert.equal(occupancy([room],[b],room,now).length,1);
  assert.equal(occupancy([room],[b],room,'2026-10-13T20:45:00+05:45').length,1);
  assert.equal(occupancy([room],[b],room,'2026-10-14T08:00:00Z').length,0);
});
test('upcoming reservations remain visible with a distinct status', () => {
  const state=roomBoardState([room],[booking()],room,'2026-10-13T10:00:00Z');
  assert.equal(state.current.length,0);
  assert.equal(state.bookings.length,1);
  assert.equal(state.label,'Yaklaşan rezervasyon');
});
test('day selection includes morning checkout and evening arrival', () => {
  const morning=booking({booking_id:'morning',status:'completed',actual_check_in:'2026-10-12T14:00:00Z',actual_check_out:'2026-10-13T06:00:00Z',allocations:[{room_id:'r1',start:'2026-10-12T14:00:00Z',end:'2026-10-13T06:00:00Z'}]});
  const state=roomBoardState([room],[morning,booking()],room,now,'2026-10-13');
  assert.deepEqual(state.bookings.map(b=>b.booking_id),['morning','booking1']);
  assert.equal(roomBoardState([room],[morning],room,now).bookings.length,0);
});
test('checked-in guest remains visible after scheduled checkout', () => {
  const b=booking({status:'checked_in',actual_check_in:now});
  const later='2026-10-15T12:00:00Z';
  assert.equal(occupancy([room],[b],room,later).length,1);
  assert.equal(roomBoardState([room],[b],room,later).label,'Giriş yapıldı');
  assert.equal(roomBoardState([room],[b],room,later,'2026-10-20').bookings.length,0);
});
test('a moved guest occupies only the current room and its ancestors', () => {
  const parent={...room,room_id:'parent',kind:'apartment'};
  const destination={...room,room_id:'r2',parent_id:'parent'};
  const sibling={...room,room_id:'r3',parent_id:'parent'};
  const b=booking({status:'checked_in',room_id:'r2',actual_check_in:'2026-10-13T14:00:00Z',allocations:[{room_id:'r1',start:'2026-10-13T14:00:00Z',end:'2026-10-13T15:00:00Z'},{room_id:'r2',start:'2026-10-13T15:00:00Z',end:'2026-10-14T11:00:00+03:00'}]});
  const rooms=[room,parent,destination,sibling];
  assert.equal(occupancy(rooms,[b],room,now).length,0);
  assert.equal(occupancy(rooms,[b],destination,now).length,1);
  assert.equal(occupancy(rooms,[b],parent,now).length,1);
  assert.equal(occupancy(rooms,[b],sibling,now).length,0);
});
test('cancelled and other branch reservations never appear; missing allocations have a fallback', () => {
  assert.equal(roomBoardState([room],[booking({status:'cancelled'}),booking({branch_id:'other'})],room,now).bookings.length,0);
  assert.equal(roomBoardState([room],[booking({allocations:[]})],room,now).bookings.length,1);
});
test('current stay takes priority over a future reservation', () => {
  const current=booking({status:'checked_in',actual_check_in:now});
  const future=booking({booking_id:'future',allocations:[{room_id:'r1',start:'2026-10-20T15:00:00Z',end:'2026-10-21T10:00:00Z'}]});
  const state=roomBoardState([room],[future,current],room,now);
  assert.deepEqual(state.bookings.map(b=>b.booking_id),['booking1','future']);
  assert.equal(state.label,'Giriş yapıldı');
});
test('card renders guest, companions, reservation dates, price, real arrival and accessible actions', () => {
  const b=booking({status:'checked_in',actual_check_in:now});
  const markup=renderToStaticMarkup(React.createElement(RoomStatusCard,{room,state:roomBoardState([room],[b],room,now),now,busy:false,onOpenBooking(){},onTransition(){},onContextMenu(){}}));
  for(const text of ['Deniz Test','Ece Test','2 kişi','Gerçek giriş','Planlanan çıkış','Giriş yapıldı','2026','Detaylar','Çıkış yap','101 işlemleri','/ gece']) assert.ok(markup.includes(text),text);
  assert.ok(!markup.includes('max-w-[65px]'));
});


test('SEFIL SUITE future reservation allows explicit early check-in', () => {
  const future = booking({check_in:'2026-10-14T18:16:00+03:00',check_out:'2026-10-20T11:00:00+03:00'});
  assert.equal(roomMenuOperation(future,now),'check_in');
  assert.equal(bookingCanCheckIn(future,now),true);
  assert.equal(roomMenuOperation(booking(),now),'check_in');
  assert.equal(roomMenuOperation(booking({status:'checked_in'}),now),'receipt');
  assert.equal(roomMenuOperation(undefined,now),'create');
  assert.equal(roomMenuOperation(booking({status:'completed'}),now),'create');
});


test('early arrival is visible now while planned arrival remains tomorrow', () => {
  const b = booking({status:'checked_in',check_in:'2026-10-14T18:16:00+03:00',actual_check_in:now,allocations:[{room_id:'r1',start:now,end:'2026-10-15T11:00:00+03:00'}]});
  const state=roomBoardState([room],[b],room,now);
  assert.equal(state.label,'Giriş yapıldı');
  assert.equal(state.current.length,1);
  assert.equal(state.upcoming,false);
});

test('a clean parent exposes the dirty bed that prevents early arrival', () => {
  const bed={...room,room_id:'bed',parent_id:'r1',kind:'bed',code:'301-Y67873EA2-1-1',status:'Kirli'};
  const state=roomBoardState([room,bed],[booking()],room,'2026-10-13T10:00:00Z');
  assert.equal(state.operationalStatus,'Kirli');
  assert.equal(state.blockingUnit.room_id,'bed');
  const markup=renderToStaticMarkup(React.createElement(RoomStatusCard,{room,state,now,busy:false,onOpenBooking(){},onContextMenu(){}}));
  assert.ok(markup.includes('301-Y67873EA2-1-1 birimi: Kirli'));
  assert.ok(!markup.includes('>Temiz<'));
  const cleaned=roomBoardState([room,{...bed,status:'Temiz'}],[],room,now);
  assert.equal(cleaned.operationalStatus,'Temiz');
  assert.equal(cleaned.blockingUnit,undefined);
});

test('operational status includes ancestors but not sibling beds', () => {
  const clean={...room,room_id:'bed1',parent_id:'r1',kind:'bed'};
  const dirty={...clean,room_id:'bed2',status:'Kirli'};
  assert.equal(roomBoardState([room,clean,dirty],[],clean,now).operationalStatus,'Temiz');
  assert.equal(roomBoardState([{...room,status:'Kirli'},clean,dirty],[],clean,now).operationalStatus,'Kirli');
  const state=roomBoardState([room,clean,dirty,{...clean,room_id:'bed3',status:'Arizali'}],[],room,now);
  assert.equal(state.operationalStatus,'Arizali');
  assert.equal(state.tone,'warning');
});

test('occupied and reserved room cards retain their condition alongside occupancy artwork', () => {
  for (const [status,icon] of [['confirmed','reserved'],['checked_in','occupied']]) {
    const unit={...room,status:'Kirli'};
    const b=booking({status,actual_check_in:status==='checked_in'?now:undefined});
    const state=roomBoardState([unit],[b],unit,now);
    const markup=renderToStaticMarkup(React.createElement(RoomStatusCard,{room:unit,state,now,busy:false,onOpenBooking(){},onContextMenu(){}}));
    assert.ok(markup.includes(`/images/room-status-dott/${icon}.avif`));
    assert.ok(markup.includes('/images/room-status-dott/dirty.avif'));
    assert.ok(markup.includes(state.label));
  }
});

const {roomGradientKey, roomGradientPixels, ROOM_GRADIENT_PALETTES} = require(path.join(output,'lib/room-gradient.js'));
test('clean empty cards have a clean gradient; occupancy and reservation retain priority',()=>{
  assert.equal(roomGradientKey({tone:'available',operationalStatus:'Temiz'}),'clean');
  assert.equal(roomGradientKey({tone:'warning',operationalStatus:'Kirli'}),'dirty');
  assert.equal(roomGradientKey({tone:'occupied',operationalStatus:'Kirli'}),'occupied');
  assert.equal(roomGradientKey({tone:'reserved',operationalStatus:'Tadilat'}),'reserved');
});
test('gradient phase wraps smoothly and changes placement with scroll',()=>{
  const colors=ROOM_GRADIENT_PALETTES.clean;
  assert.deepEqual(roomGradientPixels(colors,0),roomGradientPixels(colors,8));
  assert.notDeepEqual(roomGradientPixels(colors,0),roomGradientPixels(colors,.5));
  const before=roomGradientPixels(colors,7.999),after=roomGradientPixels(colors,.001);
  assert.ok(before.every((value,index)=>Math.abs(value-after[index])<=1));
});
