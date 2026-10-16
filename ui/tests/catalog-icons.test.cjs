const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const catalog = require('../../internal/domain/catalog/defaults.json');
const images = require('../src/lib/catalog-icon-map.json');
const entries = catalog.categories.flatMap(category => category.groups.flatMap(group => group.entries));

test('every catalog entry has its own semantically matched artwork', () => {
  assert.deepEqual(Object.keys(images).sort(), entries.map(entry => entry.key).sort());
  const meaningByImage = new Map();
  for (const entry of entries) {
    const image = images[entry.key];
    assert.match(image, /^\/images\/[a-z0-9_./-]+\.avif$/);
    if (meaningByImage.has(image)) assert.equal(meaningByImage.get(image), entry.label.EN, `Different features share ${image}`);
    meaningByImage.set(image, entry.label.EN);
  }
});

test('catalog illustrations are real, distinct AVIF assets', () => {
  const content = new Map();
  for (const image of new Set(Object.values(images))) {
    const file = path.join(__dirname, '../public', image);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.toString('ascii', 4, 8), 'ftyp', file);
    assert.ok(bytes.subarray(8, 32).includes(Buffer.from('avif')), file);
    const digest = createHash('sha256').update(bytes).digest('hex');
    assert.ok(!content.has(digest), `${image} repeats the image for ${content.get(digest)}`);
    content.set(digest, image);
  }
});
