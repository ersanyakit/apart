import assert from 'node:assert/strict';
import {chromium} from '../../ui/node_modules/playwright/index.mjs';
const browser=await chromium.launch({args:['--no-sandbox','--no-zygote','--single-process']});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const width of [1440,390,320]){
 await page.setViewportSize({width,height:900});
 await page.goto('http://localhost:3000',{waitUntil:'networkidle'});
 const trigger=page.getByRole('button',{name:'Dil seçin: Türkçe',exact:true});
 await trigger.click();
 const box=page.getByRole('combobox');await box.fill('deutsch');
 await page.waitForTimeout(250);
 await page.screenshot({path:`output/i18n/language-menu-${width}.png`});
 const list=page.getByRole('listbox');const bounds=await list.boundingBox();
 assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width,`menu overflow ${width}`);
 assert.equal(await page.getByRole('option').count(),1);
 await box.press('Escape');await trigger.click();await box.fill('asdfxyz');
 await page.getByRole('status').filter({hasText:'Aramanıza uygun dil bulunamadı.'}).waitFor();
 await box.press('Escape');
 assert.equal(await trigger.getAttribute('aria-expanded'),'false');
 assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
}
await page.setViewportSize({width:1440,height:1000});
await page.getByRole('button',{name:'Dil seçin: Türkçe',exact:true}).click();
await page.getByRole('combobox').fill('English');await page.getByRole('combobox').press('Enter');
await page.getByRole('button',{name:'Choose language: English',exact:true}).waitFor();
await page.reload({waitUntil:'networkidle'});
assert.equal(await page.locator('html').getAttribute('lang'),'en');
for(const path of ['/pricing','/screenshots','/contact']){
 await page.goto('http://localhost:3000'+path,{waitUntil:'networkidle'});
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 console.log(path,await page.title());
}
assert.deepEqual(errors,[]);console.log('Language menu: desktop/mobile bounds, search, empty state, keyboard, persistence and navigation passed');
await browser.close();
