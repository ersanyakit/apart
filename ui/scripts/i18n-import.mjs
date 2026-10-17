import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/lib/i18n');
const [locale,input]=process.argv.slice(2);
const core=JSON.parse(await fs.readFile(path.join(base,'application-core.json'),'utf8'));
if(!Object.hasOwn(core,locale)||!input)throw new Error('Usage: node scripts/i18n-import.mjs <locale> <translated-json>');
const source=JSON.parse(await fs.readFile(path.join(base,'application-source.json'),'utf8'));
const data=JSON.parse(await fs.readFile(input,'utf8'));
const tokens=text=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join('|');
const problems=[];
for(const [key,value]of Object.entries(data)){
  if(!Object.hasOwn(source,key)&&!Object.hasOwn(core[locale],key))problems.push(`Unknown key: ${key}`);
  if(typeof value!=='string'||!value.trim())problems.push(`Empty or non-string value: ${key}`);
  else if(tokens(key)!==tokens(value))problems.push(`Interpolation changed: ${key}`);
}
if(problems.length)throw new Error(problems.join('\n'));
const file=path.join(base,'application',`${locale}.json`),previous=JSON.parse(await fs.readFile(file,'utf8'));
await fs.writeFile(file,JSON.stringify({...previous,...data},null,2)+'\n');
console.log(`Imported ${Object.keys(data).length} messages for ${locale}; run the coverage audit before declaring completion.`);
