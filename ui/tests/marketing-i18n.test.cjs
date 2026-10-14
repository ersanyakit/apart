const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '../src/lib/i18n/marketing');
const source = JSON.parse(fs.readFileSync(path.join(dir, 'tr.json'), 'utf8'));
const placeholders = value => [...value.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();

test('landing translations cover every supported application language', () => {
  const expected = require('../src/lib/contracts.generated.json').languages
    .map(code => code.toLowerCase().replace('zh-cn', 'zh-CN').replace('zh-tw', 'zh-TW')).sort();
  const actual = fs.readdirSync(dir).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5)).sort();
  assert.deepEqual(actual, expected, 'A supported language is missing its landing translation');
});

test('every published marketing dictionary covers every source and preserves interpolation', () => {
  const keys = Object.keys(source).sort();
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
    const dictionary = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    assert.deepEqual(Object.keys(dictionary).sort(), keys, `${file}: key coverage`);
    for (const key of keys) {
      assert.equal(typeof dictionary[key], 'string', `${file}: ${key}`);
      assert.ok(dictionary[key].trim(), `${file}: empty value for ${key}`);
      assert.deepEqual(placeholders(dictionary[key]), placeholders(key), `${file}: interpolation for ${key}`);
    }
    if (file !== 'tr.json') {
      const translated = keys.filter(key => dictionary[key] !== source[key]);
      assert.ok(translated.length > keys.length * 0.9, `${file}: source-language fallback detected`);
    }
  }
});

test('every published locale has a lazy loader', () => {
  const module = fs.readFileSync(path.join(dir, '../marketing.ts'), 'utf8');
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
    assert.ok(module.includes(`./marketing/${file}`), `${file}: missing loader`);
  }
});

test('marketing has no external translation service dependency', () => {
  const files = [
    path.join(dir, '../marketing.ts'),
    path.join(__dirname, '../src/components/landing/MarketingI18n.tsx'),
    path.join(__dirname, '../src/components/landing/LanguageSelect.tsx'),
  ];
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /translate\.google|translate_a|googleTranslateElement|gtranslate|libretranslate/i);
  }
});

test('literal marketing copy and every public report description have translation keys', () => {
  const ts = require('typescript');
  const folders = ['src/components/landing', 'src/app/pricing', 'src/app/screenshots', 'src/app/contact'];
  const files = folders.flatMap(folder => fs.readdirSync(path.join(__dirname, '..', folder))
    .filter(file => file.endsWith('.tsx')).map(file => path.join(__dirname, '..', folder, file)));
  files.push(path.join(__dirname, '../src/app/page.tsx'));
  for (const file of files) {
    const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = node => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'm' && ts.isStringLiteral(node.arguments[0])) {
        assert.ok(Object.hasOwn(source, node.arguments[0].text), `${file}: missing ${node.arguments[0].text}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  for (const report of require('../src/lib/contracts.generated.json').reports) {
    for (const value of [report.name, report.description, report.category]) assert.ok(Object.hasOwn(source, value), value);
  }
});
