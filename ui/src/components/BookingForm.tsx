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
  Trash2,
  Info,
  Plus,
} from "lucide-react";
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
/** Girilen metinleri tr-TR büyük harfe çevirir (otel kayıt disiplini). */
export const upperTR = (v: string) => v.toLocaleUpperCase("tr-TR");
import {
  StepperField,
  DateField,
  TextField,
  SelectField,
  TextAreaField,
} from "./fields";
/** Bölüm başlığı: referans bölüm dili (18px kitap + 14px açıklama). */
function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="min-w-0">
        <h3 className="font-uninav-book text-[1.125rem] leading-6 text-slate-900">
          {title}
        </h3>
        {hint && (
          <p className="mt-1 text-[0.875rem] leading-5 text-slate-500">{hint}</p>
        )}
      </div>
      {children}
    </section>
  );
}
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
  const selectedRoom = snapshot.rooms.find((r) => r.room_id === room);
  return (
    <form
      className="space-y-6"
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
      <FormSection
        title="Konaklama Tarihleri"
        hint="Giriş ve çıkış tarih-saatleri"
      >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DateField
          label="Giriş"
          value={start}
          onChange={(v) => {
            setStart(v);
            setOptions(null);
          }}
        />
        <DateField
          label="Çıkış"
          value={end}
          min={start || undefined}
          onChange={(v) => {
            setEnd(v);
            setOptions(null);
          }}
        />
      </div>
      </FormSection>
      <FormSection
        title={`Misafirler${guests.length ? ` · ${guests.length}` : ""}`}
        hint="Sahip, kişi sayısı ve konaklayanlar"
      >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <TextField
        label="Rezervasyon sahibi"
        value={name}
        onChange={setName}
        placeholder="Ad soyad"
        required
        autoComplete="off"
        uppercase
      />
      <StepperField
        label="Kişi sayısı"
        value={count}
        min={1}
        max={100000}
        onChange={(v) => {
          setCount(v);
          setOptions(null);
        }}
        sub={
          selectedRoom
            ? `Birim kapasitesi: ${selectedRoom.effective_capacity || selectedRoom.capacity} kişi`
            : "kişi"
        }
      />
      </div>
      <div className="space-y-3 pt-1">
        <div className="flex justify-between items-center gap-3">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Konaklayanlar
          </p>
          <button
            className={`uni-control ${secondaryStyle}`}
            type="button"
            onClick={() => {
              setGuests([...guests, { id: crypto.randomUUID(), name: "" }]);
              setCount(Math.max(count, guests.length + 1));
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Misafir Ekle
          </button>
        </div>
        {guests.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
            <p className="text-xs font-bold text-slate-400">
              Henüz misafir eklenmedi
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Yukarıdaki butonla konaklayanları tek tek ekleyin
            </p>
          </div>
        )}
        {guests.map((g, i) => (
          <div
            className="rounded-[20px] bg-[#f9f9f9] p-4 space-y-3"
            key={g.id}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span aria-hidden="true" className="font-uninav-book flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[13px] text-slate-700 shadow-sm ring-1 ring-slate-200/70">
                  {i + 1}
                </span>
                <span className="truncate text-xs font-black text-slate-700 uppercase tracking-wider">
                  Misafir
                </span>
              </span>
              <button
                type="button"
                aria-label="Misafiri kaldır"
                title="Misafiri kaldır"
                className="uni-control flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                onClick={() => setGuests(guests.filter((_, n) => n !== i))}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              aria-label={`Misafir ${i + 1} adı`}
              required
              placeholder="Ad soyad"
              className={`uni-input ${inputStyle} uppercase`}
              value={g.name}
              onChange={(e) =>
                setGuests(
                  guests.map((v, n) =>
                    n === i ? { ...v, name: upperTR(e.target.value) } : v,
                  ),
                )
              }
            />
            <input
              aria-label={`Misafir ${i + 1} telefon`}
              placeholder="Telefon"
              className={`uni-input ${inputStyle} uppercase`}
              value={g.phone || ""}
              onChange={(e) =>
                setGuests(
                  guests.map((v, n) =>
                    n === i ? { ...v, phone: upperTR(e.target.value) } : v,
                  ),
                )
              }
            />
            <input
              aria-label={`Misafir ${i + 1} kimlik`}
              placeholder="Kimlik / pasaport"
              className={`uni-input ${inputStyle} uppercase`}
              value={g.tcNo || ""}
              onChange={(e) =>
                setGuests(
                  guests.map((v, n) =>
                    n === i ? { ...v, tcNo: upperTR(e.target.value) } : v,
                  ),
                )
              }
            />
            <input
              aria-label={`Misafir ${i + 1} yakınlık`}
              placeholder="Yakınlık"
              className={`uni-input ${inputStyle} uppercase`}
              value={g.relationship || ""}
              onChange={(e) =>
                setGuests(
                  guests.map((v, n) =>
                    n === i ? { ...v, relationship: upperTR(e.target.value) } : v,
                  ),
                )
              }
            />
            </div>
          </div>
        ))}
      </div>
      </FormSection>
      <FormSection
        title="Birim"
        hint="Tarihlere uygun birim seçin"
      >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <SelectField
            label="Kiralanacak birim"
            required
            value={room}
            onChange={setRoom}
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
          </SelectField>
        </div>
        <button
          type="button"
          className={`uni-control ${secondaryStyle}`}
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
        <p className="flex items-start gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Bu tarih ve kişi sayısına uygun {options.length} birim. Kesin
            müsaitlik kaydetme sırasında tekrar kontrol edilir.
          </span>
        </p>
      )}
      <p className="flex items-start gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-blue-600" />
        <span>
          Seçilen birimin tamamı ayrılır. Daire rezervasyonu, içindeki oda ve
          yatakları da aynı tarihler için kapatır.
        </span>
      </p>
      </FormSection>
      <FormSection title="Notlar" hint="Rezervasyonla ilgili ek bilgi">
      <TextAreaField
        label="Notlar"
        value={notes}
        onChange={setNotes}
        placeholder="Özel istekler, varış saati vb."
        uppercase
      />
      </FormSection>
      <button className={`uni-control ${buttonStyle} w-full !rounded-[20px] !px-5 !py-4 !text-lg`} disabled={busy || !room}>
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
          className={`uni-input ${inputStyle}`}
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
            className={`uni-input ${inputStyle}`}
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
            className={`uni-input ${inputStyle}`}
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
      <button disabled={busy} className={`uni-control ${buttonStyle}`}>
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
              className={`uni-control ${secondaryStyle}`}
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
                  className={`uni-input ${inputStyle}`}
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
          className={`uni-control ${secondaryStyle}`}
          onClick={() =>
            setGuests((rows) => [
              ...rows,
              { id: crypto.randomUUID(), name: "" },
            ])
          }
        >
          Misafir Ekle
        </button>
        <button className={`uni-control ${buttonStyle}`} disabled={busy || !guests.length}>
          Misafirleri Kaydet
        </button>
      </div>
    </form>
  );
}
