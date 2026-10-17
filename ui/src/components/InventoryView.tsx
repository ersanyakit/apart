import { BedIllustration } from './BedIllustration';
import { FloorList } from "./FloorList";
import { useI18n } from "./I18n";
import { UnitsToolbar } from "./UnitsToolbar";
import { BedPresetPicker } from "./BedPresetPicker";
import { PageHeader } from "./PageHeader";
import { SettingsEditor } from "./SettingsEditor";
import React, { useEffect, useRef, useState } from "react";
import { Layers, Plus, Pencil, Trash2, Map as MapIcon } from "lucide-react";
import {
  command,
  contracts,
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
import { BED_PRESETS, matchBedPreset, applyBedPreset, type Bed, type Place, type BedPreset } from "../lib/bed-presets";
const bedTypes: Record<string, string> = contracts.bed_types;
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
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const {locale}=useI18n();
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
  const rooms = s.rooms.filter((r) => r.kind !== "bed" && (!floor || r.floor_id === floor));
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
        _uiText("{value1} seçili birim ve alt birimleri silinsin mi?\nKayıtlar ve geçmişi korunur. Aktif rezervasyonu bulunan birimler silinmez.", {value1: String(ids.length)}),
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
        <PageHeader pageId="units"/>
        <UnitsToolbar floors={s.floors} floor={floor} mode={mode} busy={busy}
          onFloorChange={id=>{setFloor(id);setSelected([]);setParent(null);if(!id&&mode==='plan')setMode('rooms');}}
          onModeChange={next=>{setMode(next);setParent(null);setSelected([]);}}
          onAdd={()=>onUnit()} onAddBed={newBed} onBulk={onBulk} onCreateFloor={()=>onFloor()}/>
        {mode==='floors'&&<FloorList floors={s.floors} rooms={s.rooms} busy={busy} onEdit={onFloor}
          onRooms={f=>{setFloor(f.floor_id);setMode('rooms');setSelected([]);setParent(null);}}
          onDelete={f=>void (async()=>{
            const name=localized(f.label,locale.toUpperCase())||f.code;
            if(await confirmDialog(_uiText("{value1} ({value2}) silinsin mi? Bu katta kayıtlı birim bulunmuyor.", {value1: String(name), value2: String(f.code)})))
              await work(async()=>{await command('floor.delete',{id:f.floor_id});if(floor===f.floor_id){setFloor('');setParent(null);}});
          })()}/>}
        {mode === "rooms" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-uni-muted">
              <span>{rooms.length} {_uiText("oda / birim · Yatak ayrıntıları için “Yataklar” görünümünü kullanın.")}</span>
              {!!selected.length&&<button className={`uni-control ${secondaryStyle}`} disabled={busy} onClick={()=>remove(selected)}><Trash2 size={14}/>{_uiText("Seçilenleri Sil (")}{selected.length})</button>}
            </div>
            <div className="rounded-2xl border border-slate-200 overflow-auto bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400">
                  <tr>
                    <th className="p-4">
                      <Switch
                        label={_uiText("Tüm birimleri seç")}
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
                      "Kiralama şekli",
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
                          label={_uiText("{value1} seç", {value1: String(r.code)})}
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
                      <td>{r.kind === "bed" ? _uiText("{value1} kişilik yatak yeri", {value1: String(r.capacity)}) : r.rental_mode === "beds" ? _uiText("Yataklar ayrı ayrı") : r.rentable ? _uiText("Tamamı kiralanır") : _uiText("Ayrı kiralanmaz")}</td>
                      <td>{r.status}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            className={`uni-control ${secondaryStyle}`}
                            aria-label={_uiText("{value1} düzenle", {value1: String(r.code)})}
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
                            >{_uiText("Yatakları")} </button>
                          )}
                          <button
                            className={`uni-control ${secondaryStyle}`}
                            aria-label={_uiText("{value1} sil", {value1: String(r.code)})}
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
                <p className="p-10 text-sm text-slate-400">{_uiText("Bu katta henüz birim tanımlanmamış.")} </p>
              )}
            </div>
          </>
        )}
        {mode === "beds" && (
          <>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="min-w-44 flex-1">
                <InlineSelectField
                  label={_uiText("Oda")}
                  value={parent || ""}
                  onChange={(v) => setParent(v || null)}
                  options={[
                    { value: "", label: _uiText("Tüm odalar / bağımsız yataklar") },
                    ...rooms
                      .filter((r) => r.kind !== "bed")
                      .map((r) => ({ value: r.room_id, label: r.code })),
                  ]}
                />
              </div>

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
                      <BedIllustration type={b.type} structure={b.structure} levels={b.levels} size={80} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {matchBedPreset(b)?.label || bedTypes[b.type]} · {structures[b.structure]} · {b.levels}{" "}{_uiText("seviye ·")} {b.width_cm || "—"} × {b.length_cm || "—"} {_uiText("cm")} </p>
                    <p className="text-xs font-bold">
                      {b.places
                        .filter((p) => p.is_active)
                        .reduce((n, p) => n + p.capacity, 0)}{" "}{_uiText("kişi ·")} {b.places.length} {_uiText("yatak yeri")} </p>
                    <details><summary className="min-h-11 cursor-pointer text-xs text-uni-muted">{_uiText("Yatak yerleri (")}{b.places.length})</summary>
                    {b.places.map((p) => (
                      <p key={p.unit_id} className="text-xs text-slate-400">
                        {p.code} {_uiText("· Seviye")} {p.level} · {p.capacity} {_uiText("kişi ·")}{" "}
                        {p.is_active ? _uiText("Aktif") : _uiText("Pasif")}
                      </p>
                    ))}
                    </details>
                    <div className="flex gap-2">
                      <button
                        className={`uni-control ${secondaryStyle}`}
                        onClick={() => setBed(b)}
                      >{_uiText("Düzenle")} </button>
                      <button
                        className={`uni-control ${secondaryStyle}`}
                        onClick={async () => {
                          if (
                            await confirmDialog(
                              _uiText("{value1} fiziksel yatağı ve yatak yerleri silinsin mi?", {value1: String(b.code)}),
                            )
                          )
                            await work(() =>
                              command("bed.delete", { id: b.bed_id }),
                            );
                        }}
                      >{_uiText("Sil")} </button>
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
        <SettingsEditor title={_uiText("Fiziksel Yatak Tanımı")} onClose={() => setBed(null)}>
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
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const {locale}=useI18n();
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
      <section aria-label={_uiText("Hazır yatak tanımları")} className="space-y-3">
        <div>
          <h3 className="font-uninav-book text-base text-uni-ink">{_uiText("Hazır yatak tanımları")}</h3>
          <p className="mt-1 text-sm text-uni-muted">{_uiText("Bir seçenekle tür, ölçü, seviye ve kapasiteyi doldurun. Ölçüler başlangıç değerleridir; kaydetmeden önce düzenleyebilirsiniz.")} </p>
        </div>
        <BedPresetPicker disabled={busy} onSelect={applyPreset}/>
        <p role="status" className="text-xs text-uni-muted">{presetNotice}</p>
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label={_uiText("Yatak kodu")}
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
          label={_uiText("Oda")}
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
            { value: "", label: _uiText("Bağımsız yatak") },
            ...s.rooms
              .filter((r) => r.kind !== "bed")
              .map((r) => ({ value: r.room_id, label: r.code })),
          ]}
        />
        <InlineSelectField
          label={_uiText("Kat")}
          value={b.floor_id || ""}
          onChange={(v) => patch({ floor_id: v || null })}
          options={[
            { value: "", label: _uiText("Kat atanmamış") },
            ...s.floors.map((f) => ({
              value: f.floor_id,
              label: localized(f.label,locale.toUpperCase()) || f.code,
            })),
          ]}
        />
        <InlineSelectField
          label={_uiText("Yatak türü")}
          value={b.type}
          onChange={(v) => patch({ type: v })}
          options={Object.entries(bedTypes).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <InlineSelectField
          label={_uiText("Fiziksel yapı")}
          value={b.structure}
          onChange={(v) => patch({ structure: v })}
          options={Object.entries(structures).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <TextField
          label={_uiText("Seviye sayısı")}
          type="number"
          value={String(b.levels)}
          onChange={(v) => levels(Number(v))}
        />
        <TextField
          label={_uiText("Yatak genişliği (cm)")}
          type="number"
          value={String(b.width_cm)}
          onChange={(v) => patch({ width_cm: Number(v) })}
        />
        <TextField
          label={_uiText("Yatak uzunluğu (cm)")}
          type="number"
          value={String(b.length_cm)}
          onChange={(v) => patch({ length_cm: Number(v) })}
        />
      </div>
      <p className="text-xs text-slate-500">{_uiText("Her fiziksel yatak ayrı kaydedilir. Kapasite, aktif yatak yerlerinin kişi kapasitelerinin toplamıdır. Twin düzeni oda tanımında seçilir.")} </p>
      <h3 className="font-uninav-book text-[1.125rem] leading-6 text-slate-900">{_uiText("Yatak yerleri")}</h3>
      {b.places.map((p, i) => (
        <div
          key={i}
          className="rounded-[20px] bg-[#f9f9f9] p-4 space-y-3"
        >
          <strong className="font-uninav-book block text-[0.875rem] leading-5 text-slate-500">{_uiText("Seviye")} {p.level}</strong>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label={_uiText("Yer kodu")}
              tone="white"
              required
              autoComplete="off"
              uppercase
              value={p.code}
              onChange={(v) => changePlace(i, { code: v })}
            />
            <InlineSelectField
              label={_uiText("Konum")}
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
              label={_uiText("Kişi kapasitesi")}
              tone="white"
              type="number"
              required
              value={String(p.capacity)}
              onChange={(v) => changePlace(i, { capacity: Number(v) })}
            />
            <TextField
              label={_uiText("Genişlik (cm)")}
              tone="white"
              type="number"
              value={String(p.width_cm)}
              onChange={(v) => changePlace(i, { width_cm: Number(v) })}
            />
            <TextField
              label={_uiText("Uzunluk (cm)")}
              tone="white"
              type="number"
              value={String(p.length_cm)}
              onChange={(v) => changePlace(i, { length_cm: Number(v) })}
            />
          </div>
          <div className="space-y-1">
            <Switch
              label={_uiText("Aktif")}
              hint={_uiText("Pasif yataklar planda ve aramada görünmez.")}
              checked={p.is_active}
              onChange={(v) => changePlace(i, { is_active: v })}
            />
            <Switch
              label={_uiText("Ayrı rezerve edilebilir")}
              hint={parentRentalMode ? _uiText("Odanın kiralama şekline göre belirlenir. Oda tanımından değiştirebilirsiniz.") : _uiText("Kapalıysa yalnızca üst birimle birlikte kiralanır.")}
              disabled={!!parentRentalMode}
              checked={parentRentalMode ? parentRentalMode === "beds" : p.rentable}
              onChange={(v) => changePlace(i, { rentable: v })}
            />
          </div>
        </div>
      ))}
      <button className={`uni-control ${buttonStyle}`} disabled={busy}>{_uiText("Yatağı Kaydet")} </button>
    </form>
  );
}
