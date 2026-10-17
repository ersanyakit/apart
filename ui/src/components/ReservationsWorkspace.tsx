"use client";
import { useI18n } from "./I18n";

import { BookingsTable, type BookingsTableProps } from "./BookingsTable";
import { StaysScheduler } from "./stays-scheduler/StaysScheduler";
import type { Booking, Floor } from "../lib/api";
export function ReservationsWorkspace({ floors, anchorDay, list, cancelledOnly, onOpenList, timelineBookings, ...props }: BookingsTableProps & { timelineBookings: Booking[]; floors: Floor[]; anchorDay: string; list: boolean; cancelledOnly: boolean; onOpenList: () => void }) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  if (list) return <BookingsTable {...props} />;
  if (cancelledOnly) return <div className="rounded-xl border border-uni-border p-5"><p className="mb-3 text-sm text-uni-muted">{_uiText("İptal edilen rezervasyonlar Ayrıntılı Rezervasyon Listesi menüsünde gösterilir.")}</p><button type="button" className="uni-button uni-button-secondary" onClick={onOpenList}>{_uiText("Ayrıntılı listeyi aç")}</button></div>;
  return <StaysScheduler variant="bookings" anchorDay={anchorDay} rooms={props.rooms} floors={floors} bookings={timelineBookings} serverTime={props.serverTime} busy={props.busy} onDetails={props.onDetails} onContextMenu={props.onContextMenu} />;
}
