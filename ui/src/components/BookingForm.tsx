import React, { useState } from "react";
import {
  command,
  messageOf,
  type APIRoom,
  type Booking,
  type Snapshot,
  unitKinds,
} from "../lib/api";
import {
  Field,
  ErrorMessage,
  inputStyle,
  buttonStyle,
  secondaryStyle,
} from "./FormKit";
export const localDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export function BookingForm({
  snapshot,
  booking,
  roomId,
  checkInAfterSave = false,
  onSaved,
}: {
  snapshot: Snapshot;
  booking?: Booking;
  roomId?: string;
  checkInAfterSave?: boolean;
  onSaved: () => Promise<void>;
}) {
  const [room, setRoom] = useState(booking?.room_id || roomId || "");
  const [name, setName] = useState(booking?.guest_name || "");
  const [count, setCount] = useState(booking?.guest_count || 1);
  const [start, setStart] = useState(
    localDate(booking?.check_in || snapshot.server_time),
  );
  const [end, setEnd] = useState(
    localDate(
      booking?.check_out ||
        new Date(
          new Date(snapshot.server_time).getTime() + 86400000,
        ).toISOString(),
    ),
  );
  const [notes, setNotes] = useState(booking?.notes || "");
  const [guests, setGuests] = useState(booking?.guests || []);
  const [options, setOptions] = useState<APIRoom[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = () => ({
    branch_id: snapshot.branch_id,
    check_in: new Date(start).toISOString(),
    check_out: new Date(end).toISOString(),
    guest_count: count,
  });
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const result = await command<Booking>(
            booking ? "booking.update" : "booking.create",
            {
              ...query(),
              ...(booking ? { booking_id: booking.booking_id } : {}),
              room_id: room,
              guest_name: name,
              guests,
              notes,
            },
          );
          if (checkInAfterSave && !booking)
            await command("booking.transition", {
              booking_id: result.booking_id,
              branch_id: result.branch_id,
              action: "check_in",
            });
          await onSaved();
        } catch (e) {
          setError(messageOf(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorMessage message={error} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Giriş">
          <input
            type="datetime-local"
            required
            className={inputStyle}
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setOptions(null);
            }}
          />
        </Field>
        <Field label="Çıkış">
          <input
            type="datetime-local"
            required
            className={inputStyle}
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setOptions(null);
            }}
          />
        </Field>
        <Field label="Rezervasyon sahibi">
          <input
            required
            className={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Kişi sayısı">
          <input
            type="number"
            min={1}
            max={100000}
            required
            className={inputStyle}
            value={count}
            onChange={(e) => {
              setCount(Number(e.target.value));
              setOptions(null);
            }}
          />
        </Field>
      </div>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Field label="Kiralanacak birim">
            <select
              required
              className={inputStyle}
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            >
              <option value="">Birim seçin</option>
              {(options || snapshot.rooms.filter((r) => r.rentable)).map(
                (r) => (
                  <option key={r.room_id} value={r.room_id}>
                    {r.code} · {unitKinds[r.kind]} ·{" "}
                    {r.effective_capacity || r.capacity} kişi
                  </option>
                ),
              )}
            </select>
          </Field>
        </div>
        <button
          type="button"
          className={secondaryStyle}
          disabled={busy || !start || !end}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const available = await command<APIRoom[]>("room.availability", {
                ...query(),
                ...(booking ? { exclude_booking_id: booking.booking_id } : {}),
              });
              setOptions(available);
              if (!available.some((r) => r.room_id === room)) setRoom("");
            } catch (e) {
              setError(messageOf(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Müsaitlik Kontrolü
        </button>
      </div>
      {options && (
        <p className="text-xs text-brand-blue-700">
          Bu tarih ve kişi sayısına uygun {options.length} birim. Kesin
          müsaitlik kaydetme sırasında tekrar kontrol edilir.
        </p>
      )}
      <p className="rounded-xl bg-brand-blue-50 p-3 text-xs text-brand-blue-800">
        Seçilen birimin tamamı ayrılır. Daire rezervasyonu, içindeki oda ve
        yatakları da aynı tarihler için kapatır.
      </p>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-500">MİSAFİRLER</h3>
          <button
            className={secondaryStyle}
            type="button"

            onClick={() => {
              setGuests([...guests, { id: crypto.randomUUID(), name: "" }]);
              setCount(Math.max(count, guests.length + 1));
            }}
          >
            Misafir Ekle
          </button>
        </div>
        {guests.map((g, i) => (
          <div
            className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3"
            key={g.id}
          >
            <p className="col-span-2 text-xs font-bold text-slate-500">
              {i + 1}. Misafir
            </p>
            <input
              aria-label={`Misafir ${i + 1} adı`}
              required
              placeholder="Ad soyad"
              className={inputStyle}
              value={g.name}
              onChange={(e) =>
                setGuests(
                  guests.map((v, n) =>
                    n === i ? { ...v, name: e.target.value } : v,
                  ),
                )
              }
            />
            <input
              aria-label={`Misafir ${i + 1} telefon`}
              placeholder="Telefon"
              className={inputStyle}
              value={g.phone || ""}
              onChange={(e) =>
                setGuests(
                  guests.map((v, n) =>
                    n === i ? { ...v, phone: e.target.value } : v,
                  ),
                )
              }
            />
            <input
              aria-label={`Misafir ${i + 1} kimlik`}
              placeholder="Kimlik / pasaport"
              className={inputStyle}
              value={g.tcNo || ""}
              onChange={(e) =>
                setGuests(
                  guests.map((v, n) =>
                    n === i ? { ...v, tcNo: e.target.value } : v,
                  ),
                )
              }
            />
            <input
              aria-label={`Misafir ${i + 1} yakınlık`}
              placeholder="Yakınlık"
              className={inputStyle}
              value={g.relationship || ""}
              onChange={(e) =>
                setGuests(
                  guests.map((v, n) =>
                    n === i ? { ...v, relationship: e.target.value } : v,
                  ),
                )
              }
            />
            <button
              type="button"
              aria-label="Misafiri kaldır"
              className={secondaryStyle}
              onClick={() => setGuests(guests.filter((_, n) => n !== i))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Field label="Notlar">
        <textarea
          className={inputStyle}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <button className={buttonStyle} disabled={busy || !room}>
        {busy ? "Kaydediliyor…" : "Rezervasyonu Kaydet"}
      </button>
    </form>
  );
}
export function MoveBookingForm({
  snapshot,
  booking,
  onSaved,
}: {
  snapshot: Snapshot;
  booking: Booking;
  onSaved: () => Promise<void>;
}) {
  const [mode, setMode] = useState("move");
  const [target, setTarget] = useState("");
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await command("booking.transition", {
            booking_id: booking.booking_id,
            branch_id: booking.branch_id,
            action: mode,
            ...(mode === "swap"
              ? { other_booking_id: other }
              : { target_id: target }),
          });
          await onSaved();
        } catch (e) {
          setError(messageOf(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorMessage message={error} />
      <p className="text-sm">
        {booking.guest_name} ·{" "}
        {snapshot.rooms.find((r) => r.room_id === booking.room_id)?.code}
      </p>
      <Field label="İşlem">
        <select
          className={inputStyle}
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="move">Başka birime taşı</option>
          <option value="swap">İki rezervasyonun birimlerini değiştir</option>
        </select>
      </Field>
      {mode === "move" ? (
        <Field label="Hedef birim">
          <select
            required
            className={inputStyle}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Seçin</option>
            {snapshot.rooms
              .filter((r) => r.rentable && r.room_id !== booking.room_id)
              .map((r) => (
                <option key={r.room_id} value={r.room_id}>
                  {r.code} · {unitKinds[r.kind]} ·{" "}
                  {r.effective_capacity || r.capacity} kişi
                </option>
              ))}
          </select>
        </Field>
      ) : (
        <Field label="Diğer rezervasyon">
          <select
            required
            className={inputStyle}
            value={other}
            onChange={(e) => setOther(e.target.value)}
          >
            <option value="">Seçin</option>
            {snapshot.bookings
              .filter(
                (b) =>
                  b.booking_id !== booking.booking_id &&
                  b.status === booking.status &&
                  (b.status === "checked_in" ||
                    b.check_in === booking.check_in),
              )
              .map((b) => (
                <option key={b.booking_id} value={b.booking_id}>
                  {b.guest_name} ·{" "}
                  {snapshot.rooms.find((r) => r.room_id === b.room_id)?.code}
                </option>
              ))}
          </select>
        </Field>
      )}
      <p className="text-xs text-slate-500">
        Konaklayan misafir için değişiklik işlem anından itibaren uygulanır;
        önceki birim geçmişte korunur. Rezervasyon değişikliği planlanan
        konaklamanın tamamını kapsar. Kapasite ve tarih çakışmaları iki taraf
        için birlikte kontrol edilir.
      </p>
      <button disabled={busy} className={buttonStyle}>
        Değişikliği Kaydet
      </button>
    </form>
  );
}

export function BookingGuestsForm({
  booking,
  onSaved,
}: {
  booking: Booking;
  onSaved: () => Promise<void>;
}) {
  const [guests, setGuests] = useState(booking.guests || []),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const patch = (i: number, p: Partial<import("../types").Guest>) =>
    setGuests((rows) => rows.map((g, n) => (n === i ? { ...g, ...p } : g)));
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await command("booking.guests.update", {
            booking_id: booking.booking_id,
            branch_id: booking.branch_id,
            guest_count: guests.length,
            guests,
          });
          await onSaved();
        } catch (e) {
          setError(messageOf(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorMessage message={error} />
      <p className="text-sm text-slate-500">
        Her misafir ayrı kaydedilir. Konaklama sırasında eklenen veya ayrılan
        kişilerin zamanları geçmişte korunur.
      </p>
      {guests.map((g, i) => (
        <div
          key={g.id}
          className="border border-slate-200 rounded-2xl p-4 space-y-3"
        >
          <div className="flex justify-between">
            <strong className="text-sm">{i + 1}. Misafir</strong>
            <button
              type="button"
              className={secondaryStyle}
              onClick={() =>
                setGuests((rows) => rows.filter((_, n) => n !== i))
              }
            >
              Kaldır
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["name", "Ad soyad"],
                ["tcNo", "Kimlik / Pasaport"],
                ["phone", "Telefon"],
                ["relationship", "Yakınlık"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={`${i + 1}. Misafir ${label}`}>
                <input
                  className={inputStyle}
                  required={key === "name"}
                  value={g[key] || ""}
                  onChange={(e) => patch(i, { [key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-3">
        <button
          type="button"
          className={secondaryStyle}
          onClick={() =>
            setGuests((rows) => [
              ...rows,
              { id: crypto.randomUUID(), name: "" },
            ])
          }
        >
          Misafir Ekle
        </button>
        <button className={buttonStyle} disabled={busy || !guests.length}>
          Misafirleri Kaydet
        </button>
      </div>
    </form>
  );
}
