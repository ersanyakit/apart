"use client";
import { useI18n } from "./I18n";

import React, { useEffect, useRef, useState } from "react";
import { Banknote } from "lucide-react";
import { command, localized, messageOf, type Booking } from "../lib/api";
import { ResponsiveDialog } from "./BottomSheet";
import { InlineSelectField, MoneyField, TextField } from "./fields";
import { ErrorMessage, buttonStyle, secondaryStyle } from "./FormKit";
import { useNotifications } from "./Toast";
import { paymentOptions } from "./reports/options";
import type { Folio } from "./CheckoutFolio";

type Channel = { code: string; labels: Record<string, string>; active: boolean };
const money = (n: number, c: string) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: c }).format(n / 100);

/**
 * Oda kartı ve giriş akışından tahsilat girişi. Resepsiyonun rapor
 * ekranlarına erişimi yoktur; bu pencere yalnızca rezervasyona bağlı
 * tahsilat (receipt) kaydeder. Tutar varsayılan olarak kalan borçtur.
 */
export function FolioPayment({ hotelId, booking, roomCode, entry, onClose, onSaved }: {
  hotelId: string;
  booking: Booking;
  roomCode?: string;
  /** checkin: giriş sonrası "ödeme alındı mı?" sorusu; manual: kart menüsü. */
  entry: "checkin" | "manual";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const notify = useNotifications();
  const currency = booking.currency || "TRY";
  const [folio, setFolio] = useState<Folio | null>(null);
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState(paymentOptions);
  const [amount, setAmount] = useState(0);
  const [channel, setChannel] = useState(paymentOptions[0].value);
  const [label, setLabel] = useState("Konaklama tahsilatı");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const retry = useRef<{ payload: string; id: string } | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      command<Folio>("booking.folio", { branch_id: booking.branch_id, booking_id: booking.booking_id }),
      command<Channel[]>("payment_channel.list", { hotel_id: hotelId }).catch(() => [] as Channel[]),
    ]).then(([f, channels]) => {
      if (!active) return;
      setFolio(f);
      const extra = channels.filter((c) => c.active && !paymentOptions.some((p) => p.value === c.code))
        .map((c) => ({ value: c.code, label: localized(c.labels) }));
      if (extra.length) setMethods([...paymentOptions, ...extra]);
      const total = f.totals.find((t) => t.currency === currency) ?? f.totals[0];
      if (total && total.balance > 0) setAmount(total.balance);
    }).catch((e) => { if (active) setError(messageOf(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [booking.booking_id, booking.branch_id, hotelId, currency]);
  const total = folio?.totals.find((t) => t.currency === currency) ?? folio?.totals[0];
  const valid = amount > 0 && amount <= 999999999999 && label.trim().length > 0 && label.trim().length <= 200 && channel !== "";
  const save = async () => {
    if (!valid || busy || loading) return;
    setBusy(true);
    setError("");
    try {
      const body = {
        hotel_id: hotelId, branch_id: booking.branch_id,
        room_id: booking.room_id, booking_id: booking.booking_id,
        responsible_id: null, kind: "receipt",
        label: label.trim(), category: "", party: booking.guest_name,
        channel, currency, amount_minor: amount,
        quantity: 1, threshold: 0, measure: "piece", priority: "normal",
        status: "completed", reference: "", shift_code: "",
        notes: entry === "checkin" ? "Girişte tahsilat" : "",
        occurred_at: new Date().toISOString(), due_at: null, end_at: null,
      };
      const serialized = JSON.stringify(body);
      if (retry.current?.payload !== serialized) retry.current = { payload: serialized, id: crypto.randomUUID() };
      await command("report.record", { ...body, id: retry.current.id });
      retry.current = null;
      notify(_uiText("Tahsilat kaydedildi."));
      await onSaved();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  return <ResponsiveDialog
    open
    title={entry === "checkin" ? _uiText("Ödeme alındı mı?") : _uiText("Tahsilat al")}
    subtitle={_uiText("{value1}{value2}{value3}", {value1: String(booking.guest_name), value2: String(roomCode ? ` · Oda ${roomCode}` : ""), value3: String(entry === "checkin" ? " · Giriş tamamlandı" : "")})}
    icon={Banknote}
    busy={busy}
    onClose={() => { if (!busy) onClose(); }}
  >
    <div className="space-y-4">
      <ErrorMessage message={error} />
      {loading && <p role="status" className="text-sm text-uni-muted">{_uiText("Folyo ve kalan borç yükleniyor…")}</p>}
      {total && <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-[var(--color-uni-surface)] p-4 text-sm">
        <div><dt className="text-xs text-uni-muted">{_uiText("Toplam ücret")}</dt><dd className="mt-1 font-semibold">{money(total.charges, total.currency)}</dd></div>
        <div><dt className="text-xs text-uni-muted">{_uiText("Alınan")}</dt><dd className="mt-1 font-semibold">{money(total.paid, total.currency)}</dd></div>
        <div><dt className="text-xs text-uni-muted">{_uiText("Kalan borç")}</dt><dd className="mt-1 font-semibold">{money(total.balance, total.currency)}</dd></div>
      </dl>}
      {total && total.balance <= 0 && !loading && <p className="text-sm text-uni-muted">{_uiText("Bu rezervasyonda tahsil edilecek borç kalmamış; isterseniz avans tahsil edebilirsiniz.")}</p>}
      <MoneyField label={_uiText("Alınan tutar ({value1})", {value1: String(currency)})} valueMinor={amount} onChange={setAmount} disabled={busy || loading} />
      <InlineSelectField label={_uiText("Ödeme yöntemi")} value={channel} onChange={setChannel} options={methods} />
      <TextField label={_uiText("Açıklama")} value={label} onChange={setLabel} maxLength={200} required disabled={busy} />
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={`${secondaryStyle} !rounded-full`} disabled={busy} onClick={onClose}>
          {entry === "checkin" ? _uiText("Ödeme alınmadı") : _uiText("Vazgeç")}
        </button>
        <button type="button" className={`${buttonStyle} !rounded-full`} disabled={busy || loading || !valid} onClick={() => void save()}>
          {busy ? _uiText("Kaydediliyor…") : _uiText("Tahsilatı kaydet")}
        </button>
      </div>
    </div>
  </ResponsiveDialog>;
}
