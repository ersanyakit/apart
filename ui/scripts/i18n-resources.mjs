import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ui=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(ui,'src/lib/i18n');
const core=JSON.parse(await fs.readFile(path.join(base,'application-core.json'),'utf8'));
const source=JSON.parse(await fs.readFile(path.join(base,'application-source.json'),'utf8'));
const target=path.join(base,'application');
await fs.mkdir(target,{recursive:true});
for(const locale of Object.keys(core)) {
  const file=path.join(target,`${locale}.json`);
  let existing={};try{existing=JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const resource=locale==='tr'?{...source,...core.tr}:{...existing,...core[locale]};
  await fs.writeFile(file,JSON.stringify(resource,null,2)+'\n');
}
const imports=Object.keys(core).map(locale=>`  ${JSON.stringify(locale)}: () => import('./application/${locale}.json'),`).join('\n');
await fs.writeFile(path.join(base,'application-loaders.ts'),`import type { Locale } from './config';\nimport type { ApplicationDictionary } from './application';\n// Literal per-locale imports keep the full application catalog out of other bundles.\nexport const applicationLoaders: Record<Locale, () => Promise<{default:ApplicationDictionary}>> = {\n${imports}\n};\n`);
console.log(`Built ${Object.keys(core).length} language resources. Missing translations remain missing; they are never filled with Turkish or English copies.`);
