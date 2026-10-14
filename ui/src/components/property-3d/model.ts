import { localized, type APIRoom, type Snapshot } from '../../lib/api';
import { roomHasJacuzzi } from './room-fixtures';
import type { Bed } from '../../lib/bed-presets';
import { roomBoardState, type RoomBoardState } from '../../lib/room-board';

export type SceneUnit = { unit: APIRoom; state: RoomBoardState };
export type SceneBed = SceneUnit & {
  group: string; level: number; width: number; length: number; visualOnly?: boolean; label?: string;
};
export type SceneRoom = SceneUnit & {
  floorId: string; beds: SceneBed[]; hasJacuzzi: boolean;
  x: number; z: number; width: number; depth: number;
};
export type SceneFloor = {
  id: string; label: string; rooms: SceneRoom[]; automatic: boolean;
  width: number; depth: number; storyHeight: number;
};
export const STATUS_COLORS: Record<RoomBoardState['tone'], string> = {
  occupied: '#369276', reserved: '#6686d5', available: '#8eabc1', warning: '#dc9b46', neutral: '#9c9da5',
};
export const STATUS_LABELS: Record<RoomBoardState['tone'], string> = {
  occupied: 'Konaklayan var', reserved: 'Rezervasyon var', available: 'Boş', warning: 'Temizlik / bakım', neutral: 'Pasif / diğer',
};
const compare = (a: APIRoom, b: APIRoom) => a.code.localeCompare(b.code, 'tr', { numeric: true }) || a.room_id.localeCompare(b.room_id);
const positive = (n: number, fallback: number) => Number.isFinite(n) && n > 0 ? n : fallback;

/** Uses only tenant-scoped API records. No demo rooms, guests or invented beds. */
export function buildPropertyScene(snapshot: Snapshot, physicalBeds: Bed[], day = ''): SceneFloor[] {
  const units = snapshot.rooms.filter(r => r.branch_id === snapshot.branch_id).sort(compare);
  const byId = new Map(units.map(r => [r.room_id, r]));
  const children = new Map<string, APIRoom[]>();
  for (const unit of units) {
    if (unit.parent_id && byId.has(unit.parent_id)) children.set(unit.parent_id, [...(children.get(unit.parent_id) || []), unit]);
  }
  function ancestors(unit: APIRoom) {
    const result: APIRoom[] = [], seen = new Set([unit.room_id]);
    let current = unit;
    while (current.parent_id && byId.has(current.parent_id) && !seen.has(current.parent_id)) {
      current = byId.get(current.parent_id)!;
      seen.add(current.room_id); result.push(current);
    }
    return result;
  }
  const floorDefs = snapshot.floors.filter(f => f.branch_id === snapshot.branch_id)
    .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code, 'tr', { numeric: true }) || a.floor_id.localeCompare(b.floor_id));
  const validFloors = new Set(floorDefs.map(f => f.floor_id));
  const metadata = new Map<string, { bed: Bed; place: Bed['places'][number] }>();
  for (const bed of physicalBeds) {
    if (bed.branch_id !== snapshot.branch_id) continue;
    for (const place of bed.places) if (place.unit_id) metadata.set(place.unit_id, { bed, place });
  }
  const state = new Map(units.map(unit => [unit.room_id, roomBoardState(units, snapshot.bookings, unit, snapshot.server_time, day)]));
  const renderRooms = units.filter(r => r.kind !== 'bed' && !(children.get(r.room_id) || []).some(c => c.kind !== 'bed'));
  const roomIds = new Set(renderRooms.map(r => r.room_id));
  const bedsByRoom = new Map<string, APIRoom[]>();
  const standaloneGroups = new Map<string, string>();
  for (const unit of units.filter(r => r.kind === 'bed')) {
    const owner = ancestors(unit).find(parent => roomIds.has(parent.room_id));
    // Standalone beds remain visible even when they have no room or floor.
    const standaloneKey = `${unit.floor_id || ''}:${metadata.get(unit.room_id)?.bed.bed_id || unit.bed_group || unit.room_id}`;
    const ownerId = owner?.room_id || standaloneGroups.get(standaloneKey) || unit.room_id;
    if (!owner && !standaloneGroups.has(standaloneKey)) {
      renderRooms.push(unit); roomIds.add(unit.room_id); standaloneGroups.set(standaloneKey, unit.room_id);
    }
    bedsByRoom.set(ownerId, [...(bedsByRoom.get(ownerId) || []), unit]);
  }
  const rooms = renderRooms.map(unit => {
    const floorId = [unit, ...ancestors(unit)].map(u => u.floor_id).find(id => id && validFloors.has(id)) || 'unassigned';
    const beds: SceneBed[] = (bedsByRoom.get(unit.room_id) || []).map(b => {
      const meta = metadata.get(b.room_id);
      return {
        unit: b, state: state.get(b.room_id)!,
        group: meta?.bed.bed_id || b.bed_group || b.room_id,
        level: Math.min(10, Math.max(1, meta?.place.level || b.bed_level || 1)),
        width: positive(meta?.place.width_cm || meta?.bed.width_cm || 0, b.capacity > 1 ? 160 : 90) / 100,
        length: positive(meta?.place.length_cm || meta?.bed.length_cm || 0, 200) / 100,
      };
    });
    // Older rooms may describe a bed layout without separate rentable units.
    // Render that explicit layout while keeping selection and capacity on the room.
    if (!beds.length && unit.kind !== 'bed' && ['single', 'double', 'twin'].includes(unit.bed_layout || '')) {
      const count = unit.bed_layout === 'twin' ? 2 : 1;
      for (let i = 0; i < count; i++) beds.push({
        unit, state: state.get(unit.room_id)!, group: `layout:${unit.room_id}:${i}`, level: 1,
        width: unit.bed_layout === 'double' ? 1.6 : 0.9, length: 2, visualOnly: true,
        label: unit.bed_layout === 'double' ? 'Çift kişilik yatak' : `Tek kişilik yatak${count > 1 ? ` ${i + 1}` : ''}`,
      });
    }
    return { unit, state: state.get(unit.room_id)!, floorId, beds, hasJacuzzi: unit.kind !== 'bed' && roomHasJacuzzi(unit, snapshot.feature_registry), x: 0, z: 0, width: 6, depth: 5 };
  });
  const definitions = floorDefs.map(f => ({ id: f.floor_id, label: localized(f.label) || f.code }));
  if (rooms.some(r => r.floorId === 'unassigned')) definitions.push({ id: 'unassigned', label: 'Kat atanmamış birimler' });
  return definitions.map(def => {
    const list = rooms.filter(r => r.floorId === def.id).sort((a, b) => compare(a.unit, b.unit));
    const positions = list.map(r => r.unit.position);
    const valid = positions.every(p => p && [p.x, p.y, p.width, p.height].every(Number.isFinite) && p.width > 0 && p.height > 0);
    const overlap = valid && positions.some((p, i) => positions.slice(i + 1).some(q => p.x < q.x + q.width && p.x + p.width > q.x && p.y < q.y + q.height && p.y + p.height > q.y));
    const automatic = !valid || !!overlap || def.id === 'unassigned';
    let width = 8, depth = 6;
    if (list.length && !automatic) {
      const scale = [...positions.map(p => p.width)].sort((a, b) => a - b)[Math.floor(positions.length / 2)] / 6;
      const minX = Math.min(...positions.map(p => p.x)), minZ = Math.min(...positions.map(p => p.y));
      width = Math.max(...positions.map(p => p.x + p.width)) - minX;
      depth = Math.max(...positions.map(p => p.y + p.height)) - minZ;
      list.forEach((room, i) => {
        const p = positions[i];
        room.width = p.width / scale; room.depth = p.height / scale;
        room.x = (p.x - minX + p.width / 2 - width / 2) / scale;
        room.z = (p.y - minZ + p.height / 2 - depth / 2) / scale;
      });
      width = width / scale + 0.6; depth = depth / scale + 0.6;
    } else if (list.length) {
      const cols = Math.ceil(Math.sqrt(list.length));
      const cellWidth = Math.max(6, ...list.map(r => Math.ceil(Math.sqrt(new Set(r.beds.map(b => b.group)).size)) * 2.4 + 1));
      const cellDepth = Math.max(5, ...list.map(r => Math.ceil(Math.sqrt(new Set(r.beds.map(b => b.group)).size)) * 3 + 1));
      const rows = Math.ceil(list.length / cols);
      width = cols * (cellWidth + 0.5) + 0.5; depth = rows * (cellDepth + 1.2) + 0.5;
      list.forEach((room, i) => {
        room.width = cellWidth; room.depth = cellDepth;
        room.x = (i % cols) * (cellWidth + 0.5) + cellWidth / 2 - width / 2 + 0.5;
        room.z = Math.floor(i / cols) * (cellDepth + 1.2) + cellDepth / 2 - depth / 2 + 0.5;
      });
    }
    const maxLevel = Math.max(1, ...list.flatMap(r => r.beds.map(b => b.level)));
    return { ...def, rooms: list, automatic, width, depth, storyHeight: Math.max(3.2, maxLevel * 1.35 + 0.7) };
  });
}

export function visibleScene(floors: SceneFloor[], floorId: string, query: string, tone: string): SceneFloor[] {
  const q = query.trim().toLocaleLowerCase('tr');
  return floors.filter(f => floorId === 'all' || f.id === floorId).map(floor => ({ ...floor, rooms: floor.rooms.filter(room => {
    const entries: SceneUnit[] = [room, ...room.beds];
    const matchesText = !q || entries.some(({ unit, state }) => `${unit.code} ${unit.name} ${state.bookings.map(b => b.guest_name).join(' ')}`.toLocaleLowerCase('tr').includes(q));
    return matchesText && (tone === 'all' || entries.some(e => e.state.tone === tone));
  }) }));
}
