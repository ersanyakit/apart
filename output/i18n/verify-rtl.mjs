import assert from 'node:assert/strict';
import {chromium} from '../../ui/node_modules/playwright/index.mjs';
const b=await chromium.launch({args:['--no-sandbox','--no-zygote','--single-process']});
const p=await b.newPage();await p.context().addCookies([{name:'interactiveotel_locale',value:'ar',domain:'localhost',path:'/'}]);
for(const width of [1440,390,320]){
 await p.setViewportSize({width,height:1000});
 for(const path of ['/','/pricing','/screenshots','/contact']){
  await p.goto('http://localhost:3000'+path,{waitUntil:'networkidle'});
  assert.equal(await p.locator('html').getAttribute('dir'),'rtl');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${path} ${width}`);
  if(path==='/'){
   const color=await p.getByRole('link',{name:'ابدأ إدارة فندقك',exact:true}).evaluate(el=>getComputedStyle(el).color);
   assert.equal(color,'rgb(255, 255, 255)');
   await p.getByRole('button',{name:'اختر اللغة: العربية',exact:true}).click();await p.waitForTimeout(200);
   const bounds=await p.getByRole('listbox').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width,`rtl menu overflow ${width}`);
   await p.screenshot({path:`output/i18n/rtl-menu-${width}.png`});
  }
 }
}
await b.close();console.log('RTL: all four public pages and dropdown fit at 1440/390/320; primary CTA text is white');
