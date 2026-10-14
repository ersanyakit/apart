const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync, mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path'), os = require('node:os');
const ui = path.resolve(__dirname, '..'), out = mkdtempSync(path.join(os.tmpdir(), 'otel-property-3d-'));
after(() => rmSync(out, { recursive: true, force: true }));
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--esModuleInterop', '--resolveJsonModule', '--jsx', 'react-jsx', '--outDir', out, 'src/components/property-3d/PropertyView.tsx', 'src/components/RoomBedsEditor.tsx', 'src/components/OriginalShell.tsx', 'node_modules/next/types/global.d.ts'], { cwd: ui, stdio: 'pipe' });
process.env.NODE_PATH = path.join(ui, 'node_modules'); require('node:module').Module._initPaths();
require.extensions['.css'] = m => { m.exports = {}; };
mkdirSync(path.join(out, 'components/property-3d'), { recursive: true });
writeFileSync(path.join(out, 'components/property-3d/PropertyView.module.css'), '');
const { buildPropertyScene, visibleScene } = require(path.join(out, 'components/property-3d/model.js'));
const React = require('react'), { renderToStaticMarkup: render } = require('react-dom/server');
const { PropertyView } = require(path.join(out, 'components/property-3d/PropertyView.js'));
const { OriginalShell } = require(path.join(out, 'components/OriginalShell.js'));
const { NotificationProvider } = require(path.join(out, 'components/Toast.js'));
const { UserPreferencesProvider } = require(path.join(out, 'components/UserPreferences.js'));
const now = '2026-10-14T10:00:00Z';
const room = (id, patch = {}) => ({ room_id: id, branch_id: 'b', code: id, name: '', kind: 'room', status: 'Temiz', capacity: 2, effective_capacity: 2, parent_id: null, floor_id: 'f', rentable: true, bed_group: '', bed_level: 1, position: { x: 0, y: 0, width: 100, height: 80 }, ...patch });
const floor = (id = 'f', patch = {}) => ({ floor_id: id, branch_id: 'b', code: id, label: { TR: id }, sort_order: 0, width: 1000, height: 800, ...patch });
const snapshot = (rooms = [], patch = {}) => ({ hotel_id: 'h', branch_id: 'b', server_time: now, rooms, floors: [floor()], bookings: [], user: { user_id: 'u', role: 'reception', displayname: 'Resepsiyon', username: 'reception' }, hotels: [], branches: [], feature_registry: { categories: [], definitions: [] }, ...patch });
const booking = (id, patch = {}) => ({ booking_id: id, branch_id: 'b', room_id: '101', guest_name: 'Deniz', status: 'checked_in', check_in: '2026-10-13T11:00:00Z', check_out: '2026-10-15T11:00:00Z', actual_check_in: '2026-10-13T11:00:00Z', allocations: [], ...patch });

test('builds only the selected branch, preserves arbitrary floor IDs and negative sort order', () => {
  const result = buildPropertyScene(snapshot([room('101'), room('B01', { floor_id: 'basement' }), room('secret', { branch_id: 'other' })], { floors: [floor(), floor('basement', { sort_order: -5 }), floor('other', { branch_id: 'other' })] }), []);
  assert.deepEqual(result.map(f => f.id), ['basement', 'f']);
  assert.deepEqual(result.flatMap(f => f.rooms.map(r => r.unit.code)), ['B01', '101']);
});
test('uses saved nonoverlapping placements; fallback layout is stable without API mutations', () => {
  const a = room('101'), b = room('102', { position: { x: 100, y: 0, width: 100, height: 80 } });
  const s = snapshot([a, b]), before = JSON.stringify(s);
  const saved = buildPropertyScene(s, [])[0];
  assert.equal(saved.automatic, false); assert.equal(saved.rooms[1].x - saved.rooms[0].x, 6);
  const overlap = buildPropertyScene(snapshot([room('102'), a]), [])[0];
  assert.equal(overlap.automatic, true); assert.notEqual(overlap.rooms[0].x, overlap.rooms[1].x);
  assert.deepEqual(overlap, buildPropertyScene(snapshot([a, room('102')]), [])[0]);
  assert.equal(JSON.stringify(s), before);
});
test('physical beds retain all four tiers, dimensions and unit IDs, without creating demo beds', () => {
  const bedUnits = Array.from({ length: 4 }, (_, i) => room(`B-${i + 1}`, { kind: 'bed', parent_id: '101', floor_id: null, capacity: 1 }));
  const bed = { bed_id: 'physical', branch_id: 'b', levels: 4, width_cm: 90, length_cm: 200, places: bedUnits.map((b, i) => ({ unit_id: b.room_id, level: i + 1, width_cm: 90, length_cm: 200 })) };
  const result = buildPropertyScene(snapshot([room('101'), ...bedUnits, room('empty', { position: { x: 100, y: 0, width: 100, height: 80 } })]), [bed]);
  const r = result[0].rooms.find(r => r.unit.code === '101');
  assert.deepEqual(r.beds.map(b => b.level), [1, 2, 3, 4]); assert.equal(new Set(r.beds.map(b => b.group)).size, 1);
  assert.ok(r.beds.every(b => b.width === .9 && b.length === 2)); assert.ok(result[0].storyHeight > 5.4);
  assert.equal(result[0].rooms.find(r => r.unit.code === 'empty').beds.length, 0);
  const double = buildPropertyScene(snapshot([room('D', { kind: 'bed', floor_id: null, capacity: 2 })]), []);
  assert.equal(double.at(-1).rooms[0].beds[0].width, 1.6);
});
test('nested rooms inherit their floor and standalone bunk units share one physical group', () => {
  const units = [room('apartment', { kind: 'apartment' }), room('101', { parent_id: 'apartment', floor_id: null }), room('101-1', { kind: 'bed', parent_id: '101', floor_id: null }), ...[1, 2, 3].map(level => room(`solo-${level}`, { kind: 'bed', floor_id: null, bed_group: 'solo', bed_level: level }))];
  const result = buildPropertyScene(snapshot(units), []);
  assert.equal(result[0].rooms.length, 1); assert.equal(result[0].rooms[0].unit.code, '101');
  assert.equal(result[0].rooms[0].beds.length, 1);
  assert.equal(result[1].id, 'unassigned'); assert.equal(result[1].rooms.length, 1); assert.equal(result[1].rooms[0].beds.length, 3);
});
test('status uses shared booking semantics: overdue stays, future reservations, cancellations and branch isolation', () => {
  const units = [room('101'), room('102'), room('103', { status: 'Kirli' })];
  const bookings = [booking('live', { check_out: '2026-10-14T06:00:00Z' }), booking('next', { room_id: '102', status: 'confirmed', actual_check_in: null, check_in: '2026-10-20T12:00:00Z', check_out: '2026-10-22T12:00:00Z' }), booking('cancelled', { room_id: '103', status: 'cancelled' }), booking('foreign', { room_id: '103', branch_id: 'other' })];
  const floors = buildPropertyScene(snapshot(units, { bookings }), []);
  assert.deepEqual(floors[0].rooms.map(r => r.state.tone), ['occupied', 'reserved', 'warning']);
  assert.equal(visibleScene(floors, 'all', 'DENİZ', 'occupied')[0].rooms.length, 1);
  assert.equal(visibleScene(floors, 'all', 'nonexistent', 'all')[0].rooms.length, 0);
  assert.equal(floors[0].rooms[2].state.bookings.length, 0);
});
test('page retains common header, round controls, switches, accessible selection and useful empty state', () => {
  const s = snapshot([room('101')]);
  const html = render(React.createElement(PropertyView, { snapshot: s }));
  for (const text of ['3 Boyutlu Görünüm', 'Oda / birim seçimi', 'Şematik görünüm', 'Üstten görünüm', 'Yakınlaştır', 'Katları ayır']) assert.ok(html.includes(text), text);
  assert.equal((html.match(/<h2/g) || []).length, 1); assert.ok(html.includes('role="switch"')); assert.ok(!html.includes('type="checkbox"'));
  const collapsed = render(React.createElement(NotificationProvider, null, React.createElement(UserPreferencesProvider, { initial: { 'header.property3d': true } }, React.createElement(PropertyView, { snapshot: s }))));
  assert.ok(collapsed.includes('class="page-header-details" hidden=""')); assert.ok(collapsed.includes('3 boyutlu kamera kontrolleri'));
  const empty = render(React.createElement(PropertyView, { snapshot: snapshot([]) }));
  assert.ok(empty.includes('Bu tesiste görüntülenecek birim yok')); assert.ok(!empty.includes('3 boyutlu kamera kontrolleri'));
});
test('operation menu and active tab expose the new page for reception', () => {
  const html = render(React.createElement(OriginalShell, { snapshot: snapshot([]), activeTab: 'property3d', setActiveTab() {}, openTabs: ['board', 'property3d'], onCloseTab() {}, onSelection() {}, onLogout() {}, at: now, onDate() {}, children: null }));
  assert.ok(html.includes('3 Boyutlu Görünüm')); assert.ok(html.includes('lucide-box')); assert.ok(html.includes('aria-current="page"'));
});

test('scene rebuild and teardown release geometries, materials and textures; camera actions stay finite', () => {
  const THREE = require('three');
  const Module = require('node:module'), originalLoad = Module._load;
  const originals = Object.fromEntries(['window', 'document', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame'].map(k => [k, global[k]]));
  let renderer, draw, controlsDisposed = false, observerDisconnected = false;
  const listeners = new Map(), documentListeners = new Map();
  const canvas = { setAttribute() {}, addEventListener(k, fn) { listeners.set(k, fn); }, removeEventListener(k) { listeners.delete(k); }, remove() { this.removed = true; }, setPointerCapture() {}, hasPointerCapture() { return false; }, getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 650 }; } };
  class Renderer {
    constructor() { renderer = this; this.domElement = canvas; }
    setPixelRatio() {} setSize() {}
    render(scene, camera) { this.scene = scene; this.camera = camera; }
    dispose() { this.disposed = true; }
    forceContextLoss() { this.lost = true; }
  }
  class Controls {
    constructor() { this.target = new THREE.Vector3(); }
    update() { return true; } addEventListener() {} dispose() { controlsDisposed = true; }
  }
  global.window = { devicePixelRatio: 1 };
  global.document = { hidden: false, addEventListener(k, fn) { documentListeners.set(k, fn); }, removeEventListener(k) { documentListeners.delete(k); }, createElement() { return { getContext() { return { beginPath() {}, roundRect() {}, fill() {}, fillText() {} }; } }; } };
  global.ResizeObserver = class { observe() {} disconnect() { observerDisconnected = true; } };
  global.requestAnimationFrame = fn => { draw = fn; return 1; }; global.cancelAnimationFrame = () => {};
  Module._load = function(request, ...args) { if (request === 'three') return { ...THREE, WebGLRenderer: Renderer }; if (request.includes('OrbitControls')) return { OrbitControls: Controls }; return originalLoad.call(this, request, ...args); };
  let engine;
  try {
    const { createPropertyRenderer } = require(path.join(out, 'components/property-3d/scene.js'));
    const units = [room('101', { feature_assignments: [{ code: 'catalog.pool_spa.spa.room_jacuzzi', value: true }] }), ...[1, 2, 3, 4].map(i => room(`b${i}`, { kind: 'bed', parent_id: '101', bed_group: 'bunk', bed_level: i, capacity: 1 }))];
    const floors = buildPropertyScene(snapshot(units), []);
    engine = createPropertyRenderer({ clientWidth: 1000, clientHeight: 650, appendChild() {}, style: {} }, { select() {}, hover() {}, failure() { assert.fail('unexpected render error'); } });
    engine.update(floors, true, true); draw();
    assert.ok(renderer.scene.getObjectByName('jacuzzi-101'));
    assert.ok(renderer.scene.getObjectByName('jacuzzi-water'));
    const meshes = []; renderer.scene.traverse(object => { if (object.isMesh && object.userData.unitId) meshes.push(object); });
    const mattress = id => meshes.find(m => m.userData.unitId === id && m.scale.y === .16);
    assert.ok(Math.abs(mattress('b4').position.y - mattress('b1').position.y - 4.05) < 1e-9);
    const tracked = new Set(), disposed = new Set();
    renderer.scene.traverse(object => {
      if (object.isMesh) tracked.add(object.geometry);
      if (object.material) { tracked.add(object.material); if (object.material.map) tracked.add(object.material.map); }
    });
    for (const resource of tracked) resource.addEventListener('dispose', () => disposed.add(resource));
    engine.select('b4'); draw(); assert.ok(renderer.scene.children.some(c => c.type === 'BoxHelper'));
    for (const action of ['top', 'front', 'reset', 'in', 'out', 'left', 'right']) { engine.action(action); draw(); assert.ok(renderer.camera.position.toArray().every(Number.isFinite)); }
    engine.update(floors, false, false); draw();
    assert.equal(disposed.size, tracked.size, 'all old world resources must be disposed on rebuild');
    engine.dispose(); engine = null;
    assert.ok(renderer.disposed && renderer.lost && canvas.removed && controlsDisposed && observerDisconnected);
    assert.equal(listeners.size, 0); assert.equal(documentListeners.size, 0);
  } finally {
    engine?.dispose(); Module._load = originalLoad;
    for (const [key, value] of Object.entries(originals)) { if (value === undefined) delete global[key]; else global[key] = value; }
  }
});


test('explicit room layouts render single/double/twin beds without inventing rentable units', () => {
  for (const [layout, count, width] of [['single', 1, .9], ['double', 1, 1.6], ['twin', 2, .9]]) {
    const result = buildPropertyScene(snapshot([room('101', { bed_layout: layout })]), [])[0].rooms[0];
    assert.equal(result.beds.length, count); assert.ok(result.beds.every(b => b.visualOnly && b.width === width && b.unit.room_id === '101'));
  }
  const result = buildPropertyScene(snapshot([room('101', { bed_layout: 'twin' }), room('real', { kind: 'bed', parent_id: '101' })]), [])[0].rooms[0];
  assert.equal(result.beds.length, 1); assert.ok(!result.beds[0].visualOnly);
});
test('jacuzzi uses enabled room features, quantity or custom definition, not shared property spa', () => {
  const { roomHasJacuzzi } = require(path.join(out, 'components/property-3d/room-fixtures.js'));
  const registry = { definitions: [{ code: 'custom-spa', scopes: ['room'], label: { TR: 'Jakuzi' } }] };
  for (const [code, value, expected] of [['catalog.bathroom.fixtures.jacuzzi', 1, true], ['catalog.pool_spa.spa.room_jacuzzi', true, true], ['catalog.pool_spa.spa.room_jacuzzi', false, false], ['custom-spa', true, true], ['catalog.pool_spa.spa.shared_jacuzzi', true, false], ['catalog.bathroom.fixtures.jacuzzi', 0, false]]) {
    assert.equal(roomHasJacuzzi(room('101', { feature_assignments: [{ code, value }] }), registry), expected);
  }
  assert.ok(roomHasJacuzzi(room('101', { features: ['Jakuzi'] }), registry));
});
test('room bed selection produces distinct persistent structures, not a count-only visual', () => {
  const { roomBedsPayload, RoomBedsEditor } = require(path.join(out, 'components/RoomBedsEditor.js'));
  const choices = [{ id: 'abc12345-rest', preset: 'double', count: 2 }, { id: 'def12345-rest', preset: 'bunk4', count: 1 }];
  const beds = roomBedsPayload(choices, '101', 'b');
  assert.equal(beds.length, 3); assert.deepEqual(beds.map(b => b.places.length), [1, 1, 4]);
  assert.equal(beds.flatMap(b => b.places).reduce((sum, p) => sum + p.capacity, 0), 8);
  assert.equal(new Set(beds.flatMap(b => b.places.map(p => p.code))).size, 6);
  assert.ok(beds.flatMap(b => b.places).every(p => p.is_active && !p.rentable));
  const html = render(React.createElement(RoomBedsEditor, { branchId: 'b', value: choices, onChange() {}, disabled: false }));
  for (const text of ['Yatak türü', 'Adet', 'Çift kişilik yatak', '4 katlı ranza']) assert.ok(html.includes(text), text);
});
