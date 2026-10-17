const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const output = mkdtempSync(path.join(tmpdir(), 'otel-audit-'));
after(() => rmSync(output, { recursive:true, force:true }));
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target','ES2022','--module','commonjs','--moduleResolution','node','--skipLibCheck','--strict','--esModuleInterop','--resolveJsonModule','--outDir',output,'src/lib/audit-location.ts','src/lib/audit-presentation.ts'], { cwd:path.resolve(__dirname,'..'), stdio:'pipe' });
const { auditLocationSummary } = require(path.join(output,'lib/audit-location.js'));
const location = { room_id:'r1', code:'101', kind:'room', branch_name:'Merkez', source:'event' };
test('room creation names the unit and branch without relying on UUIDs', () => {
  assert.deepEqual(auditLocationSummary('rooms',{after_location:location}),{label:'Oda 101',branch:'Merkez',inferred:false});
});
test('moves and renames expose both old and new room codes', () => {
  assert.equal(auditLocationSummary('bookings',{before_location:location,after_location:{...location,room_id:'r2',code:'205'}}).label,'Oda 101 → Oda 205');
  assert.equal(auditLocationSummary('rooms',{before_location:location,after_location:{...location,code:'102'}}).label,'Oda 101 → Oda 102');
});
test('legacy lookups are marked and missing context is never fabricated', () => {
  assert.equal(auditLocationSummary('rooms',{location:{...location,source:'current_record'}}).inferred,true);
  assert.equal(auditLocationSummary('rooms',{before:{code:'A1',kind:'apartment'}}).label,'Daire A1');
  assert.equal(auditLocationSummary('bookings').label,'Oda bilgisi kaydedilmemiş');
});

const {auditChanges,auditSummary}=require(path.join(output,'lib/audit-presentation.js'));
test('audit details show readable changes and keep internal IDs and secrets out',()=>{
 const entry={entity:'bookings',action:'update',details:{before:{guest_name:'Ayşe',status:'confirmed',daily_price_minor:10000,password:'secret',booking_id:'uuid'},after:{guest_name:'Ayşe',status:'cancelled',daily_price_minor:12000,cancellation_reason:'Misafir tarih değiştirdi',password:'newsecret',booking_id:'other'}}};
 const rows=auditChanges(entry);assert.equal(rows.length,3);assert.equal(rows.find(r=>r.key==='status').after,'İptal edildi');assert.match(rows.find(r=>r.key==='daily_price_minor').after,/120/);assert.match(rows.find(r=>r.key==='cancellation_reason').after,/Misafir tarih/);assert.ok(!JSON.stringify(rows).includes('secret'));assert.ok(!JSON.stringify(rows).includes('uuid'));assert.match(auditSummary(entry),/Ayşe/);
});
test('blacklist, missing historical context and report voids have plain language',()=>{assert.match(auditSummary({entity:'report_records',action:'delete'}),/iptal edildi/);assert.deepEqual(auditChanges({entity:'users',action:'login'}),[]);const changes=auditChanges({entity:'guest_assessments',action:'create',details:{after:{kind:'blacklist',reason:'Odaya zarar verdi',score:0}}});assert.equal(changes.find(r=>r.key==='kind').after,'Kara liste');assert.ok(!changes.some(r=>r.key==='score'))});

test('manager headlines describe room changes and report cancellation accurately',()=>{
 const {auditHeadline,auditSubject}=require(path.join(output,'lib/audit-presentation.js'));
 assert.equal(auditHeadline({entity:'rooms',action:'update',details:{before:{status:'Kirli'},after:{status:'Temiz'}}}),'Oda durumu değiştirildi');
 assert.equal(auditHeadline({entity:'report_records',action:'delete'}),'İşlem kaydı iptal edildi');
 assert.equal(auditSubject({entity:'bookings',action:'check_in',details:{after:{guest_name:'Deniz Örnek'}}}),'Deniz Örnek');
});


test('audit location translates owned unit labels while preserving codes and branch names',()=>{
 const t=source=>({'Oda':'Room','Daire':'Apartment','Birim':'Unit'}[source]??source);
 assert.deepEqual(auditLocationSummary('rooms',{after_location:{...location,code:'Oda-101',branch_name:'Daire'}},t),{label:'Room Oda-101',branch:'Daire',inferred:false});
});
