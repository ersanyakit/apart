const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const catalog = require('../../internal/domain/catalog/defaults.json');
const icons = require('../src/lib/facility-icon-map.json');
const entries = catalog.categories.flatMap(category => category.groups.flatMap(group => group.entries)).filter(entry => entry.scope === 'property');

test('every property amenity has a dedicated item image mapping', () => {
  assert.deepEqual(Object.keys(icons).sort(), entries.map(entry => entry.key).sort());
  const labels = new Map();
  for (const entry of entries) {
    const icon = icons[entry.key];
    assert.equal(icon, entry.key.split('.').at(-1));
    if (labels.has(icon)) assert.equal(labels.get(icon), entry.label.EN, `Unrelated amenities share ${icon}`);
    labels.set(icon, entry.label.EN);
  }
});

test('every mapped amenity image is a real AVIF file', () => {
  const artwork = new Map();
  for (const icon of new Set(Object.values(icons))) {
    const file = path.join(__dirname, '../public/images/facility-icons-dott/items', `${icon}.avif`);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.toString('ascii', 4, 8), 'ftyp', file);
    assert.ok(bytes.subarray(8, 32).includes(Buffer.from('avif')), file);
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.ok(!artwork.has(hash), `${icon} duplicates the artwork for ${artwork.get(hash)}`);
    artwork.set(hash, icon);
  }
});
