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
import { MediaEditor } from "./MediaEditor";
import { FeatureFields } from "./FeatureFields";
import { Field, ErrorMessage, inputStyle, buttonStyle } from "./FormKit";
const blankRoom = (s: Snapshot): APIRoom => ({
  room_id: "",
  branch_id: s.branch_id,
  floor_id: s.floors[0]?.floor_id || null,
  parent_id: null,
  kind: "room",
  capacity: 2,
  effective_capacity: 2,
  rentable: true,
  bed_group: "",
  bed_level: 0,
  position: { x: 20, y: 20, width: 140, height: 100 },
  code: "",
  name: "",
  status: "Temiz",
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
  const [draft, setDraft] = useState<APIRoom>(
    room
      ? {
          ...room,
          assets: room.assets || [],
          feature_assignments: room.feature_assignments || [],
        }
      : blankRoom(snapshot),
  );
  const [language, setLanguage] = useState("TR");
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
          const { room_id, effective_capacity, ...payload } = draft;
          await command(
            room ? "room.update" : "room.create",
            room ? { ...payload, room_id } : payload,
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
      <div className="grid grid-cols-2 gap-4">
        <Field label="Birim kodu">
          <input
            required
            maxLength={32}
            className={inputStyle}
            value={draft.code}
            onChange={(e) => patch({ code: e.target.value })}
          />
        </Field>
        <Field label="Birim türü">
          <select
            disabled={draft.kind === "bed"}
            className={inputStyle}
            value={draft.kind}
            onChange={(e) =>
              patch({
                kind: e.target.value,
                bed_level: e.target.value === "bed" ? 1 : 0,
                bed_group: "",
                capacity: e.target.value === "bed" ? 1 : draft.capacity,
              })
            }
          >
            {Object.entries(unitKinds)
              .filter(([v]) => v !== "bed" || draft.kind === "bed")
              .map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Kat">
          <select
            disabled={draft.kind === "bed"}
            className={inputStyle}
            value={draft.floor_id || ""}
            onChange={(e) => patch({ floor_id: e.target.value || null })}
          >
            <option value="">Kat atanmamış</option>
            {snapshot.floors.map((f) => (
              <option key={f.floor_id} value={f.floor_id}>
                {localized(f.label) || f.code}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Üst birim">
          <select
            disabled={draft.kind === "bed"}
            className={inputStyle}
            value={draft.parent_id || ""}
            onChange={(e) => patch({ parent_id: e.target.value || null })}
          >
            <option value="">Bağımsız birim</option>
            {snapshot.rooms
              .filter((r) => r.room_id !== draft.room_id && r.kind !== "bed")
              .map((r) => (
                <option key={r.room_id} value={r.room_id}>
                  {r.code} · {unitKinds[r.kind]}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Kişi kapasitesi (alt birim yoksa)">
          <input
            disabled={draft.kind === "bed"}
            type="number"
            required
            min={1}
            max={100000}
            value={draft.capacity}
            onChange={(e) => patch({ capacity: Number(e.target.value) })}
            className={inputStyle}
          />
        </Field>
        <Field label="Oda tipi / düzeni">
          <input
            className={inputStyle}
            value={draft.type}
            onChange={(e) => patch({ type: e.target.value })}
            placeholder="2+1, stüdyo, aile…"
          />
        </Field>
        {draft.kind === "bed" && (
          <>
            <Field label="Ranza grubu (isteğe bağlı)">
              <input
                className={inputStyle}
                disabled
                value={draft.bed_group}
                onChange={(e) => patch({ bed_group: e.target.value })}
                placeholder="RANZA-01"
              />
            </Field>
            <Field label="Yatak seviyesi">
              <input
                className={inputStyle}
                type="number"
                min={1}
                max={10}
                disabled
                value={draft.bed_level}
                onChange={(e) => patch({ bed_level: Number(e.target.value) })}
              />
            </Field>
          </>
        )}
      </div>
      {draft.kind !== "bed" && (
        <Field label="Oda yatak düzeni">
          <select
            className={inputStyle}
            value={draft.bed_layout || ""}
            onChange={(e) => patch({ bed_layout: e.target.value })}
          >
            <option value="">Belirtilmemiş</option>
            <option value="single">Tek yatak</option>
            <option value="double">Çift kişilik yatak</option>
            <option value="twin">Twin · Ayrı tek kişilik yataklar</option>
            <option value="mixed">Karma düzen</option>
          </select>
        </Field>
      )}
      {draft.kind === "bed" && (
        <p className="text-xs text-brand-blue-700">
          Fiziksel yapı ve kapasite için Kat ve Oda Tanımları → Yataklar
          bölümünü kullanın.
        </p>
      )}
      <label className="flex items-center gap-3 text-sm font-bold">
        <input
          type="checkbox"
          disabled={draft.kind === "bed"}
          checked={draft.rentable}
          onChange={(e) => patch({ rentable: e.target.checked })}
        />
        Bu birim doğrudan kiralanabilir
      </label>
      <p className="text-xs text-slate-400">
        Alt birimler varsa toplam kapasite onlardan hesaplanır. Dairenin tamamı
        kiralandığında alt birimlerin aynı tarihleri kapanır. Ranza için her
        yatak ayrı tanımlanır.
      </p>
      <div className="grid grid-cols-4 gap-3">
        {(["x", "y", "width", "height"] as const).map((key, i) => (
          <Field
            key={key}
            label={["Plan X", "Plan Y", "Genişlik", "Yükseklik"][i]}
          >
            <input
              type="number"
              className={inputStyle}
              value={draft.position[key]}
              onChange={(e) =>
                patch({
                  position: {
                    ...draft.position,
                    [key]: Number(e.target.value),
                  },
                })
              }
            />
          </Field>
        ))}
      </div>
      <Field label="Açıklama dili">
        <select
          className={inputStyle}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {snapshot.languages.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label={`Açıklama (${language})`}>
        <textarea
          className={inputStyle}
          value={draft.description?.[language] || ""}
          onChange={(e) =>
            patch({
              description: { ...draft.description, [language]: e.target.value },
            })
          }
        />
      </Field>
      <FeatureFields
        definitions={snapshot.feature_registry.definitions || []}
        scope="room"
        value={draft.feature_assignments}
        onChange={(feature_assignments) => patch({ feature_assignments })}
        language={language}
      />
      <MediaEditor
        value={draft.assets}
        onChange={(assets) => patch({ assets })}
        hotelId={snapshot.hotel_id}
        languages={snapshot.languages}
        onBusy={setUploading}
      />
      <button disabled={busy || uploading} className={buttonStyle}>
        {busy ? "Kaydediliyor…" : "Birimi Kaydet"}
      </button>
    </form>
  );
}
export function FloorForm({
  branchId,
  floor,
  onSaved,
}: {
  branchId: string;
  floor?: Floor;
  onSaved: () => Promise<void>;
}) {
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("TR");
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
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
      <Field label="Kat kodu">
        <input
          required
          className={inputStyle}
          value={draft.code}
          onChange={(e) => setDraft({ ...draft, code: e.target.value })}
        />
      </Field>
      <div className="flex gap-2">
        <select
          aria-label="Kat adı dili"
          className={inputStyle}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {[
            "TR",
            "EN",
            "DE",
            "FR",
            "RU",
            "AR",
            "NE",
            "TH",
            "ZH-CN",
            "ZH-TW",
          ].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <input
          aria-label="Kat adı"
          placeholder={`Kat adı (${language})`}
          className={inputStyle}
          value={draft.label?.[language] || ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              label: { ...draft.label, [language]: e.target.value },
            })
          }
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(["sort_order", "width", "height"] as const).map((key, i) => (
          <Field
            key={key}
            label={["Sıralama", "Plan genişliği", "Plan yüksekliği"][i]}
          >
            <input
              type="number"
              required
              className={inputStyle}
              value={draft[key]}
              onChange={(e) =>
                setDraft({ ...draft, [key]: Number(e.target.value) })
              }
            />
          </Field>
        ))}
      </div>
      <button disabled={busy} className={buttonStyle}>
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
  const [language, setLanguage] = useState("TR");
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
          const { inventory, feature_assignments, branch_id, ...base } = draft;
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
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            "name",
            "address",
            "phone",
            "email",
            "tax_number",
            "tax_office",
          ] as const
        ).map((key, i) => (
          <Field
            key={key}
            label={
              [
                "Ad",
                "Adres",
                "Telefon",
                "E-posta",
                "Vergi numarası",
                "Vergi dairesi",
              ][i]
            }
          >
            <input
              required={key === "name"}
              className={inputStyle}
              value={draft[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <Field label="Açıklama dili">
        <select
          className={inputStyle}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {snapshot.languages.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </Field>
      <textarea
        aria-label="Tesis açıklaması"
        className={inputStyle}
        value={draft.description?.[language] || ""}
        onChange={(e) =>
          setDraft({
            ...draft,
            description: { ...draft.description, [language]: e.target.value },
          })
        }
      />
      {kind === "branch" && (
        <FeatureFields
          definitions={snapshot.feature_registry.definitions || []}
          scope="property"
          value={draft.feature_assignments || []}
          onChange={(feature_assignments) =>
            setDraft({ ...draft, feature_assignments })
          }
          language={language}
        />
      )}
      <MediaEditor
        value={draft.assets}
        onChange={(assets) => setDraft({ ...draft, assets })}
        hotelId={create && kind === "hotel" ? undefined : snapshot.hotel_id}
        languages={snapshot.languages}
        onBusy={setUploading}
      />
      <button disabled={busy || uploading} className={buttonStyle}>
        Kaydet
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
            capacity,
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
      <div className="grid grid-cols-2 gap-4">
        <Field label="Kat">
          <select
            className={inputStyle}
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
          >
            <option value="">Atanmamış</option>
            {snapshot.floors.map((f) => (
              <option key={f.floor_id} value={f.floor_id}>
                {localized(f.label) || f.code}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Üst birim">
          <select
            className={inputStyle}
            value={parent}
            onChange={(e) => setParent(e.target.value)}
          >
            <option value="">Bağımsız</option>
            {snapshot.rooms
              .filter((r) => r.kind !== "bed")
              .map((r) => (
                <option key={r.room_id} value={r.room_id}>
                  {r.code}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Tür">
          <select
            className={inputStyle}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {Object.entries(unitKinds).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kod ön eki">
          <input
            required
            className={inputStyle}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </Field>
        <Field label="Birim sayısı">
          <input
            required
            min={1}
            max={1000}
            type="number"
            className={inputStyle}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </Field>
        <Field label="Her birimin kapasitesi">
          <input
            min={1}
            required
            type="number"
            className={inputStyle}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </Field>
        {kind === "bed" && (
          <Field label="Ranza seviye sayısı">
            <input
              required
              type="number"
              min={1}
              max={10}
              className={inputStyle}
              value={levels}
              onChange={(e) => setLevels(Number(e.target.value))}
            />
          </Field>
        )}
      </div>
      <button className={buttonStyle} disabled={busy}>
        {busy ? "Oluşturuluyor…" : `${count} Birimi Oluştur`}
      </button>
    </form>
  );
}
