const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const catalog = require('../../internal/domain/catalog/defaults.json');
const images = require('../src/lib/catalog-icon-map.json');

const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/CatalogFields.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(compiled, {
  module: loaded, exports: loaded.exports,
  require(name) {
    if (name === './I18n') return { useI18n: () => ({ locale: 'tr', m: value=>value }) };
    if (name === './fields') return { TextField: () => null, StepperField: () => null, Switch: () => null };
    if (name === '../lib/facility-icon-map.json') return require('../src/lib/facility-icon-map.json');
    if (name === '../lib/catalog-icon-map.json') return images;
    if (name === '../lib/i18n/catalog-source.json') return require('../src/lib/i18n/catalog-source.json');
    return require(name);
  },
});
const { CatalogFields, CatalogIcon } = loaded.exports;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

test('the read-only feature registry shows AVIF category artwork with its default room scope', () => {
  const definitions = catalog.categories.map(category => ({
    code: category.groups[0].entries[0].key,
    label: category.groups[0].entries[0].label,
    category: category.key, category_label: category.label,
    icon_key: category.icon_key, catalog_kind: 'amenity', scopes: ['room'],
  }));
  const html = render(CatalogFields, { definitions, readOnly: true });
  assert.equal((html.match(/<img /g) || []).length, catalog.categories.length);
  for (const category of catalog.categories) assert.ok(html.includes(`/images/facility-icons-dott/${category.icon_key}.avif`));
});

test('each illustrated catalog entry renders its exact item asset', () => {
  for (const [code, image] of Object.entries(images)) {
    const html = render(CatalogIcon, { featureCode: code, iconKey: 'building', artwork: true });
    assert.ok(html.includes(`src="${image}"`), code);
    assert.ok(!html.includes('<svg'), code);
  }
});

test('an unknown custom item keeps a line icon instead of an unrelated category illustration', () => {
  const html = render(CatalogIcon, { featureCode: 'custom.unknown-item', iconKey: 'bath', artwork: true });
  assert.ok(html.includes('<svg'));
  assert.ok(!html.includes('<img'));
});
