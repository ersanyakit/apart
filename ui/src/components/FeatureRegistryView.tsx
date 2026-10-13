import { SettingsEditor } from "./SettingsEditor";
import React, { useState } from "react";
import {
  command,
  messageOf,
  localized,
  type Snapshot,
  type FeatureDefinition,
} from "../lib/api";
import { MediaEditor } from "./MediaEditor";
import {
  Field,
  ErrorMessage,
  inputStyle,
  buttonStyle,
  secondaryStyle,
} from "./FormKit";
export function FeatureRegistryView({
  snapshot,
  onRefresh,
}: {
  snapshot: Snapshot;
  onRefresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<FeatureDefinition | null>(null),
    [language, setLanguage] = useState("TR"),
    [category, setCategory] = useState(false),
    [code, setCode] = useState(""),
    [label, setLabel] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const empty = (): FeatureDefinition => ({
    hotel_id: snapshot.hotel_id,
    category_id: snapshot.feature_registry.categories?.[0]?.category_id || "",
    code: "",
    label: {},
    description: {},
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
        <div className="grid md:grid-cols-3 gap-4">
          {(snapshot.feature_registry.definitions || []).map((d) => (
            <button
              key={d.code}
              className="uni-control rounded-2xl border border-slate-200 bg-white p-5 text-left"
              onClick={() => setDraft({ ...d, assets: d.assets || [] })}
            >
              <h3 className="font-black">{localized(d.label) || d.code}</h3>
              <p className="mt-2 text-xs text-slate-400">
                {d.code} · {d.value_type}
              </p>
            </button>
          ))}
        </div>
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
                  label: { TR: label },
                  sort_order: 0,
                });
                await onRefresh();
                setCategory(false);
              } catch (e) {
                setError(messageOf(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <ErrorMessage message={error} />
            <Field label="Kod">
              <input
                required
                className={`uni-input ${inputStyle}`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
            <Field label="Kategori adı">
              <input
                required
                className={`uni-input ${inputStyle}`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>
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
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kod">
                <input
                  required
                  className={`uni-input ${inputStyle}`}
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                />
              </Field>
              <Field label="Kategori">
                <select
                  className={`uni-input ${inputStyle}`}
                  value={draft.category_id}
                  onChange={(e) =>
                    setDraft({ ...draft, category_id: e.target.value })
                  }
                >
                  {(snapshot.feature_registry.categories || []).map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {localized(c.label)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Dil">
                <select
                  className={`uni-input ${inputStyle}`}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {snapshot.languages.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Başlık">
                <input
                  className={`uni-input ${inputStyle}`}
                  value={draft.label?.[language] || ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      label: { ...draft.label, [language]: e.target.value },
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Açıklama">
              <textarea
                className={`uni-input ${inputStyle}`}
                value={draft.description?.[language] || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    description: {
                      ...draft.description,
                      [language]: e.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="Veri türü">
              <select
                className={`uni-input ${inputStyle}`}
                value={draft.value_type}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value_type: e.target
                      .value as FeatureDefinition["value_type"],
                    options: [],
                    option_labels: {},
                    min: null,
                    max: null,
                  })
                }
              >
                {Object.entries({
                  boolean: "Var / Yok",
                  integer: "Tam sayı",
                  decimal: "Ondalık sayı",
                  string: "Metin",
                  enum: "Tek seçenek",
                  multi_enum: "Çoklu seçenek",
                }).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            {["enum", "multi_enum"].includes(draft.value_type) && (
              <Field label="Seçenek kodları (virgülle ayırın)">
                <input
                  className={`uni-input ${inputStyle}`}
                  value={draft.options.join(",")}
                  onChange={(e) => {
                    const options = e.target.value.split(",");
                    setDraft({
                      ...draft,
                      options,
                      option_labels: Object.fromEntries(
                        options.filter(Boolean).map((o) => [o, { TR: o }]),
                      ),
                    });
                  }}
                />
              </Field>
            )}
            {["integer", "decimal"].includes(draft.value_type) && (
              <div className="grid grid-cols-2 gap-3">
                {(["min", "max"] as const).map((k) => (
                  <Field key={k} label={k === "min" ? "Minimum" : "Maksimum"}>
                    <input
                      type="number"
                      step="any"
                      className={`uni-input ${inputStyle}`}
                      value={draft[k] ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          [k]:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              {(["property", "room"] as const).map((scope) => (
                <label key={scope} className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={draft.scopes.includes(scope)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        scopes: e.target.checked
                          ? [...draft.scopes, scope]
                          : draft.scopes.filter((s) => s !== scope),
                      })
                    }
                  />
                  {scope === "room" ? "Birim" : "Tesis"}
                </label>
              ))}
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={draft.filterable}
                  onChange={(e) =>
                    setDraft({ ...draft, filterable: e.target.checked })
                  }
                />
                Filtrelenebilir
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={draft.required}
                  onChange={(e) =>
                    setDraft({ ...draft, required: e.target.checked })
                  }
                />
                Zorunlu
              </label>
            </div>
            <MediaEditor
              value={draft.assets}
              onChange={(assets) => setDraft({ ...draft, assets })}
              hotelId={snapshot.hotel_id}
              languages={snapshot.languages}
              onBusy={setUploading}
            />
            <button disabled={busy || uploading} className={`uni-control ${buttonStyle}`}>
              Özelliği Kaydet
            </button>
          </form>
        </SettingsEditor>
      )}
    </div>
  );
}
