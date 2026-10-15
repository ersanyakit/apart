'use client';
import { BookingStatus as BookingState } from '../../lib/statuses.generated';

import { RoomStatus as RoomState } from '../../lib/statuses.generated';

import { sceneStatusColor } from "./model";
import { STATUS_PALETTE, roomStatusKey } from "../../lib/status-palette";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BedDouble, Box, Layers, RefreshCw, X } from 'lucide-react';
import { command, messageOf, unitKinds, type APIRoom, type Booking, type Snapshot } from '../../lib/api';
import type { Bed } from '../../lib/bed-presets';
import { boardDate } from '../../lib/room-board';
import { InlineSelectField, Switch, TextField } from '../fields';
import { usePreference } from '../UserPreferences';
import { PropertyCanvas } from './PropertyCanvas';
import { buildPropertyScene, visibleScene, sceneBookingTarget, STATUS_COLORS, STATUS_LABELS, type SceneUnit } from './model';
import styles from './PropertyView.module.css';

/** Numeric SVG floor icons share a fixed canvas and optical center. */
function FloorMark({ number }: { number: number }) {
  return <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" fill="currentColor">
    <text x="14" y="14" textAnchor="middle" dominantBaseline="central"
      fontFamily="Inter, Arial, sans-serif" fontWeight="600" fontSize={String(number).length > 2 ? "12" : String(number).length > 1 ? "16" : "20"}
      style={{fontVariantNumeric:'tabular-nums'}}>{number}</text>
  </svg>;
}

export function PropertyView({ snapshot: initialSnapshot, onOpenBooking, onBook, onDefinitions }: {
  snapshot: Snapshot;
  onOpenBooking?: (booking: Booking) => void; onBook?: (room: APIRoom) => void; onDefinitions?: () => void;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  useEffect(() => { setSnapshot(initialSnapshot); }, [initialSnapshot]);
  const [beds, setBeds] = useState<Bed[]>([]), [bedError, setBedError] = useState('');
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [refreshError, setRefreshError] = useState('');
  const [revision, setRevision] = useState(0);
  const [floorId, setFloorId] = useState('all'), [query, setQuery] = useState(''), [tone, setTone] = useState('all');
  const [onlyAvailableBeds, setOnlyAvailableBeds] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null), [hoverId, setHoverId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const detailsRef = useRef<HTMLElement>(null);
  useEffect(() => { if (detailsRef.current) detailsRef.current.scrollTop = 0; }, [selectedId]);
  const select = (id: string | null) => { setSelectedId(id); if (id) setPanelOpen(true); };
  const [focusRequest, setFocusRequest] = useState<{ id: string; version: number }>();
  const activate = (id: string | null) => {
    select(id);
    if (id) setFocusRequest(previous => ({ id, version: (previous?.version || 0) + 1 }));
  };
  const [exploded, setExploded] = usePreference<boolean>('property3d_exploded', true);
  const [walls, setWalls] = usePreference<boolean>('property3d_walls', true);
  const refreshController = useRef<AbortController | null>(null);
  const scope = useRef({ hotel_id: initialSnapshot.hotel_id, branch_id: initialSnapshot.branch_id });
  const refreshingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; refreshController.current?.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setBedError('');
    command<Bed[]>('bed.list', { branch_id: snapshot.branch_id }, undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setBeds(data || []); })
      .catch(error => { if (!controller.signal.aborted) setBedError(messageOf(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [snapshot.branch_id, snapshot.server_time, revision]);
  async function refresh() {
    if (refreshingRef.current) return;
    refreshingRef.current = true; setRefreshing(true); setRefreshError('');
    const controller = new AbortController(); refreshController.current = controller;
    try {
      const data = await command<Snapshot>('system.initial_sync', scope.current, undefined, controller.signal);
      if (mounted.current && !controller.signal.aborted) { setSnapshot({ ...data, rooms: data.rooms || [], floors: data.floors || [], bookings: data.bookings || [] }); setRevision(v => v + 1); }
    }
    catch (error) { if (mounted.current) setRefreshError(messageOf(error)); }
    finally { refreshingRef.current = false; if (mounted.current) setRefreshing(false); }
  }
  useEffect(() => {
    const update = () => { if (document.visibilityState === 'visible') void refresh(); };
    const initialRefresh = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60000);
    window.addEventListener('focus', update);
    return () => { window.clearTimeout(initialRefresh); window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  const floors = useMemo(() => buildPropertyScene(snapshot, beds), [snapshot, beds]);
  const effectiveFloor = floors.some(f => f.id === floorId) ? floorId : 'all';
  const filtered = useMemo(() => visibleScene(floors, effectiveFloor, query, tone, onlyAvailableBeds), [floors, effectiveFloor, query, tone, onlyAvailableBeds]);
  const rooms = filtered.flatMap(f => f.rooms);
  const units = new Map<string, SceneUnit>();
  for (const room of rooms) { units.set(room.unit.room_id, room); for (const bed of room.beds.filter(b => !b.visualOnly)) units.set(bed.unit.room_id, bed); }
  const selected = selectedId ? units.get(selectedId) : undefined;
  const selectedRoom = selectedId ? rooms.find(r => r.unit.room_id === selectedId || r.beds.some(b => b.unit.room_id === selectedId)) : undefined;
  const hover = hoverId ? units.get(hoverId) : undefined;
  const places = [...units.values()].filter(u => u.unit.kind === 'bed');
  const bookings = selected?.state.bookings || [];
  const currentStays = selected?.state.current.filter(booking => booking.status === BookingState.CheckedIn) || [];
  const bookableUnit = selectedId ? sceneBookingTarget(snapshot, selectedId) : undefined;
  const clearFilters = () => { setFloorId('all'); setTone('all'); setQuery(''); setOnlyAvailableBeds(false); };
  return <div className={styles.page}>
    {(bedError || refreshError) && <div className={styles.notice} role="alert"><p>{bedError ? `Fiziksel yatak ölçüleri alınamadı: ${bedError}. Birim kayıtları gösteriliyor.` : `Veriler yenilenemedi: ${refreshError}`}</p><button type="button" className="uni-button uni-button-secondary rounded-full" onClick={() => void refresh()}>Tekrar dene</button></div>}
    {rooms.length ? <div className={`${styles.workspace}${panelOpen ? '' : ` ${styles.detailsHidden}`}`}>
      <div className={styles.sceneColumn}>
        <PropertyCanvas floorControls={<nav className={styles.floorTabs} aria-label="3B kat görünümü">
      <div className={styles.floorGrid}>
        {[{ id: 'all', label: 'Tüm katlar' }, ...floors].map(floor => {
          const number = floor.label.trim().match(/^(?:kat\s*)?(-?\d+)\.?(?:\s*kat)?$/i)?.[1];
          return <button type="button" key={floor.id} aria-label={floor.label} title={floor.label} aria-pressed={effectiveFloor === floor.id}
            className={`uni-button ${styles.floorButton}`} onClick={() => { setFloorId(floor.id); setSelectedId(null); }}>
            {floor.id === 'all' ? <Layers size={23} aria-hidden="true"/> : number !== undefined ? <FloorMark number={Number(number)}/> : <Box size={23} aria-hidden="true"/>}
          </button>;
        })}
      </div>
      <div className={styles.sceneSwitches} role="group" aria-label="3B görünüm seçenekleri">
        <Switch label="Katları ayır" checked={exploded} onChange={setExploded} />
        <Switch label="Duvarlar" checked={walls} onChange={setWalls} />
        <Switch label="Yalnızca boş yatakları göster" checked={onlyAvailableBeds} onChange={value => { setOnlyAvailableBeds(value); setSelectedId(null); if (value) setTone('all'); }} />
      </div>
    </nav>} floors={filtered} exploded={exploded} walls={walls} selectedId={selected?.unit.room_id || null} focusRequest={focusRequest} onSelect={select} onHover={setHoverId} panelOpen={panelOpen} onTogglePanel={() => setPanelOpen(v => !v)} details={
        <aside ref={detailsRef} className={styles.details} aria-label="Oda ve yatak bilgileri" aria-hidden={!panelOpen} inert={!panelOpen}>
        {selected && <div className={styles.reservationAction}>
          <button type="button" className="uni-button uni-button-primary rounded-full" disabled={!onBook || !bookableUnit} onClick={() => { if (onBook && bookableUnit) onBook(bookableUnit); }}>Rezervasyon oluştur</button>
          {!onBook ? <small>Rezervasyon oluşturma yetkiniz bulunmuyor.</small> : !bookableUnit ? <small>Bu birim satışa kapalı, pasif veya bakımda. Birim tanımındaki satış ayarını kontrol edin.</small> : <>
            {bookableUnit.room_id !== selected.unit.room_id && <small>Rezervasyon {bookableUnit.code} odasının tamamı için oluşturulur.</small>}
            {!!selected.state.current.length && <small>Mevcut konaklama / rezervasyon var. Yeni rezervasyon için uygun tarih seçin.</small>}
          </>}
        </div>}
        <InlineSelectField label="Oda / birim seçimi" value={selectedRoom?.unit.room_id || ''} onChange={value => select(value || null)} options={[{ value: '', label: 'Bir birim seçin' }, ...rooms.map(r => ({ value: r.unit.room_id, label: `${r.unit.code} · ${r.state.label}` }))]} />
        {selected && selectedRoom ? <>
          <div className={styles.detailHeading}><div><p>{floors.find(f => f.id === selectedRoom.floorId)?.label}</p><h3>{selected.unit.code}</h3><span>{selected.unit.name || unitKinds[selected.unit.kind] || selected.unit.kind}</span></div><button type="button" className="nav-icon-button" aria-label="Birim seçimini temizle" onClick={() => select(null)}><X size={18} /></button></div>
          <div className={styles.status}><i style={{ background: sceneStatusColor(selected.state) }} />{selected.state.label}</div>
          {[RoomState.Dirty,RoomState.OutOfOrder,RoomState.Maintenance].some(status=>status===selected.state.operationalStatus) && <div className={styles.status}><i style={{background:STATUS_PALETTE[roomStatusKey(selected.state.operationalStatus)].accent}}/>{STATUS_PALETTE[roomStatusKey(selected.state.operationalStatus)].label}</div>}
          {!!currentStays.length && <section className={styles.currentGuests} aria-label="Şu anda konaklayan misafirler"><h4 className={styles.subheading}>Konaklayan misafirler</h4>{currentStays.map(booking => <div className={styles.booking} key={booking.booking_id}>
            {(booking.guests?.length ? booking.guests : [{ id: booking.booking_id, name: booking.guest_name || 'Misafir' }]).map(guest => <strong key={guest.id}>{guest.name}</strong>)}
            <small>{boardDate(booking.actual_check_in || booking.check_in)} → {boardDate(booking.check_out)}</small>
            {onOpenBooking && <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={() => onOpenBooking(booking)}>Konaklama detayını aç</button>}
          </div>)}</section>}

          <dl className={styles.facts}><div><dt>Kapasite</dt><dd>{selected.unit.effective_capacity || selected.unit.capacity} kişi</dd></div><div><dt>Satış durumu</dt><dd>{selected.unit.inactive ? 'Pasif' : selected.unit.rentable ? 'Ayrı rezerve edilebilir' : 'Üst birimle birlikte'}</dd></div>{selected.unit.kind === 'bed' && <div><dt>Ranza seviyesi</dt><dd>{selectedRoom.beds.find(b => b.unit.room_id === selected.unit.room_id)?.level || 1}</dd></div>}</dl>
          {selectedRoom.hasJacuzzi && <p className={styles.status}>Jakuzi mevcut</p>}
          {selected.unit.status_reason && <p className={styles.caption}>{selected.unit.status_reason}</p>}
          {!!selectedRoom.beds.length && <section><h4 className={styles.subheading}>Yatak yerleri</h4><div className={styles.bedList}>{selectedRoom.beds.map(bed => <button type="button" key={bed.group + ":" + bed.level} aria-pressed={selectedId === bed.unit.room_id} className={styles.bedButton} onClick={() => activate(bed.unit.room_id)}><BedDouble size={18} style={{ color: sceneStatusColor(bed.state) }} aria-hidden="true" /><span><strong>{bed.label || bed.unit.code}</strong><small>{bed.visualOnly ? "Kayıtlı oda yatak düzeni" : `${bed.state.label} · ${bed.unit.capacity} kişi`}</small></span></button>)}</div></section>}
          {selectedRoom.beds.length === 0 && <p className={styles.caption}>Bu birime fiziksel yatak tanımı eklenmemiş.</p>}
          <section><h4 className={styles.subheading}>Konaklama ve rezervasyonlar</h4>{bookings.length ? bookings.map(booking => <div className={styles.booking} key={booking.booking_id}><strong>{booking.guest_name || 'Misafir'}</strong><span>{booking.status === BookingState.CheckedIn ? 'Giriş yapıldı' : booking.status === BookingState.Confirmed ? 'Onaylı rezervasyon' : 'Çıkış yapıldı'}</span><small>{boardDate(booking.check_in)} → {boardDate(booking.check_out)}</small>{onOpenBooking && <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={() => onOpenBooking(booking)}>Rezervasyonu aç</button>}</div>) : <p className={styles.caption}>Aktif veya yaklaşan rezervasyon bulunmuyor.</p>}</section>

        </> : <div className={styles.emptyDetail}><Box size={32} strokeWidth={1.4} /><p>Bir oda veya yatak seçin.</p><span>Kapasite, durum ve rezervasyon bilgileri burada görünür.</span></div>}
        <div className={styles.panelActions}>
          <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={() => void refresh()} disabled={refreshing}><RefreshCw size={17} aria-hidden="true" />{refreshing ? 'Yenileniyor…' : 'Yenile'}</button>
          {onDefinitions && <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={onDefinitions}>Kat ve oda tanımları</button>}
        </div>
        <TextField label="Oda veya misafir ara" value={query} onChange={setQuery} placeholder="Oda kodu, adı veya misafir" />
        <InlineSelectField label="Durum" value={tone} onChange={setTone} options={[{ value: 'all', label: 'Tüm durumlar' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]} />
    <div className={styles.summary}>
      <span><Box size={17} aria-hidden="true" />{rooms.filter(r => r.unit.kind !== 'bed').length} oda / birim</span>
      <span><BedDouble size={17} aria-hidden="true" />{places.length} yatak yeri</span>
      <span>{places.reduce((sum, p) => sum + (p.unit.inactive ? 0 : p.unit.capacity), 0)} aktif yatak kapasitesi</span>
      <span className={styles.updated}>{loading ? 'Yatak tanımları yükleniyor…' : `Son veri: ${boardDate(snapshot.server_time)}`}</span>
    </div>

        <div className={styles.legend} aria-label="Durum renkleri">{(["occupied","reserved","available","dirty","fault","maintenance"] as const).map(key => <span key={key}><i style={{ background: STATUS_PALETTE[key].accent }} />{STATUS_PALETTE[key].label}</span>)}</div>
        <p className={styles.caption}>{hover ? `${hover.unit.code} · ${hover.state.label}` : 'Detaylar için bir odaya veya yatağa tıklayın.'}</p>
        <p className={styles.caption}>Şematik görünüm · {filtered.some(f => f.automatic) ? 'Yerleşimi olmayan veya çakışan birimler otomatik dizildi.' : 'Kat planı sırası korunarak odalar arasındaki boşluklar sıkılaştırıldı.'} Oda içindeki yataklar okunabilirlik için otomatik yerleştirilir.</p>
        </aside>} />
      </div>
    </div> : <div className={styles.empty}><Box size={42} strokeWidth={1.3} /><h3>{floors.some(f => f.rooms.length) ? 'Filtrelere uygun birim bulunamadı' : 'Bu tesiste görüntülenecek birim yok'}</h3><p>{floors.some(f => f.rooms.length) ? 'Kat, durum veya arama filtresini değiştirin.' : 'Kat ve oda tanımları eklendiğinde tesisiniz burada oluşacak.'}</p>{floors.some(f => f.rooms.length) ? <button type="button" className="uni-button uni-button-secondary rounded-full" onClick={clearFilters}>Filtreleri temizle</button> : onDefinitions && <button type="button" className="uni-button uni-button-primary rounded-full" onClick={onDefinitions}>Kat ve oda tanımları</button>}</div>}
  </div>;
}
