const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");

// Compile with the project's TypeScript dependency; no additional test runtime.
const ui = path.resolve(__dirname, "..");
const output = mkdtempSync(path.join(tmpdir(), "otel-i18n-"));
after(() => rmSync(output, { recursive: true, force: true }));
execFileSync(process.execPath, [
  require.resolve("typescript/bin/tsc"), "--target", "ES2022", "--module", "commonjs",
  "--moduleResolution", "node", "--skipLibCheck", "--strict", "--outDir", output,
  "src/lib/countries.ts", "src/lib/i18n/messages.ts",
], { cwd: ui, stdio: "pipe" });
const countriesPath = path.join(output, "countries.js");
const { getCountries, countryByCode, searchCountries, currencyForCountry } = require(countriesPath);
const { LOCALES, resolveLocale, resolveRequestLocale } = require(path.join(output, "i18n/config.js"));
const { messages, translate } = require(path.join(output, "i18n/messages.js"));
const contracts = require("../src/lib/contracts.generated.json");

test("supported locales match the API and normalize safely", () => {
  assert.deepEqual(Object.keys(LOCALES).map((code) => code.toUpperCase()).sort(), [...contracts.languages].sort());
  assert.equal(resolveLocale("EN_us"), "en");
  assert.equal(resolveLocale("TR"), "tr");
  assert.equal(resolveLocale("zh-Hant-HK"), "zh-TW");
  assert.equal(resolveLocale("ZH-CN"), "zh-CN");
  assert.equal(resolveLocale("unknown"), "tr");
  assert.equal(resolveLocale(null), "tr");
  assert.equal(LOCALES.ar.direction, "rtl");
});

test("country names translate while codes and currencies remain stable", () => {
  assert.equal(countryByCode("de", "tr").name, "Almanya");
  assert.equal(countryByCode("DE", "en").name, "Germany");
  assert.equal(countryByCode("DE", "de").name, "Deutschland");
  assert.equal(countryByCode("DE", "fr").name, "Allemagne");
  const codes = getCountries("tr").map((c) => c.code).sort();
  for (const locale of Object.keys(LOCALES)) {
    const list = getCountries(locale);
    assert.deepEqual(list.map((c) => c.code).sort(), codes);
    assert.ok(list.every((c) => c.name && c.name !== c.code));
    assert.equal(countryByCode("TR", locale).currency, "TRY");
    assert.equal(countryByCode("DE", locale).currency, "EUR");
  }
  assert.equal(countryByCode("invalid", "en"), undefined);
  assert.equal(currencyForCountry(" tr "), "TRY");
});

test("localized, accented and ISO searches find the same country", () => {
  for (const [query, locale, code] of [
    ["Almanya", "tr", "DE"], ["Germany", "en", "DE"], ["Deutschland", "de", "DE"],
    ["Германия", "ru", "DE"], ["ألمانيا", "ar", "DE"], ["德国", "zh-CN", "DE"],
    ["德國", "zh-TW", "DE"], ["Turkiye", "tr", "TR"], ["IN", "en", "IN"],
    ["DE", "ar", "DE"], ["Germany", "tr", "DE"],
  ]) {
    const matches = searchCountries(query, 1, locale);
    assert.equal(matches[0]?.code, code, `${query} (${locale})`);
    assert.equal(matches[0].name, countryByCode(code, locale).name);
  }
  assert.equal(searchCountries("not-a-country", 10, "en").length, 0);
  assert.equal(searchCountries("", 5, "en").length, 5);
});

test("locale dictionaries are complete and unbundled languages use the default messages", () => {
  const keys = Object.keys(messages.tr).sort();
  for (const locale of Object.keys(LOCALES)) {
    if (messages[locale]) assert.deepEqual(Object.keys(messages[locale]).sort(), keys);
    else for (const key of keys) assert.equal(translate(locale, key), translate("tr", key));
    assert.ok(keys.every((key) => translate(locale, key).trim()));
  }
  assert.equal(translate("en", "guest.numberNationality", { number: 2 }), "Guest 2 nationality");
  assert.equal(translate("not-supported", "country.label"), "Ülke");
});

test("bundled country names remain available without Intl.DisplayNames", () => {
  const original = Intl.DisplayNames;
  try {
    Intl.DisplayNames = undefined;
    delete require.cache[countriesPath];
    const fallback = require(countriesPath);
    assert.equal(fallback.countryByCode("TR", "en").name, "Türkiye");
    assert.equal(fallback.countryByCode("DE", "ar").code, "DE");
  } finally {
    Intl.DisplayNames = original;
  }
});

test("browser language selection respects preference order, quality and explicit choice", () => {
  assert.equal(resolveRequestLocale(null, "de-DE,de;q=0.9,en;q=0.8"), "de");
  assert.equal(resolveRequestLocale(null, "xx-ZZ,en-US;q=0.8,tr;q=0.5"), "en");
  assert.equal(resolveRequestLocale(null, "fr;q=0.3,ar-SA;q=0.9"), "ar");
  assert.equal(resolveRequestLocale(null, "zh-Hant-TW,zh;q=0.9"), "zh-TW");
  assert.equal(resolveRequestLocale(null, "zh-SG"), "zh-CN");
  assert.equal(resolveRequestLocale(null, "de;q=0,fr;q=bad,en;q=0.8"), "en");
  assert.equal(resolveRequestLocale(null, "de;q=2,fr;q=-1,en;q=0.8"), "en");
  assert.equal(resolveRequestLocale(null, "fr;q=0.8,de;q=0.8"), "fr");
  assert.equal(resolveRequestLocale("tr", "en-US"), "tr");
  assert.equal(resolveRequestLocale("invalid", "de-DE"), "de");
  assert.equal(resolveRequestLocale(null, "*,xx-ZZ"), "tr");
  assert.equal(resolveRequestLocale(null, null), "tr");
});
