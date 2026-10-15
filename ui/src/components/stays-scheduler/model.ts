import { BookingStatus as BookingState } from '../../lib/statuses.generated';
import { bookingIntervals, type APIRoom, type Booking, type Floor } from "../../lib/api";

export const DAY = 86_400_000;
export const TIME_ZONE = "Europe/Istanbul";
export function dayOf(instant: string): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export const dayTime = (day: string) => Date.parse(`${day}T00:00:00+03:00`);
export const shiftDay = (day: string, count: number) => dayOf(new Date(dayTime(day) + count * DAY).toISOString());
export type Segment = { id: string; booking: Booking; roomId: string; start: number; end: number };
export function segmentsFor(bookings: Booking[], now: string): Segment[] {
  return bookings.filter(b => b.status !== BookingState.Cancelled).flatMap(b =>
    bookingIntervals(b, now).map((s, i) => ({ ...s, id: `${b.booking_id}:${i}`, booking: b })),
  );
}
export function layoutSegments(segments: Segment[], start: number, end: number, minimumCardPercent = 0) {
  const lanes: number[] = [];
  return segments.filter(s => s.start < end && s.end > start)
    .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id)).map(segment => {
      const from = Math.max(start, segment.start), to = Math.min(end, segment.end);
      const left = (from - start) / (end - start) * 100, width = (to - from) / (end - start) * 100;
      // Short stays still need a readable guest label. Pack the visual cards,
      // while retaining the exact interval separately for the duration marker.
      const cardWidth = Math.min(100, Math.max(width, minimumCardPercent));
      const cardLeft = Math.min(left, 100 - cardWidth);
      let lane = lanes.findIndex(finish => finish <= cardLeft);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = cardLeft + cardWidth;
      return { segment, lane, left, width, cardLeft, cardWidth, continuesBefore: segment.start < start, continuesAfter: segment.end > end };
    });
}
export function monthBands(days: string[]) {
  const bands: { month: string; start: number; count: number }[] = [];
  days.forEach((day, i) => {
    const month = day.slice(0, 7), last = bands.at(-1);
    if (last?.month === month) last.count++;
    else bands.push({ month, start: i, count: 1 });
  });
  return bands;
}
export function resourceGroups(rooms: APIRoom[], floors: Floor[]) {
  const byId = new Map(rooms.map(room => [room.room_id, room]));
  const location = (room: APIRoom) => {
    let floorId = room.floor_id, depth = 0, parent = room.parent_id;
    const visited = new Set([room.room_id]);
    const path = [room.code];
    while (parent && !visited.has(parent)) {
      visited.add(parent);
      const ancestor = byId.get(parent);
      if (!ancestor) break;
      floorId ||= ancestor.floor_id;
      path.unshift(ancestor.code); depth++; parent = ancestor.parent_id;
    }
    return { floorId, depth, path: path.join("\u0000") };
  };
  const order = [...floors].sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code, "tr", { numeric: true }));
  const groups = order.map(floor => ({ id: floor.floor_id, floor: floor as Floor | undefined, rooms: [] as { room: APIRoom; depth: number; path: string }[] }));
  const unassigned = { id: "unassigned", floor: undefined, rooms: [] as { room: APIRoom; depth: number; path: string }[] };
  groups.push(unassigned);
  for (const room of rooms) {
    const { floorId, depth, path } = location(room);
    (groups.find(g => g.id === floorId) || unassigned).rooms.push({ room, depth, path });
  }
  for (const group of groups) group.rooms.sort((a, b) => a.path.localeCompare(b.path, "tr", { numeric: true }) || a.room.room_id.localeCompare(b.room.room_id));
  return groups.filter(g => g.rooms.length);
}
