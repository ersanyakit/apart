import { BookingStatus as BookingState } from './statuses.generated';
import type { Booking } from './api';

/** A day filter covers the full property day, including early arrivals and actual departures. */
export function bookingMatchesDay(booking:Booking, day:string, now:string) {
  if(!day)return true;
  const start=Date.parse(`${day}T00:00:00+03:00`), end=start+86400000;
  const arrival=Date.parse(booking.actual_check_in||booking.check_in);
  const departure=booking.actual_check_out?Date.parse(booking.actual_check_out):booking.status===BookingState.CheckedIn?Math.max(Date.parse(booking.check_out),Date.parse(now)+1):Date.parse(booking.check_out);
  return Number.isFinite(start)&&arrival<end&&departure>start;
}
export function bookingSearchText(booking:Booking, roomCode:string) {
  return [booking.guest_name, ...(booking.guests||[]).map(guest=>guest.name),roomCode].join(' ').toLocaleLowerCase('tr');
}
