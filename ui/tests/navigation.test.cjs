const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const ui = path.resolve(__dirname, "..");
const output = mkdtempSync(path.join(tmpdir(), "otel-navigation-"));
after(() => rmSync(output, { recursive: true, force: true }));
execFileSync(process.execPath, [
  require.resolve("typescript/bin/tsc"), "--target", "ES2022", "--module", "commonjs",
  "--moduleResolution", "node", "--skipLibCheck", "--strict", "--esModuleInterop",
  "--resolveJsonModule", "--jsx", "react-jsx", "--outDir", output,
  "src/components/Sidebar.tsx", "src/components/MobileNav.tsx", "src/components/reports/navigation.ts",
], { cwd: ui, stdio: "pipe" });
process.env.NODE_PATH = path.join(ui, "node_modules");
require("node:module").Module._initPaths();
const { SidebarItem } = require(path.join(output, "components/Sidebar.js"));
const { MobileNav } = require(path.join(output, "components/MobileNav.js"));
const groups = [
  { id: "operations", label: "Otel Operasyonu", subItems: [
    { id: "board", label: "Oda Durum Çizelgesi" },
    { id: "bookings", label: "Rezervasyon Listesi" },
    { id: "stays", label: "Konaklayan Listesi" },
    { id: "guests", label: "Misafir Arama ve Geçmiş" },
  ] },
  { id: "settings", label: "Sistem Ayarları", subItems: [
    { id: "staff", label: "Personel Tanımları" },
    { id: "appsettings", label: "Ayarlar" },
  ] },
];

test("collapsed desktop navigation retains every destination with an accessible label", () => {
  const markup = renderToStaticMarkup(React.createElement(React.Fragment, null,
    ...groups.map((item) => React.createElement(SidebarItem, { key: item.id, item, isOpen: false, activeTab: "staff", onSelect() {} })),
  ));
  for (const item of groups.flatMap((group) => group.subItems)) {
    assert.ok(markup.includes(`aria-label="${item.label}"`), item.id);
  }
  assert.equal((markup.match(/aria-current="page"/g) ?? []).length, 1);
  assert.equal((markup.match(/<button/g) ?? []).length, 6);
});

test("expanded desktop navigation exposes the active page and its section", () => {
  const markup = renderToStaticMarkup(React.createElement(SidebarItem, {
    item: groups[1], isOpen: true, activeTab: "staff", onSelect() {},
  }));
  // Groups are always visible; the section name identifies their parent.
  assert.ok(markup.includes('aria-label="Sistem Ayarları"'));
  assert.ok(markup.includes('aria-current="page"'));
  assert.ok(markup.includes("Personel Tanımları"));
  assert.ok(markup.includes("Ayarlar"));
});

test("mobile navigation has a single menu trigger and marks the active tab", () => {
  const props = {
    snapshot: { user: { displayname: "Test Kullanıcı", username: "test" }, branches: [], hotels: [] },
    groups, activeTab: "guests", onSelect() {}, onSelection() {}, onLogout() {},
  };
  const markup = renderToStaticMarkup(React.createElement(MobileNav, props));
  assert.equal((markup.match(/aria-haspopup="dialog"/g) ?? []).length, 1);
  assert.equal((markup.match(/<button/g) ?? []).length, 5);
  assert.equal((markup.match(/aria-current="page"/g) ?? []).length, 1);
  assert.ok(markup.includes('aria-expanded="false"'));
  const restricted = renderToStaticMarkup(React.createElement(MobileNav, {
    ...props, groups: [{ ...groups[0], subItems: [groups[0].subItems[0]] }], activeTab: "board",
  }));
  assert.equal((restricted.match(/<button/g) ?? []).length, 2);
  assert.ok(!restricted.includes("Rezervasyon"));
});

const { REPORTS, REPORT_GROUPS, reportPageID, reportForPage, reportSidebarPage } = require(path.join(output, "components/reports/navigation.js"));
test("report categories retain every report exactly once and preserve deep links", () => {
  const grouped = REPORT_GROUPS.flatMap(group => group.reports);
  assert.equal(REPORT_GROUPS.length, 10);
  assert.equal(new Set(grouped.map(report => report.key)).size, REPORTS.length);
  assert.equal(grouped.length, REPORTS.length);
  for (const group of REPORT_GROUPS) {
    assert.ok(group.reports.length > 0);
    assert.equal(reportSidebarPage(group.id), group.id);
    for (const report of group.reports) {
      assert.equal(reportForPage(reportPageID(report.key)), report);
      assert.equal(reportSidebarPage(reportPageID(report.key)), group.id);
    }
  }
  assert.equal(reportSidebarPage("reports"), "report-group.management");
  assert.equal(reportSidebarPage("board"), "board");
});
test("report sidebar exposes category destinations without individual report rows", () => {
  const item = { id: "reports", label: "Raporlar", subItems: REPORT_GROUPS.map(group => ({ id: group.id, label: group.name })) };
  for (const isOpen of [true, false]) {
    const markup = renderToStaticMarkup(React.createElement(SidebarItem, { item, isOpen,
      activeTab: reportSidebarPage("report.finance.daily_revenue"), onSelect() {} }));
    assert.equal((markup.match(/<button/g) ?? []).length, REPORT_GROUPS.length);
    for (const group of REPORT_GROUPS) assert.ok(markup.includes(group.name));
    for (const report of REPORTS) assert.ok(!markup.includes(`>${report.name}<`));
  }
});
