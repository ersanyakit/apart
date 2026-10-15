import { BookingStatus as BookingState } from '../lib/statuses.generated';
import { bookingStatusKey, statusStyle } from "../lib/status-palette";
import { LogIn, LogOut, Clock } from 'lucide-react';
import type { Booking } from '../lib/api';
import { boardDate } from '../lib/room-board';

export function BookingArrival({ booking: b }: { booking: Booking }) {
  const entered = !!b.actual_check_in || b.status === BookingState.CheckedIn || b.status === BookingState.Completed;
  const departed = !!b.actual_check_out || b.status === BookingState.Completed;
  return <div className="min-w-52 space-y-2 py-3 text-xs">
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium" style={statusStyle(bookingStatusKey(departed ? BookingState.Completed : entered ? BookingState.CheckedIn : b.status))}>
      {departed ? <LogOut size={14}/> : entered ? <LogIn size={14}/> : <Clock size={14}/>}
      {departed ? 'Çıkış yapıldı' : entered ? 'Giriş yapıldı' : b.status === BookingState.Cancelled ? 'İptal edildi · Giriş yok' : 'Henüz giriş yapılmadı'}
    </span>
    {entered && <p><span className="text-uni-muted">Gerçek giriş: </span>{b.actual_check_in ? boardDate(b.actual_check_in) : 'Zaman kaydedilmemiş'}</p>}
    {departed && <p><span className="text-uni-muted">Gerçek çıkış: </span>{b.actual_check_out ? boardDate(b.actual_check_out) : 'Zaman kaydedilmemiş'}</p>}
  </div>;
}
