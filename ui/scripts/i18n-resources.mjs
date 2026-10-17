import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ui=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(ui,'src/lib/i18n');
const core=JSON.parse(await fs.readFile(path.join(base,'application-core.json'),'utf8'));
const source=JSON.parse(await fs.readFile(path.join(base,'application-source.json'),'utf8'));
const builtins=JSON.parse(await fs.readFile(path.join(base,'catalog-source.json'),'utf8'));
const semantic=JSON.parse(await fs.readFile(path.join(base,'semantic-source.json'),'utf8'));
const target=path.join(base,'application');
// A template containing only placeholders and punctuation has no linguistic
// content. Keeping it identical is intentional, rather than a language fallback.
const neutral=Object.fromEntries(Object.keys(source).filter(key=>!/[\p{L}]/u.test(key.replace(/\{\w+\}/g,''))).map(key=>[key,key]));
await fs.mkdir(target,{recursive:true});
for(const locale of Object.keys(core)) {
  const file=path.join(target,`${locale}.json`);
  let existing={};try{existing=JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const native=Object.fromEntries(Object.entries({...builtins,...semantic}).flatMap(([key,value])=>value[locale.toUpperCase()]?[[key,value[locale.toUpperCase()]]]:[]));
  const resource=locale==='tr'?{...source,...core.tr}:{...neutral,...native,...existing,...core[locale]};
  await fs.writeFile(file,JSON.stringify(resource,null,2)+'\n');
}
const imports=Object.keys(core).map(locale=>`  ${JSON.stringify(locale)}: () => import('./application/${locale}.json'),`).join('\n');
await fs.writeFile(path.join(base,'application-loaders.ts'),`import type { Locale } from './config';\nimport type { ApplicationDictionary } from './application';\n// Literal per-locale imports keep the full application catalog out of other bundles.\nexport const applicationLoaders: Record<Locale, () => Promise<{default:ApplicationDictionary}>> = {\n${imports}\n};\n`);
console.log(`Built ${Object.keys(core).length} language resources. Missing translations remain missing; they are never filled with Turkish or English copies.`);
