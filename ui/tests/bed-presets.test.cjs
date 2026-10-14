const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const out = mkdtempSync(path.join(os.tmpdir(), 'otel-bed-presets-'));
after(() => rmSync(out, { recursive: true, force: true }));
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022', '--module', 'commonjs', '--skipLibCheck', '--strict', '--outDir', out, 'src/lib/bed-presets.ts'], { cwd: path.resolve(__dirname, '..') });
const { BED_PRESETS, applyBedPreset } = require(path.join(out, 'bed-presets.js'));
const empty = { branch_id: 'branch', room_id: 'room', floor_id: 'floor', code: '', type: 'single', structure: 'standard', width_cm: 90, length_cm: 200, levels: 1, places: [] };

test('double beds are one sleeping surface for two; bunks have one person per level', () => {
  for (const preset of BED_PRESETS) {
    const result = applyBedPreset(empty, preset);
    assert.equal(result.places.length, preset.levels);
    assert.equal(result.places.reduce((sum, place) => sum + place.capacity, 0), preset.key === 'double' ? 2 : preset.levels);
    assert.ok(result.places.every(p => p.width_cm === result.width_cm && p.length_cm === result.length_cm));
    assert.ok(result.places.every(p => p.code === '' && p.is_active && p.rentable));
    assert.deepEqual(result.places.map(p => p.position), preset.levels === 1 ? ['single'] : ['lower', ...Array(preset.levels - 2).fill('middle'), 'upper']);
  }
  assert.deepEqual(empty.places, []);
});

test('preset changes preserve assignments, unit identities, custom codes and availability flags by level', () => {
  const original = { ...applyBedPreset({ ...empty, bed_id: 'bed', code: 'B01' }, BED_PRESETS[3]) };
  original.places = original.places.map(p => ({ ...p, unit_id: `unit-${p.level}`, code: `CUSTOM-${p.level}`, is_active: false, rentable: false })).reverse();
  const result = applyBedPreset(original, BED_PRESETS[4]);
  for (const key of ['bed_id', 'branch_id', 'room_id', 'floor_id', 'code']) assert.equal(result[key], original[key]);
  for (let i = 0; i < 3; i++) {
    assert.equal(result.places[i].unit_id, `unit-${i + 1}`);
    assert.equal(result.places[i].code, `CUSTOM-${i + 1}`);
    assert.equal(result.places[i].is_active, false);
    assert.equal(result.places[i].rentable, false);
  }
  assert.equal(result.places[3].code, 'B01-4');
  assert.equal(result.places[3].unit_id, undefined);
});

test('shrinking then restoring a preset reuses remembered unit IDs instead of creating replacements', () => {
  const original = applyBedPreset({ ...empty, code: 'B02' }, BED_PRESETS[4]);
  original.places = original.places.map(p => ({ ...p, unit_id: `unit-${p.level}` }));
  const smaller = applyBedPreset(original, BED_PRESETS[0]);
  const restored = applyBedPreset(smaller, BED_PRESETS[4], original.places);
  assert.deepEqual(restored, original);
});
