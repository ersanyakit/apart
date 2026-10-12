import React from "react";
import {
  localized,
  type FeatureAssignment,
  type FeatureDefinition,
  type FeatureValue,
} from "../lib/api";
import { X } from "lucide-react";
export function FeatureFields({
  definitions,
  scope,
  value,
  onChange,
  language = "TR",
}: {
  definitions: FeatureDefinition[];
  scope: "property" | "room";
  value: FeatureAssignment[];
  onChange: (items: FeatureAssignment[]) => void;
  language?: string;
}) {
  const set = (code: string, v: FeatureValue) =>
    onChange([...value.filter((a) => a.code !== code), { code, value: v }]);
  const items = definitions.filter((d) => d.scopes.includes(scope));
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
        Olanaklar ve Özellikler
      </h3>
      {!items.length && (
        <p className="text-xs text-slate-400">
          Olanak Tanımları ekranından bu tesis için özellik ekleyebilirsiniz.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((d) => {
          const assignment = value.find((a) => a.code === d.code);
          const v = assignment?.value;
          const inputClass =
            "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs";
          return (
            <div
              key={d.code}
              className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                {d.assets?.find((a) => a.kind === "image") && (
                  <img
                    src={d.assets.find((a) => a.kind === "image")!.url}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover"
                  />
                )}
                <label
                  className="text-xs font-bold text-slate-700 flex-1"
                  htmlFor={`feature-${d.code}`}
                >
                  {localized(d.label, language)}
                  {d.required ? " *" : ""}
                  {d.unit ? ` (${d.unit})` : ""}
                </label>
                {assignment && !d.required && (
                  <button
                    type="button"
                    title="Atamayı kaldır"
                    aria-label={`${d.code} atamasını kaldır`}
                    onClick={() =>
                      onChange(value.filter((a) => a.code !== d.code))
                    }
                    className="text-slate-400"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {d.value_type === "boolean" ? (
                <select
                  id={`feature-${d.code}`}
                  value={v === undefined ? "" : String(v)}
                  onChange={(e) =>
                    e.target.value === ""
                      ? onChange(value.filter((a) => a.code !== d.code))
                      : set(d.code, e.target.value === "true")
                  }
                  className={inputClass}
                >
                  <option value="">Belirtilmedi</option>
                  <option value="true">Var / Evet</option>
                  <option value="false">Yok / Hayır</option>
                </select>
              ) : d.value_type === "integer" || d.value_type === "decimal" ? (
                <input
                  id={`feature-${d.code}`}
                  type="number"
                  step={d.value_type === "integer" ? 1 : "any"}
                  min={d.min ?? undefined}
                  max={d.max ?? undefined}
                  value={typeof v === "number" ? v : ""}
                  onChange={(e) =>
                    e.target.value === ""
                      ? onChange(value.filter((a) => a.code !== d.code))
                      : set(d.code, Number(e.target.value))
                  }
                  className={inputClass}
                />
              ) : d.value_type === "enum" ? (
                <select
                  id={`feature-${d.code}`}
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) =>
                    e.target.value
                      ? set(d.code, e.target.value)
                      : onChange(value.filter((a) => a.code !== d.code))
                  }
                  className={inputClass}
                >
                  <option value="">Seçiniz</option>
                  {d.options.map((o) => (
                    <option key={o} value={o}>
                      {localized(d.option_labels?.[o], language) || o}
                    </option>
                  ))}
                </select>
              ) : d.value_type === "multi_enum" ? (
                <div className="flex flex-wrap gap-2">
                  {d.options.map((o) => {
                    const selected = Array.isArray(v) && v.includes(o);
                    return (
                      <button
                        type="button"
                        key={o}
                        onClick={() =>
                          set(
                            d.code,
                            selected
                              ? (v as string[]).filter((x) => x !== o)
                              : [...(Array.isArray(v) ? v : []), o],
                          )
                        }
                        className={`rounded-lg px-3 py-2 text-xs border ${selected ? "bg-brand-blue-600 text-white border-brand-blue-600" : "bg-slate-50 border-slate-200"}`}
                      >
                        {localized(d.option_labels?.[o], language) || o}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  id={`feature-${d.code}`}
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => set(d.code, e.target.value)}
                  className={inputClass}
                />
              )}
              {localized(d.description, language) && (
                <p className="text-[11px] text-slate-400">
                  {localized(d.description, language)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
