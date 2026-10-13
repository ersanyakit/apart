import React from "react";
import {
  localized,
  type FeatureAssignment,
  type FeatureDefinition,
  type FeatureValue,
} from "../lib/api";
import { useI18n } from "./I18n";
import { X } from "lucide-react";
import { CatalogFields } from "./CatalogFields";
export function FeatureFields({
  definitions,
  scope,
  value,
  onChange,
}: {
  definitions: FeatureDefinition[];
  scope: "property" | "room";
  value: FeatureAssignment[];
  onChange: (items: FeatureAssignment[]) => void;
}) {
  const { locale } = useI18n();
  const language = locale.toUpperCase();
  const set = (code: string, v: FeatureValue) =>
    onChange([...value.filter((a) => a.code !== code), { code, value: v }]);
  const items = definitions.filter((d) => !d.catalog_kind && d.scopes.includes(scope));
  const bareInputClass =
    "w-full bg-white rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-60";
  const bareSelectWrap = "relative";
  const bareSelectClass =
    "w-full appearance-none bg-white rounded-xl pl-3 pr-9 py-2.5 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-60";
  const chevron = (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  return (
    <>
    {scope === "room" && <CatalogFields definitions={definitions} value={value} onChange={onChange} />}
    {(items.length > 0 || !definitions.some((d) => d.catalog_kind)) && <section className="space-y-4">
      <div className="min-w-0">
        <h3 className="font-uninav-book text-[1.125rem] leading-6 text-slate-900">
          Olanaklar ve Özellikler
        </h3>
        <p className="mt-1 text-[0.875rem] leading-5 text-slate-500">
          Bu kayıt için geçerli ek özellikler.
        </p>
      </div>
      {!items.length && (
        <p className="text-xs text-slate-400">
          Olanak Tanımları ekranından bu tesis için özellik ekleyebilirsiniz.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((d) => {
          const assignment = value.find((a) => a.code === d.code);
          const v = assignment?.value;
          return (
            <div
              key={d.code}
              className="rounded-[20px] bg-[#f9f9f9] p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                {d.assets?.find((a) => a.kind === "image") && (
                  <img
                    src={d.assets.find((a) => a.kind === "image")!.url}
                    alt=""
                    className="w-9 h-9 rounded-xl object-cover shrink-0"
                  />
                )}
                <label
                  className="font-uninav-book flex-1 truncate text-[0.875rem] leading-5 text-slate-500"
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
                    className="uni-control flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 outline-none transition-all duration-150 ease-out hover:bg-red-50 hover:text-red-500 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-neutral-400"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {d.value_type === "boolean" ? (
                <div className={bareSelectWrap}>
                  <select
                    id={`feature-${d.code}`}
                    value={v === undefined ? "" : String(v)}
                    onChange={(e) =>
                      e.target.value === ""
                        ? onChange(value.filter((a) => a.code !== d.code))
                        : set(d.code, e.target.value === "true")
                    }
                    className={bareSelectClass}
                  >
                    <option value="">Belirtilmedi</option>
                    <option value="true">Var / Evet</option>
                    <option value="false">Yok / Hayır</option>
                  </select>
                  {chevron}
                </div>
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
                  className={`${bareInputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                />
              ) : d.value_type === "enum" ? (
                <div className={bareSelectWrap}>
                  <select
                    id={`feature-${d.code}`}
                    value={typeof v === "string" ? v : ""}
                    onChange={(e) =>
                      e.target.value
                        ? set(d.code, e.target.value)
                        : onChange(value.filter((a) => a.code !== d.code))
                    }
                    className={bareSelectClass}
                  >
                    <option value="">Seçiniz</option>
                    {d.options.map((o) => (
                      <option key={o} value={o}>
                        {localized(d.option_labels?.[o], language) || o}
                      </option>
                    ))}
                  </select>
                  {chevron}
                </div>
              ) : d.value_type === "multi_enum" ? (
                <div className="flex flex-wrap gap-2">
                  {d.options.map((o) => {
                    const selected = Array.isArray(v) && v.includes(o);
                    return (
                      <button
                        type="button"
                        key={o}
                        aria-pressed={selected}
                        onClick={() =>
                          set(
                            d.code,
                            selected
                              ? (v as string[]).filter((x) => x !== o)
                              : [...(Array.isArray(v) ? v : []), o],
                          )
                        }
                        className={`uni-control rounded-xl px-3 py-2 text-xs font-bold outline-none transition-all duration-150 ease-out active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                          selected
                            ? "uni-button-primary"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
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
                  className={bareInputClass}
                />
              )}
              {localized(d.description, language) && (
                <p className="text-xs text-slate-500">
                  {localized(d.description, language)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>}
    </>
  );
}
