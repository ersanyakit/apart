import React from "react";
import { STATUS_PALETTE, boardStatusKey, roomStatusKey, statusStyle } from "../lib/status-palette";
import styles from "./RoomStatusCard.module.css";
import { BedDouble, MoreHorizontal, Users, ArrowUpRight, LogIn, LogOut, ChevronDown } from "lucide-react";
import { type APIRoom, type Booking, unitKinds } from "../lib/api";
import { boardDate, bookingCanCheckIn, type RoomBoardState } from "../lib/room-board";
import { display } from "./reports/model";

type Props = {
  room: APIRoom; state: RoomBoardState; now: string; day?: string; floorName?: string; busy: boolean;
  onOpenBooking: (booking: Booking) => void;
  onTransition?: (booking: Booking, action: "check_in" | "check_out") => void;
  onContextMenu: (event: Pick<React.MouseEvent, "preventDefault" | "clientX" | "clientY">) => void;
  onDragStart?: (roomId: string) => void; onDrop?: (roomId: string) => void; children?: React.ReactNode;
};
function CompactDate({value}:{value:string}) {
  return <time dateTime={value} title={boardDate(value)}>{new Date(value).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</time>;
}
export function RoomStatusCard({room,state,now,day,floorName,busy,onOpenBooking,onTransition,onContextMenu,onDragStart,onDrop,children}:Props) {
  const palette=STATUS_PALETTE[boardStatusKey(state)];
  const primary=state.bookings[0];
  const condition=STATUS_PALETTE[roomStatusKey(state.operationalStatus)];
  const showCondition=["Temiz","Kirli","Arizali","Tadilat"].includes(state.operationalStatus);
  const transitionButton=(booking:Booking)=>onTransition&&(booking.status==="checked_in"||bookingCanCheckIn(booking,now))&&<button type="button" disabled={busy} className={`uni-button ${styles.transition}`} style={statusStyle(booking.status==="checked_in"?"departure":"occupied")} onClick={()=>onTransition(booking,booking.status==="checked_in"?"check_out":"check_in")}>
    {booking.status==="checked_in"?<LogOut size={15} aria-hidden="true"/>:<LogIn size={15} aria-hidden="true"/>}{booking.status==="checked_in"?"Çıkış yap":Date.parse(booking.check_in)>Date.parse(now)?"Erken giriş yap":"Giriş yap"}
  </button>;
  const bookingSummary=(booking:Booking)=>{
    const companions=[...new Set((booking.guests||[]).map(g=>g.name).filter(name=>name&&name!==booking.guest_name))];
    return <section key={booking.booking_id} className={styles.booking} aria-label={`${booking.guest_name} rezervasyonu`}>
      <div className={styles.eyebrow}><span>{booking.status==="checked_in"?"KONAKLAYAN":booking.status==="completed"?"TAMAMLANAN KONAKLAMA":"REZERVASYON"}</span><span className={styles.price}>{display(booking.daily_price_minor||0,"money",booking.currency||"TRY")}<small> / gece</small></span></div>
      <button type="button" className={`uni-control ${styles.guest}`} onClick={()=>onOpenBooking(booking)}><strong>{booking.guest_name||"Misafir"}</strong><ArrowUpRight size={16} aria-hidden="true"/></button>
      <div className={styles.people}><Users size={13} aria-hidden="true"/><span>{booking.guest_count} kişi</span>{companions.length>0&&<span className={styles.companionNames}>{companions.join(" · ")}</span>}</div>
      <dl className={styles.dates}>
        <div><dt><LogIn size={12} aria-hidden="true"/>{booking.actual_check_in?"Gerçek giriş":"Planlanan giriş"}</dt><dd><CompactDate value={booking.actual_check_in||booking.check_in}/></dd></div>
        <div><dt><LogOut size={12} aria-hidden="true"/>{booking.actual_check_out?"Gerçek çıkış":"Planlanan çıkış"}</dt><dd><CompactDate value={booking.actual_check_out||booking.check_out}/></dd></div>
      </dl>
      {(booking.checked_in_by_name||booking.checked_out_by_name)&&<div className={styles.actors}>{booking.checked_in_by_name&&<span>Giriş: {booking.checked_in_by_name}</span>}{booking.checked_out_by_name&&<span>Çıkış: {booking.checked_out_by_name}</span>}</div>}
      {booking.status==="checked_in"&&Date.parse(booking.check_out)<=Date.parse(now)&&<p className={styles.warning}>Çıkış saati geçti · İşlem bekleniyor</p>}
    </section>;
  };
  return <article className={`room-status-card ${styles.card}`} style={{"--room-state":palette.accent,"--room-tint":palette.background} as React.CSSProperties} onContextMenu={onContextMenu} draggable={!!onDragStart} onDragStart={()=>onDragStart?.(room.room_id)} onDragOver={e=>onDrop&&e.preventDefault()} onDrop={e=>{e.preventDefault();onDrop?.(room.room_id);}}>
    <header className={styles.header}>
      <div className={`${styles.icon} room-status-icon`}><BedDouble size={20} aria-hidden="true"/></div>
      <div className={styles.heading}><h3>{room.code}</h3><p>{[unitKinds[room.kind],floorName].filter(Boolean).join(" · ")}</p></div>
      <button type="button" className="nav-icon-button" aria-label={`${room.code} işlemleri`} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();onContextMenu({preventDefault(){},clientX:r.left,clientY:r.bottom});}}><MoreHorizontal size={20}/></button>
    </header>
    <div className={styles.statusRow}><span className={styles.badge}>{state.label}</span>{showCondition&&<span className={styles.condition} style={{color:condition.text}}><i style={{background:condition.accent}}/>{condition.label}</span>}{state.upcoming&&<span className={styles.vacant}>Şu an boş</span>}</div>
    {state.blockingUnit&&state.blockingUnit.room_id!==room.room_id&&<p className={styles.warning}>{state.blockingUnit.code} birimi: {condition.label}</p>}
    {primary?bookingSummary(primary):<div className={styles.empty}><BedDouble size={24} strokeWidth={1.4} aria-hidden="true"/><div><strong>{["Kirli","Arizali","Tadilat"].includes(state.operationalStatus)?"Oda hazırlık bekliyor":"Aktif konaklama yok"}</strong><p>{day?"Seçilen gün için kayıt bulunmuyor.":"Rezervasyonları oda işlemlerinden yönetin."}</p></div></div>}
    {state.bookings.length>1&&<details className={styles.more}><summary><ChevronDown size={14}/>{state.bookings.length-1} rezervasyon daha</summary>{state.bookings.slice(1).map(b=><div key={b.booking_id}>{bookingSummary(b)}<div className={styles.moreActions}><button type="button" className="uni-button uni-button-secondary" onClick={()=>onOpenBooking(b)}>Detaylar</button>{transitionButton(b)}</div></div>)}</details>}
    {room.last_cleaning&&<details className={styles.cleaning}><summary>Son temizlik · {room.last_cleaning.cleaner}<ChevronDown size={13}/></summary><div><p>{boardDate(room.last_cleaning.completed_at)}</p>{room.last_cleaning.note&&<p>{room.last_cleaning.note}</p>}<p>Kaydeden: {room.last_cleaning.recorded_by_name||"Bilgi kaydedilmemiş"}</p></div></details>}
    <footer className={styles.actions}>{primary&&<button type="button" className={`uni-button ${styles.detail}`} onClick={()=>onOpenBooking(primary)}>Detaylar</button>}{children}{primary&&transitionButton(primary)}</footer>
  </article>;
}
