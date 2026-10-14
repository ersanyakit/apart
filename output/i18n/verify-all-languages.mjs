import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '../../ui/node_modules/playwright/index.mjs';
const dir='ui/src/lib/i18n/marketing';
const locales=JSON.parse(fs.readFileSync('ui/src/lib/contracts.generated.json')).languages.map(code=>code.toLowerCase().replace('zh-cn','zh-CN').replace('zh-tw','zh-TW'));
const browser=await chromium.launch({args:['--no-sandbox','--no-zygote','--single-process']});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage(); const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try {
 for(const locale of locales){
  const dictionary=JSON.parse(fs.readFileSync(`${dir}/${locale}.json`));
  await context.addCookies([{name:'interactiveotel_locale',value:locale,url:'http://localhost:3000'}]);
  await page.goto('http://localhost:3000',{waitUntil:'networkidle'});
  assert.equal(await page.locator('html').getAttribute('lang'),locale);
  await page.getByRole('heading',{level:1}).filter({hasText:dictionary['Az telaş.']}).waitFor();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(overflow,false,`${locale}: mobile horizontal overflow`);
  await page.locator('button[aria-haspopup="listbox"]').click();
  assert.equal(await page.getByRole('option').count(),60,`${locale}: missing menu language`);
  await page.getByRole('combobox').press('Escape');
  console.log('PASS',locale);
 }
 for(const locale of ['en','ru','ar','zh-CN','de','ne','te','dz','si','km','am']){
  const dictionary=JSON.parse(fs.readFileSync(`${dir}/${locale}.json`));
  await context.addCookies([{name:'interactiveotel_locale',value:locale,url:'http://localhost:3000'}]);
  for(const [path,key] of [['/pricing','Fiyatlar | Interactiveotel'],['/screenshots','Ekran Görüntüleri | Interactiveotel'],['/contact','İletişim | Interactiveotel']]){
   await page.goto('http://localhost:3000'+path,{waitUntil:'networkidle'});
   assert.equal(await page.title(),dictionary[key],`${locale} ${path}: metadata`);
   assert.equal(await page.locator('html').getAttribute('lang'),locale);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${locale} ${path}: overflow`);
  }
  await page.screenshot({path:`output/i18n/contact-${locale}-390.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);
 console.log('All 60 languages, menu availability, mobile layout and representative translated subpages passed.');
} finally {await browser.close();}
