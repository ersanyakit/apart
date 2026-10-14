import { chromium } from '../../ui/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const width of [1440,820,390,320]){
 await page.setViewportSize({width,height:1000});
 for(const path of ['/','/pricing','/screenshots','/contact']){
  const response=await page.goto('http://localhost:3000'+path,{waitUntil:'networkidle'});assert.equal(response.status(),200,path);
  assert.equal(await page.locator('h1').count(),1,path);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path+' overflow '+width);
  await page.locator('footer').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
  const broken=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src));assert.deepEqual(broken,[],path);
  await page.evaluate(()=>window.scrollTo(0,0));await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  if(width===1440||width===390)await page.screenshot({path:`output/marketing/${path.slice(1)||'landing'}-${width}.png`,fullPage:true});
  if(width===390){await page.getByRole('button',{name:'Menüyü aç'}).click();await page.getByRole('navigation',{name:'Mobil gezinme'}).getByRole('link',{name:'Fiyatlar',exact:true}).waitFor();await page.getByRole('button',{name:'Menüyü kapat'}).click();}
  console.log('OK',path,width);
 }
}
await page.goto('http://localhost:3000/screenshots',{waitUntil:'networkidle'});
await page.getByRole('button',{name:'Rezervasyon',exact:true}).click();assert.equal(await page.locator('article').count(),3);
const opener=page.getByRole('button',{name:'Konaklama takvimi ekranını büyüt'});await opener.click();assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').evaluate(d=>d.open),false);assert.equal(await opener.evaluate(el=>el===document.activeElement),true);
await page.getByRole('button',{name:'Tümü',exact:true}).click();assert.equal(await page.locator('article').count(),10);
assert.deepEqual(errors,[]);console.log('Gallery filters, modal, Escape, focus: OK');await browser.close();
