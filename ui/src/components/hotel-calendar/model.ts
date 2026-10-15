import { BookingStatus as BookingState } from '../../lib/statuses.generated';
import type { APIRoom, Booking } from "../../lib/api";

export type CalendarView = "day" | "week" | "month";
export type StayEvent = { id: string; booking: Booking; roomId: string; roomCode: string; start: Date; end: Date };
export const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const addDays = (date: Date, count: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export function weekStart(date: Date) { return addDays(date, -((date.getDay()+6)%7)); }
export function viewRange(date: Date, view: CalendarView) {
  if (view === "day") return { start: dayStart(date), end: addDays(date, 1) };
  if (view === "week") { const start = weekStart(date); return { start, end: addDays(start, 7) }; }
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  return { start, end: new Date(date.getFullYear(), date.getMonth()+1, 1) };
}
export function shiftDate(date: Date, view: CalendarView, step: number) {
  return view === "month" ? new Date(date.getFullYear(), date.getMonth()+step, 1) : addDays(date, step*(view === "week" ? 7 : 1));
}
export const overlaps = (event: StayEvent, start: Date, end: Date) => event.start < end && event.end > start;
export function stayEvents(bookings: Booking[], rooms: APIRoom[], now = new Date()): StayEvent[] {
  const codes = new Map(rooms.map(room => [room.room_id, room.code]));
  return bookings.flatMap(booking => {
    const segments = booking.allocations?.length ? booking.allocations : [{ allocation_id: booking.booking_id, room_id: booking.room_id, start: booking.check_in, end: booking.check_out }];
    return segments.flatMap(segment => {
      let start = new Date(segment.start), end = new Date(segment.end);
      if (booking.actual_check_in) start = new Date(Math.max(+start, +new Date(booking.actual_check_in)));
      if (booking.actual_check_out) end = new Date(Math.min(+end, +new Date(booking.actual_check_out)));
      // A guest who has not checked out still occupies the current room today.
      if (booking.status === BookingState.CheckedIn && segment.room_id === booking.room_id && +end === +new Date(booking.check_out) && end < now) end = new Date(+now+60000);
      if (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= start) return [];
      return [{ id: segment.allocation_id, booking, roomId: segment.room_id, roomCode: codes.get(segment.room_id) ?? "Arşiv birimi", start, end }];
    });
  });
}
export function weekLayout(events: StayEvent[], start: Date) {
  const end = addDays(start,7);
  const lanes: number[] = [];
  const items = events.filter(event => overlaps(event,start,end)).map(event => {
    let from = 0, to = 7;
    while(from < 7 && addDays(start,from+1) <= event.start) from++;
    while(to > 0 && addDays(start,to-1) >= event.end) to--;
    return { event, from, to };
  }).sort((a,b) => a.from-b.from || b.to-a.to || a.event.id.localeCompare(b.event.id));
  return items.map(item => {
    let lane = lanes.findIndex(end => end <= item.from);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = item.to;
    return { ...item, lane };
  });
}
export function timelineLayout(events: StayEvent[], start: Date, end: Date) {
  const lanes: number[] = [];
  return events.filter(event => overlaps(event,start,end)).sort((a,b) => +a.start-+b.start || a.id.localeCompare(b.id)).map(event => {
    const from = Math.max(+start,+event.start), to = Math.min(+end,+event.end);
    let lane = lanes.findIndex(end => end <= from);
    if(lane < 0) lane=lanes.length;
    lanes[lane]=to;
    return { event, lane, left: (from-+start)/(+end-+start)*100, width: (to-from)/(+end-+start)*100 };
  });
}
export const guestNameList = (booking: Booking) => [...new Set([booking.guest_name, ...(booking.guests ?? []).map(guest => guest.name)].map(name => name?.trim()).filter((name): name is string => !!name))];
export const guestNames = (booking: Booking) => guestNameList(booking).join(", ");
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r]/.test(text)) text = "'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function calendarCSV(events: StayEvent[], statusLabels: Record<string,string>, currency: string) {
  const rows: unknown[][] = [["Rezervasyon ID", "Birim", "Konaklayanlar", "Kişi", "Durum", "Rezervasyon giriş", "Rezervasyon çıkış", "Birimde başlangıç", "Birimde bitiş", "Gecelik fiyat", "Para birimi"]];
  const local = (date: Date) => `${dayKey(date)} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
  for(const e of events) rows.push([e.booking.booking_id,e.roomCode,guestNames(e.booking),e.booking.guest_count,statusLabels[e.booking.status],local(new Date(e.booking.check_in)),local(new Date(e.booking.check_out)),local(e.start),local(e.end),(e.booking.daily_price_minor/100).toFixed(2),currency]);
  return "\uFEFF"+rows.map(row => row.map(csvCell).join(";")).join("\r\n");
}
