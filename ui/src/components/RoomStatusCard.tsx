import { useI18n } from "./I18n";
import { RoomGradient } from './RoomGradient';
import { ROOM_GRADIENT_PALETTES, roomGradientKey } from '../lib/room-gradient';
import { RoomCondition, RoomConditionIcon } from './RoomCondition';
import { RoomStatus as RoomState, BookingStatus as BookingState } from '../lib/statuses.generated';
import React, { useEffect, useRef, useState } from "react";
import { STATUS_PALETTE, boardStatusKey, roomStatusKey } from "../lib/status-palette";
import styles from "./RoomStatusCard.module.css";
import { NavigationIcon } from "./NavigationIcon";
import { MoreHorizontal, ArrowUpRight, LogIn, LogOut, ChevronDown, GripVertical, ArrowRightLeft, MoveRight, Ban } from "lucide-react";
import { type APIRoom, type Booking, unitKinds } from "../lib/api";
import { boardDate, bookingCanCheckIn, type RoomBoardState } from "../lib/room-board";
import { display } from "./reports/model";

type Props = {
  room: APIRoom; state: RoomBoardState; now: string; day?: string; floorName?: string; busy: boolean;
  onOpenBooking: (booking: Booking) => void;
  onTransition?: (booking: Booking, action: "check_in" | "check_out") => void;
  onContextMenu: (event: Pick<React.MouseEvent, "preventDefault" | "clientX" | "clientY">) => void;
  draggedRoomId?: string | null; onDragEnd?: () => void;
  onDragStart?: (roomId: string) => void; onDrop?: (roomId: string) => void; children?: React.ReactNode;
};
function CompactDate({value}:{value:string}) {
  const {locale:_uiLocale}=useI18n();
  return <time dateTime={value} title={boardDate(value, _uiLocale)}>{new Date(value).toLocaleString(_uiLocale,{timeZone:"Europe/Istanbul",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</time>;
}
export function RoomStatusCard({room,state,now,day,floorName,busy,onOpenBooking,onTransition,onContextMenu,onDragStart,onDrop,onDragEnd,draggedRoomId,children}:Props) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [over, setOver] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!draggedRoomId)setOver(false);},[draggedRoomId]);
  const isSource = draggedRoomId === room.room_id;
  const isTarget = !!draggedRoomId && !isSource;
  const canDrop = isTarget && !!onDrop && !busy && room.rentable && !room.inactive && !state.blockingUnit
    && state.current.length <= 1 && state.current.every(booking => booking.room_id === room.room_id);
  const swapping = state.current.length === 1;
  const openRoomMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    onContextMenu({ preventDefault() {}, clientX: bounds.left, clientY: bounds.bottom });
  };
  const palette=STATUS_PALETTE[boardStatusKey(state)];
  const gradientKey=roomGradientKey(state);
  const gradientColors=ROOM_GRADIENT_PALETTES[gradientKey];
  const primary=state.bookings[0];
  const condition=STATUS_PALETTE[roomStatusKey(state.operationalStatus)];
  const showCondition=[RoomState.Clean,RoomState.Dirty,RoomState.OutOfOrder,RoomState.Maintenance].some(status=>status===state.operationalStatus);
  const transitionButton=(booking:Booking)=>onTransition&&(booking.status===BookingState.CheckedIn||bookingCanCheckIn(booking,now))&&<button type="button" disabled={busy} className={`uni-button ${styles.transition}`} onClick={()=>onTransition(booking,booking.status===BookingState.CheckedIn?"check_out":"check_in")}>
    {booking.status===BookingState.CheckedIn?<LogOut size={15} aria-hidden="true"/>:<LogIn size={15} aria-hidden="true"/>}{booking.status===BookingState.CheckedIn?_uiText("Çıkış yap"):Date.parse(booking.check_in)>Date.parse(now)?_uiText("Erken giriş yap"):_uiText("Giriş yap")}
  </button>;
  const bookingSummary=(booking:Booking)=>{
    const companions=[...new Set((booking.guests||[]).map(g=>g.name).filter(name=>name&&name!==booking.guest_name))];
    return <section key={booking.booking_id} className={styles.booking} aria-label={_uiText("{value1} rezervasyonu", {value1: String(booking.guest_name)})}>
      <button type="button" title={_uiText("Detaylar")} className={`uni-control ${styles.guest}`} onClick={()=>onOpenBooking(booking)}><strong>{booking.guest_name||_uiText("Misafir")}</strong><ArrowUpRight size={16} aria-hidden="true"/></button>
      <div className={styles.people}><span className={styles.guestCount} title={[booking.guest_name,...companions].join(" · ")}><NavigationIcon name="guests" size={14}/>{_uiText("{count} kişi",{count:booking.guest_count})}</span><span className={styles.price}>{display(booking.daily_price_minor||0,"money",booking.currency||"TRY", _uiLocale)}<small> {_uiText("/ gece")}</small></span></div>
      <dl className={styles.dates}>
        <div><dt title={booking.checked_in_by_name ? _uiText("Girişi yapan: {value1}", {value1: String(booking.checked_in_by_name)}) : undefined}><LogIn size={12} strokeWidth={1.8} aria-hidden="true"/>{booking.actual_check_in?_uiText("Gerçek giriş"):_uiText("Planlanan giriş")}</dt><dd><CompactDate value={booking.actual_check_in||booking.check_in}/></dd></div>
        <div><dt title={booking.checked_out_by_name ? _uiText("Çıkışı yapan: {value1}", {value1: String(booking.checked_out_by_name)}) : undefined}><LogOut size={12} strokeWidth={1.8} aria-hidden="true"/>{booking.actual_check_out?_uiText("Gerçek çıkış"):_uiText("Planlanan çıkış")}</dt><dd><CompactDate value={booking.actual_check_out||booking.check_out}/></dd></div>
      </dl>
      {booking.status===BookingState.CheckedIn&&Date.parse(booking.check_out)<=Date.parse(now)&&<p className={styles.warning}>{_uiText("Çıkış saati geçti · İşlem bekleniyor")}</p>}
    </section>;
  };
  return <article className={`room-status-card ${styles.card}`} style={{"--room-state":palette.accent,"--room-tint":palette.background,"--room-text":palette.text,"--room-gradient-fallback":`linear-gradient(135deg, ${gradientColors.map(color=>`color-mix(in srgb, ${color} 45%, white)`).join(", ")})`} as React.CSSProperties} onContextMenu={onContextMenu}
    data-drag-source={isSource || undefined} data-drop-state={isTarget ? (canDrop ? (over ? "over" : "ready") : "blocked") : undefined}
    onDragOver={event=>{if(canDrop && event.dataTransfer.types.includes("application/x-hotel-room")){event.preventDefault();event.dataTransfer.dropEffect="move";setOver(true);}}}
    onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node | null))setOver(false);}}
    onDrop={event=>{event.preventDefault();setOver(false);if(canDrop && event.dataTransfer.getData("application/x-hotel-room")===draggedRoomId)onDrop?.(room.room_id);}}>
    <RoomGradient status={gradientKey} roomId={room.room_id} className={styles.gradient}/>
    {isTarget && <div className={styles.dropOverlay} aria-hidden="true">
      {canDrop ? (swapping ? <ArrowRightLeft size={22}/> : <MoveRight size={22}/>) : <Ban size={20}/>}
      <strong>{canDrop ? (swapping ? _uiText("Odaları değiştir") : _uiText("{value1} odasına taşı", {value1: String(room.code)})) : _uiText("Bu odaya bırakılamaz")}</strong>
      <span>{canDrop ? _uiText("Bıraktığınızda onay istenir") : state.blockingUnit ? condition.label : _uiText("Uygun bir oda seçin")}</span>
    </div>}

    <header className={styles.header}>
      {onDragStart && <button type="button" className={`nav-icon-button ${styles.dragHandle}`} aria-label={_uiText("{value1} odasını taşı", {value1: String(room.code)})} title={_uiText("Sürükleyerek taşı veya oda menüsünü aç")} disabled={busy} draggable={!busy}
        onClick={openRoomMenu}
        onDragStart={event=>{event.stopPropagation();event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("application/x-hotel-room",room.room_id);if(preview.current)event.dataTransfer.setDragImage(preview.current,24,24);onDragStart(room.room_id);}}
        onDragEnd={()=>{setOver(false);onDragEnd?.();}}><GripVertical size={18}/></button>}
      <div className={styles.heading}><h3><NavigationIcon name={room.kind === "bed" ? "stays" : room.kind === "apartment" ? "home" : "units"} size={18}/>{room.code}</h3><p>{[_uiText(unitKinds[room.kind]),floorName].filter(Boolean).join(" · ")}</p></div>
      <button type="button" className="nav-icon-button" aria-label={_uiText("{value1} işlemleri", {value1: String(room.code)})} onClick={openRoomMenu}><MoreHorizontal size={20}/></button>
    </header>
    <div className={styles.statusRow}><span className={styles.badge} data-condition={true} title={state.upcoming ? _uiText("Şu an boş · Yaklaşan rezervasyon") : undefined}>{showCondition&&condition.label===state.label?<RoomCondition status={state.operationalStatus}/>:<><RoomConditionIcon semantic={boardStatusKey(state)}/>{_uiText(state.label)}</>}</span>{showCondition&&condition.label!==state.label&&<span className={styles.condition} style={{color:condition.text}}><RoomCondition status={state.operationalStatus}/></span>}</div>
    {state.blockingUnit&&state.blockingUnit.room_id!==room.room_id&&<p className={styles.warning}>{state.blockingUnit.code} {_uiText("birimi:")} {_uiText(condition.label)}</p>}
    {primary?bookingSummary(primary):<div className={styles.empty}><div><strong>{[RoomState.Dirty,RoomState.OutOfOrder,RoomState.Maintenance].some(status=>status===state.operationalStatus)?_uiText("Oda hazırlık bekliyor"):_uiText("Aktif konaklama yok")}</strong></div></div>}
    {state.bookings.length>1&&<details className={styles.more}><summary><ChevronDown size={14}/>{state.bookings.length-1} {_uiText("rezervasyon daha")}</summary>{state.bookings.slice(1).map(b=><div key={b.booking_id}>{bookingSummary(b)}<div className={styles.moreActions}><button type="button" className="uni-button uni-button-secondary" onClick={()=>onOpenBooking(b)}>{_uiText("Detaylar")}</button>{transitionButton(b)}</div></div>)}</details>}
    {room.last_cleaning&&<details className={styles.cleaning}><summary>{_uiText("Son temizlik ·")} {room.last_cleaning.cleaner}<ChevronDown size={13}/></summary><div><p>{boardDate(room.last_cleaning.completed_at, _uiLocale)}</p>{room.last_cleaning.note&&<p>{room.last_cleaning.note}</p>}<p>{_uiText("Kaydeden:")} {room.last_cleaning.recorded_by_name||_uiText("Bilgi kaydedilmemiş")}</p></div></details>}
    {onDragStart && <div ref={preview} className={styles.dragPreview} aria-hidden="true"><span>{_uiText("Oda")} {room.code}</span><strong>{state.current.find(booking=>booking.room_id===room.room_id)?.guest_name}</strong><small>{_uiText("Taşımak için bir odaya bırakın")}</small></div>}
    <footer className={styles.actions}>{children}{primary&&transitionButton(primary)}</footer>
  </article>;
}
