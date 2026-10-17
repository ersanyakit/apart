import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const ui=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=path.join(ui,'src/lib/i18n');
const source=JSON.parse(await fs.readFile(path.join(base,'application-source.json'),'utf8'));
const core=JSON.parse(await fs.readFile(path.join(base,'application-core.json'),'utf8'));
const plurals=JSON.parse(await fs.readFile(path.join(base,'application-plurals.json'),'utf8'));
const fold=text=>text.trim().replace(/\s+/g,' ').toLocaleLowerCase('tr');
const audit={complete:true,sourceMessages:Object.keys(source).length,languages:{}};
for(const locale of Object.keys(core)){
 const marketing=JSON.parse(await fs.readFile(path.join(base,'marketing',`${locale}.json`),'utf8'));
 const resource=JSON.parse(await fs.readFile(path.join(base,'application',`${locale}.json`),'utf8'));
 const keys=new Set([...Object.keys(marketing),...Object.keys(resource),...Object.keys(plurals[locale])].map(fold));
 const missing=Object.keys(source).filter(key=>!keys.has(fold(key)));
 audit.languages[locale]={translated:audit.sourceMessages-missing.length,missingCount:missing.length,missing};
 if(missing.length)audit.complete=false;
}
const output=path.resolve(ui,'../output/app-i18n');await fs.mkdir(output,{recursive:true});
await fs.writeFile(path.join(output,'coverage.json'),JSON.stringify(audit,null,2)+'\n');
console.table(Object.entries(audit.languages).map(([locale,value])=>({locale,translated:value.translated,missing:value.missingCount})));
console.log(audit.complete?'Complete: all catalogs cover the registered UI messages.':'INCOMPLETE: translation fallback is not counted as a completed translation.');
if(!audit.complete&&process.argv.includes('--strict'))process.exitCode=1;
