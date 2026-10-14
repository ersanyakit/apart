import { PageHeader } from "./PageHeader";
import { SettingsEditor } from "./SettingsEditor";
import React, { useEffect, useRef, useState } from "react";
import { Layers, Plus, Pencil, Trash2, BedDouble, Map as MapIcon } from "lucide-react";
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
  buttonStyle,
  secondaryStyle,
} from "./FormKit";
import { InlineSelectField, Switch, TextField } from "./fields";
import { confirmDialog } from "./ConfirmDialog";
import { FloorBoard } from "./FloorBoard";
import { BED_PRESETS, applyBedPreset, type Bed, type Place, type BedPreset } from "../lib/bed-presets";
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
        <PageHeader pageId="units">
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
            <MapIcon size={14} />
            Kat Planı
          </button>
        </div>
        </PageHeader>
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
                      <Switch
                        label="Tüm birimleri seç"
                        hideLabel
                        checked={
                          rooms.length > 0 &&
                          rooms.every((r) => selected.includes(r.room_id))
                        }
                        onChange={(checked) =>
                          setSelected(
                            checked ? rooms.map((r) => r.room_id) : [],
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
                        <Switch
                          hideLabel
                          label={`${r.code} seç`}
                          checked={selected.includes(r.room_id)}
                          onChange={(checked) =>
                            setSelected((v) =>
                              checked
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
              <div className="min-w-44 flex-1">
                <InlineSelectField
                  label="Oda"
                  value={parent || ""}
                  onChange={(v) => setParent(v || null)}
                  options={[
                    { value: "", label: "Tüm odalar / bağımsız yataklar" },
                    ...rooms
                      .filter((r) => r.kind !== "bed")
                      .map((r) => ({ value: r.room_id, label: r.code })),
                  ]}
                />
              </div>
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
  const parentRentalMode = s.rooms.find(r => r.room_id === b.room_id)?.rental_mode;
  const rememberedPlaces = useRef(new Map(bed.places.map(p => [p.level, p])));
  const [presetNotice, setPresetNotice] = useState("");
  const applyPreset = (preset: BedPreset) => {
    for (const place of b.places) rememberedPlaces.current.set(place.level, place);
    setB(applyBedPreset(b, preset, [...rememberedPlaces.current.values()]));
    setPresetNotice(`${preset.label} alanlara uygulandı. Düzenleyip kaydedebilirsiniz.`);
    setError("");
  };
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
      <section aria-label="Hazır yatak tanımları" className="space-y-3">
        <div>
          <h3 className="font-uninav-book text-base text-uni-ink">Hazır yatak tanımları</h3>
          <p className="mt-1 text-sm text-uni-muted">
            Bir seçenekle tür, ölçü, seviye ve kapasiteyi doldurun. Ölçüler başlangıç değerleridir; kaydetmeden önce düzenleyebilirsiniz.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {BED_PRESETS.map(preset => {
            const Icon = preset.structure === "bunk" ? Layers : BedDouble;
            return (
              <button
                key={preset.key}
                type="button"
                disabled={busy}
                className="uni-button uni-button-secondary rounded-full"
                title={`${preset.width_cm} × ${preset.length_cm} cm · ${preset.levels} seviye · ${preset.levels * preset.capacity} kişi`}
                onClick={() => applyPreset(preset)}
              >
                <Icon size={18} aria-hidden="true" />
                {preset.label}
              </button>
            );
          })}
        </div>
        <p role="status" className="text-xs text-uni-muted">{presetNotice}</p>
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="Yatak kodu"
          required
          autoComplete="off"
          uppercase
          value={b.code}
          onChange={(v) =>
            patch({
              code: v,
              places: b.places.map((p, i) => ({
                ...p,
                code:
                  p.code === "" || p.code === `${b.code}-${i + 1}`
                    ? `${v}-${i + 1}`
                    : p.code,
              })),
            })
          }
        />
        <InlineSelectField
          label="Oda"
          value={b.room_id || ""}
          onChange={(v) =>
            patch({
              room_id: v || null,
              floor_id:
                s.rooms.find((r) => r.room_id === v)?.floor_id ||
                b.floor_id,
            })
          }
          options={[
            { value: "", label: "Bağımsız yatak" },
            ...s.rooms
              .filter((r) => r.kind !== "bed")
              .map((r) => ({ value: r.room_id, label: r.code })),
          ]}
        />
        <InlineSelectField
          label="Kat"
          value={b.floor_id || ""}
          onChange={(v) => patch({ floor_id: v || null })}
          options={[
            { value: "", label: "Kat atanmamış" },
            ...s.floors.map((f) => ({
              value: f.floor_id,
              label: localized(f.label) || f.code,
            })),
          ]}
        />
        <InlineSelectField
          label="Yatak türü"
          value={b.type}
          onChange={(v) => patch({ type: v })}
          options={Object.entries(bedTypes).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <InlineSelectField
          label="Fiziksel yapı"
          value={b.structure}
          onChange={(v) => patch({ structure: v })}
          options={Object.entries(structures).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <TextField
          label="Seviye sayısı"
          type="number"
          value={String(b.levels)}
          onChange={(v) => levels(Number(v))}
        />
        <TextField
          label="Yatak genişliği (cm)"
          type="number"
          value={String(b.width_cm)}
          onChange={(v) => patch({ width_cm: Number(v) })}
        />
        <TextField
          label="Yatak uzunluğu (cm)"
          type="number"
          value={String(b.length_cm)}
          onChange={(v) => patch({ length_cm: Number(v) })}
        />
      </div>
      <p className="text-xs text-slate-500">
        Her fiziksel yatak ayrı kaydedilir. Kapasite, aktif yatak yerlerinin
        kişi kapasitelerinin toplamıdır. Twin düzeni oda tanımında seçilir.
      </p>
      <h3 className="font-uninav-book text-[1.125rem] leading-6 text-slate-900">Yatak yerleri</h3>
      {b.places.map((p, i) => (
        <div
          key={i}
          className="rounded-[20px] bg-[#f9f9f9] p-4 space-y-3"
        >
          <strong className="font-uninav-book block text-[0.875rem] leading-5 text-slate-500">Seviye {p.level}</strong>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label="Yer kodu"
              tone="white"
              required
              autoComplete="off"
              uppercase
              value={p.code}
              onChange={(v) => changePlace(i, { code: v })}
            />
            <InlineSelectField
              label="Konum"
              tone="white"
              value={p.position}
              onChange={(v) => changePlace(i, { position: v })}
              options={Object.entries({
                single: "Tek seviye",
                lower: "Alt",
                middle: "Orta",
                upper: "Üst",
              }).map(([value, label]) => ({ value, label }))}
            />
            <TextField
              label="Kişi kapasitesi"
              tone="white"
              type="number"
              required
              value={String(p.capacity)}
              onChange={(v) => changePlace(i, { capacity: Number(v) })}
            />
            <TextField
              label="Genişlik (cm)"
              tone="white"
              type="number"
              value={String(p.width_cm)}
              onChange={(v) => changePlace(i, { width_cm: Number(v) })}
            />
            <TextField
              label="Uzunluk (cm)"
              tone="white"
              type="number"
              value={String(p.length_cm)}
              onChange={(v) => changePlace(i, { length_cm: Number(v) })}
            />
          </div>
          <div className="space-y-1">
            <Switch
              label="Aktif"
              hint="Pasif yataklar planda ve aramada görünmez."
              checked={p.is_active}
              onChange={(v) => changePlace(i, { is_active: v })}
            />
            <Switch
              label="Ayrı rezerve edilebilir"
              hint={parentRentalMode ? "Odanın kiralama şekline göre belirlenir. Oda tanımından değiştirebilirsiniz." : "Kapalıysa yalnızca üst birimle birlikte kiralanır."}
              disabled={!!parentRentalMode}
              checked={parentRentalMode ? parentRentalMode === "beds" : p.rentable}
              onChange={(v) => changePlace(i, { rentable: v })}
            />
          </div>
        </div>
      ))}
      <button className={`uni-control ${buttonStyle}`} disabled={busy}>
        Yatağı Kaydet
      </button>
    </form>
  );
}
