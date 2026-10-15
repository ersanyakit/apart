import type { Booking } from '../lib/api';

export function BookingActors({ booking: b, compact = false }: { booking: Booking; compact?: boolean }) {
  const entered = !!b.actual_check_in || b.status === 'checked_in' || b.status === 'completed';
  const departed = !!b.actual_check_out || b.status === 'completed';
  const unknown = 'Bilgi kaydedilmemiş';
  return <section className={compact ? "booking-table-actors" : "booking-detail-actors"} aria-label="İşlemleri gerçekleştiren personel">
    {!compact && <h3 className="mb-3 font-semibold">İşlemleri gerçekleştiren personel</h3>}
    <dl className={compact ? undefined : "booking-detail-dates"}>
      <div><dt>Rezervasyonu alan</dt><dd>{b.created_by_name || unknown}</dd></div>
      <div><dt>Girişi gerçekleştiren</dt><dd>{entered ? b.checked_in_by_name || unknown : 'Giriş yapılmadı'}</dd></div>
      <div><dt>Çıkışı gerçekleştiren</dt><dd>{departed ? b.checked_out_by_name || unknown : 'Çıkış yapılmadı'}</dd></div>
      {b.status === 'cancelled' && <div><dt>İptali gerçekleştiren</dt><dd>{b.cancelled_by_name || unknown}</dd></div>}
    </dl>
  </section>;
}
