const assert=require('node:assert/strict');
const {test,after}=require('node:test');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync,readFileSync}=require('node:fs');
const os=require('node:os'),path=require('node:path');
const ui=path.resolve(__dirname,'..'),out=mkdtempSync(path.join(os.tmpdir(),'otel-app-i18n-'));
after(()=>rmSync(out,{recursive:true,force:true}));
execFileSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--skipLibCheck','--strict','--esModuleInterop','--resolveJsonModule','--outDir',out,'src/lib/i18n/application.ts','src/lib/i18n/formatters.ts'],{cwd:ui,stdio:'pipe'});
const {LOCALES}=require(path.join(out,'config.js'));
const {coreDictionary,loadApplicationDictionary,applicationText}=require(path.join(out,'application.js'));
const {dateFieldLabels}=require(path.join(out,'formatters.js'));
const core=require('../src/lib/i18n/application-core.json');
const source=require('../src/lib/i18n/application-source.json');

test('all 60 languages have authored core resources and load their own application catalog',async()=>{
 const keys=Object.keys(core.tr).sort();
 assert.equal(Object.keys(LOCALES).length,60);
 for(const locale of Object.keys(LOCALES)){
  assert.deepEqual(Object.keys(core[locale]).sort(),keys,locale);
  const dictionary=await loadApplicationDictionary(locale);
  assert.equal(applicationText(dictionary,'Kaydet',{},locale),core[locale].Kaydet);
  assert.equal(applicationText(dictionary,'Oda durumu',{},locale),core[locale]['Oda durumu']);
  assert.ok(Object.values(core[locale]).every(value=>typeof value==='string'&&value.trim()),locale);
 }
});
test('plural rules use native categories and preserve the selected room count',()=>{
 for(const [locale,count,expected]of [['en',1,'1 guest'],['en',2,'2 guests'],['de',2,'2 Gäste'],['ru',2,'2 гостя'],['ru',5,'5 гостей'],['ar',2,'نزيلان'],['tr',2,'2 kişi']]){
  assert.equal(applicationText(coreDictionary(locale),'{count} kişi',{count},locale),expected);
 }
});
test('named interpolation preserves user content without translating it or treating it as HTML',()=>{
 const dictionary={'Oda {room} · {name}':'Room {room} · {name}'};
 assert.equal(applicationText(dictionary,'Oda {room} · {name}',{room:'101',name:'Temiz <b>Ayşe</b>'},'en'),'Room 101 · Temiz <b>Ayşe</b>');
 assert.equal(applicationText(dictionary,'Oda {room} · {name}',{room:'101'},'en'),'Room 101 · {name}');
 assert.equal(applicationText(coreDictionary('en'),'not a registered message',{},'en'),'not a registered message');
});
test('date controls localize months and weekdays and share immutable cached formatters',()=>{
 assert.match(dateFieldLabels('en').monthFmt.format(new Date(2026,9,17)),/October/);
 assert.match(dateFieldLabels('de').monthFmt.format(new Date(2026,9,17)),/Oktober/);
 assert.equal(dateFieldLabels('en').WEEKDAYS[0],'Mon');
 for(const locale of Object.keys(LOCALES)){
  const labels=dateFieldLabels(locale);assert.equal(labels.WEEKDAYS.length,7);assert.equal(labels.MONTHS_SHORT.length,12);
  assert.equal(labels,dateFieldLabels(locale));
 }
});
test('new resources and interpolations remain static and external-service free',()=>{
 const implementation=readFileSync(path.join(ui,'src/lib/i18n/application.ts'),'utf8');
 assert.ok(!/translate\.google|googleapis|fetch\(|XMLHttpRequest/.test(implementation));
 for(const locale of Object.keys(LOCALES)){
  const resource=require(`../src/lib/i18n/application/${locale}.json`);
  for(const [key,value]of Object.entries(resource)){
   assert.ok(typeof value==='string'&&value.trim(),`${locale}: ${key}`);
   const tokens=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
   assert.deepEqual(tokens(value),tokens(key),`${locale}: ${key}`);
  }
 }
 assert.ok(Object.keys(source).length>1000);
});
