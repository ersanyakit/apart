import { useI18n } from "./I18n";
import { BookingStatus as BookingState } from '../lib/statuses.generated';
import type { Booking } from '../lib/api';

export function BookingActors({ booking: b, compact = false }: { booking: Booking; compact?: boolean }) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const entered = !!b.actual_check_in || b.status === BookingState.CheckedIn || b.status === BookingState.Completed;
  const departed = !!b.actual_check_out || b.status === BookingState.Completed;
  const unknown = 'Bilgi kaydedilmemiş';
  return <section className={compact ? "booking-table-actors" : "booking-detail-actors"} aria-label={_uiText("İşlemleri gerçekleştiren personel")}>
    {!compact && <h3 className="mb-3 font-semibold">{_uiText("İşlemleri gerçekleştiren personel")}</h3>}
    <dl className={compact ? undefined : "booking-detail-dates"}>
      <div><dt>{_uiText("Rezervasyonu alan")}</dt><dd>{b.created_by_name || unknown}</dd></div>
      <div><dt>{_uiText("Girişi gerçekleştiren")}</dt><dd>{entered ? b.checked_in_by_name || unknown : _uiText("Giriş yapılmadı")}</dd></div>
      <div><dt>{_uiText("Çıkışı gerçekleştiren")}</dt><dd>{departed ? b.checked_out_by_name || unknown : _uiText("Çıkış yapılmadı")}</dd></div>
      {b.status === BookingState.Cancelled && <div><dt>{_uiText("İptali gerçekleştiren")}</dt><dd>{b.cancelled_by_name || unknown}</dd></div>}
    </dl>
  </section>;
}
