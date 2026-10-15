"use client";
import { BookingStatus as BookingState } from '../lib/statuses.generated';

import { statusStyle } from "../lib/status-palette";
import { bookingSourceLabel } from "../lib/booking-origin";
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil, LogIn, LogOut, ArrowRightLeft } from 'lucide-react';
import { bookingStatuses, type Booking, type Snapshot } from '../lib/api';
import { boardDate } from '../lib/room-board';
import { MoneyText } from './fields';
import { BookingGuestList } from './BookingGuestList';
import { BookingActors } from './BookingActors';
import { BookingArrival } from './BookingArrival';
import { RoomFolio } from './RoomFolio';
import { BookingDocuments } from './DocumentsView';
import { BookingGuestsForm } from './BookingForm';

export type BookingDetailTab = 'overview' | 'folio' | 'documents' | 'history' | 'guests';
export function BookingDetails({ booking: b, snapshot, initialTab = 'overview', onClose, onEdit, onMove, onTransition, onRefresh, initialDocumentKind }: {
  booking: Booking; snapshot: Snapshot; initialTab?: BookingDetailTab;
  initialDocumentKind?: string; onClose: () => void; onEdit?: (booking: Booking) => void; onMove?: (booking: Booking) => void;
  onTransition?: (booking: Booking, action: string) => void; onRefresh: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<BookingDetailTab>(initialTab);
  const canOperate = ['admin', 'management', 'reception'].includes(snapshot.user.role);
  const editable = canOperate && [BookingState.Confirmed, BookingState.CheckedIn].some(status=>status===b.status);
  const earlyArrival = b.status === BookingState.Confirmed && Date.parse(b.check_in) > Date.parse(snapshot.server_time);
  const room = snapshot.rooms.find(room => room.room_id === b.room_id);
  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; previousFocus?.focus({preventScroll:true}); };
  }, []);
  const tabs: {id:BookingDetailTab;label:string}[] = [
    {id:'overview',label:'Genel bakış'},
    ...(canOperate ? [{id:'folio' as const,label:'Folyo ve hizmetler'}] : []),
    {id:'documents',label:'Belgeler'}, {id:'history',label:'İşlem geçmişi'},
    ...(editable ? [{id:'guests' as const,label:'Misafirleri düzenle'}] : []),
  ];
  return createPortal(<dialog ref={dialog} className="booking-detail-dialog" aria-labelledby="booking-detail-title"
    onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <header className="booking-detail-header">
      <div><p className="text-xs text-uni-muted">Rezervasyon detayı · {room?.code || 'Birim'} · {bookingStatuses[b.status]}</p><h2 id="booking-detail-title">{b.guest_name || 'Konaklama detayı'}</h2></div>
      <button type="button" className="nav-icon-button" autoFocus aria-label="Rezervasyon detayını kapat" onClick={onClose}><X size={21}/></button>
    </header>
    <nav className="booking-detail-tabs" aria-label="Rezervasyon detay bölümleri">{tabs.map(item=><button key={item.id} type="button" className="uni-button rounded-full" aria-pressed={tab===item.id} onClick={()=>setTab(item.id)}>{item.label}</button>)}</nav>
    <div className="booking-detail-content">
      {tab==='overview' && <div className="booking-detail-overview">
        <div className="booking-detail-summary"><BookingArrival booking={b}/><div className="text-right"><span className="block text-xs text-uni-muted">Gecelik fiyat</span><strong className="text-xl"><MoneyText minor={b.daily_price_minor || 0}/></strong><span className="mt-1 block text-xs text-uni-muted">{b.guest_count} kişi</span></div></div>
        <dl className="booking-detail-dates"><div><dt>Rezervasyon kaynağı</dt><dd>{bookingSourceLabel(b.source)}</dd></div>{b.external_reservation_id && <div><dt>Kanal rezervasyon numarası</dt><dd className="break-all">{b.external_reservation_id}</dd></div>}{b.external_property_id && <div><dt>Kanaldaki tesis kimliği</dt><dd className="break-all">{b.external_property_id}</dd></div>}</dl>
        <dl className="booking-detail-dates"><div><dt>Planlanan giriş</dt><dd>{boardDate(b.check_in)}</dd></div><div><dt>Planlanan çıkış</dt><dd>{boardDate(b.check_out)}</dd></div></dl>
        <div className="booking-detail-columns"><BookingGuestList booking={b}/><BookingActors booking={b}/></div>
        {b.notes && <section className="booking-detail-note"><h3>Rezervasyon notu</h3><p>{b.notes}</p></section>}
        {b.cancellation_reason && <section className="booking-detail-note"><h3>İptal gerekçesi</h3><p>{b.cancellation_reason}</p></section>}
      </div>}
      {tab==='folio' && canOperate && <RoomFolio booking={b} onDocuments={()=>setTab('documents')}/>}
      {tab==='documents' && <BookingDocuments initialKind={initialDocumentKind} snapshot={snapshot} booking={b} onFolio={canOperate?()=>setTab('folio'):undefined}/>}
      {tab==='guests' && editable && <BookingGuestsForm booking={b} hotelId={snapshot.hotel_id} onSaved={async()=>{await onRefresh();setTab('overview');}}/>}
      {tab==='history' && <div className="space-y-5">
        <BookingActors booking={b}/>
        <BookingArrival booking={b}/>
        <dl className="booking-detail-dates"><div><dt>Kayıt zamanı</dt><dd>{b.created_at ? boardDate(b.created_at) : 'Bilgi kaydedilmemiş'}</dd></div><div><dt>Son güncelleme</dt><dd>{b.updated_at ? boardDate(b.updated_at) : 'Bilgi kaydedilmemiş'}</dd></div></dl>
        <section><h3 className="mb-3 font-semibold">Birim geçmişi</h3><ol className="booking-detail-history">{(b.allocations || []).map(allocation=><li key={allocation.allocation_id}><strong>{snapshot.rooms.find(room=>room.room_id===allocation.room_id)?.code || 'Arşiv birimi'}</strong><span>{boardDate(allocation.start)} → {boardDate(allocation.end)}</span></li>)}</ol>{!b.allocations?.length && <p className="text-sm text-uni-muted">Birim hareketi kaydedilmemiş.</p>}</section>
      </div>}
    </div>
    {editable && <footer className="booking-detail-actions">
      {onTransition && b.status===BookingState.Confirmed && <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={()=>onTransition(b,'cancel')}>Rezervasyonu iptal et</button>}
      {onEdit && <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={()=>onEdit(b)}><Pencil size={16}/>Rezervasyonu düzenle</button>}
      {onMove && <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={()=>onMove(b)}><ArrowRightLeft size={16}/>Birim değiştir</button>}
      {onTransition && <button type="button" className="uni-button uni-button-primary rounded-full" style={statusStyle(b.status===BookingState.CheckedIn?"departure":"occupied")} onClick={()=>onTransition(b,b.status===BookingState.CheckedIn?'check_out':'check_in')}>{b.status===BookingState.CheckedIn?<LogOut size={16}/>:<LogIn size={16}/>} {b.status===BookingState.CheckedIn?'Çıkış yap':earlyArrival?'Erken giriş yap':'Giriş yap'}</button>}
    </footer>}
  </dialog>,document.body);
}
