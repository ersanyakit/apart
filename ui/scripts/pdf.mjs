import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
let input='';for await (const chunk of process.stdin) input+=chunk;
const {html}=JSON.parse(input);
const executablePath=process.env.CHROME_PATH || (process.platform==='darwin'&&existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
const browser=await chromium.launch({headless:true,executablePath});
try{
 const context=await browser.newContext({javaScriptEnabled:false});
 await context.route('**/*',route=>route.abort());
 const page=await context.newPage();await page.setContent(html,{waitUntil:'load'});
 const bytes=await page.pdf({format:'A4',printBackground:true,margin:{top:'18mm',bottom:'18mm',left:'16mm',right:'16mm'},displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;font-size:9px;text-align:center;color:#718096"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
 process.stdout.write(bytes);
}finally{await browser.close()}
