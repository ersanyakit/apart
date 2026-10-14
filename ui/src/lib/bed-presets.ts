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
export const BED_PRESETS = [
  { key: "single", label: "Tek kişilik baza", type: "single", structure: "standard", width_cm: 90, length_cm: 200, levels: 1, capacity: 1 },
  { key: "double", label: "Çift kişilik yatak", type: "double", structure: "standard", width_cm: 160, length_cm: 200, levels: 1, capacity: 2 },
  { key: "bunk2", label: "2 katlı ranza", type: "bunk_bed", structure: "bunk", width_cm: 90, length_cm: 200, levels: 2, capacity: 1 },
  { key: "bunk3", label: "3 katlı ranza", type: "bunk_bed", structure: "bunk", width_cm: 90, length_cm: 200, levels: 3, capacity: 1 },
  { key: "bunk4", label: "4 katlı ranza", type: "bunk_bed", structure: "bunk", width_cm: 90, length_cm: 200, levels: 4, capacity: 1 },
] as const;

export type BedPreset = (typeof BED_PRESETS)[number];

export function applyBedPreset(bed: Bed, preset: BedPreset, remembered: readonly Place[] = []): Bed {
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
        width_cm: preset.width_cm,
        length_cm: preset.length_cm,
        capacity: preset.capacity,
        is_active: existing?.is_active ?? true,
        rentable: existing?.rentable ?? true,
      };
    }),
  };
}
