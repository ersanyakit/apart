import { SettingsEditor } from "./SettingsEditor";
import { CatalogFields } from "./CatalogFields";
import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { confirmDialog } from "./ConfirmDialog";
import { useNotifications } from "./Toast";
import {
  command,
  messageOf,
  localized,
  type Snapshot,
  type FeatureDefinition,
} from "../lib/api";
import { MediaEditor } from "./MediaEditor";
import {
  ErrorMessage,
  buttonStyle,
  secondaryStyle,
} from "./FormKit";
import {
  InlineSelectField,
  LocalizedTextFields,
  Switch,
  TextField,
} from "./fields";
export function FeatureRegistryView({
  snapshot,
  onRefresh,
}: {
  snapshot: Snapshot;
  onRefresh: () => Promise<void>;
}) {
  const notify = useNotifications();
  const [draft, setDraft] = useState<FeatureDefinition | null>(null),
    [category, setCategory] = useState(false),
    [code, setCode] = useState(""),
    [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({ TR: "" }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const customCategories = (snapshot.feature_registry.categories || []).filter((c) => !c.code.startsWith("catalog."));
  const remove = async (kind: "feature" | "category", id: string, name: string) => {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await confirmDialog(`${name} ${kind === "category" ? "kategorisi" : "olanağı"} silinsin mi?`))) return;
      await command(kind === "category" ? "feature.category.delete" : "feature.delete", { hotel_id: snapshot.hotel_id, id });
      if (kind === "feature") setDraft(null);
      setError("");
      await onRefresh();
      notify(kind === "category" ? "Kategori silindi." : "Olanak silindi.");
    } catch (e) {
      notify(messageOf(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const empty = (): FeatureDefinition => ({
    hotel_id: snapshot.hotel_id,
    category_id: snapshot.feature_registry.categories?.[0]?.category_id || "",
    code: "",
    label: { TR: "" },
    description: { TR: "" },
    scopes: ["room"],
    value_type: "boolean",
    options: [],
    filterable: true,
    min: null,
    max: null,
    unit: "",
    required: false,
    assets: [],
  });
  return (
    <div className="space-y-5">
      <div hidden={category || !!draft} className="space-y-5">
        <ErrorMessage message={error} />
        <div className="flex gap-2">
          <button
            className={`uni-control ${buttonStyle}`}
            disabled={!snapshot.feature_registry.categories?.length}
            onClick={() => setDraft(empty())}
          >
            Özellik Ekle
          </button>
          <button className={`uni-control ${secondaryStyle}`} onClick={() => setCategory(true)}>
            Kategori Ekle
          </button>
        </div>
        {customCategories.length > 0 && (
          <section aria-label="Kendi kategorileriniz" className="space-y-3">
            <h3 className="text-base font-medium text-slate-900">Kendi kategorileriniz</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {customCategories.map((c) => (
                <div key={c.category_id} className="flex items-center gap-3 rounded-[20px] bg-[#f9f9f9] p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-slate-900">{localized(c.label) || c.code}</p>
                    <p className="truncate text-sm text-slate-500">{c.code}</p>
                  </div>
                  <button type="button" className="nav-icon-button text-red-600" disabled={busy}
                    aria-label={`${localized(c.label) || c.code} kategorisini sil`}
                    onClick={() => void remove("category", c.category_id, localized(c.label) || c.code)}>
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="grid md:grid-cols-3 gap-4">
          {(snapshot.feature_registry.definitions || []).filter((d) => !d.catalog_kind).map((d) => (
            <button
              key={d.code}
              className="uni-control rounded-[20px] bg-[#f9f9f9] p-4 text-left outline-none transition-all duration-150 ease-out hover:bg-[#efefef] focus-visible:ring-2 focus-visible:ring-neutral-400"
              onClick={() => setDraft({ ...d, assets: d.assets || [] })}
            >
              <h3 className="font-uninav-book truncate text-[1.125rem] leading-6 text-slate-900">{localized(d.label) || d.code}</h3>
              <p className="mt-1 truncate text-[0.875rem] leading-5 text-slate-500">
                {d.code} · {d.value_type}
              </p>
            </button>
          ))}
        </div>
        <CatalogFields definitions={snapshot.feature_registry.definitions || []} readOnly />
        {!snapshot.feature_registry.definitions?.length && (
          <p className="text-sm text-slate-400 p-8">
            Havuz, jakuzi ve manzara gibi özellikleri tanımlamak için önce bir
            kategori ekleyin.
          </p>
        )}
      </div>
      {category && (
        <SettingsEditor title="Kategori Ekle" onClose={() => setCategory(false)}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await command("feature.category.create", {
                  hotel_id: snapshot.hotel_id,
                  code,
                  label: categoryLabels,
                  sort_order: 0,
                });
                await onRefresh();
                setCategory(false);
                setCode("");
                setCategoryLabels({ TR: "" });
              } catch (e) {
                setError(messageOf(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <ErrorMessage message={error} />
            <TextField
              label="Kod"
              required
              autoComplete="off"
              uppercase
              value={code}
              onChange={setCode}
            />
            <LocalizedTextFields
              label="Kategori adı"
              hint="Her dil için ayrı ad ekleyin."
              values={categoryLabels}
              onChange={setCategoryLabels}
            />
            <button disabled={busy} className={`uni-control ${buttonStyle}`}>
              Kaydet
            </button>
          </form>
        </SettingsEditor>
      )}
      {draft && (
        <SettingsEditor title="Özellik Tanımı" onClose={() => setDraft(null)}>
          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const { category, ...payload } = draft;
                await command(
                  draft.feature_id ? "feature.update" : "feature.create",
                  payload,
                );
                await onRefresh();
                setDraft(null);
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
                label="Kod"
                required
                autoComplete="off"
                uppercase
                value={draft.code}
                onChange={(v) => setDraft({ ...draft, code: v })}
              />
              <InlineSelectField
                label="Kategori"
                value={draft.category_id}
                onChange={(v) => setDraft({ ...draft, category_id: v })}
                options={(snapshot.feature_registry.categories || []).map((c) => ({
                  value: c.category_id,
                  label: localized(c.label),
                }))}
              />
            </div>
            <LocalizedTextFields
              label="İsim"
              hint="Jakuzi, buzdolabı gibi her dilde ayrı ad ekleyin."
              values={draft.label || {}}
              onChange={(label) => setDraft({ ...draft, label })}
              placeholder="Örn. Jakuzi"
            />
            <LocalizedTextFields
              label="Açıklama"
              hint="Her dilde ayrı açıklama ekleyin."
              values={draft.description || {}}
              onChange={(description) => setDraft({ ...draft, description })}
              multiline
              placeholder="Örn. Isıtmalı açık hava jakuzisi"
            />
            <InlineSelectField
              label="Veri türü"
              value={draft.value_type}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  value_type: v as FeatureDefinition["value_type"],
                  options: [],
                  option_labels: {},
                  min: null,
                  max: null,
                })
              }
              options={Object.entries({
                boolean: "Var / Yok",
                integer: "Tam sayı",
                decimal: "Ondalık sayı",
                string: "Metin",
                enum: "Tek seçenek",
                multi_enum: "Çoklu seçenek",
              }).map(([value, label]) => ({ value, label }))}
            />
            {["enum", "multi_enum"].includes(draft.value_type) && (
              <TextField
                label="Seçenek kodları (virgülle ayırın)"
                autoComplete="off"
                value={draft.options.join(",")}
                onChange={(v) => {
                  const options = v.split(",");
                  setDraft({
                    ...draft,
                    options,
                    option_labels: Object.fromEntries(
                      options.filter(Boolean).map((o) => [o, { TR: o }]),
                    ),
                  });
                }}
              />
            )}
            {["integer", "decimal"].includes(draft.value_type) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(["min", "max"] as const).map((k) => (
                  <TextField
                    key={k}
                    label={k === "min" ? "Minimum" : "Maksimum"}
                    type="number"
                    value={draft[k] == null ? "" : String(draft[k])}
                    onChange={(v) =>
                      setDraft({
                        ...draft,
                        [k]: v.trim() === "" ? null : Number(v),
                      })
                    }
                  />
                ))}
              </div>
            )}
            <div className="space-y-1 rounded-[20px] bg-[#f9f9f9] p-4">
              {(["room", "property"] as const).map((scope) => (
                <Switch
                  key={scope}
                  label={scope === "room" ? "Birim" : "Tesis"}
                  hint={
                    scope === "room"
                      ? "Oda ve dairelerde seçilebilir."
                      : "Tesis genelinde geçerli."
                  }
                  checked={draft.scopes.includes(scope)}
                  onChange={(v) =>
                    setDraft({
                      ...draft,
                      scopes: v
                        ? [...draft.scopes, scope]
                        : draft.scopes.filter((s) => s !== scope),
                    })
                  }
                />
              ))}
              <Switch
                label="Filtrelenebilir"
                hint="Arama ve filtrelerde çıkar."
                checked={draft.filterable}
                onChange={(v) => setDraft({ ...draft, filterable: v })}
              />
              <Switch
                label="Zorunlu"
                hint="Her birimde değer girilmeli."
                checked={draft.required}
                onChange={(v) => setDraft({ ...draft, required: v })}
              />
            </div>
            <MediaEditor
              value={draft.assets}
              onChange={(assets) => setDraft({ ...draft, assets })}
              hotelId={snapshot.hotel_id}
              languages={snapshot.languages}
              onBusy={setUploading}
            />
            <div className="flex flex-wrap gap-3">
              <button disabled={busy || uploading} className={`uni-control ${buttonStyle}`}>
                Özelliği Kaydet
              </button>
              {draft.feature_id && !draft.catalog_kind && (
                <button type="button" disabled={busy || uploading} className={`uni-control ${secondaryStyle} text-red-600`}
                  onClick={() => void remove("feature", draft.feature_id!, localized(draft.label) || draft.code)}>
                  <Trash2 size={18} aria-hidden="true" /> Olanağı Sil
                </button>
              )}
            </div>
          </form>
        </SettingsEditor>
      )}
    </div>
  );
}
