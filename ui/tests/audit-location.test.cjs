const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const output = mkdtempSync(path.join(tmpdir(), 'otel-audit-'));
after(() => rmSync(output, { recursive:true, force:true }));
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target','ES2022','--module','commonjs','--moduleResolution','node','--skipLibCheck','--strict','--esModuleInterop','--resolveJsonModule','--outDir',output,'src/lib/audit-location.ts'], { cwd:path.resolve(__dirname,'..'), stdio:'pipe' });
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
