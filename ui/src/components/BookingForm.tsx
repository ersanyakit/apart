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
// Gece hesabı için yerel "YYYY-MM-DDTHH:mm" yardımcıları.
const parseLocalInput = (v: string): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const toLocalInputValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
/** Takvim günü farkından gece sayısı (en az 1, en çok 365). */
const calcNights = (startStr: string, endStr: string): number => {
  const s = parseLocalInput(startStr);
  const e = parseLocalInput(endStr);
  if (!s || !e) return 1;
  const sDay = new Date(s);
  sDay.setHours(0, 0, 0, 0);
  const eDay = new Date(e);
  eDay.setHours(0, 0, 0, 0);
  const diff = Math.round((eDay.getTime() - sDay.getTime()) / 86400000);
  return Math.min(365, Math.max(1, diff <= 0 ? 1 : diff));
};
/** Verilen gece sayısına göre çıkış tarihini üretir (çıkışın saat-dakikası korunur). */
const endForNights = (
  startStr: string,
  endStr: string,
  nights: number,
): string => {
  const s = parseLocalInput(startStr);
  if (!s) return endStr;
  const e = parseLocalInput(endStr);
  const h = e ? e.getHours() : 11;
  const mi = e ? e.getMinutes() : 0;
  const d = new Date(s);
  d.setDate(d.getDate() + Math.min(365, Math.max(1, Math.floor(nights) || 1)));
  d.setHours(h, mi, 0, 0);
  return toLocalInputValue(d);
};
import {
  StepperField,
  DateField,
  GuestNameField,
  NationalityField,
  TextField,
  TextAreaField,
  RoomSelectField,
  MoneyField,
} from "./fields";
import { useCurrency } from "./Currency";
import { COUNTRIES, countryFlag } from "../lib/countries";
/** Bölüm başlığı: referans bölüm dili (18px kitap + 14px açıklama). */
function FormSection({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-uninav-book text-[1.125rem] leading-6 text-slate-900">
            {title}
          </h3>
          {hint && (
            <p className="mt-1 text-[0.875rem] leading-5 text-slate-500">{hint}</p>
          )}
        </div>
        {action && <div className="shrink-0 pt-0.5">{action}</div>}
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
  const [priceMinor, setPriceMinor] = useState(booking?.daily_price_minor || 0);
  const [start, setStart] = useState(
    localDate(booking?.check_in || snapshot.server_time),
  );
  const [end, setEnd] = useState(() =>
    localDate(
      booking?.check_out ||
        (() => {
          // Varsayılan çıkış: ertesi gün 11:00 (otel standardı).
          const d = new Date(
            new Date(snapshot.server_time).getTime() + 86400000,
          );
          d.setHours(11, 0, 0, 0);
          return d.toISOString();
        })(),
    ),
  );
  const [notes, setNotes] = useState(booking?.notes || "");
  const [guests, setGuests] = useState(booking?.guests || []);
  // Yeni misafir satırları varsayılan uyrukla açılır (Ayarlar → Ülke).
  const { defaultCountry } = useCurrency();
  // Sahip adı değişince ilk misafir otomatik eşlenir (manuel girilmiş
  // isim ezilmez; eşleşme önceki sahip değeriyle takip edilir).
  const ownerPrev = React.useRef(booking?.guest_name || "");
  const syncOwnerToFirstGuest = (ownerName: string) => {
    const prev = ownerPrev.current;
    ownerPrev.current = ownerName;
    setGuests((rows) => {
      if (!rows.length) {
        return ownerName.trim()
          ? [
              {
                id: crypto.randomUUID(),
                name: ownerName,
                nationality: defaultCountry,
              },
            ]
          : rows;
      }
      const [first, ...rest] = rows;
      if (first.name === "" || first.name === prev) {
        return [{ ...first, name: ownerName }, ...rest];
      }
      return rows;
    });
  };
  // Kayıtlı sahibi olup misafir satırı olmayan eski kayıtlarda ilk satırı tohumla.
  React.useEffect(() => {
    setGuests((rows) => {
      const ownerName = (booking?.guest_name || "").trim();
      if (rows.length || !ownerName) return rows;
      ownerPrev.current = booking?.guest_name || "";
      return [
        { id: crypto.randomUUID(), name: ownerName, nationality: defaultCountry },
      ];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [options, setOptions] = useState<APIRoom[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Giriş + Çıkış takvimleri tek obje gibi birlikte açılır/kapanır.
  const [datesOpen, setDatesOpen] = useState(false);
  // Gece sayısı giriş/çıkıştan türetilir; tek kaynak tarih stringleridir.
  const nights = React.useMemo(() => calcNights(start, end), [start, end]);
  const handleNightsChange = (n: number) => {
    if (!start) return;
    setEnd(endForNights(start, end, n));
    setOptions(null);
  };
  const handleStartChange = (v: string) => {
    setStart(v);
    // Giriş kayınca çıkış da aynı gece sayısını koruyarak ötelenir.
    if (v) setEnd(endForNights(v, end, nights));
    setOptions(null);
  };
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
              daily_price_minor: priceMinor,
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
      <div className="grid grid-cols-12 gap-4 items-start">
        <div className="col-span-12 sm:col-span-5 min-w-0">
          <DateField
            label="Giriş"
            value={start}
            open={datesOpen}
            onOpenChange={setDatesOpen}
            onChange={handleStartChange}
          />
        </div>
        <div className="col-span-12 sm:col-span-2 min-w-0">
          <StepperField
            label="Gece"
            value={nights}
            min={1}
            max={365}
            onChange={handleNightsChange}
            sub="gece"
          />
        </div>
        <div className="col-span-12 sm:col-span-5 min-w-0">
          <DateField
            label="Çıkış"
            value={end}
            min={start || undefined}
            open={datesOpen}
            onOpenChange={setDatesOpen}
            onChange={(v) => {
              setEnd(v);
              setOptions(null);
            }}
          />
        </div>
      </div>
      </FormSection>
      <FormSection
        title={`Misafirler${guests.length ? ` · ${guests.length}` : ""}`}
        hint="Sahip, kişi sayısı ve konaklayanlar"
        action={
          <button
            className={`uni-control ${secondaryStyle} gap-2`}
            type="button"
            onClick={() => {
              setGuests([
                ...guests,
                { id: crypto.randomUUID(), name: "", nationality: defaultCountry },
              ]);
              setCount(Math.max(count, guests.length + 1));
            }}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Misafir Ekle
          </button>
        }
      >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <GuestNameField
        label="Rezervasyon sahibi"
        value={name}
        hotelId={snapshot.hotel_id}
        branchId={snapshot.branch_id}
        placeholder="Ad soyad"
        required
        autoComplete="off"
        uppercase
        onChange={(v) => {
          setName(v);
          syncOwnerToFirstGuest(v);
        }}
        onPick={(picked) => {
          // Sahiple eşlenen ilk satır varsa kayıtlı telefon/kimlik/uyruğu
          // boş alanlara işle (elle girilmiş farklı kişiye dokunma).
          setGuests((rows) =>
            rows.map((r, n) =>
              n === 0 && r.name === picked.name
                ? {
                    ...r,
                    id: picked.id,
                    address: picked.address || r.address,
                    phone: r.phone || picked.phone,
                    tcNo: r.tcNo || picked.tcNo,
                    nationality: r.nationality || picked.nationality,
                  }
                : r,
            ),
          );
        }}
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
        {guests.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
            <p className="text-xs font-bold text-slate-600">
              Henüz misafir eklenmedi
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
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
            <GuestNameField
              label="Ad Soyad"
              tone="white"
              required
              uppercase
              value={g.name}
              hotelId={snapshot.hotel_id}
              branchId={snapshot.branch_id}
              onChange={(v) =>
                setGuests(
                  guests.map((n2) =>
                    n2.id === g.id ? { ...n2, name: v } : n2,
                  ),
                )
              }
              onPick={(picked) =>
                setGuests(
                  guests.map((n2) =>
                    n2.id === g.id
                      ? {
                          ...n2,
                          id: picked.id,
                          address: picked.address || n2.address,
                          name: picked.name,
                          phone: n2.phone || picked.phone,
                          tcNo: n2.tcNo || picked.tcNo,
                          nationality:
                            n2.nationality || picked.nationality,
                        }
                      : n2,
                  ),
                )
              }
            />
            <TextField
              label="Telefon"
              tone="white"
              uppercase
              value={g.phone || ""}
              onChange={(v) =>
                setGuests(
                  guests.map((n2) =>
                    n2.id === g.id ? { ...n2, phone: v } : n2,
                  ),
                )
              }
            />
            <TextField
              label="Kimlik / Pasaport"
              tone="white"
              uppercase
              value={g.tcNo || ""}
              onChange={(v) =>
                setGuests(
                  guests.map((n2) =>
                    n2.id === g.id ? { ...n2, tcNo: v } : n2,
                  ),
                )
              }
            />
            <NationalityField
              label="Uyruk"
              tone="white"
              value={g.nationality || ""}
              onChange={(v) =>
                setGuests(
                  guests.map((n2) =>
                    n2.id === g.id ? { ...n2, nationality: v } : n2,
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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <RoomSelectField
            label="Kiralanacak birim"
            value={room}
            onChange={setRoom}
            snapshot={snapshot}
            checkInISO={start ? new Date(start).toISOString() : snapshot.server_time}
            excludeBookingId={booking?.booking_id}
            rooms={options ?? undefined}
          />
        </div>
        <div className="lg:col-span-2">
          <MoneyField
            label="Günlük Fiyat"
            valueMinor={priceMinor}
            onChange={setPriceMinor}
          />
        </div>
      </div>
      <div>
        <button
          type="button"
          className={`uni-control ${secondaryStyle} w-full`}
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
            <Field label={`${i + 1}. Misafir Uyruk`}>
              <select
                className={`uni-input ${inputStyle}`}
                aria-label={`${i + 1}. Misafir Uyruk`}
                value={g.nationality || ""}
                onChange={(e) => patch(i, { nationality: e.target.value })}
              >
                <option value="">Seçin</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {countryFlag(c.code)} {c.name}
                  </option>
                ))}
              </select>
            </Field>
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
