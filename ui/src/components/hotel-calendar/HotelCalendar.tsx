"use client";
import { BookingStatus as BookingState } from '../../lib/statuses.generated';

import { PageHeader } from "../PageHeader";
import { usePreference } from "../UserPreferences";
import { useNotifications } from "../Toast";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Printer, Search } from "lucide-react";
import { bookingStatuses, type APIRoom, type Booking } from "../../lib/api";
import { useI18n } from "../I18n";
import { formatMoney, useCurrency } from "../Currency";
import { UniSelect } from "../UniSelect";
import { addDays, calendarCSV, dayKey, dayStart, guestNameList, guestNames, overlaps, shiftDate, stayEvents, timelineLayout, viewRange, weekLayout, weekStart, type CalendarView, type StayEvent } from "./model";
import { printCalendar } from "./print";

export type HotelCalendarProps = {
  bookings: Booking[];
  rooms: APIRoom[];
  propertyName: string;
  initialDate?: Date;
  /** Host actions share the calendar header; the host must not render a second page title. */
  headerActions?: React.ReactNode;
  onOpenBooking?: (booking: Booking) => void;
};

/** Reusable hotel calendar; receives tenant-scoped data and owns no API/session state. */
export function HotelCalendar({ bookings, rooms, propertyName, initialDate, headerActions, onOpenBooking }: HotelCalendarProps) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [date,setDate] = useState(() => dayStart(initialDate ?? new Date()));
  const [view,setView] = usePreference<CalendarView>("calendar_view", "month");
  const [query,setQuery] = useState("");
  const [status,setStatus] = usePreference<string>("calendar_status", "active");
  const notify = useNotifications();
  const printable = useRef<HTMLDivElement>(null);
  const { locale } = useI18n();
  const { currency,format } = useCurrency();
  const [now,setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()),60000); return () => clearInterval(timer); },[]);
  const range = viewRange(date,view);
  const gridStart = view === "month" ? weekStart(range.start) : range.start;
  const gridEnd = view === "month" ? addDays(weekStart(addDays(range.end,-1)),7) : range.end;
  const allEvents = useMemo(() => stayEvents(bookings,rooms,now),[bookings,rooms,now]);
  const search = query.trim().toLocaleLowerCase(locale);
  const filtered = allEvents.filter(e => (status === "all" || (status === "active" ? e.booking.status !== BookingState.Cancelled : e.booking.status === status)) && (!search || `${e.roomCode} ${guestNames(e.booking)} ${e.booking.guests?.map(g => `${g.phone || ""} ${g.tcNo || ""}`).join(" ")}`.toLocaleLowerCase(locale).includes(search)));
  const visible = filtered.filter(e => overlaps(e,range.start,range.end));
  const unique = [...new Map(visible.map(e => [e.booking.booking_id,e.booking])).values()];
  const title = view === "month" ? date.toLocaleDateString(locale,{month:"long",year:"numeric"}) : view === "day" ? date.toLocaleDateString(locale,{day:"numeric",month:"long",year:"numeric"}) : `${range.start.toLocaleDateString(locale,{day:"numeric",month:"short"})} – ${addDays(range.end,-1).toLocaleDateString(locale,{day:"numeric",month:"short",year:"numeric"})}`;
  const weeks: Date[] = [];
  for(let cursor=gridStart; cursor<gridEnd; cursor=addDays(cursor,7)) weeks.push(cursor);
  const eventTitle = (e: StayEvent) => `${e.roomCode} · ${guestNames(e.booking)} · ${bookingStatuses[e.booking.status]} · ${e.booking.guest_count} kişi · ${formatMoney(e.booking.daily_price_minor,currency,format)} / gece`;
  const eventButton = (event: StayEvent, style?: React.CSSProperties, compact=false) => <button type="button" key={event.id} className={`hc-event hc-${event.booking.status}`} style={style} onClick={() => onOpenBooking?.(event.booking)} title={eventTitle(event)} aria-label={eventTitle(event)}><span className="hc-event-title"><b>{event.roomCode}</b></span><span className="hc-event-guests">{guestNameList(event.booking).map(name => <span key={name} title={name}>{name}</span>)}</span>{!compact && <span className="hc-event-meta">{event.booking.guest_count} {_uiText("kişi ·")} {formatMoney(event.booking.daily_price_minor,currency,format)}</span>}</button>;
  const exportCSV = () => {
    const url=URL.createObjectURL(new Blob([calendarCSV(visible,bookingStatuses,currency)],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download=`otel-takvimi-${view}-${dayKey(range.start)}.csv`;link.click();setTimeout(() => URL.revokeObjectURL(url),1000);
    notify(_uiText("{value1} rezervasyon CSV olarak indirildi.", {value1: String(unique.length)}));
  };
  const timelineRooms = rooms.filter(r => r.rentable && (!search || r.code.toLocaleLowerCase(locale).includes(search) || visible.some(e => e.roomId === r.room_id))).map(r => ({ id:r.room_id,code:r.code,name:r.name }));
  for(const e of visible) if(!timelineRooms.some(r => r.id===e.roomId)) timelineRooms.push({id:e.roomId,code:e.roomCode,name:"Arşiv birimi"});
  const ticks = view === "day" ? Array.from({length:24},(_,i) => String(i).padStart(2,"0")+":00") : Array.from({length:7},(_,i) => addDays(range.start,i).toLocaleDateString(locale,{weekday:"short",day:"numeric"}));
  return <section className="hc" aria-label={_uiText("Otel konaklama takvimi")}>
    <PageHeader pageId="calendar" propertyName={propertyName} globalActions={headerActions} actions={<>
<button type="button" className="uni-button uni-button-secondary" disabled={!visible.length} onClick={exportCSV}><Download size={16}/>{"CSV"}</button><button type="button" className="uni-button uni-button-secondary" onClick={() => printable.current && printCalendar(printable.current,`${propertyName} · ${title}`)}><Printer size={16}/>{"Yazdır / PDF"}</button>
    </>}>
    <div className="hc-controls">
      <div className="hc-date-navigation"><button type="button" className="nav-icon-button" aria-label={_uiText("Önceki dönem")} onClick={() => setDate(shiftDate(date,view,-1))}><ChevronLeft size={20}/></button><button type="button" className="nav-icon-button" aria-label={_uiText("Sonraki dönem")} onClick={() => setDate(shiftDate(date,view,1))}><ChevronRight size={20}/></button><h3 aria-live="polite">{title}</h3><button type="button" className="uni-button uni-button-secondary" onClick={() => setDate(dayStart(new Date()))}>{_uiText("Bugün")}</button></div>
      <div className="hc-views" role="group" aria-label={_uiText("Takvim görünümü")}>{([["day","Gün"],["week","Hafta"],["month","Ay"]] as const).map(([id,label]) => <button key={id} type="button" aria-pressed={view===id} onClick={() => setView(id)}>{label}</button>)}</div>
    </div>
    <div className="hc-filters"><label className="hc-search"><Search size={18}/><input aria-label={_uiText("Takvimde misafir veya birim ara")} placeholder={_uiText("Misafir, telefon, kimlik veya birim ara…")} value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="hc-status-select"><UniSelect caption={_uiText("Durum")} ariaLabel={_uiText("Takvim durum filtresi")} icon={<CalendarDays size={18}/>} value={status} options={[{value:"active",label:"İptal dışındaki kayıtlar"},{value:"all",label:"Tüm durumlar"},...Object.entries(bookingStatuses).map(([value,label])=>({value,label}))]} onChange={setStatus}/></div><input className="uni-input hc-date-input" type="date" aria-label={_uiText("Takvim tarihi")} value={dayKey(date)} onChange={e=>{if(e.target.value) setDate(new Date(e.target.value+"T12:00:00"));}}/></div>
    </PageHeader>
    <div ref={printable}>
      <div className="hc-summary"><span><strong>{unique.length}</strong> {_uiText("rezervasyon")}</span><span><strong>{unique.reduce((sum,b)=>sum+b.guest_count,0)}</strong> {_uiText("kayıtlı kişi")}</span><span className="hc-summary-hint">{title}</span></div>
      <div className="hc-scroll" tabIndex={0} aria-label={_uiText("Takvim çizelgesi; dar ekranda yatay kaydırabilirsiniz")}>
        {view === "month" ? <div className="hc-month">
          <div className="hc-weekdays">{Array.from({length:7},(_,i)=><div key={i}>{addDays(gridStart,i).toLocaleDateString(locale,{weekday:"long"})}</div>)}</div>
          {weeks.map(start => {
            const items=weekLayout(filtered,start);
            return <div key={dayKey(start)} className="hc-month-week" style={{minHeight:138}}>
              <div className="hc-day-cells">{Array.from({length:7},(_,i)=>{const day=addDays(start,i);return <div key={i} className={`hc-day-cell ${day.getMonth()!==date.getMonth()?"hc-outside":""} ${dayKey(day)===dayKey(now)?"hc-today":""}`}><button type="button" aria-label={_uiText("{value1} günlük görünüm", {value1: String(day.toLocaleDateString(locale))})} onClick={()=>{setDate(day);setView("day");}}>{day.getDate()}</button></div>;})}</div>
              <div className="hc-month-events">{items.map(({event,from,to,lane})=>eventButton(event,{gridColumn:`${from+1} / ${to+1}`,gridRow:lane+1},true))}</div>
            </div>;
          })}
        </div> : <div className={`hc-timeline hc-timeline-${view}`}>
          <div className="hc-timeline-heading"><div className="hc-room-heading">{_uiText("Birim")}</div><div className="hc-ticks" style={{gridTemplateColumns:`repeat(${ticks.length},1fr)`}}>{ticks.map(t=><span key={t}>{t}</span>)}</div></div>
          {timelineRooms.map(room => {
            const items = timelineLayout(visible.filter(event => event.roomId === room.id), range.start, range.end);
            return <div className="hc-timeline-row" key={room.id}>
              <div className="hc-room-label"><strong>{room.code}</strong><small>{room.name || _uiText("Birim")}</small></div>
              <div className="hc-tracks" style={{backgroundSize:`${100/ticks.length}% 100%`}}>
                {items.map(({event, left, width}) => <div key={event.id} className="hc-timeline-entry">
                  {eventButton(event)}
                  <div className="hc-stay-period"><strong>{_uiText("Konaklama aralığı:")} </strong>{event.start.toLocaleString(locale,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} – {event.end.toLocaleString(locale,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                  <div className="hc-duration-track" aria-hidden="true"><span className={`hc-duration-bar hc-${event.booking.status}`} style={{left:`${left}%`,width:`${width}%`}} /></div>
                </div>)}
                {view === "day" && now >= range.start && now < range.end && <div className="hc-now" style={{left:`${(+now-+range.start)/(+range.end-+range.start)*100}%`}} />}
              </div>
            </div>;
          })}
        </div>}
      </div>
      {!visible.length && <p className="hc-empty">{_uiText("Bu dönem ve filtreler için konaklama kaydı bulunamadı.")}</p>}
      <footer className="hc-legend">{Object.entries(bookingStatuses).map(([id,label])=><span key={id}><i className={`hc-${id}`}/>{label}</span>)}<small>{_uiText("Konaklama detayları için bir kayda dokunun.")}</small></footer>
    </div>
  </section>;
}
