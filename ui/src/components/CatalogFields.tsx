import React, { useId, useState } from "react";
import {
  Accessibility, Baby, Bath, BedDouble, Brush, Building2, ChevronDown,
  Coffee, DoorOpen, Lamp, Monitor, Package, Palette, Refrigerator, Shield,
  Sofa, Table2, Trees, Tv, Utensils, Waves, Wind,
} from "lucide-react";
import type { FeatureAssignment, FeatureDefinition, LocalizedString } from "../lib/api";
import { useI18n } from "./I18n";
import { StepperField, Switch, TextField } from "./fields";

const icons = {
  bath: Bath, bed: BedDouble, sofa: Sofa, table: Table2,
  refrigerator: Refrigerator, utensils: Utensils, tv: Tv, wind: Wind,
  lamp: Lamp, palette: Palette, trees: Trees, waves: Waves, shield: Shield,
  brush: Brush, monitor: Monitor, baby: Baby, building: Building2,
  accessibility: Accessibility, door: DoorOpen, coffee: Coffee,
};

export function CatalogIcon({ iconKey }: { iconKey?: string }) {
  const Icon = icons[iconKey as keyof typeof icons] || Package;
  return <Icon size={21} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />;
}

// The catalog ships TR/EN labels. Other UI languages use English until a
// translation for that language is supplied by the server.
export function catalogLabel(value: LocalizedString | undefined, locale: string) {
  return value?.[locale.toUpperCase()] || value?.EN || value?.TR || "";
}

export function CatalogFields({ definitions, value = [], onChange, readOnly = false }: {
  definitions: FeatureDefinition[];
  value?: FeatureAssignment[];
  onChange?: (value: FeatureAssignment[]) => void;
  readOnly?: boolean;
}) {
  const { locale } = useI18n();
  const id = useId();
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<string[]>([]);
  const tr = locale === "tr";
  const label = (v?: LocalizedString) => catalogLabel(v, locale);
  const normalize = (v: string) => v.toLocaleLowerCase(locale).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("ı", "i");
  const search = normalize(query.trim());
  const all = definitions.filter((d) => d.catalog_kind && (readOnly || d.scopes.includes("room")));
  const items = all.filter((d) => !search || normalize([
    d.code, ...Object.values(d.label), ...Object.values(d.category_label || {}),
    ...Object.values(d.group_label || {}),
  ].join(" ")).includes(search)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const categories = Array.from(new Set(items.map((d) => d.category || "")));
  const assignments = new Map(value.map((a) => [a.code, a.value]));
  const set = (code: string, next: boolean | number | undefined) => onChange?.([
    ...value.filter((a) => a.code !== code), ...(next === undefined ? [] : [{ code, value: next }]),
  ]);
  if (!all.length) return null;
  return (
    <section className="space-y-4" aria-label={tr ? "Standart olanak ve envanter kataloğu" : "Standard amenities and inventory catalog"}>
      <div>
        <h3 className="font-uninav-book text-lg text-slate-900">{tr ? "Olanaklar ve oda envanteri" : "Amenities and room inventory"}</h3>
        <p className="mt-1 text-sm text-slate-500">{readOnly
          ? (tr ? "Tüm otellerin ortak kataloğu. Odaya ait ürün ve olanaklar oda formunda seçilir." : "Shared catalog for all hotels. Room items and amenities are selected in the room form.")
          : (tr ? "Yalnızca bu odada bulunanları seçin. Fiziksel ürünlerde adedi belirtin." : "Select what is available in this room. Enter quantities for physical items.")}</p>
      </div>
      <TextField label={tr ? "Katalogda ara" : "Search catalog"} type="search" value={query} onChange={setQuery}
        placeholder={tr ? "Havlu, Wi-Fi, mutfak…" : "Towel, Wi-Fi, kitchen…"} />
      {!items.length && <p className="text-sm text-slate-500">{tr ? "Eşleşen kayıt yok." : "No matching items."}</p>}
      {categories.map((category, index) => {
        const rows = items.filter((d) => d.category === category);
        const expanded = !!search || opened.includes(category);
        const selectedCount = all.filter((d) => d.category === category && assignments.has(d.code)).length;
        const panelId = `${id}-category-${index}`;
        return <div key={category} className="overflow-hidden rounded-2xl bg-[#f9f9f9]">
          <button type="button" aria-expanded={expanded} aria-controls={panelId}
            className="uni-control flex min-h-12 w-full items-center gap-3 p-4 text-start focus-visible:ring-2 focus-visible:ring-neutral-400"
            onClick={() => setOpened(opened.includes(category) ? opened.filter((c) => c !== category) : [...opened, category])}>
            <CatalogIcon iconKey={rows[0].icon_key} />
            <span className="min-w-0 flex-1">{label(rows[0].category_label)}</span>
            <span className="text-xs text-slate-500">{readOnly ? rows.length : `${selectedCount} / ${all.filter((d) => d.category === category).length}`}</span>
            <ChevronDown aria-hidden="true" size={16} className={expanded ? "rotate-180" : ""} />
          </button>
          <div id={panelId} hidden={!expanded} className="space-y-4 px-4 pb-4">
            {expanded && Array.from(new Set(rows.map((d) => d.group_key))).map((group) => {
              const members = rows.filter((d) => d.group_key === group);
              return <div key={group} className="space-y-2">
                <h4 className="text-sm font-medium text-slate-600">{label(members[0].group_label)}</h4>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {members.map((d) => {
                    const current = assignments.get(d.code);
                    const selected = current !== undefined;
                    const name = label(d.label);
                    return <div key={d.code} className="rounded-xl bg-white p-3">
                      <div className="flex items-center gap-3">
                        <CatalogIcon iconKey={d.icon_key} />
                        <div className="min-w-0 flex-1">
                          {readOnly ? <span className="text-sm">{name}</span> : <Switch label={name}
                            checked={d.catalog_kind === "amenity" ? current === true : selected}
                            onChange={(checked) => set(d.code, checked ? (d.catalog_kind === "amenity" ? true : 1) : undefined)} />}
                        </div>
                      </div>
                      {readOnly ? <p className="mt-1 break-all text-xs text-slate-400">
                        {d.code} · {d.scopes.includes("room") ? (tr ? "Oda" : "Room") : (tr ? "Ortak alan / tesis" : "Common area / property")}
                      </p> : selected && d.catalog_kind !== "amenity" && <div className="mt-2">
                        <StepperField label={`${name} — ${tr ? "Adet" : "Quantity"}`} min={0} max={Number.MAX_SAFE_INTEGER}
                          value={typeof current === "number" ? current : 1} onChange={(n) => set(d.code, n)} />
                      </div>}
                    </div>;
                  })}
                </div>
              </div>;
            })}
          </div>
        </div>;
      })}
    </section>
  );
}
