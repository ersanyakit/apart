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
  "src/components/BookingArrival.tsx", "src/components/BookingActors.tsx", "src/lib/booking-grid.ts",
], { cwd: ui, stdio: "pipe" });
process.env.NODE_PATH = path.join(ui, "node_modules");
require("node:module").Module._initPaths();
const {BookingArrival}=require(path.join(output,"components/BookingArrival.js"));
const render=booking=>renderToStaticMarkup(React.createElement(BookingArrival,{booking}));
test("confirmed reservations do not imply arrival from planned dates",()=>{
 const html=render({status:"confirmed",check_in:"2020-01-01T12:00:00Z"});
 assert.ok(html.includes("Henüz giriş yapılmadı"));assert.ok(!html.includes("Gerçek giriş:"));
});
test("arrivals and departures show actual timestamps with separate labels",()=>{
 const html=render({status:"completed",actual_check_in:"2026-10-15T09:00:00Z",actual_check_out:"2026-10-16T09:00:00Z"});
 assert.ok(html.includes("Çıkış yapıldı"));assert.ok(html.includes("Gerçek giriş:"));assert.ok(html.includes("Gerçek çıkış:"));
});
test("legacy checked-in records disclose a missing timestamp without inventing one",()=>{
 const html=render({status:"checked_in"});assert.ok(html.includes("Giriş yapıldı"));assert.ok(html.includes("Zaman kaydedilmemiş"));
});
test("cancelled reservations without actual arrival show no entry",()=>{
 assert.ok(render({status:"cancelled"}).includes("İptal edildi · Giriş yok"));
});

const {BookingActors}=require(path.join(output,"components/BookingActors.js"));
const actors=booking=>renderToStaticMarkup(React.createElement(BookingActors,{booking}));
test("booking actors show each actual operator without inventing missing attribution",()=>{
 const html=actors({status:"completed",created_by_name:"Creator",checked_in_by_name:"Arrival",checked_out_by_name:"Departure"});
 for(const name of ["Creator","Arrival","Departure"])assert.ok(html.includes(name));
 assert.ok(!html.includes("İptali gerçekleştiren"));
 assert.equal((actors({status:"completed"}).match(/Bilgi kaydedilmemiş/g)||[]).length,3);
});
test("cancellation actor appears only for cancelled bookings and never implies arrival",()=>{
 const html=actors({status:"cancelled",cancelled_by_name:"Canceller"});
 assert.ok(html.includes("Canceller"));assert.ok(html.includes("Giriş yapılmadı"));assert.ok(html.includes("Çıkış yapılmadı"));
});

const {bookingMatchesDay,bookingSearchText}=require(path.join(output,"lib/booking-grid.js"));
test("booking day filter handles property midnight, early arrival and overdue stays",()=>{
 const base={status:"confirmed",check_in:"2026-10-14T23:30:00Z",check_out:"2026-10-16T21:00:00Z"};
 assert.equal(bookingMatchesDay(base,"2026-10-14","2026-10-15T09:00:00Z"),false);
 assert.equal(bookingMatchesDay(base,"2026-10-15","2026-10-15T09:00:00Z"),true);
 assert.equal(bookingMatchesDay(base,"2026-10-17","2026-10-15T09:00:00Z"),false);
 assert.equal(bookingMatchesDay({...base,status:"checked_in",actual_check_in:"2026-10-14T09:00:00Z"},"2026-10-14","2026-10-15T09:00:00Z"),true);
 assert.equal(bookingMatchesDay({...base,status:"checked_in"},"2026-10-18","2026-10-18T09:00:00Z"),true);
 assert.equal(bookingMatchesDay({...base,status:"completed",actual_check_out:"2026-10-16T10:00:00Z"},"2026-10-18","2026-10-18T09:00:00Z"),false);
});
test("reservation search includes every registered companion",()=>{
 assert.ok(bookingSearchText({guest_name:"Deniz",guests:[{name:"İpek Yılmaz"}]},"301").includes("ipek yılmaz"));
});
