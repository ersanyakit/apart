import {roomStatuses} from "./statuses";
import { BookingStatus as BookingState, RoomStatus as RoomState } from './statuses.generated';
import { bookingIntervals, occupancy, related, type APIRoom, type Booking } from "./api";

export type RoomBoardState = {
  operationalStatus: string;
  blockingUnit?: APIRoom;
  current: Booking[];
  bookings: Booking[];
  upcoming: boolean;
  label: string;
  tone: "occupied" | "reserved" | "available" | "warning" | "neutral";
};

export function roomBoardState(rooms: APIRoom[], bookings: Booking[], room: APIRoom, now: string, day = ""): RoomBoardState {
  const ids = related(rooms, room.room_id);
  const start = day ? Date.parse(`${day}T00:00:00+03:00`) : Date.parse(now);
  const end = day ? start + 86400000 : Infinity;
  const current = occupancy(rooms, bookings, room, now);
  const relevant = bookings.filter(booking => booking.branch_id === room.branch_id && booking.status !== BookingState.Cancelled && (day || booking.status !== BookingState.Completed))
    .map(booking => ({ booking, segments: bookingIntervals(booking, now).filter(a => ids.has(a.roomId) && a.start < end && a.end > start) }))
    .filter(item => item.segments.length)
    .sort((a, b) => (day ? 0 : Number(current.includes(b.booking)) - Number(current.includes(a.booking))) || Math.min(...a.segments.map(s => s.start)) - Math.min(...b.segments.map(s => s.start)))
    .map(item => item.booking);
  const upcoming = !day && !current.length && !!relevant.length;
  const displayed = day ? relevant : current;
  const occupied = displayed.some(b => b.status === BookingState.CheckedIn);
  const reserved = relevant.some(b => b.status === BookingState.Confirmed);
  // Match the server check-in scope: this unit, its ancestors and descendants.
  // Sibling beds stay independent.
  const blockingUnit = [RoomState.OutOfOrder, RoomState.Maintenance, RoomState.Dirty].map(status =>
    rooms.find(unit => unit.branch_id === room.branch_id && ids.has(unit.room_id) && unit.status === status)
  ).find(Boolean);
  const operationalStatus = blockingUnit?.status ?? room.status;
  const warning = !!blockingUnit;
  return {
    operationalStatus, blockingUnit, current, bookings: relevant, upcoming,
    label: occupied ? "Giriş yapıldı" : reserved ? (upcoming ? "Yaklaşan rezervasyon" : "Rezerve") : relevant.length ? "Çıkış yapıldı" : room.inactive ? "Pasif" : warning ? (roomStatuses[operationalStatus] || operationalStatus) : "Boş",
    tone: occupied ? "occupied" : reserved ? "reserved" : relevant.length || room.inactive ? "neutral" : warning ? "warning" : "available",
  };
}

export const boardDate = (value: string, locale = "tr-TR") => new Date(value).toLocaleString(locale, { timeZone: "Europe/Istanbul", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function bookingCanCheckIn(booking: Booking, now: string) {
  return booking.status === BookingState.Confirmed && Date.parse(booking.check_out) > Date.parse(now);
}

export function roomMenuOperation(booking: Booking | undefined, now: string) {
  if (booking?.status === BookingState.CheckedIn) return "receipt";
  if (booking && bookingCanCheckIn(booking, now)) return "check_in";
  return "create";
}
