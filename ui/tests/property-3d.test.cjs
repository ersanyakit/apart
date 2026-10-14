const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync, mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path'), os = require('node:os');
const ui = path.resolve(__dirname, '..'), out = mkdtempSync(path.join(os.tmpdir(), 'otel-property-3d-'));
after(() => rmSync(out, { recursive: true, force: true }));
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--esModuleInterop', '--resolveJsonModule', '--jsx', 'react-jsx', '--outDir', out, 'src/components/property-3d/PropertyView.tsx', 'src/components/AccommodationForms.tsx', 'src/components/RoomBedsEditor.tsx', 'src/components/OriginalShell.tsx', 'node_modules/next/types/global.d.ts'], { cwd: ui, stdio: 'pipe' });
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
test('page dedicates content to the scene with no page header and keeps controls inside', () => {
  const s = snapshot([room('101')]);
  const html = render(React.createElement(PropertyView, { snapshot: s }));
  for (const text of ['Oda / birim seçimi', 'Şematik görünüm', 'Üstten görünüm', 'Yakınlaştır', 'Katları ayır']) assert.ok(html.includes(text), text);
  assert.equal((html.match(/<h2/g) || []).length, 0); assert.ok(html.includes('role="switch"')); assert.ok(!html.includes('type="checkbox"'));
  const collapsed = render(React.createElement(NotificationProvider, null, React.createElement(UserPreferencesProvider, { initial: { 'header.property3d': true } }, React.createElement(PropertyView, { snapshot: s }))));
  assert.ok(!collapsed.includes('page-header-details')); assert.ok(collapsed.includes('inert=""')); assert.ok(collapsed.includes('3 boyutlu kamera kontrolleri'));
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
  const motionPreference = { matches: false };
  const selections = [];
  let controls;
  let renderer, draw, controlsDisposed = false, observerDisconnected = false;
  const listeners = new Map(), documentListeners = new Map();
  const canvas = { setAttribute() {}, addEventListener(k, fn) { listeners.set(k, fn); }, removeEventListener(k) { listeners.delete(k); }, remove() { this.removed = true; }, setPointerCapture() {}, hasPointerCapture() { return false; }, getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 650 }; } };
  class Renderer {
    constructor() { renderer = this; this.domElement = canvas; this.shadowMap = {}; }
    setPixelRatio() {} setSize() {}
    render(scene, camera) { this.scene = scene; this.camera = camera; }
    dispose() { this.disposed = true; }
    forceContextLoss() { this.lost = true; }
  }
  class Controls {
    constructor() { controls = this; this.target = new THREE.Vector3(); }
    update() { return true; } addEventListener() {} dispose() { controlsDisposed = true; }
  }
  global.window = { devicePixelRatio: 1, matchMedia: () => motionPreference };
  global.document = { hidden: false, addEventListener(k, fn) { documentListeners.set(k, fn); }, removeEventListener(k) { documentListeners.delete(k); }, createElement() { return { getContext() { return { beginPath() {}, roundRect() {}, fill() {}, fillText() {} }; } }; } };
  global.ResizeObserver = class { observe() {} disconnect() { observerDisconnected = true; } };
  global.requestAnimationFrame = fn => { draw = fn; return 1; }; global.cancelAnimationFrame = () => {};
  Module._load = function(request, ...args) { if (request === 'three') return { ...THREE, WebGLRenderer: Renderer, Raycaster: class extends THREE.Raycaster { intersectObjects(objects) { const object = objects.find(o => o.userData.unitId === 'b4'); return object ? [{ object }] : []; } } }; if (request.includes('OrbitControls')) return { OrbitControls: Controls }; return originalLoad.call(this, request, ...args); };
  let engine;
  try {
    const { createPropertyRenderer } = require(path.join(out, 'components/property-3d/scene.js'));
    const units = [room('101', { feature_assignments: [{ code: 'catalog.pool_spa.spa.room_jacuzzi', value: true }] }), ...[1, 2, 3, 4].map(i => room(`b${i}`, { kind: 'bed', parent_id: '101', bed_group: 'bunk', bed_level: i, capacity: 1 }))];
    const floors = buildPropertyScene(snapshot(units, { bookings: [booking('stay', { room_id: 'b1', guest_count: 1, guests: [{ id: 'guest', name: 'Misafir', gender: 'female' }] })] }), []);
    engine = createPropertyRenderer({ clientWidth: 1000, clientHeight: 650, appendChild() {}, style: {} }, { select(id) { selections.push(id); }, hover() {}, failure() { assert.fail('unexpected render error'); } });
    engine.update(floors, true, true); draw();
    assert.ok(renderer.scene.getObjectByName('jacuzzi-101'));
    assert.ok(renderer.scene.getObjectByName('jacuzzi-water'));
    const sleeper = renderer.scene.getObjectByName('sleeper-b1-0');
    assert.equal(sleeper.userData.gender, 'female');
    const chest = sleeper.getObjectByName('sleeper-chest');
    assert.notEqual(chest.position.y, 0, 'breathing animation advances');
    motionPreference.matches = true; const frozen = chest.position.y; draw(); assert.equal(chest.position.y, frozen);
    motionPreference.matches = false;
    assert.equal(renderer.scene.getObjectByName('sleeper-b2-0'), undefined);
    assert.ok(renderer.shadowMap.enabled);
    const quilts = [1, 2, 3, 4].map(i => renderer.scene.getObjectByName(`blanket-b${i}-${i}`));
    assert.equal(new Set(quilts.map(q => q.material.map)).size, 4, 'each tier has its own colored plaid textile');
    assert.ok(quilts.every(q => q.material.map.isDataTexture));
    const glass = []; renderer.scene.traverse(o => { if (o.material?.isMeshPhysicalMaterial) glass.push(o); });
    assert.ok(glass.length >= 4, 'glazing and water use physical optical materials');
    const meshes = []; renderer.scene.traverse(object => { if (object.isMesh && object.userData.unitId) meshes.push(object); });
    const mattress = id => meshes.find(m => m.userData.unitId === id && m.scale.y === .16);
    const bedNode = mattress('b4').parent;
    const event = { pointerId: 1, button: 0, clientX: 400, clientY: 300, pointerType: 'mouse' };
    listeners.get('pointerdown')(event); assert.equal(bedNode.scale.x, 0.98);
    listeners.get('pointerup')(event); assert.equal(bedNode.scale.x, 1); assert.deepEqual(selections, ['b4']);
    listeners.get('pointerdown')(event);
    listeners.get('pointermove')({ ...event, clientX: 430 });
    assert.equal(bedNode.scale.x, 1);
    listeners.get('pointerup')({ ...event, clientX: 430 }); assert.deepEqual(selections, ['b4'], 'drag must not select');
    listeners.get('pointerdown')(event); listeners.get('pointercancel')(event); assert.equal(bedNode.scale.x, 1);
    assert.ok(Math.abs(mattress('b4').position.y - mattress('b1').position.y - 4.05) < 1e-9);
    const tracked = new Set(), disposed = new Set();
    renderer.scene.traverse(object => {
      if (object.isMesh) tracked.add(object.geometry);
      if (object.material) { tracked.add(object.material); if (object.material.map) tracked.add(object.material.map); }
    });
    for (const resource of tracked) resource.addEventListener('dispose', () => disposed.add(resource));
    engine.setPanMode(true);
    assert.equal(controls.mouseButtons.LEFT, THREE.MOUSE.PAN);
    assert.equal(controls.touches.ONE, THREE.TOUCH.PAN);
    listeners.get('pointerdown')(event); listeners.get('pointerup')(event);
    assert.deepEqual(selections, ['b4'], 'pan mode must not select a bed');
    engine.setPanMode(false);
    assert.equal(controls.mouseButtons.LEFT, THREE.MOUSE.ROTATE);
    assert.equal(controls.touches.TWO, THREE.TOUCH.DOLLY_PAN);
    for (const action of ['pan-left', 'pan-right', 'pan-up', 'pan-down']) {
      const before = renderer.camera.position.clone(), target = controls.target.clone();
      const offset = before.clone().sub(target), rotation = renderer.camera.quaternion.clone();
      engine.action(action); draw();
      const delta = renderer.camera.position.clone().sub(before);
      assert.ok(delta.length() > 0);
      assert.ok(controls.target.clone().sub(target).distanceTo(delta) < 1e-8);
      assert.ok(renderer.camera.position.clone().sub(controls.target).distanceTo(offset) < 1e-8);
      assert.ok(renderer.camera.quaternion.equals(rotation), 'panning does not rotate the camera');
    }
    engine.select('b4'); draw();
    const selection = renderer.scene.getObjectByName('selection-glass-enclosure');
    assert.ok(selection);
    const selectionResources = new Set();
    selection.traverse(o => { if (o.geometry) selectionResources.add(o.geometry); if (o.material) selectionResources.add(o.material); });
    let selectionDisposed = 0;
    for (const resource of selectionResources) resource.addEventListener('dispose', () => selectionDisposed++);
    engine.select(null); assert.equal(selectionDisposed, selectionResources.size);
    engine.select('b4');
    for (const action of ['top', 'front', 'reset', 'in', 'out', 'left', 'right']) { engine.action(action); draw(); assert.ok(renderer.camera.position.toArray().every(Number.isFinite)); }
    engine.update(floors, false, false); draw();
    assert.equal(disposed.size, tracked.size, 'all old world resources must be disposed on rebuild');
    const dirtyFloors = buildPropertyScene(snapshot(units.map(u => u.room_id === '101' ? { ...u, status: 'Kirli' } : u)), []);
    engine.update(dirtyFloors, false, true); draw();
    assert.ok(renderer.scene.getObjectByName('dirty-fold-b1-0'));
    assert.ok(renderer.scene.getObjectByName('dirty-fold-b4-2'));
    engine.update(floors, false, true); draw();
    assert.equal(renderer.scene.getObjectByName('dirty-fold-b1-0'), undefined);
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

test('room form asks for whole-room or per-bed rental explicitly', () => {
  const { I18nProvider } = require(path.join(out, 'components/I18n.js'));
  const wrap = child => React.createElement(NotificationProvider, null, React.createElement(I18nProvider, null, child));
  const { UnitForm } = require(path.join(out, 'components/AccommodationForms.js'));
  const html = render(wrap(React.createElement(UnitForm, { snapshot: snapshot([]), onSaved() {} })));
  assert.ok(html.includes('Nasıl kiralanacak?')); assert.ok(html.includes('Kiralama şeklini seçin'));
  for (const [mode, label] of [['room', 'Odanın tamamı kiralanacak'], ['beds', 'Yataklar ayrı ayrı kiralanacak']]) {
    const html = render(wrap(React.createElement(UnitForm, { snapshot: snapshot([]), room: room('101', { rental_mode: mode }), onSaved() {} })));
    assert.ok(html.includes(label)); assert.ok(!html.includes('Bu birim doğrudan kiralanabilir'));
  }
});

test('sparse saved plans compact empty space without shrinking rooms, changing order or mutating API data', () => {
  const source = snapshot([
    room('101', { position: { x: 0, y: 0, width: 100, height: 80 } }),
    room('102', { position: { x: 1000, y: 0, width: 100, height: 80 } }),
    room('103', { position: { x: 0, y: 900, width: 100, height: 80 } }),
    room('104', { position: { x: 1000, y: 900, width: 100, height: 80 } }),
  ]);
  const before = JSON.stringify(source);
  const floor = buildPropertyScene(source, [])[0];
  const [a, b, c] = floor.rooms;
  assert.equal(a.width, 6); assert.equal(a.depth, 4.8);
  assert.ok(Math.abs(b.x - b.width / 2 - (a.x + a.width / 2) - .35) < 1e-8);
  assert.ok(Math.abs(c.z - c.depth / 2 - (a.z + a.depth / 2) - .2) < 1e-8);
  assert.ok(floor.width < 13 && floor.depth < 11);
  for (const [i, room] of floor.rooms.entries()) for (const other of floor.rooms.slice(i + 1)) {
    assert.ok(Math.abs(room.x - other.x) >= (room.width + other.width) / 2 - 1e-8 || Math.abs(room.z - other.z) >= (room.depth + other.depth) / 2 - 1e-8);
  }
  assert.equal(JSON.stringify(source), before);
});
test('automatic room rows use tight shared partitions instead of broad empty lanes', () => {
  const floor = buildPropertyScene(snapshot(['101', '102', '103', '104'].map(id => room(id))), [])[0];
  const [a, b, c] = floor.rooms;
  assert.ok(Math.abs(b.x - a.x - a.width - .18) < 1e-8);
  assert.ok(Math.abs(c.z - a.z - a.depth - .2) < 1e-8);
  assert.ok(Math.abs(a.x - a.width / 2 + floor.width / 2 - .2) < 1e-8);
});


test('sleepers represent checked-in guests once with recorded gender; future bookings never create sleepers', () => {
  const units = [room('101'), room('b1', { kind: 'bed', parent_id: '101', capacity: 1 }), room('b2', { kind: 'bed', parent_id: '101', capacity: 1 }), room('b3', { kind: 'bed', parent_id: '101', capacity: 1 })];
  const guests = [{ id: '1', name: 'A', gender: 'female' }, { id: '2', name: 'B', gender: 'male' }];
  const beds = buildPropertyScene(snapshot(units, { bookings: [booking('stay', { guest_count: 2, guests })] }), [])[0].rooms[0].beds;
  assert.deepEqual(beds.map(b => b.sleepers), [['female'], ['male'], []]);
  const future = buildPropertyScene(snapshot(units, { bookings: [booking('future', { guest_count: 2, guests, status: 'confirmed', check_in: '2026-10-20T11:00:00Z', check_out: '2026-10-21T11:00:00Z' })] }), [])[0].rooms[0].beds;
  assert.ok(future.every(b => b.sleepers.length === 0));
  const neutral = buildPropertyScene(snapshot(units, { bookings: [booking('stay', { guest_count: 1, guests: [{ id: '3', name: 'C' }] })] }), [])[0].rooms[0].beds;
  assert.deepEqual(neutral.map(b => b.sleepers), [['neutral'], [], []]);
});

test('room finishes stay stable through search and floors can be isolated without other floors', () => {
  const floors = buildPropertyScene(snapshot([room('101'), room('102'), room('201', { floor_id: 'second' })], { floors: [floor(), floor('second')] }), []);
  assert.notEqual(floors[0].rooms[0].floorColor, floors[0].rooms[1].floorColor);
  const filtered = visibleScene(floors, 'f', '102', 'all');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].rooms[0].floorColor, floors[0].rooms[1].floorColor);
  assert.deepEqual(visibleScene(floors, 'second', '', 'all').map(f => f.id), ['second']);
});


test('bedding uses varied reference textile colors stable across status changes and filters', () => {
  const units = [room('101'), ...[1, 2, 3, 4].map(i => room(`b${i}`, { kind: 'bed', parent_id: '101', capacity: 1, bed_level: i }))];
  const empty = buildPropertyScene(snapshot(units), []);
  const occupied = buildPropertyScene(snapshot(units, { bookings: [booking('stay', { guest_count: 1, room_id: 'b1' })] }), []);
  const colors = empty[0].rooms[0].beds.map(b => b.blanketColor);
  assert.equal(new Set(colors).size, 4);
  assert.deepEqual(occupied[0].rooms[0].beds.map(b => b.blanketColor), colors);
  assert.deepEqual(visibleScene(empty, 'f', 'b1', 'all')[0].rooms[0].beds.map(b => b.blanketColor), colors);
});


test('dirty rooms propagate unmade bedding without marking maintenance or neighboring rooms dirty', () => {
  const units = [room('101', { status: 'Kirli' }), room('b1', { kind: 'bed', parent_id: '101', capacity: 1 }), room('102'), room('b2', { kind: 'bed', parent_id: '102', capacity: 1 }), room('103', { status: 'Tadilat', bed_layout: 'double' })];
  const source = snapshot(units), before = JSON.stringify(source);
  const result = buildPropertyScene(source, []);
  assert.equal(result[0].rooms[0].beds[0].dirty, true);
  assert.equal(result[0].rooms[0].beds[0].state.tone, 'warning');
  assert.match(result[0].rooms[0].beds[0].state.label, /Temizlik gerekli/);
  assert.equal(result[0].rooms[1].beds[0].dirty, false);
  assert.equal(result[0].rooms[2].beds[0].dirty, false);
  assert.equal(JSON.stringify(source), before);
  const clean = buildPropertyScene(snapshot(units.map(u => u.room_id === '101' ? { ...u, status: 'Temiz' } : u)), []);
  assert.equal(clean[0].rooms[0].beds[0].dirty, false);
  const bedDirty = buildPropertyScene(snapshot(units.map(u => u.room_id === 'b2' ? { ...u, status: 'Kirli' } : u)), []);
  assert.equal(bedDirty[0].rooms[1].beds[0].dirty, true);
});
