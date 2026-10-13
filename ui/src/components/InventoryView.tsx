import { SettingsEditor } from "./SettingsEditor";
import React, { useEffect, useState } from "react";
import { Layers, Plus, Pencil, Trash2, BedDouble, Map } from "lucide-react";
import {
  command,
  messageOf,
  localized,
  unitKinds,
  type Snapshot,
  type APIRoom,
  type Floor,
} from "../lib/api";
import {
  ErrorMessage,
  Field,
  inputStyle,
  buttonStyle,
  secondaryStyle,
} from "./FormKit";
import { confirmDialog } from "./ConfirmDialog";
import { FloorBoard } from "./FloorBoard";
type Place = {
  unit_id?: string;
  code: string;
  level: number;
  position: string;
  width_cm: number;
  length_cm: number;
  capacity: number;
  is_active: boolean;
  rentable: boolean;
};
type Bed = {
  bed_id?: string;
  branch_id: string;
  room_id: string | null;
  floor_id: string | null;
  code: string;
  type: string;
  structure: string;
  width_cm: number;
  length_cm: number;
  levels: number;
  places: Place[];
};
const bedTypes: Record<string, string> = {
  single: "Tek kişilik",
  double: "Çift kişilik",
  queen: "Queen",
  king: "King",
  bunk_bed: "Ranza",
  loft_bed: "Yükseltilmiş",
  capsule_bed: "Kapsül",
  sofa_bed: "Açılır kanepe",
  futon: "Futon",
  murphy_bed: "Duvara katlanan",
  rollaway_bed: "Taşınabilir ek yatak",
  crib: "Bebek yatağı",
  daybed: "Divan",
};
const structures: Record<string, string> = {
  standard: "Standart",
  bunk: "Ranza",
  capsule: "Kapsül",
  sofa: "Kanepe",
  folding: "Katlanır",
  loft: "Yükseltilmiş",
};
export function InventoryView({
  snapshot: s,
  onRefresh,
  onUnit,
  onFloor,
  onBulk,
  onBook,
}: {
  snapshot: Snapshot;
  onRefresh: () => Promise<void>;
  onUnit: (room?: APIRoom) => void;
  onFloor: (floor?: Floor) => void;
  onBulk: () => void;
  onBook: (room: APIRoom) => void;
}) {
  const [floor, setFloor] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [beds, setBeds] = useState<Bed[]>([]),
    [bed, setBed] = useState<Bed | null>(null),
    [parent, setParent] = useState<string | null>(null),
    [mode, setMode] = useState("rooms"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    command<Bed[]>("bed.list", { branch_id: s.branch_id })
      .then((v) => {
        if (active) setBeds(v);
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      });
    return () => {
      active = false;
    };
  }, [s]);
  useEffect(() => {
    setFloor("");
    setSelected([]);
    setParent(null);
  }, [s.branch_id]);
  const rooms = s.rooms.filter((r) => !floor || r.floor_id === floor);
  const currentFloor = s.floors.find((f) => f.floor_id === floor);
  const work = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await onRefresh();
      setSelected([]);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (ids: string[]) => {
    if (
      await confirmDialog(
        `${ids.length} seçili birim ve alt birimleri silinsin mi?\nKayıtlar ve geçmişi korunur. Aktif rezervasyonu bulunan birimler silinmez.`,
      )
    )
      await work(() =>
        command("room.delete_many", { branch_id: s.branch_id, ids }),
      );
  };
  const newBed = () =>
    setBed({
      branch_id: s.branch_id,
      room_id: parent,
      floor_id: floor || null,
      code: "",
      type: "single",
      structure: "standard",
      width_cm: 90,
      length_cm: 200,
      levels: 1,
      places: [
        {
          code: "",
          level: 1,
          position: "single",
          width_cm: 90,
          length_cm: 200,
          capacity: 1,
          is_active: true,
          rentable: true,
        },
      ],
    });
  return (
    <div className="space-y-5">
      <div hidden={!!bed} className="space-y-5">
        <ErrorMessage message={error} />
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            className={`uni-control ${!floor ? buttonStyle : secondaryStyle}`}
            onClick={() => {
              setFloor("");
              setSelected([]);
            }}
          >
            Tüm katlar
          </button>
          {s.floors.map((f) => (
            <button
              key={f.floor_id}
              className={`uni-control ${floor === f.floor_id ? buttonStyle : secondaryStyle}`}
              onClick={() => {
                setFloor(f.floor_id);
                setSelected([]);
              }}
            >
              <Layers size={14} />
              {localized(f.label) || f.code}
              <span className="opacity-60">
                {
                  s.rooms.filter(
                    (r) => r.floor_id === f.floor_id && r.kind !== "bed",
                  ).length
                }
              </span>
            </button>
          ))}
          <button className={`uni-control ${secondaryStyle}`} onClick={() => onFloor()}>
            <Plus size={14} />
            Kat Ekle
          </button>
        </div>
        <div className="flex flex-wrap justify-between gap-3 items-center">
          <div>
            <h3 className="text-lg font-black">
              {currentFloor
                ? localized(currentFloor.label) || currentFloor.code
                : "Tüm kat ve odalar"}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Kat, oda, yatak ve fiziksel yerleşim tanımları
            </p>
          </div>
          {currentFloor && (
            <div className="flex gap-2">
              <button
                className={`uni-control ${secondaryStyle}`}
                onClick={() => onFloor(currentFloor)}
              >
                <Pencil size={13} />
                Katı Düzenle
              </button>
              <button
                className={`uni-control ${secondaryStyle}`}
                disabled={busy}
                onClick={async () => {
                  if (
                    await confirmDialog(
                      "Kat silinsin mi? İçindeki birimleri önce silmelisiniz.",
                    )
                  )
                    await work(() =>
                      command("floor.delete", { id: currentFloor.floor_id }),
                    );
                }}
              >
                <Trash2 size={13} />
                Katı Sil
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`uni-control ${mode === "rooms" ? buttonStyle : secondaryStyle}`}
            onClick={() => setMode("rooms")}
          >
            Odalar ve Birimler
          </button>
          <button
            className={`uni-control ${mode === "beds" ? buttonStyle : secondaryStyle}`}
            onClick={() => {
              setMode("beds");
              setParent(null);
            }}
          >
            <BedDouble size={14} />
            Yataklar
          </button>
          <button
            className={`uni-control ${mode === "plan" ? buttonStyle : secondaryStyle}`}
            disabled={!floor}
            onClick={() => setMode("plan")}
          >
            <Map size={14} />
            Kat Planı
          </button>
        </div>
        {mode === "rooms" && (
          <>
            <div className="flex flex-wrap gap-2">
              <button className={`uni-control ${buttonStyle}`} onClick={() => onUnit()}>
                <Plus size={14} />
                Oda / Birim Ekle
              </button>
              <button className={`uni-control ${secondaryStyle}`} onClick={onBulk}>
                Toplu Oda / Yatak Ekle
              </button>
              <button
                className={`uni-control ${secondaryStyle}`}
                disabled={!selected.length || busy}
                onClick={() => remove(selected)}
              >
                <Trash2 size={14} />
                Seçilenleri Sil ({selected.length})
              </button>
              <button
                className={`uni-control ${secondaryStyle}`}
                disabled={!rooms.length || busy}
                onClick={() => remove(rooms.map((r) => r.room_id))}
              >
                Bu Görünümdeki Tümünü Sil
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 overflow-auto bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400">
                  <tr>
                    <th className="p-4">
                      <input
                        aria-label="Tüm birimleri seç"
                        type="checkbox"
                        checked={
                          rooms.length > 0 &&
                          rooms.every((r) => selected.includes(r.room_id))
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked ? rooms.map((r) => r.room_id) : [],
                          )
                        }
                      />
                    </th>
                    {[
                      "Birim",
                      "Kat",
                      "Üst birim",
                      "Tür",
                      "Kişi sınırı",
                      "Durum",
                      "İşlemler",
                    ].map((h) => (
                      <th className="p-3" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.room_id} className="border-t border-slate-100">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          aria-label={`${r.code} seç`}
                          checked={selected.includes(r.room_id)}
                          onChange={(e) =>
                            setSelected((v) =>
                              e.target.checked
                                ? [...v, r.room_id]
                                : v.filter((id) => id !== r.room_id),
                            )
                          }
                        />
                      </td>
                      <td className="font-black">{r.code}</td>
                      <td>
                        {s.floors.find((f) => f.floor_id === r.floor_id)?.code ||
                          "—"}
                      </td>
                      <td>
                        {s.rooms.find((p) => p.room_id === r.parent_id)?.code ||
                          "—"}
                      </td>
                      <td>{unitKinds[r.kind]}</td>
                      <td>{r.kind === "bed" ? r.capacity : "Yok"}</td>
                      <td>{r.status}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            className={`uni-control ${secondaryStyle}`}
                            aria-label={`${r.code} düzenle`}
                            onClick={() => onUnit(r)}
                          >
                            <Pencil size={13} />
                          </button>
                          {r.kind !== "bed" && (
                            <button
                              className={`uni-control ${secondaryStyle}`}
                              onClick={() => {
                                setParent(r.room_id);
                                setMode("beds");
                              }}
                            >
                              Yatakları
                            </button>
                          )}
                          <button
                            className={`uni-control ${secondaryStyle}`}
                            aria-label={`${r.code} sil`}
                            onClick={() => remove([r.room_id])}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rooms.length && (
                <p className="p-10 text-sm text-slate-400">
                  Bu katta henüz birim tanımlanmamış.
                </p>
              )}
            </div>
          </>
        )}
        {mode === "beds" && (
          <>
            <div className="flex gap-3 items-end">
              <Field label="Oda">
                <select
                  className={`uni-input ${inputStyle}`}
                  value={parent || ""}
                  onChange={(e) => setParent(e.target.value || null)}
                >
                  <option value="">Tüm odalar / bağımsız yataklar</option>
                  {rooms
                    .filter((r) => r.kind !== "bed")
                    .map((r) => (
                      <option key={r.room_id} value={r.room_id}>
                        {r.code}
                      </option>
                    ))}
                </select>
              </Field>
              <button className={`uni-control ${buttonStyle}`} onClick={newBed}>
                <Plus size={14} />
                Fiziksel Yatak Ekle
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {beds
                .filter(
                  (b) =>
                    (!floor || b.floor_id === floor) &&
                    (!parent || b.room_id === parent),
                )
                .map((b) => (
                  <article
                    key={b.bed_id}
                    className="uni-card border border-slate-200 rounded-2xl p-5 bg-white space-y-3"
                  >
                    <div className="flex justify-between">
                      <strong>{b.code}</strong>
                      <BedDouble className="text-brand-blue-500" size={20} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {bedTypes[b.type]} · {structures[b.structure]} · {b.levels}{" "}
                      seviye · {b.width_cm || "—"} × {b.length_cm || "—"} cm
                    </p>
                    <p className="text-xs font-bold">
                      {b.places
                        .filter((p) => p.is_active)
                        .reduce((n, p) => n + p.capacity, 0)}{" "}
                      kişi · {b.places.length} yatak yeri
                    </p>
                    {b.places.map((p) => (
                      <p key={p.unit_id} className="text-xs text-slate-400">
                        {p.code} · Seviye {p.level} · {p.capacity} kişi ·{" "}
                        {p.is_active ? "Aktif" : "Pasif"}
                      </p>
                    ))}
                    <div className="flex gap-2">
                      <button
                        className={`uni-control ${secondaryStyle}`}
                        onClick={() => setBed(b)}
                      >
                        Düzenle
                      </button>
                      <button
                        className={`uni-control ${secondaryStyle}`}
                        onClick={async () => {
                          if (
                            await confirmDialog(
                              `${b.code} fiziksel yatağı ve yatak yerleri silinsin mi?`,
                            )
                          )
                            await work(() =>
                              command("bed.delete", { id: b.bed_id }),
                            );
                        }}
                      >
                        Sil
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </>
        )}
        {mode === "plan" && currentFloor && (
          <FloorBoard
            snapshot={s}
            floorId={floor}
            at={s.server_time}
            canManage
            onRefresh={onRefresh}
            onEdit={onUnit}
            onBook={onBook}
          />
        )}
      </div>
      {bed && (
        <SettingsEditor title="Fiziksel Yatak Tanımı" onClose={() => setBed(null)}>
          <BedForm
            bed={bed}
            snapshot={s}
            onSaved={async () => {
              setBed(null);
              await onRefresh();
            }}
          />
        </SettingsEditor>
      )}
    </div>
  );
}
function BedForm({
  bed,
  snapshot: s,
  onSaved,
}: {
  bed: Bed;
  snapshot: Snapshot;
  onSaved: () => Promise<void>;
}) {
  const [b, setB] = useState(bed),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const patch = (p: Partial<Bed>) => setB((v) => ({ ...v, ...p }));
  const changePlace = (i: number, p: Partial<Place>) =>
    patch({ places: b.places.map((v, n) => (i === n ? { ...v, ...p } : v)) });
  const levels = (n: number) => {
    if (n < 1 || n > 10) return;
    patch({
      levels: n,
      places: Array.from({ length: n }, (_, i) => ({
        ...b.places[i],
        code: b.places[i]?.code || `${b.code}-${i + 1}`,
        level: i + 1,
        position:
          n === 1
            ? "single"
            : i === 0
              ? "lower"
              : i === n - 1
                ? "upper"
                : "middle",
        width_cm: b.places[i]?.width_cm ?? b.width_cm,
        length_cm: b.places[i]?.length_cm ?? b.length_cm,
        capacity: b.places[i]?.capacity ?? 1,
        is_active: b.places[i]?.is_active ?? true,
        rentable: b.places[i]?.rentable ?? true,
      })),
    });
  };
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await command(b.bed_id ? "bed.update" : "bed.create", b);
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
        <Field label="Yatak kodu">
          <input
            required
            className={`uni-input ${inputStyle}`}
            maxLength={32}
            value={b.code}
            onChange={(e) =>
              patch({
                code: e.target.value,
                places: b.places.map((p, i) => ({
                  ...p,
                  code:
                    p.code === "" || p.code === `${b.code}-${i + 1}`
                      ? `${e.target.value}-${i + 1}`
                      : p.code,
                })),
              })
            }
          />
        </Field>
        <Field label="Oda">
          <select
            className={`uni-input ${inputStyle}`}
            value={b.room_id || ""}
            onChange={(e) =>
              patch({
                room_id: e.target.value || null,
                floor_id:
                  s.rooms.find((r) => r.room_id === e.target.value)?.floor_id ||
                  b.floor_id,
              })
            }
          >
            <option value="">Bağımsız yatak</option>
            {s.rooms
              .filter((r) => r.kind !== "bed")
              .map((r) => (
                <option value={r.room_id} key={r.room_id}>
                  {r.code}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Kat">
          <select
            className={`uni-input ${inputStyle}`}
            value={b.floor_id || ""}
            onChange={(e) => patch({ floor_id: e.target.value || null })}
          >
            <option value="">Kat atanmamış</option>
            {s.floors.map((f) => (
              <option key={f.floor_id} value={f.floor_id}>
                {localized(f.label) || f.code}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Yatak türü">
          <select
            className={`uni-input ${inputStyle}`}
            value={b.type}
            onChange={(e) => patch({ type: e.target.value })}
          >
            {Object.entries(bedTypes).map(([v, label]) => (
              <option value={v} key={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fiziksel yapı">
          <select
            className={`uni-input ${inputStyle}`}
            value={b.structure}
            onChange={(e) => patch({ structure: e.target.value })}
          >
            {Object.entries(structures).map(([v, label]) => (
              <option value={v} key={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Seviye sayısı">
          <input
            className={`uni-input ${inputStyle}`}
            type="number"
            min={1}
            max={10}
            value={b.levels}
            onChange={(e) => levels(Number(e.target.value))}
          />
        </Field>
        <Field label="Yatak genişliği (cm)">
          <input
            className={`uni-input ${inputStyle}`}
            type="number"
            min={0}
            max={500}
            value={b.width_cm}
            onChange={(e) => patch({ width_cm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Yatak uzunluğu (cm)">
          <input
            className={`uni-input ${inputStyle}`}
            type="number"
            min={0}
            max={500}
            value={b.length_cm}
            onChange={(e) => patch({ length_cm: Number(e.target.value) })}
          />
        </Field>
      </div>
      <p className="text-xs text-slate-500">
        Her fiziksel yatak ayrı kaydedilir. Kapasite, aktif yatak yerlerinin
        kişi kapasitelerinin toplamıdır. Twin düzeni oda tanımında seçilir.
      </p>
      <h3 className="font-black text-sm">Yatak yerleri</h3>
      {b.places.map((p, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 p-4 space-y-3"
        >
          <strong className="text-sm">Seviye {p.level}</strong>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Yer kodu">
              <input
                required
                className={`uni-input ${inputStyle}`}
                value={p.code}
                maxLength={32}
                onChange={(e) => changePlace(i, { code: e.target.value })}
              />
            </Field>
            <Field label="Konum">
              <select
                className={`uni-input ${inputStyle}`}
                value={p.position}
                onChange={(e) => changePlace(i, { position: e.target.value })}
              >
                {Object.entries({
                  single: "Tek seviye",
                  lower: "Alt",
                  middle: "Orta",
                  upper: "Üst",
                }).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kişi kapasitesi">
              <input
                required
                className={`uni-input ${inputStyle}`}
                type="number"
                min={1}
                max={10}
                value={p.capacity}
                onChange={(e) =>
                  changePlace(i, { capacity: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Genişlik (cm)">
              <input
                className={`uni-input ${inputStyle}`}
                type="number"
                min={0}
                max={500}
                value={p.width_cm}
                onChange={(e) =>
                  changePlace(i, { width_cm: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Uzunluk (cm)">
              <input
                className={`uni-input ${inputStyle}`}
                type="number"
                min={0}
                max={500}
                value={p.length_cm}
                onChange={(e) =>
                  changePlace(i, { length_cm: Number(e.target.value) })
                }
              />
            </Field>
          </div>
          <div className="flex gap-4 text-xs font-bold">
            <label>
              <input
                type="checkbox"
                checked={p.is_active}
                onChange={(e) =>
                  changePlace(i, { is_active: e.target.checked })
                }
              />{" "}
              Aktif
            </label>
            <label>
              <input
                type="checkbox"
                checked={p.rentable}
                onChange={(e) => changePlace(i, { rentable: e.target.checked })}
              />{" "}
              Ayrı rezerve edilebilir
            </label>
          </div>
        </div>
      ))}
      <button className={`uni-control ${buttonStyle}`} disabled={busy}>
        Yatağı Kaydet
      </button>
    </form>
  );
}
