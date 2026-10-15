import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '../../ui/node_modules/playwright/index.mjs';
const dir='ui/src/lib/i18n/marketing';
const locales=JSON.parse(fs.readFileSync('ui/src/lib/contracts.generated.json')).languages.map(code=>code.toLowerCase().replace('zh-cn','zh-CN').replace('zh-tw','zh-TW'));
const browser=await chromium.launch({args:['--no-sandbox','--no-zygote','--single-process']});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage(); const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.setDefaultTimeout(30000);
try {
 await page.goto('http://localhost:3000',{waitUntil:'networkidle',timeout:90000});
 for(const locale of locales){
  const dictionary=JSON.parse(fs.readFileSync(`${dir}/${locale}.json`));
  await page.locator('button[aria-haspopup="listbox"]').click();
  assert.equal(await page.getByRole('option').count(),60,`${locale}: missing menu language`);
  await page.locator(`[role="option"][id$="-${locale}"]`).click();
  await page.waitForFunction(code=>document.documentElement.lang===code,locale);
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(title=>document.title===title,`INTERACTIVEOTEL | ${dictionary['Tesis yönetimi']}`);
  assert.equal(await page.locator('html').getAttribute('lang'),locale);
  assert.equal(await page.locator('html').getAttribute('dir'),['ar','ur','fa','he','ps'].includes(locale)?'rtl':'ltr');
  await page.getByRole('heading',{level:1}).filter({hasText:dictionary['Az telaş.']}).waitFor();
  for(const width of [390,320]){
   await page.setViewportSize({width,height:844});
   const issues=await page.evaluate(()=>{
    const errors=[];
    if(document.documentElement.scrollWidth>innerWidth+1)errors.push('page overflow');
    for(const el of document.querySelectorAll('h1, [class*=heroContent] a')){
     const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
     if(r.left < -1 || r.right > innerWidth+1)errors.push('outside viewport: '+el.textContent);
     if(el.scrollWidth>el.clientWidth+1)errors.push('clipped text: '+el.textContent);
    }
    return errors;
   });
   assert.deepEqual(issues,[],`${locale} ${width}px: layout`);
  }
  await page.setViewportSize({width:390,height:844});
  console.log('PASS',locale);
 }
 for(const locale of ['en','ru','ar','fa','he','ps','zh-CN','de','ne','te','dz','si','km','am']){
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
