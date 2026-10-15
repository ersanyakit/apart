import { sceneStatusColor } from "./model";
import { STATUS_PALETTE } from "../../lib/status-palette";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STATUS_COLORS, type SceneFloor, type SceneRoom, type SceneBed } from './model';

export type CameraAction = 'reset' | 'top' | 'front' | 'left' | 'right' | 'in' | 'out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
type Callbacks = { select: (id: string | null) => void; hover: (id: string | null) => void; failure: () => void };

// Adapted from the supplied Hostel3D reference: cutaway floor slabs, voxel
// wooden frames, layered mattresses, ladders and orbit navigation. Geometry
// is generated from API records; all resources belong to this scene instance.
export function createPropertyRenderer(container: HTMLDivElement, callbacks: Callbacks) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#b2b9c9', 2.6));
  const light = new THREE.DirectionalLight('#fff4e2', 3);
  light.position.set(15, 30, 20); light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048); light.shadow.bias = -0.0004; light.shadow.normalBias = 0.025; scene.add(light);
  const fill = new THREE.DirectionalLight('#c8dbff', 1.5);
  fill.position.set(-15, 10, -10); scene.add(fill);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 10000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.1;
  controls.maxPolarAngle = Math.PI / 2 - 0.015; controls.minPolarAngle = 0.01;
  controls.screenSpacePanning = true; controls.minDistance = 1;
  controls.enablePan = true;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  let panMode = false;
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let world = new THREE.Group(); scene.add(world);
  let targets: THREE.Object3D[] = [];
  let nodes = new Map<string, THREE.Object3D>();
  let selected: THREE.Group | null = null;
  let hoverShell: THREE.Group | null = null;
  let pressed: THREE.Object3D | null = null;
  let animated: { node: THREE.Object3D; base: number; phase: number; amplitude: number }[] = [];
  let waterAnimations: ((time: number) => void)[] = [];
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let selectedId: string | null = null;
  let resources: Array<{ dispose(): void }> = [];
  let dirty = true, disposed = false, lost = false, frame = 0;
  let bounds = new THREE.Box3(), center = new THREE.Vector3(), radius = 10;
  let layoutSignature = '';
  let hoverId: string | null = null;
  let selectionAccent = '#2ABDFF';
  let selectionTint = '#eefaff';
  const activePointers = new Set<number>();
  let down: { x: number; y: number; id: number; dragged: boolean } | null = null;

  function disposeShell(shell: THREE.Group | null) {
    if (!shell) return;
    scene.remove(shell);
    shell.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(m => m.dispose());
      }
    });
  }
  function clearHighlight() { disposeShell(selected); selected = null; }
  function enclosure(node: THREE.Object3D, active: boolean) {
    node.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(node);
    const size = bounds.getSize(new THREE.Vector3()).addScalar(0.12);
    size.y = Math.max(size.y, 0.85);
    const center = bounds.getCenter(new THREE.Vector3()); center.y = bounds.min.y + size.y / 2;
    const shell = new THREE.Group(); shell.name = active ? 'selection-glass-enclosure' : 'hover-glass-enclosure';
    shell.position.copy(center);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const glass = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: selectionTint, transparent: true, opacity: active ? 0.72 : 0.52, depthWrite: false, toneMapped: false }));
    glass.name = 'selection-theme-fill';
    shell.add(glass);
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: selectionAccent, toneMapped: false, transparent: true, opacity: active ? 0.9 : 0.65 })); shell.add(border);
    const footprint = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.z), new THREE.MeshBasicMaterial({ color: selectionTint, toneMapped: false, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }));
    footprint.rotation.x = -Math.PI / 2; footprint.position.y = -size.y / 2 + 0.015;
    footprint.name = 'selection-theme-footprint'; shell.add(footprint);
    // Layered translucent footprint produces a soft halo without an external texture.
    for (let i = 0; i < 7; i++) {
      const glow = new THREE.Mesh(new THREE.BoxGeometry(size.x + i * 0.055, 0.008, size.z + i * 0.055), new THREE.MeshBasicMaterial({ color: selectionAccent, transparent: true, opacity: (active ? 0.055 : 0.025) * (1 - i / 8), depthWrite: false }));
      glow.position.y = -size.y / 2 + 0.006 + i * 0.001; shell.add(glow);
    }
    scene.add(shell); return shell;
  }
  function releasePress() {
    if (pressed) { pressed.scale.setScalar(1); pressed = null; dirty = true; }
  }
  function select(id: string | null) {
    releasePress(); selectedId = id; clearHighlight();
    disposeShell(hoverShell); hoverShell = null;
    const node = id ? nodes.get(id) : undefined;
    if (node) selected = enclosure(node, true);
    dirty = true;
  }
  function fit(top = false, front = false) {
    controls.target.copy(center);
    const halfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
    const distance = radius / Math.sin(Math.min(halfAngle, Math.atan(Math.tan(halfAngle) * camera.aspect))) * 1.08;
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
    if ((animated.length || waterAnimations.length) && !motion?.matches) {
      const time = performance.now() / 1000;
      for (const item of animated) item.node.position.y = item.base + Math.sin(time * 2.2 + item.phase) * item.amplitude;
      waterAnimations.forEach(animateWater => animateWater(time));
      dirty = true;
    }
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
    disposeShell(hoverShell); hoverShell = null;
    const node = id && id !== selectedId ? nodes.get(id) : undefined;
    if (node) hoverShell = enclosure(node, false);
    dirty = true;
    hoverId = id; container.style.cursor = id ? 'pointer' : 'grab'; callbacks.hover(id);
  }
  function pointerDown(e: PointerEvent) {
    activePointers.add(e.pointerId);
    if (activePointers.size > 1) { releasePress(); if (down) down.dragged = true; return; }
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, dragged: e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey };
    if (!down.dragged) {
      const id = hit(e); const node = id ? nodes.get(id) : undefined;
      if (node) { hover(id); if (!motion?.matches) { pressed = node; node.scale.setScalar(0.98); } dirty = true; }
    }
    renderer.domElement.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: PointerEvent) {
    if (down) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down.dragged = true; releasePress(); }
      hover(null); return;
    }
    if (e.pointerType !== 'touch') hover(hit(e));
  }
  function pointerUp(e: PointerEvent) {
    releasePress();
    activePointers.delete(e.pointerId);
    if (down?.id === e.pointerId) {
      if (!down.dragged && !activePointers.size) callbacks.select(hit(e));
      down = null;
    }
    if (renderer.domElement.hasPointerCapture(e.pointerId)) renderer.domElement.releasePointerCapture(e.pointerId);
  }
  function pointerCancel(e: PointerEvent) { releasePress(); activePointers.delete(e.pointerId); down = null; hover(null); }
  function pointerLeave() { hover(null); }
  function contextLost(e: Event) { e.preventDefault(); lost = true; cancelAnimationFrame(frame); callbacks.failure(); }
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', pointerCancel);
  renderer.domElement.addEventListener('pointerleave', pointerLeave);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);

  function update(floors: SceneFloor[], exploded: boolean, walls: boolean, accent = '#2ABDFF') {
    // Theme anchors come from the shared Theme options; halve sRGB channels for white-text contrast.
    const rgb = new THREE.Color(accent).getRGB(new THREE.Color(), THREE.SRGBColorSpace);
    selectionAccent = accent;
    selectionTint = `rgb(${Math.round((rgb.r * 0.08 + 0.92) * 255)}, ${Math.round((rgb.g * 0.08 + 0.92) * 255)}, ${Math.round((rgb.b * 0.08 + 0.92) * 255)})`;
    const bedLabelBackground = `rgb(${Math.round(rgb.r * 127.5)}, ${Math.round(rgb.g * 127.5)}, ${Math.round(rgb.b * 127.5)})`;
    releasePress(); clearHighlight(); disposeShell(hoverShell); hoverShell = null; animated = []; waterAnimations = []; scene.remove(world); resources.forEach(r => r.dispose()); resources = [];
    world = new THREE.Group(); scene.add(world); targets = []; nodes = new Map(); hover(null);
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1); resources.push(boxGeometry);
    const grain = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      const shade = 185 + Math.round(38 * Math.sin(x * 1.9 + Math.sin(y * 0.12)) + 14 * Math.sin(x * 7 + y * 0.15));
      grain[i] = grain[i + 1] = grain[i + 2] = shade; grain[i + 3] = 255;
    }
    const woodTexture = new THREE.DataTexture(grain, 64, 64);
    woodTexture.colorSpace = THREE.SRGBColorSpace; woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.needsUpdate = true; resources.push(woodTexture);
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    function material(color: string, opacity = 1) {
      const key = `${color}:${opacity}`;
      if (!materials.has(key)) {
        const m = (opacity < 1 ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, transmission: 0.72, thickness: 0.12, ior: 1.45, transparent: true, opacity, depthWrite: false }) : new THREE.MeshStandardMaterial({ color, roughness: 0.72 }));
        if (color === '#9b7656') { m.map = woodTexture; m.roughness = 0.62; }
        materials.set(key, m); resources.push(m);
      }
      return materials.get(key)!;
    }
    function box(parent: THREE.Group, size: number[], pos: number[], color: string, id?: string, opacity = 1) {
      const mesh = new THREE.Mesh(boxGeometry, material(color, opacity));
      mesh.castShadow = opacity === 1; mesh.receiveShadow = true;
      mesh.scale.set(size[0], size[1], size[2]); mesh.position.set(pos[0], pos[1], pos[2]); parent.add(mesh);
      if (id) { mesh.userData.unitId = id; targets.push(mesh); }
      return mesh;
    }
    function textile(color: string, dirty = false) {
      const key = `textile:${color}:${dirty}`;
      if (!materials.has(key)) {
        const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
        const pixels = new Uint8Array(64 * 64 * 4);
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
          const i = (y * 64 + x) * 4;
          const stripe = x % 16 < 4 || y % 16 < 4;
          const edge = x < 2 || y < 2 || x > 61 || y > 61;
          const weave = (x + y) % 2 ? 0.97 : 1;
          for (let c = 0; c < 3; c++) pixels[i + c] = (edge ? rgb[c] * (color === '#ffffff' ? 0.94 : 0.6) : stripe ? rgb[c] * 0.65 + 255 * 0.35 : rgb[c]) * weave;
          if (dirty) {
            const stain = ((x - 18) ** 2 / 80 + (y - 23) ** 2 / 42 < 1) || ((x - 44) ** 2 / 30 + (y - 48) ** 2 / 65 < 1);
            for (let c = 0; c < 3; c++) pixels[i + c] = pixels[i + c] * (stain ? 0.48 : 0.78) + [83, 67, 43][c] * (stain ? 0.38 : 0.12);
          }
          pixels[i + 3] = 255;
        }
        const texture = new THREE.DataTexture(pixels, 64, 64);
        texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
        const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88 });
        materials.set(key, mat); resources.push(texture, mat);
      }
      return materials.get(key)!;
    }
    function label(parent: THREE.Group, text: string, pos: number[], width: number, dark = false, background?: string, sign = false, unitId?: string) {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = sign ? 144 : 96;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      const height = canvas.height;
      if (sign) {
        // Dark LED display with a recessed screen and theme-colored dot-matrix lettering.
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#303743'; ctx.beginPath(); ctx.roundRect(8, 8, 496, 128, 20); ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.fillStyle = '#080e17'; ctx.beginPath(); ctx.roundRect(16, 16, 480, 112, 13); ctx.fill();
        const mask = document.createElement('canvas'); mask.width = 120; mask.height = 26;
        const ink = mask.getContext('2d');
        if (ink) {
          ink.fillStyle = '#ffffff'; ink.font = '700 20px monospace';
          ink.textAlign = 'center'; ink.textBaseline = 'middle'; ink.fillText(text, 60, 13, 110);
          const pixels = ink.getImageData(0, 0, 120, 26).data;
          for (const lit of [false, true]) {
            ctx.fillStyle = lit ? (background || accent) : '#17222e';
            ctx.shadowColor = lit ? (background || accent) : 'transparent'; ctx.shadowBlur = lit ? 3 : 0;
            ctx.beginPath();
            for (let y = 0; y < 26; y++) for (let x = 0; x < 120; x++) {
              if ((pixels[(y * 120 + x) * 4 + 3] > 90) !== lit) continue;
              const px = 18 + x * 4, py = 22 + y * 4;
              ctx.moveTo(px + 1.35, py); ctx.arc(px, py, 1.35, 0, Math.PI * 2);
            }
            ctx.fill();
          }
          ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
        }
      } else {
        ctx.fillStyle = background || (dark ? '#344057' : '#ffffff');
        ctx.beginPath(); ctx.roundRect(0, 0, 512, height, 22); ctx.fill();
        ctx.fillStyle = dark ? '#ffffff' : '#27374d'; ctx.font = '600 38px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, height / 2, 470);
      }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      if (sign) {
        // Screen-facing upright LED: anchored at the floor, readable from every orbit angle.
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
        resources.push(texture, material);
        const panel = new THREE.Sprite(material);
        panel.name = `floor-sign-${parent.name}`;
        panel.center.set(0.5, 0); panel.renderOrder = 20;
        panel.scale.set(width, width * height / 512, 1);
        panel.position.set(pos[0], pos[1], pos[2]); parent.add(panel);
        return;
      }
      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, toneMapped: false });
      resources.push(texture, mat);
      const sprite = new THREE.Sprite(mat); sprite.position.set(pos[0], pos[1], pos[2]); sprite.scale.set(width, width * height / 512, 1); parent.add(sprite);
      if (unitId) { sprite.userData.unitId = unitId; targets.push(sprite); }
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
        const occupied = bed.state.tone === 'occupied';
        const blanketColor = occupied ? (bed.blanketColor || '#7c3aed') : '#ffffff';
        const quilt = box(unitGroup, [bed.width - 0.04, occupied ? 0.08 : 0.1, bed.length * (occupied ? 0.66 : 0.42)], [0, y + 0.25, bed.length * (occupied ? 0.14 : 0.27)], blanketColor, bed.unit.room_id);
        quilt.material = textile(blanketColor, bed.dirty); quilt.name = `blanket-${bed.unit.room_id}-${bed.level}`;
        if (bed.dirty) {
          quilt.rotation.y = 0.09;
          for (let i = 0; i < 3; i++) {
            const fold = box(unitGroup, [bed.width * 0.75, 0.055, bed.length * 0.12], [(i % 2 ? 1 : -1) * bed.width * 0.06, y + 0.32 + i * 0.012, bed.length * (0.14 + i * 0.10)], blanketColor, bed.unit.room_id);
            fold.rotation.set(0.12 * (i - 1), (i - 1) * 0.12, 0.045);
            fold.material = textile(blanketColor, true); fold.name = `dirty-fold-${bed.unit.room_id}-${i}`;
          }
        }
        box(unitGroup, [bed.width + 0.08, 0.48, 0.075], [0, y + 0.18, -bed.length / 2], wood, bed.unit.room_id);
        box(unitGroup, [bed.width + 0.08, 0.2, 0.065], [0, y + 0.04, bed.length / 2], wood, bed.unit.room_id);
        // Operational status stays separate from the textile palette.
        box(unitGroup, [bed.width * 0.65, 0.035, 0.04], [0, y + 0.16, bed.length / 2 + 0.05], sceneStatusColor(bed.state), bed.unit.room_id);
        if (bed.dirty) box(unitGroup, [0.07, 0.035, 0.04], [bed.width * 0.4, y + 0.16, bed.length / 2 + 0.05], STATUS_PALETTE.dirty.accent, bed.unit.room_id);
        const pillows = bed.width >= 1.4 ? 2 : 1;
        for (let i = 0; i < pillows; i++) {
          const pillow = box(unitGroup, [bed.width / pillows * 0.72, 0.12, 0.36], [(i - (pillows - 1) / 2) * bed.width / pillows, y + 0.27, -bed.length * 0.33], bed.dirty ? '#c8bd9f' : '#ffffff', bed.unit.room_id);
          if (bed.dirty) { pillow.material = textile('#e8dfc9', true); pillow.rotation.y = i % 2 ? -0.16 : 0.16; }
        }
        if (bed.level > 1) box(unitGroup, [0.04, 0.13, bed.length * 0.72], [bed.width / 2, y + 0.4, -0.1], wood);
        for (const [index, gender] of (bed.sleepers || []).entries()) {
          const sleeper = new THREE.Group(); sleeper.name = `sleeper-${bed.unit.room_id}-${index}`;
          sleeper.userData.gender = gender;
          sleeper.position.set((index - ((bed.sleepers?.length || 1) - 1) / 2) * bed.width / 2, y + 0.23, 0);
          sleeper.scale.setScalar(Math.min(1, bed.length / 2)); unitGroup.add(sleeper);
          const skin = '#e7b493', hair = gender === 'female' ? '#744331' : '#38333c';
          const shirt = gender === 'female' ? '#c85c90' : gender === 'male' ? '#407ab5' : '#64887f';
          box(sleeper, [0.34, 0.28, 0.34], [0, 0.19, -bed.length * 0.32], hair);
          box(sleeper, [0.29, 0.025, 0.24], [0, 0.34, -bed.length * 0.30], skin);
          for (const dx of [-0.075, 0.075]) box(sleeper, [0.065, 0.012, 0.022], [dx, 0.36, -bed.length * 0.31], '#3c302d');
          box(sleeper, [0.055, 0.014, 0.02], [0, 0.36, -bed.length * 0.25], '#a76e5d');
          if (gender === 'female') for (const dx of [-0.19, 0.19]) box(sleeper, [0.08, 0.13, 0.36], [dx, 0.12, -bed.length * 0.3], hair);
          const chest = new THREE.Group(); chest.name = 'sleeper-chest'; sleeper.add(chest);
          box(chest, [0.39, 0.18, 0.52], [0, 0.18, -0.09], shirt);
          for (const dx of [-0.25, 0.25]) {
            box(chest, [0.12, 0.12, 0.39], [dx, 0.15, -0.1], shirt);
            box(chest, [0.12, 0.1, 0.12], [dx, 0.14, 0.14], skin);
            box(sleeper, [0.18, 0.14, 0.53], [dx * 0.43, 0.13, 0.45], '#34495e');
          }
          const cover = box(chest, [0.46, 0.08, 0.65], [0, 0.24, 0.42], blanketColor); cover.material = textile(blanketColor, bed.dirty);
          animated.push({ node: chest, base: 0, phase: index + bed.level, amplitude: 0.012 });
        }
        box(unitGroup, [bed.width - 0.03, 0.025, 0.12], [0, y + 0.3, -bed.length * (occupied ? 0.17 : -0.05)], '#e1e7ee');
        label(unitGroup, bed.label || bed.unit.code, [0, y + 0.43, bed.length / 2 + 0.08], Math.max(0.75, bed.width), true, bedLabelBackground, false, bed.unit.room_id);
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
      const waterGeometry = new THREE.PlaneGeometry(1.8, 1.8, 24, 24);
      waterGeometry.rotateX(-Math.PI / 2);
      const waterMaterial = new THREE.MeshPhysicalMaterial({ color: '#21bcd5', roughness: 0.2, metalness: 0.08, transmission: 0.35, thickness: 0.22, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
      resources.push(waterGeometry, waterMaterial);
      const water = new THREE.Mesh(waterGeometry, waterMaterial);
      water.name = 'jacuzzi-water'; water.position.y = 0.64; water.userData.unitId = id;
      tub.add(water); targets.push(water);
      const waveHeight = (x: number, z: number, time: number) =>
        Math.sin(x * 7 + time * 2.6) * 0.028 + Math.cos(z * 8 - time * 2.1) * 0.021 + Math.sin((x + z) * 11 - time * 3) * 0.012;
      const ripples: { mesh: THREE.Mesh; phase: number }[] = [];
      const ringGeometry = new THREE.RingGeometry(0.075, 0.09, 24); ringGeometry.rotateX(-Math.PI / 2); resources.push(ringGeometry);
      for (const [index, point] of [[-0.55, -0.5], [0.5, -0.45], [-0.45, 0.45], [0.5, 0.5]].entries()) {
        const foamMaterial = new THREE.MeshBasicMaterial({ color: '#e1fbff', transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }); resources.push(foamMaterial);
        const mesh = new THREE.Mesh(ringGeometry, foamMaterial); mesh.name = 'jacuzzi-ripple';
        mesh.position.set(point[0], 0.66, point[1]); tub.add(mesh); ripples.push({ mesh, phase: index * 0.23 });
      }
      const animateWater = (time: number) => {
        const positions = waterGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) positions.setY(i, waveHeight(positions.getX(i), positions.getZ(i), time));
        positions.needsUpdate = true; waterGeometry.computeVertexNormals();
        for (const { mesh, phase } of ripples) {
          const cycle = (time * 0.55 + phase) % 1;
          mesh.scale.setScalar(0.55 + cycle * 2.2);
          mesh.position.y = 0.658 + waveHeight(mesh.position.x, mesh.position.z, time);
          (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.8;
        }
      };
      animateWater(0); waterAnimations.push(animateWater);
      for (const x of [-0.7, 0.7]) box(tub, [0.38, 0.1, 0.24], [x, 0.9, -0.95], '#344057', id);
      box(tub, [0.08, 0.22, 0.18], [0, 0.95, -0.94], '#cbd6df', id);
      box(tub, [1.1, 0.2, 0.45], [0, 0.1, 1.4], '#62748a', id);
      box(tub, [1.1, 0.4, 0.3], [0, 0.2, 1.13], '#62748a', id);
      label(tub, 'Jakuzi', [0, 0.45, 1.55], 1.4);
    }
    function roomModel(parent: THREE.Group, room: SceneRoom) {
      const group = new THREE.Group(); group.position.set(room.x, 0, room.z); parent.add(group); nodes.set(room.unit.room_id, group);
      const w = room.width, d = room.depth;
      const floorColor = room.floorColor || '#d9c6a5';
      const slab = box(group, [w - 0.04, 0.08, d - 0.04], [0, 0.06, 0], floorColor, room.unit.room_id); slab.name = `room-floor-${room.unit.room_id}`;
      // Fine staggered parquet seams, bounded to keep large room meshes inexpensive.
      const plankRows = Math.min(18, Math.ceil(d / 0.42));
      for (let row = 1; row < plankRows; row++) box(group, [w - 0.1, 0.003, 0.012], [0, 0.102, -d / 2 + row * d / plankRows], '#a7a59a');
      for (let row = 0; row < plankRows; row++) for (let col = 1; col < 4; col++) {
        const x = -w / 2 + (col - (row % 2) * 0.4) * w / 4;
        box(group, [0.009, 0.003, d / plankRows - 0.02], [x, 0.102, -d / 2 + (row + 0.5) * d / plankRows], '#a7a59a');
      }
      box(group, [w - 0.12, 0.025, 0.10], [0, 0.115, d / 2 - 0.1], sceneStatusColor(room.state));
      if (walls) {
        box(group, [w, 1.05, 0.08], [0, 0.6, -d / 2], '#c1cddd', undefined, 0.4);
        box(group, [0.08, 1.05, d], [-w / 2, 0.6, 0], '#c1cddd', undefined, 0.32);
        box(group, [0.08, 1.05, d], [w / 2, 0.6, 0], '#c1cddd', undefined, 0.32);
        box(group, [w, 0.04, 0.1], [0, 1.14, -d / 2], '#f5f8fa');
        for (const x of [-w / 2, w / 2]) {
          box(group, [0.1, 0.04, d], [x, 1.14, 0], '#f5f8fa');
          box(group, [0.1, 0.14, d], [x, 0.18, 0], '#8e9ba8');
        }
        // Framed back glazing: clear panes, dark mullions and polished sill.
        const windowWidth = w * 0.62;
        box(group, [windowWidth, 0.68, 0.035], [0, 0.72, -d / 2 - 0.045], '#bde5f3', undefined, 0.3);
        for (const x of [-windowWidth / 2, 0, windowWidth / 2]) box(group, [0.045, 0.74, 0.09], [x, 0.72, -d / 2 - 0.05], '#637989');
        for (const y of [0.35, 1.09]) box(group, [windowWidth + 0.1, 0.045, 0.12], [0, y, -d / 2 - 0.05], '#637989');
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
      const group = new THREE.Group(); group.name = floor.id; group.position.y = elevation; world.add(group);
      box(group, [floor.width, 0.2, floor.depth], [0, -0.1, 0], '#697888');
      label(group, floor.label, [0, 0.012, floor.depth / 2 + 0.85], Math.min(3.2, floor.width * 0.7), true, accent, true);
      floor.rooms.forEach(room => roomModel(group, room));
      elevation += floor.storyHeight + (exploded ? 3 : 0);
    }
    world.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(world);
    if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-4, 0, -3), new THREE.Vector3(4, 2, 3));
    const shadowExtent = Math.max(10, bounds.getSize(new THREE.Vector3()).length());
    light.position.set(shadowExtent, shadowExtent * 1.5, shadowExtent);
    light.shadow.camera.left = light.shadow.camera.bottom = -shadowExtent;
    light.shadow.camera.right = light.shadow.camera.top = shadowExtent;
    light.shadow.camera.far = shadowExtent * 5; light.shadow.camera.updateProjectionMatrix();
    center = bounds.getCenter(new THREE.Vector3()); radius = Math.max(2, bounds.getSize(new THREE.Vector3()).length() / 2);
    const signature = floors.map(f => `${f.id}:${f.width}:${f.depth}:${f.storyHeight}:${f.rooms.map(r => `${r.unit.room_id}:${r.x}:${r.z}`).join(',')}`).join('|') + exploded;
    if (signature !== layoutSignature) { layoutSignature = signature; fit(); }
    select(selectedId); dirty = true;
  }
  return {
    update, select,
    focus(id: string) {
      const node = nodes.get(id); if (!node) return;
      releasePress(); node.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(node);
      if (box.isEmpty()) return;
      const target = box.getCenter(new THREE.Vector3());
      const halfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
      const limitingAngle = Math.min(halfAngle, Math.atan(Math.tan(halfAngle) * camera.aspect));
      const distance = Math.max(2.5, box.getSize(new THREE.Vector3()).length() / 2 / Math.sin(limitingAngle) * 1.3);
      const direction = camera.position.clone().sub(controls.target).normalize();
      if (!direction.lengthSq()) direction.set(1, 0.95, 1.25).normalize();
      controls.target.copy(target); camera.position.copy(target).addScaledVector(direction, distance);
      controls.update(); select(id); dirty = true;
    },
    setPanMode(enabled: boolean) {
      panMode = enabled; releasePress(); down = null; hover(null);
      controls.mouseButtons.LEFT = enabled ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      controls.touches.ONE = enabled ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
      dirty = true;
    },
    action(action: CameraAction) {
      if (action === 'reset' || action === 'top' || action === 'front') { fit(action === 'top', action === 'front'); return; }
      if (action.startsWith('pan-')) {
        camera.updateMatrixWorld();
        const vertical = action === 'pan-up' || action === 'pan-down';
        const direction = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, vertical ? 1 : 0);
        const distance = camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.24;
        direction.multiplyScalar(distance * (action === 'pan-left' || action === 'pan-down' ? -1 : 1));
        camera.position.add(direction); controls.target.add(direction);
        controls.update(); dirty = true; return;
      }
      const offset = camera.position.clone().sub(controls.target);
      if (action === 'left' || action === 'right') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), (action === 'left' ? 1 : -1) * Math.PI / 4);
      else offset.multiplyScalar(action === 'in' ? 0.8 : 1.25).clampLength(controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset); controls.update(); dirty = true;
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); releasePress(); clearHighlight(); disposeShell(hoverShell); animated = []; waterAnimations = [];
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', pointerCancel);
      renderer.domElement.removeEventListener('pointerleave', pointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      resources.forEach(r => r.dispose()); light.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
