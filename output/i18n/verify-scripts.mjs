import assert from 'node:assert/strict';
import {chromium} from '../../ui/node_modules/playwright/index.mjs';
const browser=await chromium.launch({args:['--no-sandbox','--no-zygote','--single-process']});
const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
try{for(const locale of ['ne','dz','te']){
 await context.addCookies([{name:'interactiveotel_locale',value:locale,url:'http://localhost:3000'}]);
 await page.goto('http://localhost:3000',{waitUntil:'networkidle',timeout:90000});
 assert.equal(await page.locator('html').getAttribute('lang'),locale);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,locale);
 await page.screenshot({path:`output/i18n/hero-${locale}-390.png`});
 console.log(locale,await page.locator('h1').innerText());
}}finally{await browser.close();}
