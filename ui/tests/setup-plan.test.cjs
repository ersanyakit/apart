const assert=require('node:assert/strict');
const {test,after}=require('node:test');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const path=require('node:path'),os=require('node:os');
const out=mkdtempSync(path.join(os.tmpdir(),'otel-setup-'));after(()=>rmSync(out,{recursive:true,force:true}));
execFileSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--strict','--skipLibCheck','--esModuleInterop','--resolveJsonModule','--outDir',out,'src/lib/setup-plan.ts'],{cwd:path.resolve(__dirname,'..'),stdio:'pipe'});
const {buildSetupUnits,setupFloors}=require(path.join(out,'lib/setup-plan.js'));
const base={id:'group',name:'Standart',floorKey:'all',kind:'room',mode:'room',count:2,roomsPerApartment:3,prefix:'',start:1,beds:[{id:'choice123',preset:'single',count:2}],features:[]};
test('whole rooms, hostel beds and whole apartments use the shared physical bed payload',()=>{
 const floors=setupFloors(2,true);
 for(const [kind,mode,rentable] of [['room','room',true],['dormitory','beds',false],['apartment','room',true]]){
  const units=buildSetupUnits(floors,[{...base,kind,mode}],true);
  assert.equal(units.length,4);assert.equal(new Set(units.map(u=>u.room.code)).size,4);
  assert.ok(units.every(u=>u.room.rentable===rentable&&u.room.beds_to_add.length===2&&u.room.status==='Temiz'));
  assert.equal(units[0].room.rental_mode,kind==='apartment'?'':mode);
 }
});
test('rooms inside apartments have real parents; apartments are not sold twice',()=>{
 const units=buildSetupUnits(setupFloors(2,true),[{...base,kind:'apartment_rooms'}],false);
 const parents=units.filter(u=>!u.parent_key),children=units.filter(u=>u.parent_key);
 assert.equal(parents.length,4);assert.equal(children.length,12);
 assert.ok(parents.every(u=>!u.room.rentable&&u.room.beds_to_add.length===0));
 assert.ok(children.every(u=>u.room.rentable&&parents.some(p=>p.key===u.parent_key&&p.floor_key===u.floor_key)));
 assert.ok(units.every(u=>u.room.status==='Kirli'));
});
test('plan rejects missing beds, duplicate room codes and orphan floor groups',()=>{
 const floors=setupFloors(1,true);
 assert.throws(()=>buildSetupUnits(floors,[{...base,beds:[]}],true),/yatak ekleyin/);
 assert.throws(()=>buildSetupUnits(floors,[{...base,floorKey:'missing'}],true),/kat seçin/);
 const units=buildSetupUnits(floors,[base],true);
 assert.throws(()=>buildSetupUnits(floors,[base],true,Object.fromEntries(units.map(u=>[u.key,'SAME']))),/benzersiz/);
});
