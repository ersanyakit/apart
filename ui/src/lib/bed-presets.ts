import contracts from "./contracts.generated.json";
export type Place = {
  unit_id?: string;
  code: string;
  level: number;
  position: string;
  width_cm: number;
  length_cm: number;
  capacity: number;
  is_active: boolean;
  rentable: boolean;
};
export type Bed = {
  bed_id?: string;
  branch_id: string;
  room_id: string | null;
  floor_id: string | null;
  code: string;
  type: string;
  structure: string;
  width_cm: number;
  length_cm: number;
  levels: number;
  places: Place[];
};
export const BED_PRESETS = contracts.bed_presets;
export type BedPreset = (typeof BED_PRESETS)[number];
export function matchBedPreset(bed: Bed) {
  return BED_PRESETS.find(p => p.physical_count === 1 && p.type === bed.type && p.structure === bed.structure && p.levels === bed.levels &&
    p.place_capacities.every((capacity,i) => bed.places.find(place=>place.level===i+1)?.capacity === capacity));
}

export function applyBedPreset(bed: Bed, preset: BedPreset, remembered: readonly Place[] = []): Bed {
  if (preset.physical_count !== 1) throw new Error("Twin düzeni oda formundan iki ayrı fiziksel yatak olarak eklenir.");
  return {
    ...bed,
    type: preset.type,
    structure: preset.structure,
    width_cm: preset.width_cm,
    length_cm: preset.length_cm,
    levels: preset.levels,
    places: Array.from({ length: preset.levels }, (_, i) => {
      const level = i + 1;
      // Keep existing physical unit identities, including when switching back
      // to a taller preset before saving the form.
      const existing = bed.places.find(p => p.level === level)
        ?? remembered.find(p => p.level === level);
      return {
        ...existing,
        code: existing?.code || (bed.code ? `${bed.code}-${level}` : ""),
        level,
        position: preset.levels === 1 ? "single" : i === 0 ? "lower" : level === preset.levels ? "upper" : "middle",
        width_cm: preset.place_widths[i],
        length_cm: preset.length_cm,
        capacity: preset.place_capacities[i],
        is_active: existing?.is_active ?? true,
        rentable: existing?.rentable ?? true,
      };
    }),
  };
}
