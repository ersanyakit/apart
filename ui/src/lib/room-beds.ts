import {BED_PRESETS,applyBedPreset,type Bed} from './bed-presets';
export type RoomBedChoice = { id: string; preset: string; count: number };
export function roomBedsPayload(choices: RoomBedChoice[], code: string, branch: string): Bed[] {
  return choices.flatMap(choice => Array.from({ length: choice.count * (BED_PRESETS.find(p => p.key === choice.preset)?.physical_count || 1) }, (_, i) => {
    const preset = BED_PRESETS.find(p => p.key === choice.preset)!;
    const bedCode = `${code.slice(0,12)}-Y${choice.id.slice(0,8)}-${i+1}`.toUpperCase();
    const bed = applyBedPreset({ branch_id: branch, room_id: null, floor_id: null, code: bedCode, type: 'single', structure: 'standard', width_cm: 90, length_cm: 200, levels: 1, places: [] }, preset.physical_count === 2 ? BED_PRESETS.find(p=>p.key==='single')! : preset);
    return { ...bed, places: bed.places.map(p => ({ ...p, rentable: false })) };
  }));
}
