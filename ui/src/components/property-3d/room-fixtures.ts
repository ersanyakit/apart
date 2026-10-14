import type { APIRoom, FeatureRegistry } from '../../lib/api';
const JACUZZI_KEYS = new Set([
  'catalog.bathroom.fixtures.jacuzzi', 'catalog.pool_spa.spa.room_jacuzzi',
  'catalog.pool_spa.spa.private_outdoor_jacuzzi', 'catalog.pool_spa.spa.whirlpool_bath',
  'jacuzzi', 'jakuzi', 'hot_tub', 'private_jacuzzi', 'room_jacuzzi', 'whirlpool_bath',
]);
const names = new Set(['jakuzi', 'oda içi jakuzi', 'özel açık hava jakuzisi', 'hidromasajlı küvet', 'jacuzzi', 'in-room jacuzzi', 'private outdoor jacuzzi', 'whirlpool bath', 'hot tub']);
export function roomHasJacuzzi(room: APIRoom, registry: FeatureRegistry): boolean {
  const definitions = new Map((registry?.definitions || []).map(d => [d.code, d]));
  const matches = (code: string) => {
    const definition = definitions.get(code);
    if (definition && !definition.scopes.includes('room')) return false;
    return JACUZZI_KEYS.has(code.toLowerCase()) || names.has(code.toLocaleLowerCase('tr')) ||
      !!definition && Object.values(definition.label || {}).some(label => names.has(label.trim().toLocaleLowerCase('tr')));
  };
  const assignments = room.feature_assignments || [];
  const enabled = (v: unknown) => v === true || typeof v === 'number' && v > 0 || typeof v === 'string' && ['true', 'yes', 'var', '1'].includes(v.trim().toLowerCase());
  if (assignments.some(a => matches(a.code))) return assignments.some(a => matches(a.code) && enabled(a.value));
  return (room.features || []).some(code => matches(code) && !assignments.some(a => a.code === code));
}
