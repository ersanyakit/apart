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
          label="Birim kodu"
          required
          autoComplete="off"
          uppercase
          value={draft.code}
          onChange={(v) => patch({ code: v })}
        />
        <InlineSelectField
          label="Birim türü"
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
          label="Kat"
          value={draft.floor_id || ""}
          disabled={draft.kind === "bed"}
          onChange={(v) => patch({ floor_id: v || null })}
          options={[
            { value: "", label: "Kat atanmamış" },
            ...snapshot.floors.map((f) => ({
              value: f.floor_id,
              label: localized(f.label,locale.toUpperCase()) || f.code,
            })),
          ]}
        />
        <TextField
          label="Oda tipi"
          placeholder="Standart, aile, süit…"
          value={draft.type}
          onChange={(v) => patch({ type: v })}
        />
        {draft.kind === "bed" && (
          <>
            <TextField
              label="Ranza grubu (isteğe bağlı)"
              disabled
              placeholder="RANZA-01"
              value={draft.bed_group}
              onChange={(v) => patch({ bed_group: v })}
            />
            <TextField
              label="Yatak seviyesi"
              type="number"
              disabled
              value={String(draft.bed_level)}
              onChange={(v) => patch({ bed_level: Number(v) })}
            />
          </>
        )}
      </div>
      {supportsRentalMode ? <RoomRentalSetup mode={rentalMode} onModeChange={setRentalMode}
        beds={bedChoices} onBedsChange={setBedChoices} roomId={room?.room_id} branchId={snapshot.branch_id} disabled={busy}/>
        : draft.kind !== "bed" ? <>
          <Switch label="Bu birim doğrudan kiralanabilir" checked={draft.rentable} disabled={busy} onChange={v=>patch({rentable:v})}/>
          <RoomBedsEditor roomId={room?.room_id} branchId={snapshot.branch_id} value={bedChoices} onChange={setBedChoices} disabled={busy}/>
        </> : <p className="text-sm text-uni-muted">Fiziksel yapı ve kapasiteyi Yataklar bölümünden düzenleyebilirsiniz.</p>}
      <SettingsSection title="Yerleşim ve gelişmiş ayarlar" description="Üst birim ve kat planındaki konum.">
        <div className="grid gap-4">
        <InlineSelectField
          label="Üst birim"
          value={draft.parent_id || ""}
          disabled={draft.kind === "bed"}
          onChange={(v) => patch({ parent_id: v || null })}
          options={[
            { value: "", label: "Bağımsız birim" },
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
            label={["Plan X", "Plan Y", "Genişlik", "Yükseklik"][i]}
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
      <SettingsSection title="Açıklamalar" description="İsteğe bağlı, farklı dillerde oda açıklaması.">
      <LocalizedTextFields
        label="Açıklama"
        hint="Her dil için ayrı açıklama ekleyin."
        values={draft.description || {}}
        onChange={(description) => patch({ description })}
        multiline
      />
      </SettingsSection>
      <SettingsSection title="Oda olanakları" description="Odada bulunan olanakları ve envanteri seçin.">
      <FeatureFields
        definitions={snapshot.feature_registry.definitions || []}
        scope="room"
        value={draft.feature_assignments}
        onChange={(feature_assignments) => patch({ feature_assignments })}
      />
      </SettingsSection>
      <SettingsSection title="Görseller ve videolar" description={`${draft.assets.length} medya dosyası`}>
      <MediaEditor
        value={draft.assets}
        onChange={(assets) => patch({ assets })}
        hotelId={snapshot.hotel_id}
        onBusy={setUploading}
      />
      </SettingsSection>
      <button disabled={busy || uploading} className={`uni-control ${buttonStyle}`}>
        {busy ? "Kaydediliyor…" : "Birimi Kaydet"}
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
      <FloorPresetPicker value={preset} floors={floors.filter(f=>f.floor_id!==draft.floor_id)} disabled={busy} onChange={(id,values)=>{setPreset(id);if(values)setDraft(previous=>({...previous,...values}));}}/>
      {preset && preset !== "custom" && <div className="rounded-2xl bg-uni-surface p-4 text-sm text-uni-muted" role="status">
        {localized(draft.label,locale.toUpperCase())} · Kod: {draft.code} · Sıra: {draft.sort_order}
        <p className="mt-1 text-xs">Kat adı desteklenen tüm dillerde otomatik hazırlandı. Farklı ad veya kod için “Özel kat / Elle gir” seçin.</p>
      </div>}
      {preset === "custom" && <div className="grid gap-4">
      <TextField
        label="Kat kodu"
        required
        autoComplete="off"
        uppercase
        value={draft.code}
        onChange={(v) => setDraft({ ...draft, code: v })}
      />
      <LocalizedTextFields
        label="Kat adı"
        hint="Özel kat adını girin. İhtiyaç duyduğunuz dillerde karşılık ekleyebilirsiniz."
        values={draft.label || {}}
        onChange={(label) => setDraft({ ...draft, label })}
      />
      <TextField label="Sıralama" type="number" step="any" value={String(draft.sort_order)} onChange={v=>setDraft({...draft,sort_order:Number(v)})}/>
      </div>}
      <SettingsSection title="Kat planı ölçüleri" description="İsteğe bağlı, çizim alanının boyutları.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="Plan genişliği" type="number" required value={String(draft.width)} onChange={v=>setDraft({...draft,width:Number(v)})}/>
          <TextField label="Plan yüksekliği" type="number" required value={String(draft.height)} onChange={v=>setDraft({...draft,height:Number(v)})}/>
        </div>
      </SettingsSection>
      <button disabled={busy} className={`uni-control ${buttonStyle}`}>
        Katı Kaydet
      </button>
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
        <p className="font-medium">{kind === "hotel" ? "Şirketin ticari bilgileri" : snapshot.hotels.find(h=>h.hotel_id===snapshot.hotel_id)?.name}</p>
        <p className="mt-1 text-xs text-uni-muted">{kind === "hotel" ? "Örn. Meyman Turizm A.Ş. Otellerinizi bu şirketin altında oluşturabilirsiniz." : "Bu otele ait iletişim, adres ve tanıtım bilgilerini düzenleyin."}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(
          [
            "name",
            "address",
            "phone",
            "email",
            "tax_number",
            "tax_office",
          ] as const
        ).map((key, i) => key === "phone" ? (
          <PhoneField key={key} label="Telefon" value={draft.phone} defaultCountry={defaultCountry}
            disabled={busy} onChange={phone=>setDraft(previous=>({...previous,phone}))}/>
        ) : (
          <TextField
            key={key}
            label={
              [
                kind === "hotel" ? "Şirket unvanı" : "Otel / tesis adı",
                kind === "hotel" ? "Şirket adresi" : "Otel / tesis adresi",
                "Telefon",
                "E-posta",
                "Vergi numarası",
                "Vergi dairesi",
              ][i]
            }
            required={key === "name"}
            type={key === "email" ? "email" : "text"}
            autoComplete="off"
            value={draft[key]}
            onChange={(v) => setDraft({ ...draft, [key]: v })}
          />
        ))}
      </div>
      <SettingsSection title="Tanıtım ve açıklamalar" description="Farklı dillerde açıklama ekleyin.">
      <LocalizedTextFields
        label="Açıklama"
        hint="Her dil için ayrı açıklama ekleyin."
        values={draft.description || {}}
        onChange={(description) => setDraft({ ...draft, description })}
        multiline
      />
      </SettingsSection>
      {kind === "branch" && (
        <SettingsSection title="Otel olanakları" description="Havuz, otopark, kahvaltı ve diğer olanaklar.">
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
      <SettingsSection title="Görseller ve videolar" description={`${draft.assets.length} medya dosyası`}>
      <MediaEditor
        value={draft.assets}
        onChange={(assets) => setDraft({ ...draft, assets })}
        hotelId={create && kind === "hotel" ? undefined : snapshot.hotel_id}
        onBusy={setUploading}
      />
      </SettingsSection>
      <button disabled={busy || uploading} className={`uni-control ${buttonStyle}`}>
        {busy ? "Kaydediliyor…" : kind === "hotel" ? "Şirketi kaydet" : "Oteli kaydet"}
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
      <p className="text-sm text-slate-500">
        100 yatak ve 2 ranza seviyesi seçildiğinde 50 ranza grubunda 100 ayrı
        yatak oluşturulur. Kayıtların tamamı birlikte kaydedilir.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InlineSelectField
          label="Kat"
          value={floor}
          onChange={setFloor}
          options={[
            { value: "", label: "Atanmamış" },
            ...snapshot.floors.map((f) => ({
              value: f.floor_id,
              label: localized(f.label,locale.toUpperCase()) || f.code,
            })),
          ]}
        />
        <InlineSelectField
          label="Üst birim"
          value={parent}
          onChange={setParent}
          options={[
            { value: "", label: "Bağımsız" },
            ...snapshot.rooms
              .filter((r) => r.kind !== "bed")
              .map((r) => ({ value: r.room_id, label: r.code })),
          ]}
        />
        <InlineSelectField
          label="Tür"
          value={kind}
          onChange={setKind}
          options={Object.entries(unitKinds).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <TextField
          label="Kod ön eki"
          required
          autoComplete="off"
          uppercase
          value={prefix}
          onChange={setPrefix}
        />
        <TextField
          label="Birim sayısı"
          type="number"
          required
          value={String(count)}
          onChange={(v) => setCount(Number(v))}
        />
        {kind === "bed" && (
          <TextField
            label="Yatak kişi kapasitesi"
            type="number"
            required
            value={String(capacity)}
            onChange={(v) => setCapacity(Number(v))}
          />
        )}
        {kind === "bed" && (
          <TextField
            label="Ranza seviye sayısı"
            type="number"
            required
            value={String(levels)}
            onChange={(v) => setLevels(Number(v))}
          />
        )}
      </div>
      <button className={`uni-control ${buttonStyle}`} disabled={busy}>
        {busy ? "Oluşturuluyor…" : `${count} Birimi Oluştur`}
      </button>
    </form>
  );
}
