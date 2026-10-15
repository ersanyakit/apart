"use client";
import { BookingStatus as BookingState } from '../../lib/statuses.generated';


import { STATUS_PALETTE, boardStatusKey, statusStyle } from "../../lib/status-palette";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown, Info, LogOut, Pencil, Users, X } from "lucide-react";
import { bookingStatuses, localized, unitKinds, type APIRoom, type Booking, type Floor } from "../../lib/api";
import { roomBoardState } from "../../lib/room-board";
import { useI18n } from "../I18n";
import { DateField, InlineSelectField, Switch, TextField } from "../fields";
import { DAY, TIME_ZONE, dayOf, dayTime, layoutSegments, monthBands, resourceGroups, segmentsFor, shiftDay } from "./model";
import { PageHeader } from "../PageHeader";
import { usePreference } from "../UserPreferences";
import styles from "./StaysScheduler.module.css";

export type StaysSchedulerProps = {
  variant?: "stays" | "bookings";
  anchorDay?: string;
  onContextMenu?: (event: React.MouseEvent, booking: Booking) => void;
  rooms: APIRoom[];
  floors: Floor[];
  bookings: Booking[];
  serverTime: string;
  busy?: boolean;
  onDetails: (booking: Booking) => void;
  onEdit?: (booking: Booking) => void;
  onMove?: (booking: Booking) => void;
  onCheckOut?: (booking: Booking) => void;
};

/** Resource timeline for the stays screen. All writes remain in the host's
 * authorized booking workflows; this component owns only view state. */
export function StaysScheduler({ variant = "stays", anchorDay, onContextMenu, rooms, floors, bookings, serverTime, busy = false, onDetails, onEdit, onMove, onCheckOut }: StaysSchedulerProps) {
  const { locale } = useI18n();
  const reservations = variant === "bookings";
  const [startDay, setStartDay] = useState(() => anchorDay || dayOf(serverTime));
  const [daysCount, setDaysCount] = usePreference<number>(`${variant}_days`, reservations ? 14 : 7);
  const [query, setQuery] = useState("");
  const [floorId, setFloorId] = useState("");
  const [status, setStatus] = usePreference<string>(`${variant}_status`, "all");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(serverTime);
  const scroll = useRef<HTMLDivElement>(null);
  const timeline = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(7 * 128);
  const [showEmpty, setShowEmpty] = usePreference<boolean>(`${variant}_show_empty`, reservations);
  useEffect(() => {
    const element = timeline.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setTrackWidth(element.getBoundingClientRect().width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const mountedAt = Date.now(), base = Date.parse(serverTime);
    setNow(serverTime);
    const timer = window.setInterval(() => setNow(new Date(base + Date.now() - mountedAt).toISOString()), 30_000);
    return () => window.clearInterval(timer);
  }, [serverTime]);
  useEffect(() => { if (scroll.current) scroll.current.scrollLeft = 0; }, [startDay, daysCount]);

  useEffect(() => { if (anchorDay) setStartDay(anchorDay); }, [anchorDay]);

  const start = dayTime(startDay), end = start + daysCount * DAY;
  const days = Array.from({ length: daysCount }, (_, i) => shiftDay(startDay, i));
  const needle = query.trim().toLocaleLowerCase(locale);
  const matching = bookings.filter(b => b.status !== BookingState.Cancelled && (reservations || status === "all" || b.status === status));
  const allSegments = useMemo(() => segmentsFor(bookings, now), [bookings, now]);
  const matchingIds = new Set(matching.filter(b => !needle ||
    `${b.guest_name} ${(b.guests || []).map(g => g.name).join(" ")}`.toLocaleLowerCase(locale).includes(needle)).map(b => b.booking_id));
  const floorGroups = resourceGroups(rooms, floors).map(g => ({...g, label: g.floor ? localized(g.floor.label, locale.toUpperCase()) || g.floor.code : "Kat atanmamış"}));
  const typeGroups = [...new Set(rooms.map(r => r.type || unitKinds[r.kind] || "Diğer birimler"))].sort((a,b) => a.localeCompare(b,locale)).map(type => ({
    id: `type:${type}`, label: type, rooms: floorGroups.flatMap(g => g.rooms).filter(({room}) => (room.type || unitKinds[room.kind] || "Diğer birimler") === type).sort((a,b) => a.room.code.localeCompare(b.room.code, locale, {numeric:true})),
  }));
  const candidateGroups = (reservations ? typeGroups : floorGroups).filter(g => !floorId || g.id === floorId)
    .map(g => ({ ...g, rooms: g.rooms.filter(({ room }) => (room.rentable !== false || allSegments.some(s => s.roomId === room.room_id && s.start < end && s.end > start)) && (!needle || `${room.code} ${room.name}`.toLocaleLowerCase(locale).includes(needle) ||
      allSegments.some(s => s.roomId === room.room_id && matchingIds.has(s.booking.booking_id) && s.start < end && s.end > start))) }))
    .filter(g => g.rooms.length);
  const candidateRoomIds = new Set(candidateGroups.flatMap(g => g.rooms.map(({ room }) => room.room_id)));
  const roomMatches = new Set(rooms.filter(r => `${r.code} ${r.name}`.toLocaleLowerCase(locale).includes(needle)).map(r => r.room_id));
  const allowedIds = new Set(matching.map(b => b.booking_id));
  const visibleSegments = allSegments.filter(s => candidateRoomIds.has(s.roomId) && allowedIds.has(s.booking.booking_id) &&
    (!needle || matchingIds.has(s.booking.booking_id) || roomMatches.has(s.roomId)) && s.start < end && s.end > start);
  const occupiedIds = new Set(visibleSegments.map(s => s.roomId));
  const groups = candidateGroups.map(g => ({ ...g, rooms: g.rooms.filter(({ room }) => showEmpty || occupiedIds.has(room.room_id)) })).filter(g => g.rooms.length);
  const visibleRoomIds = new Set(groups.flatMap(g => g.rooms.map(({ room }) => room.room_id)));
  const unique = [...new Map(visibleSegments.map(s => [s.booking.booking_id, s.booking])).values()];
  const selected = unique.find(b => b.booking_id === selectedId);
  const today = dayOf(now);
  const nowPosition = (Date.parse(now) - start) / (end - start) * 100;
  const date = (value: string | number, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
    new Date(value).toLocaleString(locale, { timeZone: TIME_ZONE, ...options });
  const toggle = (id: string) => setCollapsed(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const allCollapsed = groups.length > 0 && groups.every(g => collapsed.has(g.id));
  const round = `uni-control ${styles.roundButton}`;

  return <section className={`${styles.scheduler} ${styles.palette} ${reservations ? styles.reservations : ""}`} aria-label={reservations ? "Rezervasyon çizelgesi" : "Konaklayan birim ve tarih çizelgesi"} aria-busy={busy}>
    {!reservations && <PageHeader pageId="stays">
    <div className={styles.filters}>
      <TextField label="Birim veya misafir ara" value={query} onChange={setQuery} placeholder="İsim veya birim numarası" />
      <InlineSelectField label="Kat" value={floorId} onChange={setFloorId} options={[
        { value: "", label: "Tüm katlar" }, ...floors.map(f => ({ value: f.floor_id, label: localized(f.label, locale.toUpperCase()) || f.code })),
        { value: "unassigned", label: "Kat atanmamış" },
      ]} />
      <DateField label="Çizelge başlangıcı" value={startDay} withTime={false} onChange={v => { if (v && Number.isFinite(dayTime(v))) setStartDay(v); }} />
    </div>
    </PageHeader>}
    <div className={styles.toolbar}>
      <div className={styles.navigation}>
        <button type="button" className={`nav-icon-button ${styles.iconButton}`} aria-label="Önceki dönem" onClick={() => setStartDay(shiftDay(startDay, -daysCount))}><ChevronLeft size={20} /></button>
        <button type="button" className={round} onClick={() => setStartDay(today)}>Bugün</button>
        <button type="button" className={`nav-icon-button ${styles.iconButton}`} aria-label="Sonraki dönem" onClick={() => setStartDay(shiftDay(startDay, daysCount))}><ChevronRight size={20} /></button>
        <p className={styles.period}>{date(start)} – {date(end - 1, { day: "numeric", month: "short", year: "numeric" })}</p>
      </div>
      <div className={styles.navigation} role="group" aria-label="Görünen gün sayısı">
        {[7, 14, 30].map(n => <button type="button" key={n} className={round} aria-pressed={daysCount === n} onClick={() => setDaysCount(n)}>{n} gün</button>)}
      </div>
    </div>
    <div className={styles.toolbar}>
      {!reservations && <div className={styles.navigation} role="group" aria-label="Konaklama durumu">
        {[['all', 'Tüm kayıtlar'], [BookingState.CheckedIn, 'Konaklayanlar'], [BookingState.Confirmed, 'Rezervasyonlar'], [BookingState.Completed, 'Çıkış yapılanlar']].map(([value, label]) =>
          <button type="button" key={value} className={round} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</button>)}
      </div>}
      {reservations && <div className={styles.legend}>{[[BookingState.CheckedIn, "Konaklayan"], [BookingState.Confirmed, "Rezervasyon"], [BookingState.Completed, "Çıkış yapıldı"]].map(([value, label]) => <span key={value} data-status={value}><i />{label}<b>{unique.filter(b => b.status === value).length}</b></span>)}<span data-status="turnover"><i />Bugün giriş / çıkış<b>{unique.filter(b => [BookingState.Confirmed, BookingState.CheckedIn].some(status=>status===b.status) && [b.actual_check_in || b.check_in, b.check_out].some(value => Number.isFinite(Date.parse(value)) && dayOf(value) === today)).length}</b></span></div>}
      <div className={styles.navigation}><Switch label="Boş birimleri göster" checked={showEmpty} onChange={setShowEmpty} /><p className={styles.summary} role="status">{unique.length} konaklama · {unique.reduce((n, b) => n + b.guest_count, 0)} kişi · {visibleRoomIds.size} birim</p></div>
    </div>
    {selected && <div className={styles.selection} aria-label={`${selected.guest_name} konaklama işlemleri`}>
      <div className={styles.selectionInfo}>
        <strong>{selected.guest_name}</strong>
        <span>{selected.guest_count} kişi · {bookingStatuses[selected.status]} · {date(selected.actual_check_in || selected.check_in)} – {date(selected.actual_check_out || selected.check_out)}</span>
        <small>Rezervasyonu alan: {selected.created_by_name || "Bilgi kaydedilmemiş"}{selected.status === BookingState.Completed && ` · Çıkışı gerçekleştiren: ${selected.checked_out_by_name || "Bilgi kaydedilmemiş"}`}</small>
      </div>
      <div className={styles.navigation}>
        <button type="button" className={round} onClick={() => onDetails(selected)}><Info size={16} /> Detay</button>
        {onEdit && selected.status !== BookingState.Completed && <button type="button" className={round} disabled={busy} onClick={() => onEdit(selected)}><Pencil size={16} /> Düzenle</button>}
        {onMove && selected.status !== BookingState.Completed && <button type="button" className={round} disabled={busy} onClick={() => onMove(selected)}><ArrowRightLeft size={16} /> Taşı / Değiştir</button>}
        {onCheckOut && selected.status === BookingState.CheckedIn && <button type="button" className={`uni-button uni-button-primary ${styles.roundButton}`} style={statusStyle("departure")} disabled={busy} onClick={() => onCheckOut(selected)}><LogOut size={16} /> Çıkış</button>}
        <button type="button" className={`nav-icon-button ${styles.iconButton}`} aria-label="Konaklama seçimini kapat" onClick={() => setSelectedId(null)}><X size={18} /></button>
      </div>
    </div>}
    <div ref={scroll} className={styles.scroll} tabIndex={0} role="region" aria-label="Birim zaman çizelgesi, tarihleri görmek için yatay kaydırın">
      <div className={styles.canvas} style={{ "--days": daysCount } as React.CSSProperties}>
        <div className={styles.header}>
          <div className={styles.corner}>
            <button type="button" className="nav-icon-button" aria-label={allCollapsed ? "Tüm grupları aç" : "Tüm grupları kapat"} disabled={!groups.length}
              onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(groups.map(g => g.id)))}>{allCollapsed ? <ChevronsUpDown size={17} /> : <ChevronsDownUp size={17} />}</button>
            <span>Birimler<small>{reservations ? "Oda türü / birim" : "Kat / oda / yatak"}</small></span>
          </div>
          <div ref={timeline} className={styles.timeHeader}>
            <div className={styles.months}>{monthBands(days).map(band => <div key={band.month} style={{ gridColumn: `${band.start + 1} / span ${band.count}` }}>{date(dayTime(`${band.month}-01`), { month: "long", year: "numeric" })}</div>)}</div>
            <div className={styles.days}>{days.map(day => <div key={day} data-today={day === today} data-weekend={[0, 6].includes(new Date(dayTime(day) + 12 * 3600000).getUTCDay())}>
              <strong>{date(dayTime(day), { day: "numeric" })}</strong><span>{date(dayTime(day), { weekday: "short" })}</span>
            </div>)}</div>
          </div>
        </div>
        {groups.map(group => <React.Fragment key={group.id}>
          <div className={styles.floorRow}>
            <div className={styles.floorLabel}>
              <button type="button" className="nav-icon-button" aria-label={`${group.label} birimleri`} aria-expanded={!collapsed.has(group.id)} onClick={() => toggle(group.id)}>
                {collapsed.has(group.id) ? <ChevronRight size={17} /> : <ChevronDown size={17} />}
              </button>
              <strong>{group.label}</strong><small>{group.rooms.length}</small>
            </div>
          </div>
          {!collapsed.has(group.id) && group.rooms.map(({ room, depth }) => {
            const items = layoutSegments(visibleSegments.filter(s => s.roomId === room.room_id), start, end, 164 / Math.max(trackWidth, 164) * 100);
            const lanes = Math.max(1, ...items.map(item => item.lane + 1));
            const namesCount = reservations ? Math.max(1, ...items.map(item => item.segment.booking.guests?.length || 1)) : 1;
            const laneHeight = reservations ? 76 + (Math.min(namesCount, 4) + (namesCount > 4 ? 1 : 0)) * 18 : 74;
            const state = roomBoardState(rooms, bookings, room, now);
            return <div key={room.room_id} className={styles.row} style={{ height: lanes * laneHeight + 20 }}>
              <div className={styles.resource} style={{ paddingInlineStart: 16 + Math.min(depth, 3) * 14 }}>
                <div><strong>{room.code}</strong><span>{room.name || unitKinds[room.kind] || "Birim"}</span></div>
                <small data-tone={state.tone} style={{color:STATUS_PALETTE[boardStatusKey(state)].text}}>Şu an · {state.label}</small>
              </div>
              <div className={styles.track}>
                <div className={styles.cells} aria-hidden="true">{days.map(day => <div key={day} data-today={day === today} data-weekend={[0, 6].includes(new Date(dayTime(day) + 12 * 3600000).getUTCDay())} />)}</div>
                {nowPosition >= 0 && nowPosition < 100 && <div className={styles.now} style={{ left: `${nowPosition}%` }} aria-hidden="true" />}
                {items.map(({ segment, lane, left, width, cardLeft, cardWidth, continuesBefore, continuesAfter }) => {
                  const b = segment.booking;
                  const turnover = [BookingState.Confirmed, BookingState.CheckedIn].some(status=>status===b.status) && [b.actual_check_in || b.check_in, b.check_out].some(value => Number.isFinite(Date.parse(value)) && dayOf(value) === today);
                  const overdue = b.status === BookingState.CheckedIn && Date.parse(b.check_out) < Date.parse(now);
                  const description = `${room.code} · ${b.guest_name} · ${b.guest_count} kişi · ${bookingStatuses[b.status]} · ${date(segment.start, { dateStyle: "medium", timeStyle: "short" })} – ${date(segment.end, { dateStyle: "medium", timeStyle: "short" })}${overdue ? " · Çıkış tarihi geçti" : ""}`;
                  return <button type="button" key={segment.id} className={`uni-control ${styles.event}`} data-status={b.status} data-turnover={turnover} data-overdue={overdue} data-before={continuesBefore} data-after={continuesAfter}
                    aria-label={description} aria-pressed={selectedId === b.booking_id} title={description}
                    style={{ left: `${cardLeft}%`, width: `${cardWidth}%`, top: 10 + lane * laneHeight, ...(reservations ? {height: laneHeight - 10} : {}) }} onClick={() => reservations ? onDetails(b) : setSelectedId(b.booking_id)} onContextMenu={event => onContextMenu?.(event, b)}>
                    {reservations ? <div className={styles.guestNames}>{(b.guests?.length ? b.guests.map(g => g.name) : [b.guest_name]).slice(0, 4).map((name, i) => <strong key={i}>{name}</strong>)}{(b.guests?.length || 0) > 4 && <small>+{b.guests!.length - 4} misafir</small>}</div> : <strong>{b.guest_name}</strong>}
                    <span><Users size={12} aria-hidden="true" />{b.guest_count} kişi · {overdue ? "Çıkış tarihi geçti" : bookingStatuses[b.status]}</span>
                    <small>{date(segment.start, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} – {date(segment.end, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
                    {reservations && <small>{b.status === BookingState.CheckedIn ? `Giriş: ${b.checked_in_by_name || "Personel kaydedilmemiş"}` : b.status === BookingState.Completed ? `Çıkış: ${b.checked_out_by_name || "Personel kaydedilmemiş"}` : `Alan: ${b.created_by_name || "Personel kaydedilmemiş"}`}</small>}
                    <i className={styles.duration} aria-hidden="true" style={{ left: `${(left - cardLeft) / cardWidth * 100}%`, width: `${width / cardWidth * 100}%` }} />
                  </button>;
                })}
              </div>
            </div>;
          })}
        </React.Fragment>)}
      </div>
    </div>
    {!unique.length && <p className={styles.empty}>Bu tarih aralığında ve filtrelerde konaklama bulunmuyor.</p>}
    <footer className={styles.footer}><span><i className={styles.todayDot} /> Şu an</span><span><i className={styles.stayDot} /> Giriş yapıldı</span><span><i className={styles.reservationDot} /> Rezervasyon</span><span><i className={styles.departedDot} /> Çıkış yapıldı</span><span><i className={styles.turnoverDot} /> Bugün giriş / çıkış</span><small>{reservations ? "Detay ve işlemler için rezervasyona tıklayın. Sağ tık ile işlem menüsünü açın." : "İşlemler için misafiri seçin."} Alt çizgi gerçek süreyi gösterir. Saatler Türkiye saatidir.</small></footer>
  </section>;
}
