const assert=require('node:assert/strict');
const {test,after}=require('node:test');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const path=require('node:path'),os=require('node:os');
const ui=path.resolve(__dirname,'..'),out=mkdtempSync(path.join(os.tmpdir(),'otel-money-'));
after(()=>rmSync(out,{recursive:true,force:true}));
execFileSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--lib','es2022,dom','--module','commonjs','--moduleResolution','node','--skipLibCheck','--esModuleInterop','--resolveJsonModule','--jsx','react-jsx','--outDir',out,'src/components/Currency.tsx'],{cwd:ui,stdio:'pipe'});
process.env.NODE_PATH=path.join(ui,'node_modules');require('node:module').Module._initPaths();
const {parseMoney,sanitizeMoneyInput,canonicalMoneyText}=require(path.join(out,'components/Currency.js'));
// Ondalık ayraç ne yazılırsa yazılsın kayıp olmamalı: "250.25" 25025 kuruştur,
// asla 2502500 değil. Bkz. resepsiyon tahsilat hatası.
test('dot and comma both work as decimal separators',()=>{
  for(const format of ['tr','en']){
    assert.equal(parseMoney('250.25',format),25025);
    assert.equal(parseMoney('250,25',format),25025);
    assert.equal(parseMoney('250',format),25000);
    assert.equal(parseMoney('0,5',format),50);
  }
});
test('thousands separators are stripped in both locales',()=>{
  assert.equal(parseMoney('1.234,56','tr'),123456);
  assert.equal(parseMoney('1,234.56','tr'),123456);
  assert.equal(parseMoney('1,234.56','en'),123456);
  assert.equal(parseMoney('1.234.567','tr'),123456700);
  assert.equal(parseMoney('1,234','en'),123400);
  assert.equal(parseMoney('1.234','tr'),123400);
});
test('invalid input is rejected, never silently inflated',()=>{
  assert.equal(parseMoney('', 'tr'),null);
  assert.equal(parseMoney('abc','tr'),null);
  assert.equal(parseMoney('-5','tr'),null);
  const clean=sanitizeMoneyInput('250.25','tr');
  assert.equal(parseMoney(clean,'tr'),25025);
});
test('strict typing never produces broken amounts',()=>{
  // "123.,231" gibi giriş yazılamaz: ikinci ayraç düşer, kuruş 2 basamakla sınırlanır.
  assert.equal(sanitizeMoneyInput('123.,231','tr'),'123,23');
  assert.equal(parseMoney(sanitizeMoneyInput('123.,231','tr'),'tr'),12323);
  // "...,...." tek ayraca iner ve sıfırlanır ("0," → 0 kuruş, hata yok).
  assert.equal(sanitizeMoneyInput('...,...','tr'),'0,');
  assert.equal(parseMoney(sanitizeMoneyInput('...,...','tr'),'tr'),0);
  assert.equal(sanitizeMoneyInput('250.25','tr'),'250,25');
  // Baştaki ayraç sıfırlanır: çıplak "," / "." yazılamaz.
  assert.equal(sanitizeMoneyInput(',','tr'),'0,');
  assert.equal(sanitizeMoneyInput('.','tr'),'0,');
  assert.equal(sanitizeMoneyInput(',','en'),'0.');
  assert.equal(parseMoney(sanitizeMoneyInput(',25','tr'),'tr'),25);
  // Yazarken kuruş 2 basamakla sınırlanır ("1.234" → "1,23"); binlikli
  // değerler yapıştırma akışıyla girilir (aşağıdaki teste bakın).
  assert.equal(sanitizeMoneyInput('1.234','tr'),'1,23');
});
test('pasted thousands normalize to canonical form',()=>{
  assert.equal(canonicalMoneyText(25025,'tr'),'250,25');
  assert.equal(canonicalMoneyText(25000,'tr'),'250');
  assert.equal(canonicalMoneyText(123456,'en'),'1234.56');
  // Yapıştırma akışı: akıllı çözümleme + kurallı biçim.
  assert.equal(canonicalMoneyText(parseMoney('1.234,56','tr'),'tr'),'1234,56');
  assert.equal(canonicalMoneyText(parseMoney('1,234.56','tr'),'tr'),'1234,56');
});
