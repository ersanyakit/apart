import { FloorDefinitionFields } from "./FloorDefinitionFields";
import { UnitSleepingFields } from "./UnitSleepingFields";
import { FacilityDetailsFields } from "./FacilityDetailsFields";
import {useI18n} from "./I18n";
import {FloorPresetPicker} from "./FloorPresetPicker";
import {PhoneField} from "./fields/PhoneField";
import {parsePhone} from "../lib/phone";
import {useCurrency} from "./Currency";
import {SettingsSection} from "./SettingsSection";
import { RoomStatus as RoomState } from '../lib/statuses.generated';
import React, { useState } from "react";
import {
  command,
  messageOf,
  unitKinds,
  type APIRoom,
  type Floor,
  type Snapshot,
  type Facility,
  localized,
} from "../lib/api";
import { RoomRentalSetup } from "./RoomRentalSetup";
import { RoomBedsEditor, roomBedsPayload, type RoomBedChoice } from "./RoomBedsEditor";
import { MediaEditor } from "./MediaEditor";
import { FeatureFields } from "./FeatureFields";
import { ErrorMessage, buttonStyle } from "./FormKit";
import { InlineSelectField, LocalizedTextFields, Switch, TextField } from "./fields";
const blankRoom = (s: Snapshot): APIRoom => ({
  room_id: "",
  branch_id: s.branch_id,
  floor_id: s.floors[0]?.floor_id || null,
  parent_id: null,
  kind: "room",
  capacity: 0,
  effective_capacity: 0,
  rentable: true,
  bed_group: "",
  bed_level: 0,
  position: { x: 20, y: 20, width: 140, height: 100 },
  code: "",
  name: "",
  status: RoomState.Clean,
  type: "",
  description: {},
  assets: [],
  features: [],
  inventory_ids: [],
  check_in: "",
  check_out: "",
  guests: [],
  feature_assignments: [],
});
export function UnitForm({
  snapshot,
  room,
  onSaved,
}: {
  snapshot: Snapshot;
  room?: APIRoom;
  onSaved: () => Promise<void>;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const {locale}=useI18n();
  const [draft, setDraft] = useState<APIRoom>(
    room
      ? {
          ...room,
          assets: room.assets || [],
          feature_assignments: room.feature_assignments || [],
        }
      : blankRoom(snapshot),
  );
  const [rentalMode, setRentalMode] = useState<"" | "room" | "beds">(room ? room.rental_mode || (room.rentable ? "room" : "beds") : "");
  const supportsRentalMode = draft.kind === "room" || draft.kind === "dormitory";
  const [bedChoices, setBedChoices] = useState<RoomBedChoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const patch = (p: Partial<APIRoom>) => setDraft((d) => ({ ...d, ...p }));
  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          if (supportsRentalMode && !rentalMode) throw new Error("Odanın nasıl kiralanacağını seçin.");
          if (supportsRentalMode && rentalMode === "beds" && !bedChoices.length && !snapshot.rooms.some(r => r.parent_id === draft.room_id && r.kind === "bed" && !r.inactive)) throw new Error("Yatakları ayrı kiralamak için en az bir yatak ekleyin.");
          const { room_id, effective_capacity, ...payload } = { ...draft, rental_mode: supportsRentalMode ? rentalMode : "", rentable: supportsRentalMode ? rentalMode === "room" : draft.rentable };
          await command(
            room ? "room.update" : "room.create",
            room ? { ...payload, room_id, beds_to_add: draft.kind === "bed" ? [] : roomBedsPayload(bedChoices, draft.code, draft.branch_id) } : { ...payload, beds_to_add: roomBedsPayload(bedChoices, draft.code, draft.branch_id) },
          );
          await onSaved();
        } catch (e) {
          setError(messageOf(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorMessage message={error} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label={_uiText("Birim kodu")}
          required
          autoComplete="off"
          uppercase
          value={draft.code}
          onChange={(v) => patch({ code: v })}
        />
        <InlineSelectField
          label={_uiText("Birim türü")}
          value={draft.kind}
          disabled={draft.kind === "bed"}
          onChange={(v) =>
            patch({
              kind: v,
              bed_level: v === "bed" ? 1 : 0,
              bed_group: "",
              capacity: v === "bed" ? 1 : 0,
            })
          }
          options={Object.entries(unitKinds)
            .filter(([v]) => v !== "bed" || draft.kind === "bed")
            .map(([value, label]) => ({ value, label }))}
        />
        <InlineSelectField
          label={_uiText("Kat")}
          value={draft.floor_id || ""}
          disabled={draft.kind === "bed"}
          onChange={(v) => patch({ floor_id: v || null })}
          options={[
            { value: "", label: _uiText("Kat atanmamış") },
            ...snapshot.floors.map((f) => ({
              value: f.floor_id,
              label: localized(f.label,locale.toUpperCase()) || f.code,
            })),
          ]}
        />
        <TextField
          label={_uiText("Oda tipi")}
          placeholder={_uiText("Standart, aile, süit…")}
          value={draft.type}
          onChange={(v) => patch({ type: v })}
        />
        {draft.kind === "bed" && (
          <>
            <TextField
              label={_uiText("Ranza grubu (isteğe bağlı)")}
              disabled
              placeholder={_uiText("RANZA-01")}
              value={draft.bed_group}
              onChange={(v) => patch({ bed_group: v })}
            />
            <TextField
              label={_uiText("Yatak seviyesi")}
              type="number"
              disabled
              value={String(draft.bed_level)}
              onChange={(v) => patch({ bed_level: Number(v) })}
            />
          </>
        )}
      </div>
      <UnitSleepingFields kind={draft.kind} rentable={draft.rentable} onRentableChange={rentable=>patch({rentable})}
        mode={rentalMode} onModeChange={setRentalMode} beds={bedChoices} onBedsChange={setBedChoices} roomId={room?.room_id} branchId={snapshot.branch_id} disabled={busy}/>
      <SettingsSection title={_uiText("Yerleşim ve gelişmiş ayarlar")} description={_uiText("Üst birim ve kat planındaki konum.")}>
        <div className="grid gap-4">
        <InlineSelectField
          label={_uiText("Üst birim")}
          value={draft.parent_id || ""}
          disabled={draft.kind === "bed"}
          onChange={(v) => patch({ parent_id: v || null })}
          options={[
            { value: "", label: _uiText("Bağımsız birim") },
            ...snapshot.rooms
              .filter((r) => r.room_id !== draft.room_id && r.kind !== "bed")
              .map((r) => ({
                value: r.room_id,
                label: `${r.code} · ${unitKinds[r.kind]}`,
              })),
          ]}
        />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["x", "y", "width", "height"] as const).map((key, i) => (
          <TextField
            key={key}
            label={[_uiText("Plan X"), _uiText("Plan Y"), _uiText("Genişlik"), _uiText("Yükseklik")][i]}
            type="number"
            value={String(draft.position[key])}
            onChange={(v) =>
              patch({
                position: {
                  ...draft.position,
                  [key]: Number(v),
                },
              })
            }
          />
        ))}
      </div>
        </div>
      </SettingsSection>
      <SettingsSection title={_uiText("Açıklamalar")} description={_uiText("İsteğe bağlı, farklı dillerde oda açıklaması.")}>
      <LocalizedTextFields
        label={_uiText("Açıklama")}
        hint={_uiText("Her dil için ayrı açıklama ekleyin.")}
        values={draft.description || {}}
        onChange={(description) => patch({ description })}
        multiline
      />
      </SettingsSection>
      <SettingsSection title={_uiText("Oda olanakları")} description={_uiText("Odada bulunan olanakları ve envanteri seçin.")}>
      <FeatureFields
        definitions={snapshot.feature_registry.definitions || []}
        scope="room"
        value={draft.feature_assignments}
        onChange={(feature_assignments) => patch({ feature_assignments })}
      />
      </SettingsSection>
      <SettingsSection title={_uiText("Görseller ve videolar")} description={_uiText("{value1} medya dosyası", {value1: String(draft.assets.length)})}>
      <MediaEditor
        value={draft.assets}
        onChange={(assets) => patch({ assets })}
        hotelId={snapshot.hotel_id}
        onBusy={setUploading}
      />
      </SettingsSection>
      <button disabled={busy || uploading} className={`uni-control ${buttonStyle}`}>
        {busy ? _uiText("Kaydediliyor…") : _uiText("Birimi Kaydet")}
      </button>
    </form>
  );
}
export function FloorForm({
  branchId,
  floor,
  floors = [],
  onSaved,
}: {
  branchId: string;
  floor?: Floor;
  floors?: Floor[];
  onSaved: () => Promise<void>;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const {locale}=useI18n();
  const [draft, setDraft] = useState<Floor>(
    floor || {
      floor_id: "",
      branch_id: branchId,
      code: "",
      label: { TR: "" },
      sort_order: 0,
      width: 2400,
      height: 1600,
    },
  );
  const [preset, setPreset] = useState(floor ? "custom" : "");
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
          if (!preset) throw new Error("Hazır bir kat seçin veya elle giriş seçeneğini kullanın.");
          const { floor_id, ...payload } = draft;
          await command(
            floor ? "floor.update" : "floor.create",
            floor ? draft : payload,
          );
          await onSaved();
        } catch (e) {
          setError(messageOf(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorMessage message={error} />
      <FloorDefinitionFields draft={draft} setDraft={setDraft} preset={preset} setPreset={setPreset} floors={floors} busy={busy}/>
      <button disabled={busy} className={`uni-control ${buttonStyle}`}>{_uiText("Katı Kaydet")} </button>
    </form>
  );
}
export function FacilityForm({
  snapshot,
  kind,
  create = false,
  onSaved,
}: {
  snapshot: Snapshot;
  kind: "hotel" | "branch";
  create?: boolean;
  onSaved: () => Promise<void>;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const { defaultCountry } = useCurrency();
  const current =
    kind === "hotel"
      ? snapshot.hotels.find((h) => h.hotel_id === snapshot.hotel_id)
      : snapshot.branches.find((b) => b.branch_id === snapshot.branch_id);
  const [draft, setDraft] = useState<Facility>(
    !create && current
      ? { ...current, assets: current.assets || [] }
      : {
          hotel_id: snapshot.hotel_id,
          name: "",
          description: {},
          address: "",
          phone: "",
          email: "",
          tax_number: "",
          tax_office: "",
          logo_url: "",
          cover_url: "",
          assets: [],
          feature_assignments: [],
        },
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const phone = parsePhone(draft.phone, defaultCountry);
          if (!phone.valid) throw new Error(phone.error);
          const { inventory, feature_assignments, branch_id, ...base } = { ...draft, phone: phone.e164 };
          const payload =
            kind === "branch"
              ? {
                  ...base,
                  ...(!create ? { branch_id } : {}),
                  feature_assignments: feature_assignments || [],
                }
              : base;
          await command(`${kind}.${create ? "create" : "update"}`, payload);
          await onSaved();
        } catch (e) {
          setError(messageOf(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorMessage message={error} />
      <div className="rounded-2xl bg-uni-surface px-4 py-3 text-sm">
        <p className="font-medium">{kind === "hotel" ? _uiText("Şirketin ticari bilgileri") : snapshot.hotels.find(h=>h.hotel_id===snapshot.hotel_id)?.name}</p>
        <p className="mt-1 text-xs text-uni-muted">{kind === "hotel" ? _uiText("Örn. Meyman Turizm A.Ş. Otellerinizi bu şirketin altında oluşturabilirsiniz.") : _uiText("Bu otele ait iletişim, adres ve tanıtım bilgilerini düzenleyin.")}</p>
      </div>
      <FacilityDetailsFields kind={kind} value={draft} onChange={setDraft} busy={busy}/>
      <SettingsSection title={_uiText("Tanıtım ve açıklamalar")} description={_uiText("Farklı dillerde açıklama ekleyin.")}>
      <LocalizedTextFields
        label={_uiText("Açıklama")}
        hint={_uiText("Her dil için ayrı açıklama ekleyin.")}
        values={draft.description || {}}
        onChange={(description) => setDraft({ ...draft, description })}
        multiline
      />
      </SettingsSection>
      {kind === "branch" && (
        <SettingsSection title={_uiText("Otel olanakları")} description={_uiText("Havuz, otopark, kahvaltı ve diğer olanaklar.")}>
        <FeatureFields
          definitions={snapshot.feature_registry.definitions || []}
          scope="property"
          value={draft.feature_assignments || []}
          onChange={(feature_assignments) =>
            setDraft({ ...draft, feature_assignments })
          }
        />
      </SettingsSection>
      )}
      <SettingsSection title={_uiText("Görseller ve videolar")} description={_uiText("{value1} medya dosyası", {value1: String(draft.assets.length)})}>
      <MediaEditor
        value={draft.assets}
        onChange={(assets) => setDraft({ ...draft, assets })}
        hotelId={create && kind === "hotel" ? undefined : snapshot.hotel_id}
        onBusy={setUploading}
      />
      </SettingsSection>
      <button disabled={busy || uploading} className={`uni-control ${buttonStyle}`}>
        {busy ? _uiText("Kaydediliyor…") : kind === "hotel" ? _uiText("Şirketi kaydet") : _uiText("Oteli kaydet")}
      </button>
    </form>
  );
}
export function BulkUnitForm({
  snapshot,
  onSaved,
}: {
  snapshot: Snapshot;
  onSaved: () => Promise<void>;
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const {locale}=useI18n();
  const [floor, setFloor] = useState(snapshot.floors[0]?.floor_id || "");
  const [parent, setParent] = useState("");
  const [kind, setKind] = useState("bed");
  const [count, setCount] = useState(100);
  const [levels, setLevels] = useState(2);
  const [capacity, setCapacity] = useState(1);
  const [prefix, setPrefix] = useState("Y");
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
          await command("room.bulk_create", {
            branch_id: snapshot.branch_id,
            floor_id: floor || null,
            parent_id: parent || null,
            kind,
            prefix,
            count,
            levels: kind === "bed" ? levels : 1,
            capacity: kind === "bed" ? capacity : 0,
            rentable: true,
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
      <p className="text-sm text-slate-500">{_uiText("100 yatak ve 2 ranza seviyesi seçildiğinde 50 ranza grubunda 100 ayrı yatak oluşturulur. Kayıtların tamamı birlikte kaydedilir.")} </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InlineSelectField
          label={_uiText("Kat")}
          value={floor}
          onChange={setFloor}
          options={[
            { value: "", label: _uiText("Atanmamış") },
            ...snapshot.floors.map((f) => ({
              value: f.floor_id,
              label: localized(f.label,locale.toUpperCase()) || f.code,
            })),
          ]}
        />
        <InlineSelectField
          label={_uiText("Üst birim")}
          value={parent}
          onChange={setParent}
          options={[
            { value: "", label: _uiText("Bağımsız") },
            ...snapshot.rooms
              .filter((r) => r.kind !== "bed")
              .map((r) => ({ value: r.room_id, label: r.code })),
          ]}
        />
        <InlineSelectField
          label={_uiText("Tür")}
          value={kind}
          onChange={setKind}
          options={Object.entries(unitKinds).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <TextField
          label={_uiText("Kod ön eki")}
          required
          autoComplete="off"
          uppercase
          value={prefix}
          onChange={setPrefix}
        />
        <TextField
          label={_uiText("Birim sayısı")}
          type="number"
          required
          value={String(count)}
          onChange={(v) => setCount(Number(v))}
        />
        {kind === "bed" && (
          <TextField
            label={_uiText("Yatak kişi kapasitesi")}
            type="number"
            required
            value={String(capacity)}
            onChange={(v) => setCapacity(Number(v))}
          />
        )}
        {kind === "bed" && (
          <TextField
            label={_uiText("Ranza seviye sayısı")}
            type="number"
            required
            value={String(levels)}
            onChange={(v) => setLevels(Number(v))}
          />
        )}
      </div>
      <button className={`uni-control ${buttonStyle}`} disabled={busy}>
        {busy ? _uiText("Oluşturuluyor…") : _uiText("{value1} Birimi Oluştur", {value1: String(count)})}
      </button>
    </form>
  );
}
