const assert=require('node:assert/strict');
const {test,after}=require('node:test');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync,readFileSync}=require('node:fs');
const os=require('node:os'),path=require('node:path');
const ui=path.resolve(__dirname,'..'),out=mkdtempSync(path.join(os.tmpdir(),'otel-app-i18n-'));
after(()=>rmSync(out,{recursive:true,force:true}));
execFileSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--skipLibCheck','--strict','--esModuleInterop','--resolveJsonModule','--outDir',out,'src/lib/i18n/application.ts','src/lib/i18n/formatters.ts'],{cwd:ui,stdio:'pipe'});
const {LOCALES}=require(path.join(out,'config.js'));
const {coreDictionary,loadApplicationDictionary,applicationText,applicationMessage}=require(path.join(out,'application.js'));
const {dateFieldLabels}=require(path.join(out,'formatters.js'));
const core=require('../src/lib/i18n/application-core.json');
const source=require('../src/lib/i18n/application-source.json');

test('all report headings, report group introductions, setup steps and catalog categories have native resources',async()=>{
 const contracts=require('../src/lib/contracts.generated.json');
 const catalog=require('../../internal/domain/catalog/defaults.json');
 const keys=[...contracts.reports.flatMap(r=>[r.name,r.description]),'Tüm tarihlerdeki müşterilerinizi benzersiz olarak görüntüleyin; ad, kimlik veya telefonla arayın.',...contracts.report_groups.flatMap(g=>[g.name,g.description]),...contracts.reports.filter(r=>r.key.startsWith('reservations.')).map(r=>r.description),...catalog.categories.map(c=>c.label.TR),'İşletme','Tesis','Olanaklar','Katlar','Odalar','Kontrol','İleri','Özellik Ekle','Kategori Ekle','Katalogda ara','Raporu görüntüle'];
 for(const locale of Object.keys(LOCALES)){
  const dictionary=await loadApplicationDictionary(locale);
  for(const key of keys){assert.ok(Object.hasOwn(source,key),`Unregistered source: ${key}`);assert.ok(Object.hasOwn(dictionary,key),`${locale}: ${key}`);}
 }
});

test('source extraction includes catalog entries and setup/domain validation messages',()=>{
 const catalog=require('../../internal/domain/catalog/defaults.json');
 for(const category of catalog.categories)for(const group of category.groups)for(const entry of group.entries)assert.ok(Object.hasOwn(source,entry.label.TR),entry.key);
 for(const key of ['En az bir kat ekleyin.','Her grup için 1–100 birim seçin.','Personel kullanıcı adları benzersiz olmalı.'])assert.ok(Object.hasOwn(source,key),key);
});

test('country controls translate in every language before inserting the selected name',async()=>{
 const semantic=require('../src/lib/i18n/semantic-source.json');
 for(const locale of Object.keys(LOCALES)){
  const dictionary=await loadApplicationDictionary(locale);
  for(const key of Object.keys(semantic))assert.ok(Object.hasOwn(dictionary,key),`${locale}: ${key}`);
  const text=applicationMessage(dictionary,'country.trigger',{label:'FIELD',name:'Ayşe Örnek'},locale);
  assert.ok(text.includes('FIELD')&&text.includes('Ayşe Örnek'),locale);
  assert.ok(!text.includes('{label}')&&!text.includes('{name}'),locale);
 }
 const ja=await loadApplicationDictionary('ja');
 assert.match(applicationMessage(ja,'country.label',{},'ja'),/^国/);
 assert.equal(applicationMessage(ja,'guest.numberNationality',{number:2},'ja'),'ゲスト 2 の国籍');
});

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


test('unit types and action contexts have distinct native translations in all languages',async()=>{
 for(const locale of Object.keys(LOCALES)){
  const dictionary=await loadApplicationDictionary(locale);
  for(const key of ['Daire','Koğuş','Yatak','Durum','Güncelle','Kaydediliyor…','İptal edildi']){if(locale==='tr')assert.equal(applicationText(dictionary,key),key);else assert.ok(dictionary[key],`${locale}: ${key}`);}
 }
 const en=await loadApplicationDictionary('en');
 assert.equal(applicationText(en,'Güncelle'),'Update');
 assert.equal(applicationText(en,'Durum'),'Status');
 assert.notEqual(applicationText(en,'Kaydediliyor…'),applicationText(en,'Yükleniyor…'));
});


test('extraction excludes implementation strings while retaining visible notifications and form errors',()=>{
 for(const key of ['peer sr-only','interactiveotel:locale','navigation-artwork shrink-0','button,input','ı'])assert.ok(!Object.hasOwn(source,key),key);
 for(const key of ['Geçerli bir tutar girin (örnek: {example}).','Tercihler kaydedilemedi. Ayarlar ekranından yeniden deneyebilirsiniz.','Girişte yalnızca personelin adı gösterilir. Güncelleme sonrasında personelin yeniden giriş yapması gerekir.'])assert.ok(Object.hasOwn(source,key),key);
});


test('completed shared screens and dialogs have resources across all supported locales',async()=>{
 const locations=JSON.parse(readFileSync(path.join(ui,'../output/app-i18n/source-locations.json'),'utf8'));
 const files=new Set(['SetupWizard.tsx','FacilityDetailsFields.tsx','FloorDefinitionFields.tsx','UnitSleepingFields.tsx','FeatureFields.tsx','CatalogFields.tsx','PropertySwitcher.tsx','AccommodationForms.tsx','BookingForm.tsx','SetupAccommodationFields.tsx','StaffView.tsx','StaffIdentityFields.tsx','RoomFolio.tsx','AppSettingsView.tsx','FontSize.tsx','SettingsEditor.tsx','ConfirmDialog.tsx','PWA.tsx','kanban/NoteModal.tsx','kanban/KanbanView.tsx','kanban/model.ts'].map(file=>'ui/src/components/'+file));
 const keys=Object.entries(locations).filter(([,refs])=>refs.some(ref=>files.has(ref.file))).map(([key])=>key);
 const fold=text=>text.trim().replace(/\s+/g,' ').toLocaleLowerCase('tr');
 for(const locale of Object.keys(LOCALES)){
  const dictionary=await loadApplicationDictionary(locale),known=new Set(Object.keys(dictionary).map(fold));
  for(const key of keys){
   const parts=key.match(/^([^\p{L}\p{N}{]*)(.*?)([^\p{L}\p{N}}]*)$/us);
   assert.ok(known.has(fold(key))||(parts&&known.has(fold(parts[2]))),`${locale}: ${key}`);
  }
 }
});
