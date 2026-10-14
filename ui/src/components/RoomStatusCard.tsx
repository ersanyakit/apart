import React from "react";
import { BedDouble, MoreHorizontal, Users, ArrowUpRight, LogIn, LogOut } from "lucide-react";
import { type APIRoom, type Booking, unitKinds } from "../lib/api";
import { boardDate, bookingCanCheckIn, type RoomBoardState } from "../lib/room-board";
import { MoneyText } from "./fields/MoneyField";

type Props = {
  room: APIRoom;
  state: RoomBoardState;
  now: string;
  day?: string;
  floorName?: string;
  busy: boolean;
  onOpenBooking: (booking: Booking) => void;
  onTransition?: (booking: Booking, action: "check_in" | "check_out") => void;
  onContextMenu: (event: Pick<React.MouseEvent, "preventDefault" | "clientX" | "clientY">) => void;
  onDragStart?: (roomId: string) => void;
  onDrop?: (roomId: string) => void;
  children?: React.ReactNode;
};

export function RoomStatusCard({ room, state, now, day, floorName, busy, onOpenBooking, onTransition, onContextMenu, onDragStart, onDrop, children }: Props) {
  const bookingSummary = (booking: Booking) => {
    const future = !day && !state.current.includes(booking);
    const checkedIn = booking.status === "checked_in";
    const canCheckIn = bookingCanCheckIn(booking, now);
    const companions = [...new Set((booking.guests || []).map(g => g.name).filter(name => name && name !== booking.guest_name))];
    return <section key={booking.booking_id} className="room-status-booking" aria-label={`${booking.guest_name} rezervasyonu`}>
      <div className="room-status-booking-label">
        <span>{checkedIn ? "Konaklayan" : booking.status === "completed" ? "Tamamlanan konaklama" : future ? "Sıradaki rezervasyon" : "Rezervasyon sahibi"}</span>
        <span><Users size={13} aria-hidden="true" />{booking.guest_count} kişi</span>
      </div>
      <button type="button" className="room-status-guest" onClick={() => onOpenBooking(booking)}>
        <strong>{booking.guest_name || "Misafir"}</strong><ArrowUpRight size={17} aria-hidden="true" />
      </button>
      {!!companions.length && <p className="room-status-companions">Diğer misafirler: {companions.join(", ")}</p>}
      <dl className="room-status-dates">
        <div><dt>{booking.actual_check_in ? "Gerçek giriş" : "Planlanan giriş"}</dt><dd><time dateTime={booking.actual_check_in || booking.check_in}>{boardDate(booking.actual_check_in || booking.check_in)}</time></dd></div>
        <div><dt>Planlanan çıkış</dt><dd><time dateTime={booking.check_out}>{boardDate(booking.check_out)}</time></dd></div>
      </dl>
      {booking.actual_check_in && Date.parse(booking.actual_check_in) !== Date.parse(booking.check_in) && <p className="mt-2 text-xs text-slate-500">Planlanan giriş: {boardDate(booking.check_in)}</p>}
      {booking.actual_check_in && <p className="room-status-arrival"><LogIn size={14} aria-hidden="true" />Giriş yapıldı · {boardDate(booking.actual_check_in)}</p>}
      {booking.actual_check_out && <p className="room-status-departure"><LogOut size={14} aria-hidden="true" />Çıkış yapıldı · {boardDate(booking.actual_check_out)}</p>}
      {checkedIn && Date.parse(booking.check_out) <= Date.parse(now) && <p className="room-status-overdue">Planlanan çıkış saati geçti; çıkış işlemi bekleniyor.</p>}
      <div className="room-status-booking-footer">
        <span className="room-status-price"><MoneyText minor={booking.daily_price_minor || 0} /><small> / gece</small></span>
        <button type="button" className="uni-button uni-button-secondary" onClick={() => onOpenBooking(booking)}>Detaylar</button>
        {onTransition && (checkedIn || canCheckIn) && <button type="button" disabled={busy} className="uni-button uni-button-primary" onClick={() => onTransition(booking, checkedIn ? "check_out" : "check_in")}>
          {checkedIn ? "Çıkış yap" : Date.parse(booking.check_in) > Date.parse(now) ? "Erken giriş yap" : "Giriş yap"}
        </button>}
      </div>
    </section>;
  };
  return <article className={`room-status-card room-status-${state.tone}`} onContextMenu={onContextMenu}
    draggable={!!onDragStart} onDragStart={() => onDragStart?.(room.room_id)} onDragOver={e => onDrop && e.preventDefault()} onDrop={e => { e.preventDefault(); onDrop?.(room.room_id); }}>
    <header className="room-status-header">
      <div className="room-status-icon"><BedDouble size={22} aria-hidden="true" /></div>
      <div className="room-status-heading"><h3>{room.code}</h3><p>{[unitKinds[room.kind], floorName].filter(Boolean).join(" · ")}</p></div>
      <button type="button" className="nav-icon-button" aria-label={`${room.code} işlemleri`} onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); onContextMenu({ preventDefault() {}, clientX: rect.left, clientY: rect.bottom }); }}><MoreHorizontal size={20} /></button>
    </header>
    <div className="room-status-state"><span className="room-status-badge">{state.label}</span><span className="room-status-housekeeping">{state.upcoming ? "Şu an boş · " : ""}{state.operationalStatus === "Bos" ? "Boş" : state.operationalStatus === "Arizali" ? "Arızalı" : state.operationalStatus === "Rezervli" || state.operationalStatus === "Dolu" ? "" : state.operationalStatus}</span></div>
    {state.blockingUnit && state.blockingUnit.room_id !== room.room_id && <p className="room-status-housekeeping">{state.blockingUnit.code} birimi: {state.operationalStatus === "Arizali" ? "Arızalı" : state.operationalStatus === "Tadilat" ? "Tadilatta" : "Kirli"}</p>}
    {state.bookings.slice(0, 2).map(bookingSummary)}
    {state.bookings.length > 2 && <details className="room-status-more"><summary>{state.bookings.length - 2} rezervasyon daha</summary>{state.bookings.slice(2).map(bookingSummary)}</details>}
    {!state.bookings.length && <p className="room-status-empty">{day ? "Seçilen gün için rezervasyon veya konaklama yok." : "Aktif veya yaklaşan rezervasyon yok."}</p>}
    <footer className="room-status-actions">{children}</footer>
  </article>;
}
