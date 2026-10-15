import { BookingStatus as BookingState } from '../lib/statuses.generated';
import { statusStyle } from "../lib/status-palette";
import React, { useId, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowRightLeft, Eye, LogIn, LogOut, Pencil, X } from 'lucide-react';
import { bookingStatuses, type APIRoom, type Booking } from '../lib/api';
import { bookingCanCheckIn } from '../lib/room-board';
import { display } from './reports/model';
import type { GuestHistoryTarget } from './GuestHistoryNavigation';
import styles from './BookingsTable.module.css';

export type BookingsTableProps = {
  bookings: Booking[]; rooms: APIRoom[]; serverTime: string; busy: boolean; canOperate: boolean;
  onDetails: (booking: Booking) => void; onGuest: (guest: GuestHistoryTarget) => void;
  onEdit: (booking: Booking) => void; onMove: (booking: Booking) => void;
  onTransition: (booking: Booking, action: string) => void;
  onContextMenu: (event: React.MouseEvent, booking: Booking) => void;
};
type SortKey = 'room' | 'guest' | 'status' | 'check_in' | 'check_out' | 'created_at' | 'created_by_name';
function GuestIdentity({name}:{name:string}) {
  const initials = name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toLocaleUpperCase('tr');
  return <><span className={styles.avatar} aria-hidden="true">{initials || '?'}</span><span>{name || 'Misafir'}</span></>;
}
function DateValue({value}:{value?:string|null}) {
  if(!value||!Number.isFinite(Date.parse(value)))return <span className={styles.muted}>Zaman kaydedilmemiş</span>;
  const date=new Date(value);
  return <time dateTime={value} className={styles.date}><span>{date.toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'short',year:'numeric'})}</span><small>{date.toLocaleTimeString('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'})}</small></time>;
}
export function BookingsTable({bookings, rooms, serverTime, busy, canOperate, onDetails, onGuest, onEdit, onMove, onTransition, onContextMenu}: BookingsTableProps) {
  const selectionGroup = useId();
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [sort,setSort]=useState<{key:SortKey;desc:boolean}>({key:'created_at',desc:true});
  const roomByID=useMemo(()=>new Map(rooms.map(room=>[room.room_id,room])),[rooms]);
  const selected=bookings.find(booking=>booking.booking_id===selectedId);
  const editable=!!selected&&canOperate&&[BookingState.Confirmed,BookingState.CheckedIn].some(status=>status===selected.status);
  const rows=useMemo(()=>[...bookings].sort((a,b)=>{
    const value=(booking:Booking)=>sort.key==='room'?roomByID.get(booking.room_id)?.code||'':sort.key==='guest'?booking.guest_name:sort.key==='status'?bookingStatuses[booking.status]:sort.key==='created_by_name'?booking.created_by_name||'':Date.parse((sort.key==='created_at'?booking.created_at||booking.check_in:booking[sort.key])||'')||0;
    const x=value(a),y=value(b);const result=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'tr',{numeric:true});
    return result*(sort.desc?-1:1);
  }),[bookings,roomByID,sort]);
  const sortButton=(key:SortKey,label:string)=><button type="button" className={`uni-control ${styles.sort}`} onClick={()=>setSort(previous=>({key,desc:previous.key===key?!previous.desc:false}))}>{label}{sort.key===key?(sort.desc?<ArrowDown size={13}/>:<ArrowUp size={13}/>):<ArrowUpDown size={13}/>}</button>;
  const ariaSort=(key:SortKey)=>sort.key===key?(sort.desc?'descending':'ascending'):'none';
  const statuses=[BookingState.Confirmed,BookingState.CheckedIn,BookingState.Completed,BookingState.Cancelled] as const;
  return <section className={styles.workspace} aria-label="Rezervasyon kayıtları">
    <div className={styles.overview}><strong>{bookings.length} rezervasyon</strong><div>{statuses.map(status=><span key={status} className={styles.counter} data-status={status}><i aria-hidden="true"/>{bookingStatuses[status]} <b>{bookings.filter(b=>b.status===status).length}</b></span>)}</div></div>
    <div className={styles.commandBar} aria-label="Seçili rezervasyon işlemleri">
      <div className={styles.selection}><strong>{selected?`${roomByID.get(selected.room_id)?.code||'Birim'} · ${selected.guest_name}`:'Rezervasyon seçin'}</strong><span>{selected?`${selected.guest_count} kişi · ${bookingStatuses[selected.status]}`:'İşlem yapmak için satırı seçin.'}</span></div>
      <div className={styles.actions}>
        <button type="button" className="uni-button uni-button-secondary" disabled={!selected} onClick={()=>selected&&onDetails(selected)}><Eye size={16}/>Rezervasyon detayı</button>
        {canOperate&&<>
          <button type="button" className="uni-button uni-button-secondary" disabled={!editable||busy} onClick={()=>selected&&onEdit(selected)}><Pencil size={15}/>Düzenle</button>
          <button type="button" className="uni-button uni-button-secondary" disabled={!editable||busy} onClick={()=>selected&&onMove(selected)}><ArrowRightLeft size={16}/>Birim değiştir</button>
          <button type="button" className="uni-button uni-button-secondary" disabled={!selected||selected.status!==BookingState.Confirmed||busy} onClick={()=>selected&&onTransition(selected,'cancel')}><X size={16}/>İptal et</button>
          <button type="button" className="uni-button uni-button-primary" style={statusStyle(selected?.status===BookingState.CheckedIn?"departure":"occupied")} disabled={!editable||busy||selected?.status===BookingState.Confirmed&&!bookingCanCheckIn(selected,serverTime)} title={selected?.status===BookingState.Confirmed&&!bookingCanCheckIn(selected,serverTime)?'Çıkış tarihi geçmiş. Rezervasyon tarihlerini düzenleyin.':undefined} onClick={()=>selected&&onTransition(selected,selected.status===BookingState.CheckedIn?'check_out':'check_in')}>{selected?.status===BookingState.CheckedIn?<LogOut size={16}/>:<LogIn size={16}/>} {selected?.status===BookingState.CheckedIn?'Çıkış yap':selected&&Date.parse(selected.check_in)>Date.parse(serverTime)?'Erken giriş':'Giriş yap'}</button>
        </>}
      </div>
    </div>
    <div className={styles.scroll} tabIndex={0} role="region" aria-label="Rezervasyon tablosu; diğer sütunlar için yatay kaydırın">
      <table className={styles.table}>
        <colgroup>{[44,80,220,130,140,140,190,190,145,160,160].map((width,index)=><col key={index} style={{width:index<3?width:undefined}}/>)}</colgroup>
        <thead>
          <tr><th scope="col" rowSpan={2} className={styles.selectColumn}><span className="sr-only">Seç</span></th><th scope="col" rowSpan={2} className={styles.roomColumn} aria-sort={ariaSort('room')}>{sortButton('room','Birim')}</th><th scope="col" rowSpan={2} className={styles.guestColumn} aria-sort={ariaSort('guest')}>{sortButton('guest','Konaklayanlar')}</th><th scope="col" rowSpan={2} aria-sort={ariaSort('status')}>{sortButton('status','Durum')}</th><th scope="colgroup" colSpan={2}>Planlanan konaklama</th><th scope="colgroup" colSpan={2}>Gerçekleşen işlemler</th><th scope="col" rowSpan={2} className={styles.money}>Gecelik fiyat</th><th scope="col" rowSpan={2} aria-sort={ariaSort('created_by_name')}>{sortButton('created_by_name','Rezervasyonu alan')}</th><th scope="col" rowSpan={2}>İptali gerçekleştiren</th></tr>
          <tr><th scope="col" aria-sort={ariaSort('check_in')}>{sortButton('check_in','Giriş')}</th><th scope="col" aria-sort={ariaSort('check_out')}>{sortButton('check_out','Çıkış')}</th><th scope="col">Giriş / Personel</th><th scope="col">Çıkış / Personel</th></tr>
        </thead>
        <tbody>{rows.map(booking=>{
          const entered=!!booking.actual_check_in||[BookingState.CheckedIn,BookingState.Completed].some(status=>status===booking.status);
          const departed=!!booking.actual_check_out||booking.status===BookingState.Completed;
          const guests=booking.guests?.length?booking.guests:[{id:'',name:booking.guest_name}];
          return <tr key={booking.booking_id} data-selected={selected?.booking_id===booking.booking_id} onClick={event=>{if(!(event.target as HTMLElement).closest('button,a,input,label'))setSelectedId(booking.booking_id)}} onDoubleClick={event=>{if(!(event.target as HTMLElement).closest('button,a,input,label'))onDetails(booking)}} onContextMenu={event=>{setSelectedId(booking.booking_id);onContextMenu(event,booking)}}>
            <td className={styles.selectColumn}><label className={styles.select}><input type="radio" name={selectionGroup} value={booking.booking_id} aria-label={`${booking.guest_name} rezervasyonunu seç`} checked={selected?.booking_id===booking.booking_id} onChange={()=>setSelectedId(booking.booking_id)}/></label></td>
            <td className={styles.roomColumn}><strong>{roomByID.get(booking.room_id)?.code||'—'}</strong><small>{booking.guest_count} kişi</small></td>
            <td className={styles.guestColumn}><ul className={styles.guests}>{guests.map((guest,index)=><li key={guest.id||index}>{guest.id&&guest.id!=='00000000-0000-0000-0000-000000000000'?<button type="button" className="uni-control" onClick={()=>onGuest({id:guest.id,name:guest.name})} title={`${guest.name} · Konaklama geçmişi`}><GuestIdentity name={guest.name}/></button>:<span className={styles.guestIdentity}><GuestIdentity name={guest.name}/></span>}</li>)}</ul></td>
            <td><span className={styles.status} data-status={booking.status}><i/>{bookingStatuses[booking.status]}</span>{booking.cancellation_reason&&<p className={styles.reason} title={booking.cancellation_reason}>{booking.cancellation_reason}</p>}</td>
            <td><DateValue value={booking.check_in}/></td><td><DateValue value={booking.check_out}/></td>
            <td>{entered?<><DateValue value={booking.actual_check_in}/><span className={styles.person} title="Girişi gerçekleştiren"><span className="sr-only">Girişi gerçekleştiren: </span>{booking.checked_in_by_name||'Personel kaydedilmemiş'}</span></>:<span className={styles.muted}>Giriş yapılmadı</span>}</td>
            <td>{departed?<><DateValue value={booking.actual_check_out}/><span className={styles.person} title="Çıkışı gerçekleştiren"><span className="sr-only">Çıkışı gerçekleştiren: </span>{booking.checked_out_by_name||'Personel kaydedilmemiş'}</span></>:<span className={styles.muted}>Çıkış yapılmadı</span>}</td>
            <td className={styles.money}>{booking.daily_price_minor>0?<><strong>{display(booking.daily_price_minor,'money',booking.currency||'TRY')}</strong><small>{booking.currency||'TRY'} / gece</small></>:<span className={styles.muted}>Fiyat girilmemiş</span>}</td>
            <td><span className={styles.person}>{booking.created_by_name||'Personel kaydedilmemiş'}</span>{booking.created_at&&<small>{new Date(booking.created_at).toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'})}</small>}</td>
            <td>{booking.status===BookingState.Cancelled?<><span className={styles.person}>{booking.cancelled_by_name||'Personel kaydedilmemiş'}</span>{booking.cancelled_at&&<DateValue value={booking.cancelled_at}/>}</>:<span className={styles.muted}>—</span>}</td>
          </tr>;
        })}</tbody>
      </table>
      {!rows.length&&<div className={styles.empty}>Seçili filtrelerde rezervasyon bulunamadı.</div>}
    </div>
    <div className={styles.footer}><span>{bookings.length} kayıt · Saatler Türkiye saatidir</span><span>Satır: işlem seçimi · Misafir adı: konaklama geçmişi · Çift tıklama: rezervasyon detayı</span></div>
  </section>;
}
