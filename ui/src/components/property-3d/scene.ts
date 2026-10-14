import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STATUS_COLORS, type SceneFloor, type SceneRoom, type SceneBed } from './model';

export type CameraAction = 'reset' | 'top' | 'front' | 'left' | 'right' | 'in' | 'out';
type Callbacks = { select: (id: string | null) => void; hover: (id: string | null) => void; failure: () => void };

// Adapted from the supplied Hostel3D reference: cutaway floor slabs, voxel
// wooden frames, layered mattresses, ladders and orbit navigation. Geometry
// is generated from API records; all resources belong to this scene instance.
export function createPropertyRenderer(container: HTMLDivElement, callbacks: Callbacks) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#b2b9c9', 2.6));
  const light = new THREE.DirectionalLight('#fff4e2', 3);
  light.position.set(15, 30, 20); scene.add(light);
  const fill = new THREE.DirectionalLight('#c8dbff', 1.5);
  fill.position.set(-15, 10, -10); scene.add(fill);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 10000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.1;
  controls.maxPolarAngle = Math.PI / 2 - 0.015; controls.minPolarAngle = 0.01;
  controls.screenSpacePanning = true; controls.minDistance = 1;
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let world = new THREE.Group(); scene.add(world);
  let targets: THREE.Object3D[] = [];
  let nodes = new Map<string, THREE.Object3D>();
  let selected: THREE.BoxHelper | null = null;
  let selectedId: string | null = null;
  let resources: Array<{ dispose(): void }> = [];
  let dirty = true, disposed = false, lost = false, frame = 0;
  let bounds = new THREE.Box3(), center = new THREE.Vector3(), radius = 10;
  let layoutSignature = '';
  let hoverId: string | null = null;
  const activePointers = new Set<number>();
  let down: { x: number; y: number; id: number; dragged: boolean } | null = null;

  function clearHighlight() {
    if (selected) { scene.remove(selected); selected.geometry.dispose(); (selected.material as THREE.Material).dispose(); selected = null; }
  }
  function select(id: string | null) {
    selectedId = id; clearHighlight();
    const node = id ? nodes.get(id) : undefined;
    if (node) {
      selected = new THREE.BoxHelper(node, '#4779de');
      (selected.material as THREE.LineBasicMaterial).depthTest = false;
      selected.renderOrder = 10; scene.add(selected);
    }
    dirty = true;
  }
  function fit(top = false, front = false) {
    controls.target.copy(center);
    const halfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
    const distance = radius / Math.sin(Math.min(halfAngle, Math.atan(Math.tan(halfAngle) * camera.aspect))) * 1.15;
    const direction = top ? new THREE.Vector3(0, 1, 0.001) : front ? new THREE.Vector3(0, 0.4, 1) : new THREE.Vector3(1, 0.95, 1.25);
    camera.position.copy(center).addScaledVector(direction.normalize(), distance);
    camera.far = Math.max(1000, distance * 10); camera.updateProjectionMatrix();
    controls.maxDistance = Math.max(60, distance * 4); controls.update(); dirty = true;
  }
  function resize() {
    if (disposed) return;
    const width = container.clientWidth, height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height); dirty = true;
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  const invalidate = () => { dirty = true; };
  controls.addEventListener('change', invalidate);
  const visibility = () => { dirty = true; };
  document.addEventListener('visibilitychange', visibility);
  function animate() {
    if (disposed || lost) return;
    frame = requestAnimationFrame(animate);
    if (document.hidden || !container.clientWidth || !container.clientHeight) return;
    const moved = controls.update();
    if (dirty || moved) {
      try { renderer.render(scene, camera); dirty = false; }
      catch { lost = true; cancelAnimationFrame(frame); callbacks.failure(); }
    }
  }
  frame = requestAnimationFrame(animate);

  function hit(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return (raycaster.intersectObjects(targets, false)[0]?.object.userData.unitId as string | undefined) || null;
  }
  function hover(id: string | null) {
    if (hoverId === id) return;
    hoverId = id; container.style.cursor = id ? 'pointer' : 'grab'; callbacks.hover(id);
  }
  function pointerDown(e: PointerEvent) {
    activePointers.add(e.pointerId);
    if (activePointers.size > 1) { if (down) down.dragged = true; return; }
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, dragged: e.button !== 0 };
    renderer.domElement.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: PointerEvent) {
    if (down) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.dragged = true;
      hover(null); return;
    }
    if (e.pointerType !== 'touch') hover(hit(e));
  }
  function pointerUp(e: PointerEvent) {
    activePointers.delete(e.pointerId);
    if (down?.id === e.pointerId) {
      if (!down.dragged && !activePointers.size) callbacks.select(hit(e));
      down = null;
    }
    if (renderer.domElement.hasPointerCapture(e.pointerId)) renderer.domElement.releasePointerCapture(e.pointerId);
  }
  function pointerCancel(e: PointerEvent) { activePointers.delete(e.pointerId); down = null; hover(null); }
  function pointerLeave() { hover(null); }
  function contextLost(e: Event) { e.preventDefault(); lost = true; cancelAnimationFrame(frame); callbacks.failure(); }
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', pointerCancel);
  renderer.domElement.addEventListener('pointerleave', pointerLeave);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);

  function update(floors: SceneFloor[], exploded: boolean, walls: boolean) {
    clearHighlight(); scene.remove(world); resources.forEach(r => r.dispose()); resources = [];
    world = new THREE.Group(); scene.add(world); targets = []; nodes = new Map(); hover(null);
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1); resources.push(boxGeometry);
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    function material(color: string, opacity = 1) {
      const key = `${color}:${opacity}`;
      if (!materials.has(key)) {
        const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, transparent: opacity < 1, opacity, depthWrite: opacity === 1 });
        materials.set(key, m); resources.push(m);
      }
      return materials.get(key)!;
    }
    function box(parent: THREE.Group, size: number[], pos: number[], color: string, id?: string, opacity = 1) {
      const mesh = new THREE.Mesh(boxGeometry, material(color, opacity));
      mesh.scale.set(size[0], size[1], size[2]); mesh.position.set(pos[0], pos[1], pos[2]); parent.add(mesh);
      if (id) { mesh.userData.unitId = id; targets.push(mesh); }
      return mesh;
    }
    function label(parent: THREE.Group, text: string, pos: number[], width: number, dark = false) {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.fillStyle = dark ? '#344057' : '#ffffff'; ctx.beginPath(); ctx.roundRect(0, 0, 512, 96, 22); ctx.fill();
      ctx.fillStyle = dark ? '#ffffff' : '#27374d'; ctx.font = '600 38px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 48, 470);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
      resources.push(texture, mat);
      const sprite = new THREE.Sprite(mat); sprite.position.set(pos[0], pos[1], pos[2]); sprite.scale.set(width, width * 96 / 512, 1); parent.add(sprite);
    }
    function bedModel(parent: THREE.Group, beds: SceneBed[], x: number, z: number, scale: number) {
      const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale); parent.add(group);
      const width = Math.max(...beds.map(b => b.width)), length = Math.max(...beds.map(b => b.length));
      const levels = Math.max(...beds.map(b => b.level)), top = (levels - 1) * 1.35 + 0.85;
      const wood = '#9b7656';
      for (const dx of [-width / 2, width / 2]) for (const dz of [-length / 2, length / 2]) box(group, [0.075, top, 0.075], [dx, top / 2, dz], wood);
      for (const bed of beds) {
        const y = (bed.level - 1) * 1.35 + 0.35;
        const unitGroup = new THREE.Group(); group.add(unitGroup); if (!bed.visualOnly) nodes.set(bed.unit.room_id, unitGroup);
        box(unitGroup, [bed.width + 0.09, 0.12, bed.length + 0.08], [0, y, 0], wood, bed.unit.room_id);
        box(unitGroup, [bed.width, 0.16, bed.length], [0, y + 0.13, 0], '#f7f5f0', bed.unit.room_id);
        box(unitGroup, [bed.width - 0.04, 0.08, bed.length * 0.66], [0, y + 0.25, bed.length * 0.14], STATUS_COLORS[bed.state.tone], bed.unit.room_id);
        const pillows = bed.width >= 1.4 ? 2 : 1;
        for (let i = 0; i < pillows; i++) box(unitGroup, [bed.width / pillows * 0.72, 0.12, 0.36], [(i - (pillows - 1) / 2) * bed.width / pillows, y + 0.27, -bed.length * 0.33], '#ffffff', bed.unit.room_id);
        if (bed.level > 1) box(unitGroup, [0.04, 0.13, bed.length * 0.72], [bed.width / 2, y + 0.4, -0.1], wood);
        // A neutral occupancy marker, never a fabricated guest appearance.
        if (bed.state.tone === 'occupied') box(unitGroup, [0.22, 0.09, 0.22], [0, y + 0.38, -bed.length * 0.32], '#4b5a6d');
        label(unitGroup, bed.label || bed.unit.code, [0, y + 0.43, bed.length / 2 + 0.08], Math.max(0.75, bed.width));
      }
      if (levels > 1) {
        const height = (levels - 1) * 1.35 + 0.5;
        for (const dx of [-0.21, 0.21]) box(group, [0.055, height, 0.055], [dx, height / 2, length / 2 + 0.12], wood);
        for (let y = 0.2; y < height; y += 0.28) box(group, [0.48, 0.045, 0.07], [0, y, length / 2 + 0.12], wood);
      }
    }
    function jacuzziModel(parent: THREE.Group, room: SceneRoom, cellWidth: number, cellDepth: number, x: number, z: number) {
      const tub = new THREE.Group(); tub.name = `jacuzzi-${room.unit.room_id}`;
      const scale = Math.min(1, cellWidth / 2.6, cellDepth / 3.1);
      tub.scale.setScalar(scale); tub.position.set(x, 0.12, z); parent.add(tub);
      const id = room.unit.room_id;
      box(tub, [2.35, 0.2, 2.35], [0, 0.1, 0], '#46556b', id);
      box(tub, [1.85, 0.12, 1.85], [0, 0.22, 0], '#b4dce8', id);
      // Separate basin walls keep the water visible inside the tub.
      for (const x of [-1, 1]) box(tub, [0.18, 0.7, 2.18], [x, 0.5, 0], '#fafbfc', id);
      for (const z of [-1, 1]) box(tub, [1.85, 0.7, 0.18], [0, 0.5, z], '#fafbfc', id);
      const water = box(tub, [1.8, 0.04, 1.8], [0, 0.64, 0], '#39c6dc', id, 0.86); water.name = 'jacuzzi-water';
      for (const x of [-0.7, 0.7]) box(tub, [0.38, 0.1, 0.24], [x, 0.9, -0.95], '#344057', id);
      box(tub, [0.08, 0.22, 0.18], [0, 0.95, -0.94], '#cbd6df', id);
      box(tub, [1.1, 0.2, 0.45], [0, 0.1, 1.4], '#62748a', id);
      box(tub, [1.1, 0.4, 0.3], [0, 0.2, 1.13], '#62748a', id);
      for (const x of [-0.65, 0, 0.65]) for (const z of [-0.55, 0.4]) {
        box(tub, [0.09, 0.018, 0.09], [x, 0.67, z], '#d6f8ff');
      }
      label(tub, 'Jakuzi', [0, 0.45, 1.55], 1.4);
    }
    function roomModel(parent: THREE.Group, room: SceneRoom) {
      const group = new THREE.Group(); group.position.set(room.x, 0, room.z); parent.add(group); nodes.set(room.unit.room_id, group);
      const w = room.width, d = room.depth;
      box(group, [w - 0.04, 0.08, d - 0.04], [0, 0.06, 0], '#f2ece3', room.unit.room_id);
      box(group, [w - 0.12, 0.025, 0.10], [0, 0.115, d / 2 - 0.1], STATUS_COLORS[room.state.tone]);
      if (walls) {
        box(group, [w, 1.05, 0.08], [0, 0.6, -d / 2], '#c1cddd', undefined, 0.4);
        box(group, [0.08, 1.05, d], [-w / 2, 0.6, 0], '#c1cddd', undefined, 0.32);
        box(group, [0.08, 1.05, d], [w / 2, 0.6, 0], '#c1cddd', undefined, 0.32);
        box(group, [w, 0.04, 0.1], [0, 1.14, -d / 2], '#ffffff');
      }
      const groups = new Map<string, SceneBed[]>();
      for (const bed of room.beds) groups.set(bed.group, [...(groups.get(bed.group) || []), bed]);
      const list = [...groups.values()];
      const fixtureCount = list.length + (room.hasJacuzzi ? 1 : 0);
      const cols = Math.max(1, Math.ceil(Math.sqrt(fixtureCount * w / d)));
      const rows = Math.max(1, Math.ceil(fixtureCount / cols));
      const cellWidth = w * 0.86 / cols, cellDepth = d * 0.76 / rows;
      list.forEach((beds, i) => {
        const maxW = Math.max(...beds.map(b => b.width)) + 0.3, maxD = Math.max(...beds.map(b => b.length)) + 0.5;
        const scale = Math.min(1, cellWidth / maxW, cellDepth / maxD);
        const x = -w * 0.43 + cellWidth * (i % cols + 0.5);
        const z = -d * 0.42 + cellDepth * (Math.floor(i / cols) + 0.5);
        bedModel(group, beds, x, z, scale);
      });
      if (room.hasJacuzzi) {
        const i = list.length;
        jacuzziModel(group, room, cellWidth, cellDepth, -w * 0.43 + cellWidth * (i % cols + 0.5), -d * 0.42 + cellDepth * (Math.floor(i / cols) + 0.5));
      }
      label(group, room.unit.code, [0, 0.3, d / 2 - 0.22], Math.min(w * 0.7, 2));
    }
    let elevation = 0;
    for (const floor of floors) {
      const group = new THREE.Group(); group.position.y = elevation; world.add(group);
      box(group, [floor.width, 0.2, floor.depth], [0, -0.1, 0], '#c3cad5');
      label(group, floor.label, [-floor.width / 2 + 2, 0.35, floor.depth / 2 + 0.5], 3.4, true);
      floor.rooms.forEach(room => roomModel(group, room));
      elevation += floor.storyHeight + (exploded ? 3 : 0);
    }
    world.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(world);
    if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-4, 0, -3), new THREE.Vector3(4, 2, 3));
    center = bounds.getCenter(new THREE.Vector3()); radius = Math.max(2, bounds.getSize(new THREE.Vector3()).length() / 2);
    const signature = floors.map(f => `${f.id}:${f.width}:${f.depth}:${f.rooms.map(r => r.unit.room_id).join(',')}`).join('|') + exploded;
    if (signature !== layoutSignature) { layoutSignature = signature; fit(); }
    select(selectedId); dirty = true;
  }
  return {
    update, select,
    action(action: CameraAction) {
      if (action === 'reset' || action === 'top' || action === 'front') { fit(action === 'top', action === 'front'); return; }
      const offset = camera.position.clone().sub(controls.target);
      if (action === 'left' || action === 'right') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), (action === 'left' ? 1 : -1) * Math.PI / 4);
      else offset.multiplyScalar(action === 'in' ? 0.8 : 1.25).clampLength(controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset); controls.update(); dirty = true;
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); clearHighlight();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', pointerCancel);
      renderer.domElement.removeEventListener('pointerleave', pointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      resources.forEach(r => r.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
