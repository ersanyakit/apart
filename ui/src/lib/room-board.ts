import { bookingIntervals, occupancy, related, type APIRoom, type Booking } from "./api";

export type RoomBoardState = {
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
  const relevant = bookings.filter(booking => booking.branch_id === room.branch_id && booking.status !== "cancelled" && (day || booking.status !== "completed"))
    .map(booking => ({ booking, segments: bookingIntervals(booking, now).filter(a => ids.has(a.roomId) && a.start < end && a.end > start) }))
    .filter(item => item.segments.length)
    .sort((a, b) => (day ? 0 : Number(current.includes(b.booking)) - Number(current.includes(a.booking))) || Math.min(...a.segments.map(s => s.start)) - Math.min(...b.segments.map(s => s.start)))
    .map(item => item.booking);
  const upcoming = !day && !current.length && !!relevant.length;
  const displayed = day ? relevant : current;
  const occupied = displayed.some(b => b.status === "checked_in");
  const reserved = relevant.some(b => b.status === "confirmed");
  const warning = ["Kirli", "Arizali", "Tadilat"].includes(room.status);
  return {
    current, bookings: relevant, upcoming,
    label: occupied ? "Giriş yapıldı" : reserved ? (upcoming ? "Yaklaşan rezervasyon" : "Rezerve") : relevant.length ? "Çıkış yapıldı" : room.inactive ? "Pasif" : warning ? ({ Kirli: "Kirli", Arizali: "Arızalı", Tadilat: "Tadilatta" }[room.status] || room.status) : "Boş",
    tone: occupied ? "occupied" : reserved ? "reserved" : relevant.length || room.inactive ? "neutral" : warning ? "warning" : "available",
  };
}

export const boardDate = (value: string) => new Date(value).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function bookingCanCheckIn(booking: Booking, now: string) {
  return booking.status === "confirmed" && Date.parse(booking.check_out) > Date.parse(now);
}

export function roomMenuOperation(booking: Booking | undefined, now: string) {
  if (booking?.status === "checked_in") return "receipt";
  if (booking && bookingCanCheckIn(booking, now)) return "check_in";
  return "create";
}
