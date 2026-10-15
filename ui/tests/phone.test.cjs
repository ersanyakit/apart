const assert = require('node:assert/strict');
const {test,after}=require('node:test');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const path=require('node:path'),os=require('node:os');
const ui=path.resolve(__dirname,'..'),out=mkdtempSync(path.join(os.tmpdir(),'otel-phone-'));
after(()=>rmSync(out,{recursive:true,force:true}));
execFileSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--skipLibCheck','--strict','--esModuleInterop','--resolveJsonModule','--outDir',out,'src/lib/phone/index.ts'],{cwd:ui,stdio:'pipe'});
const {parsePhone,phonePlans,formatNationalPhone,normalizeGuestPhones}=require(path.join(out,'index.js'));
test('national, international, pasted and Unicode Turkish numbers normalize identically',()=>{
 for(const number of ['0532 123 45 67','5321234567','+90 (532) 123-45-67','00905321234567','０５３２１２３４５６７','٠٥٣٢١٢٣٤٥٦٧']){
 const p=parsePhone(number,'TR');assert.equal(p.valid,true,number);assert.equal(p.e164,'+905321234567');
 }
 assert.equal(formatNationalPhone('5321234567','TR'),'532 123 45 67');
 assert.equal(parsePhone('0212 555 12 34','TR').e164,'+902125551234');
});
test('every supported mobile example validates and round trips internationally',()=>{
 for(const [country,plan] of Object.entries(phonePlans)){
 if(!plan.example)continue;
 const p=parsePhone('+'+plan.callingCode+plan.example,country);
 assert.equal(p.valid,true,`${country}: ${p.error}`);
 assert.equal(p.e164,'+'+plan.callingCode+plan.example,country);
 assert.equal(parsePhone(formatNationalPhone(plan.example,country),country).e164,p.e164,country);
 }
});
test('foreign numbers override nationality; shared calling codes and significant zero are preserved',()=>{
 assert.equal(parsePhone('+49 1512 3456789','TR').country,'DE');
 assert.equal(parsePhone('+1 416 555 0123','TR').country,'CA');
 assert.equal(parsePhone('02 3661 8300','IT').e164,'+390236618300');
 assert.equal(parsePhone('011 90 532 123 45 67','US').e164,'+905321234567');
 assert.equal(parsePhone('01512 3456789','DE').valid,true);
 assert.equal(parsePhone('020 7946 0018','GB').valid,true);
});
test('invalid nonempty values block saving while optional empty numbers remain empty',()=>{
 for(const value of ['532123','532123456789','+9991234567','abc','+90 532 123 45 67 ext 123','1111111111'])assert.equal(parsePhone(value,'TR').valid,false,value);
 assert.equal(parsePhone('','TR').valid,true);
 assert.throws(()=>normalizeGuestPhones([{name:'Ayşe',phone:'123'}]),/Ayşe: Numara eksik/);
 assert.deepEqual(normalizeGuestPhones([{name:'Ayşe',phone:'05321234567',nationality:'TR'},{name:'Can'}]),[{name:'Ayşe',phone:'+905321234567',nationality:'TR'},{name:'Can',phone:''}]);
});
