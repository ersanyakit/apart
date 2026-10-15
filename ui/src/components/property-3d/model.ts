import { BookingStatus as BookingState } from '../../lib/statuses.generated';
import { RoomStatus as RoomState } from '../../lib/statuses.generated';
import { STATUS_PALETTE, boardStatusKey } from "../../lib/status-palette";
import { localized, type APIRoom, type Snapshot } from '../../lib/api';
import { roomHasJacuzzi } from './room-fixtures';
import type { Bed } from '../../lib/bed-presets';
import { roomBoardState, type RoomBoardState } from '../../lib/room-board';

export type SceneUnit = { unit: APIRoom; state: RoomBoardState };
export type SceneBed = SceneUnit & {
  blanketColor?: string; dirty?: boolean;
  sleepers?: ('female' | 'male' | 'neutral')[];
  group: string; level: number; width: number; length: number; visualOnly?: boolean; label?: string;
};
export type SceneRoom = SceneUnit & {
  floorId: string; floorColor?: string; beds: SceneBed[]; hasJacuzzi: boolean;
  x: number; z: number; width: number; depth: number;
};
export type SceneFloor = {
  id: string; label: string; rooms: SceneRoom[]; automatic: boolean;
  width: number; depth: number; storyHeight: number;
};
export const STATUS_COLORS: Record<RoomBoardState['tone'], string> = {
  occupied: STATUS_PALETTE.occupied.accent, reserved: STATUS_PALETTE.reserved.accent, available: STATUS_PALETTE.available.accent, warning: STATUS_PALETTE.dirty.accent, neutral: STATUS_PALETTE.completed.accent,
};
export const STATUS_LABELS: Record<RoomBoardState['tone'], string> = {
  occupied: 'Konaklayan var', reserved: 'Rezervasyon var', available: 'Boş', warning: 'Temizlik / bakım', neutral: 'Pasif / diğer',
};
const compare = (a: APIRoom, b: APIRoom) => a.code.localeCompare(b.code, 'tr', { numeric: true }) || a.room_id.localeCompare(b.room_id);
const positive = (n: number, fallback: number) => Number.isFinite(n) && n > 0 ? n : fallback;

/** Remove only empty strips between rooms, preserving room sizes and ordering.
 * This is a display transform: API floor-plan coordinates are never modified. */
function compactRoomGaps(rooms: SceneRoom[], axis: 'x' | 'z', size: 'width' | 'depth', maxGap: number) {
  const spans = rooms.map(room => ({ start: room[axis] - room[size] / 2, end: room[axis] + room[size] / 2 }))
    .sort((a, b) => a.start - b.start);
  const gaps: { end: number; removed: number }[] = [];
  let end = spans[0]?.end ?? 0;
  for (const span of spans.slice(1)) {
    if (span.start - end > maxGap) gaps.push({ end: span.start, removed: span.start - end - maxGap });
    end = Math.max(end, span.end);
  }
  for (const room of rooms) {
    const start = room[axis] - room[size] / 2;
    room[axis] -= gaps.reduce((sum, gap) => sum + (start >= gap.end - 1e-8 ? gap.removed : 0), 0);
  }
  const min = Math.min(...rooms.map(r => r[axis] - r[size] / 2));
  const max = Math.max(...rooms.map(r => r[axis] + r[size] / 2));
  for (const room of rooms) room[axis] -= (min + max) / 2;
  return max - min;
}

/** Uses only tenant-scoped API records. No demo rooms, guests or invented beds. */
export function buildPropertyScene(snapshot: Snapshot, physicalBeds: Bed[], day = '', language = 'TR'): SceneFloor[] {
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
  const rooms: SceneRoom[] = renderRooms.map(unit => {
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
    // Room-level guests are distributed once, rather than repeated on every bed.
    const textiles = ['#2563eb', '#ec4899', '#7c3aed', '#0891b2', '#16a34a', '#f97316', '#a855f7', '#0284c7'];
    const roomSeed = Array.from(unit.code).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    beds.forEach((bed, index) => { bed.blanketColor = textiles[(roomSeed + index) % textiles.length]; });
    const allocated = new Map<string, number>();
    for (const bed of beds) {
      bed.dirty = [bed.unit, ...ancestors(bed.unit)].some(unit => unit.status === RoomState.Dirty);
      if (bed.dirty) {
        const inUse = bed.state.tone === 'occupied' || bed.state.tone === 'reserved';
        bed.state = { ...bed.state, tone: inUse ? bed.state.tone : 'warning', label: inUse ? `${bed.state.label} · Temizlik gerekli` : 'Kirli · Temizlik gerekli' };
      }
      bed.sleepers = [];
      for (const booking of bed.state.current.filter(b => b.status === BookingState.CheckedIn)) {
        const offset = allocated.get(booking.booking_id) || 0;
        const count = Math.min(bed.width >= 1.4 ? 2 : 1, Math.max(0, booking.guest_count - offset));
        for (let i = 0; i < count; i++) {
          const gender = booking.guests?.[offset + i]?.gender;
          bed.sleepers.push(gender === 'female' || gender === 'male' ? gender : 'neutral');
        }
        allocated.set(booking.booking_id, offset + count);
      }
    }
    return { unit, state: state.get(unit.room_id)!, floorId, beds, hasJacuzzi: unit.kind !== 'bed' && roomHasJacuzzi(unit, snapshot.feature_registry), x: 0, z: 0, width: 6, depth: 5 };
  });
  const definitions = floorDefs.map(f => ({ id: f.floor_id, label: localized(f.label,language.toUpperCase()) || f.code }));
  if (rooms.some(r => r.floorId === 'unassigned')) definitions.push({ id: 'unassigned', label: 'Kat atanmamış birimler' });
  return definitions.map(def => {
    const list = rooms.filter(r => r.floorId === def.id).sort((a, b) => compare(a.unit, b.unit));
    const palette = ['#d9c6a5', '#c2d4cd', '#c4cedf', '#d8c5d4', '#d9d0b4', '#bcd3d8'];
    list.forEach((room, index) => { room.floorColor = palette[index % palette.length]; });
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
      width = compactRoomGaps(list, 'x', 'width', 0.35) + 0.4;
      depth = compactRoomGaps(list, 'z', 'depth', 0.2) + 0.4;
    } else if (list.length) {
      const cols = Math.ceil(Math.sqrt(list.length));
      const cellWidth = Math.max(6, ...list.map(r => Math.ceil(Math.sqrt(new Set(r.beds.map(b => b.group)).size)) * 2.4 + 1));
      const cellDepth = Math.max(5, ...list.map(r => Math.ceil(Math.sqrt(new Set(r.beds.map(b => b.group)).size)) * 3 + 1));
      const rows = Math.ceil(list.length / cols);
      const columnGap = 0.18, rowGap = 0.2, padding = 0.2;
      width = cols * cellWidth + (cols - 1) * columnGap + padding * 2;
      depth = rows * cellDepth + (rows - 1) * rowGap + padding * 2;
      list.forEach((room, i) => {
        room.width = cellWidth; room.depth = cellDepth;
        room.x = (i % cols) * (cellWidth + columnGap) + cellWidth / 2 - width / 2 + padding;
        room.z = Math.floor(i / cols) * (cellDepth + rowGap) + cellDepth / 2 - depth / 2 + padding;
      });
    }
    const maxLevel = Math.max(1, ...list.flatMap(r => r.beds.map(b => b.level)));
    return { ...def, rooms: list, automatic, width, depth, storyHeight: Math.max(3.2, maxLevel * 1.35 + 0.7) };
  });
}

function hasEmptyPhysicalBed(room: SceneRoom, bed: SceneBed): boolean {
  // A whole-room reservation blocks sales, but must not hide every physical bunk.
  // Keep its reservation state intact: visibility does not make it separately bookable.
  return !bed.visualOnly && bed.unit.kind === 'bed' && !bed.unit.rentable &&
    room.unit.rentable && room.unit.rental_mode === 'room' &&
    (bed.sleepers?.length ?? 0) === 0 &&
    bed.state.bookings.every(booking => booking.room_id !== bed.unit.room_id &&
      !booking.allocations?.some(allocation => allocation.room_id === bed.unit.room_id));
}

export function visibleScene(floors: SceneFloor[], floorId: string, query: string, tone: string, onlyAvailableBeds = false): SceneFloor[] {
  const q = query.trim().toLocaleLowerCase('tr');
  return floors.filter(f => floorId === 'all' || f.id === floorId).map(floor => ({ ...floor, rooms: floor.rooms.filter(room => {
    const entries: SceneUnit[] = [room, ...room.beds];
    const matchesText = !q || entries.some(({ unit, state }) => `${unit.code} ${unit.name} ${state.bookings.map(b => b.guest_name).join(' ')}`.toLocaleLowerCase('tr').includes(q));
    return matchesText && (tone === 'all' || entries.some(e => e.state.tone === tone));
  }).map(room => onlyAvailableBeds ? { ...room, beds: room.beds.filter(bed =>
    (bed.state.tone === 'available' || hasEmptyPhysicalBed(room, bed)) && !bed.dirty && !bed.unit.inactive && !room.unit.inactive &&
    ![RoomState.Dirty, RoomState.OutOfOrder, RoomState.Maintenance].some(status=>status===room.unit.status) &&
    ![RoomState.Dirty, RoomState.OutOfOrder, RoomState.Maintenance].some(status=>status===bed.unit.status)
  ) } : room).filter(room => !onlyAvailableBeds || room.beds.length > 0) }));
}


/** Resolve a physical bed to the actual sellable unit, honoring whole-room sales. */
export function sceneBookingTarget(snapshot: Snapshot, unitId: string): APIRoom | undefined {
  const units = snapshot.rooms.filter(room => room.branch_id === snapshot.branch_id);
  const byId = new Map(units.map(room => [room.room_id, room]));
  const visited = new Set<string>();
  let unit = byId.get(unitId), target: APIRoom | undefined;
  while (unit) {
    if (visited.has(unit.room_id)) return;
    visited.add(unit.room_id);
    if (unit.inactive || [RoomState.OutOfOrder, RoomState.Maintenance].some(status=>status===unit?.status)) return;
    if (!target && unit.rentable) target = unit;
    unit = unit.parent_id ? byId.get(unit.parent_id) : undefined;
  }
  return target; // Existing stays do not prevent creating a reservation for future dates.
}

export const sceneStatusColor = (state: RoomBoardState) => STATUS_PALETTE[boardStatusKey(state)].accent;
