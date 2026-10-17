"use client";
import { useI18n } from "./I18n";

import { BookingStatus as BookingState } from '../lib/statuses.generated';

import { statusStyle } from "../lib/status-palette";
import { bookingSourceLabel } from "../lib/booking-origin";
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Pencil, LogIn, LogOut, ArrowRightLeft, StickyNote } from 'lucide-react';
import { bookingStatuses, command, messageOf, type Booking, type Snapshot } from '../lib/api';
import { boardDate } from '../lib/room-board';
import { COLUMNS, noteDate, type Note, type NotePage } from './kanban/model';
import { MoneyText, TextAreaField, TextField } from './fields';
import { useNotifications } from './Toast';
import { BookingGuestList } from './BookingGuestList';
import { BookingActors } from './BookingActors';
import { BookingArrival } from './BookingArrival';
import { RoomFolio } from './RoomFolio';
import { BookingDocuments } from './DocumentsView';
import { BookingGuestsForm } from './BookingForm';

export type BookingDetailTab = 'overview' | 'folio' | 'documents' | 'history' | 'guests';
export function BookingDetails({ booking: b, snapshot, initialTab = 'overview', onClose, onEdit, onMove, onPayment, onTransition, onRefresh, initialDocumentKind, folioRefreshKey }: {
  booking: Booking; snapshot: Snapshot; initialTab?: BookingDetailTab;
  initialDocumentKind?: string; onClose: () => void; onEdit?: (booking: Booking) => void; onMove?: (booking: Booking) => void;
  onPayment?: (booking: Booking) => void;
  onTransition?: (booking: Booking, action: string) => void; onRefresh: () => Promise<void>;
  /** Tahsilat gibi dış işlemlerden sonra folyoyu yeniden yükler. */
  folioRefreshKey?: number;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

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
    {id:'overview',label:_uiText("Genel bakış")},
    ...(canOperate ? [{id:'folio' as const,label:_uiText("Folyo ve hizmetler")}] : []),
    {id:'documents',label:_uiText("Belgeler")}, {id:'history',label:_uiText("İşlem geçmişi")},
    ...(editable ? [{id:'guests' as const,label:_uiText("Misafirleri düzenle")}] : []),
  ];
  return createPortal(<dialog ref={dialog} className="booking-detail-dialog" aria-labelledby="booking-detail-title"
    onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <header className="booking-detail-header">
      <div><p className="text-xs text-uni-muted">{_uiText("Rezervasyon detayı ·")} {room?.code || _uiText("Birim")} · {bookingStatuses[b.status]}</p><h2 id="booking-detail-title">{b.guest_name || _uiText("Konaklama detayı")}</h2></div>
      <button type="button" className="nav-icon-button" autoFocus aria-label={_uiText("Rezervasyon detayını kapat")} onClick={onClose}><X size={21}/></button>
    </header>
    <nav className="booking-detail-tabs" aria-label={_uiText("Rezervasyon detay bölümleri")}>{tabs.map(item=><button key={item.id} type="button" className="uni-button rounded-full" aria-pressed={tab===item.id} onClick={()=>setTab(item.id)}>{item.label}</button>)}</nav>
    <div className="booking-detail-content">
      {tab==='overview' && <div className="booking-detail-overview">
        <div className="booking-detail-summary"><BookingArrival booking={b}/><div className="text-right"><span className="block text-xs text-uni-muted">{_uiText("Gecelik fiyat")}</span><strong className="text-xl"><MoneyText minor={b.daily_price_minor || 0}/></strong><span className="mt-1 block text-xs text-uni-muted">{b.guest_count} {_uiText("kişi")}</span></div></div>
        <dl className="booking-detail-dates"><div><dt>{_uiText("Rezervasyon kaynağı")}</dt><dd>{bookingSourceLabel(b.source)}</dd></div>{b.external_reservation_id && <div><dt>{_uiText("Kanal rezervasyon numarası")}</dt><dd className="break-all">{b.external_reservation_id}</dd></div>}{b.external_property_id && <div><dt>{_uiText("Kanaldaki tesis kimliği")}</dt><dd className="break-all">{b.external_property_id}</dd></div>}</dl>
        <dl className="booking-detail-dates"><div><dt>{_uiText("Planlanan giriş")}</dt><dd>{boardDate(b.check_in, _uiLocale)}</dd></div><div><dt>{_uiText("Planlanan çıkış")}</dt><dd>{boardDate(b.check_out, _uiLocale)}</dd></div></dl>
        <div className="booking-detail-columns"><BookingGuestList booking={b}/><BookingActors booking={b}/></div>
        {editable
          ? <BookingNoteEditor booking={b} hotelId={snapshot.hotel_id} onRefresh={onRefresh}/>
          : (b.notes && <section className="booking-detail-note"><h3>{_uiText("Rezervasyon notu")}</h3><p>{b.notes}</p><p className="mt-2 text-xs text-uni-muted">{_uiText("Bu not, Resepsiyon Notları panosunda oda bilgisiyle birlikte kart olarak görünür.")}</p></section>)}
        {b.cancellation_reason && <section className="booking-detail-note"><h3>{_uiText("İptal gerekçesi")}</h3><p>{b.cancellation_reason}</p></section>}
      </div>}
      {tab==='folio' && canOperate && <RoomFolio booking={b} onDocuments={()=>setTab('documents')} onPayment={onPayment&&editable?()=>onPayment(b):undefined} refreshKey={folioRefreshKey}/>}
      {tab==='documents' && <BookingDocuments initialKind={initialDocumentKind} snapshot={snapshot} booking={b} onFolio={canOperate?()=>setTab('folio'):undefined}/>}
      {tab==='guests' && editable && <BookingGuestsForm booking={b} hotelId={snapshot.hotel_id} onSaved={async()=>{await onRefresh();setTab('overview');}}/>}
      {tab==='history' && <div className="space-y-5">
        <BookingActors booking={b}/>
        <BookingArrival booking={b}/>
        <dl className="booking-detail-dates"><div><dt>{_uiText("Kayıt zamanı")}</dt><dd>{b.created_at ? boardDate(b.created_at, _uiLocale) : _uiText("Bilgi kaydedilmemiş")}</dd></div><div><dt>{_uiText("Son güncelleme")}</dt><dd>{b.updated_at ? boardDate(b.updated_at, _uiLocale) : _uiText("Bilgi kaydedilmemiş")}</dd></div></dl>
        <section><h3 className="mb-3 font-semibold">{_uiText("Birim geçmişi")}</h3><ol className="booking-detail-history">{(b.allocations || []).map(allocation=><li key={allocation.allocation_id}><strong>{snapshot.rooms.find(room=>room.room_id===allocation.room_id)?.code || _uiText("Arşiv birimi")}</strong><span>{boardDate(allocation.start, _uiLocale)} → {boardDate(allocation.end, _uiLocale)}</span></li>)}</ol>{!b.allocations?.length && <p className="text-sm text-uni-muted">{_uiText("Birim hareketi kaydedilmemiş.")}</p>}</section>
      </div>}
    </div>
    {editable && <footer className="booking-detail-actions">
      {onTransition && b.status===BookingState.Confirmed && <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={()=>onTransition(b,'cancel')}>{_uiText("Rezervasyonu iptal et")}</button>}
      {onEdit && <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={()=>onEdit(b)}><Pencil size={16}/>{_uiText("Rezervasyonu düzenle")}</button>}
      {onMove && <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={()=>onMove(b)}><ArrowRightLeft size={16}/>{_uiText("Birim değiştir")}</button>}
      {onTransition && <button type="button" className="uni-button uni-button-primary rounded-full" style={statusStyle(b.status===BookingState.CheckedIn?"departure":"occupied")} onClick={()=>onTransition(b,b.status===BookingState.CheckedIn?'check_out':'check_in')}>{b.status===BookingState.CheckedIn?<LogOut size={16}/>:<LogIn size={16}/>} {b.status===BookingState.CheckedIn?_uiText("Çıkış yap"):earlyArrival?_uiText("Erken giriş yap"):_uiText("Giriş yap")}</button>}
    </footer>}
    </dialog>,document.body);
}

/**
 * Detay ekranındaki rezervasyon notu düzenleyici. Kaydetme
 * `booking.update` üzerinden yapılır; sunucu not metnini
 * Resepsiyon Notları panosundaki bağlı karta aynalar
 * (yeni kart / yerinde güncelleme / temizlenince arşiv).
 */
function BookingNoteEditor({ booking: b, hotelId, onRefresh }: {
  booking: Booking; hotelId: string; onRefresh: () => Promise<void>;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const notify = useNotifications();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(b.notes || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [linked, setLinked] = useState<Note[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");
  const loadLinked = async () => {
    try {
      const page = await command<NotePage>("note.list", { hotel_id: hotelId, branch_id: b.branch_id, booking_id: b.booking_id, page: 1 });
      setLinked(page.items);
    } catch {
      setLinked(null);
    }
  };
  useEffect(() => { void loadLinked(); }, [b.booking_id]);
  const open = () => { setText(b.notes || ""); setError(""); setEditing(true); };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await command("booking.update", {
        branch_id: b.branch_id,
        booking_id: b.booking_id,
        room_id: b.room_id,
        guest_name: b.guest_name,
        guest_count: b.guest_count,
        daily_price_minor: b.daily_price_minor || 0,
        check_in: b.check_in,
        check_out: b.check_out,
        guests: b.guests || [],
        notes: text,
      });
      setEditing(false);
      await onRefresh();
      await loadLinked();
      notify(text.trim() ? _uiText("Not kaydedildi, panoya eklendi.") : _uiText("Not silindi, pano kartı arşivlendi."));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  const add = async () => {
    const title = newTitle.trim();
    if (!title) { setAddError("Başlık yazın."); return; }
    setAddBusy(true);
    setAddError("");
    try {
      await command("note.save", {
        id: crypto.randomUUID(), hotel_id: hotelId, branch_id: b.branch_id,
        booking_id: b.booking_id, booking_auto: false,
        title: title.slice(0, 160), body: newBody.trim(),
        status: "todo", priority: "normal", archived: false, version: 0,
      });
      setNewTitle(""); setNewBody(""); setAdding(false);
      await loadLinked();
      notify(_uiText("Not panoya eklendi."));
    } catch (e) {
      setAddError(messageOf(e));
    } finally {
      setAddBusy(false);
    }
  };
  if (!editing) {
    return <section className="booking-detail-note">
      <div className="flex items-start justify-between gap-3">
        <h3>{_uiText("Rezervasyon notu")}</h3>
        <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={open}>
          <Pencil size={16} />{b.notes ? _uiText("Notu düzenle") : _uiText("Not ekle")}
        </button>
      </div>
      {b.notes
        ? <><p className="mt-2">{b.notes}</p><p className="mt-2 text-xs text-uni-muted">{_uiText("Bu not, Resepsiyon Notları panosunda oda bilgisiyle birlikte kart olarak görünür.")}</p></>
        : <p className="mt-2 text-sm text-uni-muted">{_uiText("Henüz not yok. Ekleyeceğiniz not panoya kart olarak düşer.")}</p>}
      <LinkedBookingNotes linked={linked} adding={adding} setAdding={setAdding}
        newTitle={newTitle} setNewTitle={setNewTitle} newBody={newBody} setNewBody={setNewBody}
        addBusy={addBusy} addError={addError} onAdd={() => void add()} />
    </section>;
  }
  return <section className="booking-detail-note">
    <div className="flex items-start justify-between gap-3">
      <h3>{b.notes ? _uiText("Notu düzenle") : _uiText("Not ekle")}</h3>
      <StickyNote size={18} aria-hidden="true" className="shrink-0 text-slate-400" />
    </div>
    <div className="mt-3">
      <TextAreaField label={_uiText("Rezervasyon notu")} value={text} onChange={setText} placeholder={_uiText("Özel istekler, varış saati vb.")} rows={4} disabled={busy} uppercase />
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    <p className="mt-2 text-xs text-uni-muted">{_uiText("Kaydetmeniz bu notu panodaki karta işler; yazıyı silmeniz kartı arşivler.")}</p>
    <div className="mt-3 flex gap-2">
      <button type="button" className="uni-button uni-button-secondary rounded-full" disabled={busy} onClick={() => setEditing(false)}>{_uiText("Vazgeç")}</button>
      <button type="button" className="uni-button uni-button-primary rounded-full" disabled={busy} onClick={() => void save()}>{busy ? _uiText("Kaydediliyor…") : _uiText("Notu kaydet")}</button>
    </div>
  </section>;
}

/** Rezervasyona bağlı pano kartları: otomatik kart + elle eklenenler. */
function LinkedBookingNotes({ linked, adding, setAdding, newTitle, setNewTitle, newBody, setNewBody, addBusy, addError, onAdd }: {
  linked: Note[] | null; adding: boolean; setAdding: (v: boolean) => void;
  newTitle: string; setNewTitle: (v: string) => void; newBody: string; setNewBody: (v: string) => void;
  addBusy: boolean; addError: string; onAdd: () => void;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const statusLabel = (value: Note["status"]) => COLUMNS.find(c => c.value === value)?.label ?? value;
  return <div className="mt-4 border-t border-slate-200/70 pt-3">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold">{_uiText("Panodaki notlar")}{linked ? _uiText(" · {value1}", {value1: String(linked.length)}) : ""}</h3>
      {!adding && <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={() => setAdding(true)}>{_uiText("Panoya not ekle")}</button>}
    </div>
    {linked && linked.length > 0 && <ul className="mt-3 space-y-2">
      {linked.map(note => <li key={note.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <strong className="min-w-0 truncate text-sm">{note.title}</strong>
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">{statusLabel(note.status)}</span>
        </div>
        {note.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{note.body}</p>}
        <p className="mt-1 text-[11px] text-slate-400">{note.created_by_name} · {noteDate(note.created_at)}</p>
      </li>)}
    </ul>}
    {linked && linked.length === 0 && !adding && <p className="mt-2 text-sm text-uni-muted">{_uiText("Bu rezervasyona bağlı pano kartı yok.")}</p>}
    {adding && <div className="mt-3 space-y-3">
      <TextField label={_uiText("Başlık")} value={newTitle} onChange={setNewTitle} placeholder={_uiText("Örn. Geç çıkış talebi")} maxLength={160} required />
      <TextAreaField label={_uiText("Not")} value={newBody} onChange={setNewBody} placeholder={_uiText("Ekip için ayrıntı…")} rows={3} disabled={addBusy} uppercase />
      {addError && <p role="alert" className="text-sm text-red-600">{addError}</p>}
      <div className="flex gap-2">
        <button type="button" className="uni-button uni-button-secondary rounded-full" disabled={addBusy} onClick={() => setAdding(false)}>{_uiText("Vazgeç")}</button>
        <button type="button" className="uni-button uni-button-primary rounded-full" disabled={addBusy || !newTitle.trim()} onClick={onAdd}>{addBusy ? _uiText("Ekleniyor…") : _uiText("Panoya ekle")}</button>
      </div>
    </div>}
  </div>;
}
