import React, { useId, useState } from "react";
import {
  Accessibility, Baby, Bath, BedDouble, Brush, Building2, ChevronDown,
  Coffee, DoorOpen, Lamp, Monitor, Package, Palette, Refrigerator, Shield,
  Sofa, Table2, Trees, Tv, Utensils, Waves, Wind,
} from "lucide-react";
import type { FeatureAssignment, FeatureDefinition, LocalizedString } from "../lib/api";
import { useI18n } from "./I18n";
import { StepperField, Switch, TextField } from "./fields";
import facilityIconMap from "../lib/facility-icon-map.json";
import catalogIconMap from "../lib/catalog-icon-map.json";

const icons = {
  bath: Bath, bed: BedDouble, sofa: Sofa, table: Table2,
  refrigerator: Refrigerator, utensils: Utensils, tv: Tv, wind: Wind,
  lamp: Lamp, palette: Palette, trees: Trees, waves: Waves, shield: Shield,
  brush: Brush, monitor: Monitor, baby: Baby, building: Building2,
  accessibility: Accessibility, door: DoorOpen, coffee: Coffee,
};

export function CatalogIcon({ iconKey, artwork = false, featureCode, artworkSize = 40 }: { iconKey?: string; artwork?: boolean; featureCode?: string; artworkSize?: number }) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const catalogArtwork = featureCode && Object.hasOwn(catalogIconMap, featureCode) ? (catalogIconMap as Record<string, string>)[featureCode] : undefined;
  const itemIcon = featureCode && Object.hasOwn(facilityIconMap, featureCode) ? (facilityIconMap as Record<string, string>)[featureCode] : undefined;
  const artworkPath = itemIcon ? `items/${itemIcon}` : !featureCode && iconKey && Object.hasOwn(icons, iconKey) ? iconKey : undefined;
  if (artwork && (catalogArtwork || artworkPath)) {
    return <img src={catalogArtwork || `/images/facility-icons-dott/${artworkPath}.avif`} width={artworkSize} height={artworkSize} style={{ width: artworkSize, height: artworkSize }} alt="" aria-hidden="true" className="shrink-0 rounded-lg object-contain" loading="lazy" />;
  }
  const Icon = icons[iconKey as keyof typeof icons] || Package;
  return <Icon size={21} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />;
}

// The catalog ships TR/EN labels. Other UI languages use English until a
// translation for that language is supplied by the server.
export function catalogLabel(value: LocalizedString | undefined, locale: string) {
  return value?.[locale.toUpperCase()] || value?.EN || value?.TR || "";
}

export function CatalogFields({ definitions, value = [], onChange, readOnly = false, scope = "room" }: {
  definitions: FeatureDefinition[];
  value?: FeatureAssignment[];
  onChange?: (value: FeatureAssignment[]) => void;
  readOnly?: boolean;
  scope?: "room" | "property";
}) {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const { locale } = useI18n();
  const id = useId();
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<string[]>([]);
  const tr = locale === "tr";
  const useArtwork = true;
  const label = (v?: LocalizedString) => catalogLabel(v, locale);
  const normalize = (v: string) => v.toLocaleLowerCase(locale).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("ı", "i");
  const search = normalize(query.trim());
  const all = definitions.filter((d) => d.catalog_kind && (readOnly || d.scopes.includes(scope)));
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
    <section className="space-y-4" aria-label={tr ? _uiText("Standart olanak ve envanter kataloğu") : _uiText("Standard amenities and inventory catalog")}>
      <div>
        <h3 className="font-uninav-book text-lg text-slate-900">{scope === "property" ? (tr ? _uiText("Tesis olanakları ve envanteri") : _uiText("Property amenities and inventory")) : (tr ? _uiText("Olanaklar ve oda envanteri") : _uiText("Amenities and room inventory"))}</h3>
        <p className="mt-1 text-sm text-slate-500">{readOnly
          ? (tr ? _uiText("Tüm otellerin ortak kataloğu. Odaya ait ürün ve olanaklar oda formunda seçilir.") : _uiText("Shared catalog for all hotels. Room items and amenities are selected in the room form."))
          : scope === "property" ? (tr ? _uiText("Tesisin ortak alanlarında sunulan olanakları seçin. Fiziksel ürünlerde adedi belirtin.") : _uiText("Select amenities available at the property. Enter quantities for physical items."))
          : (tr ? _uiText("Yalnızca bu odada bulunanları seçin. Fiziksel ürünlerde adedi belirtin.") : _uiText("Select what is available in this room. Enter quantities for physical items."))}</p>
      </div>
      <TextField label={tr ? _uiText("Katalogda ara") : _uiText("Search catalog")} type="search" value={query} onChange={setQuery}
        placeholder={tr ? _uiText("Havlu, Wi-Fi, mutfak…") : _uiText("Towel, Wi-Fi, kitchen…")} />
      {!items.length && <p className="text-sm text-slate-500">{tr ? _uiText("Eşleşen kayıt yok.") : _uiText("No matching items.")}</p>}
      {categories.map((category, index) => {
        const rows = items.filter((d) => d.category === category);
        const expanded = !!search || opened.includes(category);
        const selectedCount = all.filter((d) => d.category === category && (d.catalog_kind === "amenity" ? assignments.get(d.code) === true : assignments.has(d.code))).length;
        const panelId = `${id}-category-${index}`;
        return <div key={category} className="overflow-hidden rounded-2xl bg-[#f9f9f9]">
          <button type="button" aria-expanded={expanded} aria-controls={panelId}
            className="uni-control flex min-h-12 w-full items-center gap-3 p-4 text-start focus-visible:ring-2 focus-visible:ring-neutral-400"
            onClick={() => setOpened(opened.includes(category) ? opened.filter((c) => c !== category) : [...opened, category])}>
            <CatalogIcon iconKey={rows[0].icon_key} artwork={useArtwork} artworkSize={96} />
            <span className="min-w-0 flex-1">{label(rows[0].category_label)}</span>
            <span className="text-xs text-slate-500">{readOnly ? rows.length : _uiText("{value1} / {value2}", {value1: String(selectedCount), value2: String(all.filter((d) => d.category === category).length)})}</span>
            <ChevronDown aria-hidden="true" size={16} className={expanded ? "rotate-180" : ""} />
          </button>
          <div id={panelId} hidden={!expanded} className="space-y-4 px-4 pb-4">
            {expanded && Array.from(new Set(rows.map((d) => d.group_key))).map((group) => {
              const members = rows.filter((d) => d.group_key === group);
              const groupMembers = all.filter((d) => d.category === category && d.group_key === group);
              const groupName = label(members[0].group_label);
              const allSelected = groupMembers.every((d) => d.catalog_kind === "amenity" ? assignments.get(d.code) === true : assignments.has(d.code));
              const anySelected = groupMembers.some((d) => assignments.has(d.code));
              const updateGroup = (select: boolean) => {
                const codes = new Set(groupMembers.map((d) => d.code));
                onChange?.([
                  ...value.filter((a) => !codes.has(a.code)),
                  ...(select ? groupMembers.map((d) => ({
                    code: d.code,
                    value: d.catalog_kind === "amenity" ? true : (assignments.get(d.code) ?? 1),
                  })) : []),
                ]);
              };
              return <div key={group} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <h4 className="text-sm font-medium text-slate-600">{groupName}</h4>
                  {!readOnly && <div className="flex flex-wrap items-center gap-1">
                    <button type="button" disabled={allSelected} onClick={() => updateGroup(true)}
                      aria-label={_uiText("{value1}: {value2}", {value1: String(groupName), value2: String(tr ? "Tümünü seç" : "Select all")})}
                      className="uni-control min-h-11 rounded-xl px-3 text-xs font-medium text-slate-700 hover:bg-white focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-40">
                      {tr ? _uiText("Tümünü seç") : _uiText("Select all")}
                    </button>
                    <button type="button" disabled={!anySelected} onClick={() => updateGroup(false)}
                      aria-label={_uiText("{value1}: {value2}", {value1: String(groupName), value2: String(tr ? "Seçimi temizle" : "Clear selection")})}
                      className="uni-control min-h-11 rounded-xl px-3 text-xs text-slate-500 hover:bg-white focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-40">
                      {tr ? _uiText("Seçimi temizle") : _uiText("Clear selection")}
                    </button>
                  </div>}
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {members.map((d) => {
                    const current = assignments.get(d.code);
                    const selected = current !== undefined;
                    const name = label(d.label);
                    return <div key={d.code} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex items-center gap-4">
                        <CatalogIcon iconKey={d.icon_key} featureCode={d.code} artwork={useArtwork} artworkSize={96} />
                        <div className="min-w-0 flex-1">
                          {readOnly ? <span className="text-sm">{name}</span> : <Switch label={name}
                            checked={d.catalog_kind === "amenity" ? current === true : selected}
                            onChange={(checked) => set(d.code, checked ? (d.catalog_kind === "amenity" ? true : 1) : undefined)} />}
                        </div>
                      </div>
                      {readOnly ? <p className="mt-1 break-all text-xs text-slate-400">
                        {d.code} · {d.scopes.includes("room") ? (tr ? _uiText("Oda") : _uiText("Room")) : (tr ? _uiText("Ortak alan / tesis") : _uiText("Common area / property"))}
                      </p> : selected && d.catalog_kind !== "amenity" && <div className="mt-2">
                        <StepperField label={_uiText("{value1} — {value2}", {value1: String(name), value2: String(tr ? "Adet" : "Quantity")})} min={0} max={Number.MAX_SAFE_INTEGER}
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
