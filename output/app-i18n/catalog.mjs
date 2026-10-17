import ts from '../../ui/node_modules/typescript/lib/typescript.js';import fs from 'node:fs';import path from 'node:path';
const sources=new Set(),locations={};
function scan(file){const s=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(n){if(ts.isCallExpression(n)&&['_uiText'].includes(n.expression.getText(ast))&&ts.isStringLiteral(n.arguments[0])){const key=n.arguments[0].text;sources.add(key);(locations[key]??=[]).push({file,line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1});}ts.forEachChild(n,visit);}visit(ast);}
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory()){if(e.name!=='landing')walk(f);}else if(f.endsWith('.tsx'))scan(f);}}walk('ui/src/components');scan('ui/src/App.tsx');
const contracts=JSON.parse(fs.readFileSync('ui/src/lib/contracts.generated.json','utf8'));
for(const value of Object.values(contracts.errors))if(typeof value==='string')sources.add(value);
for(const item of [...contracts.reports,...contracts.report_groups,...contracts.report_record_kinds]){
 for(const field of ['name','description','hint','category'])if(typeof item[field]==='string')sources.add(item[field]);
}
function metadata(file,names){const content=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true);function visit(n){if(ts.isVariableDeclaration(n)&&names.includes(n.name.getText(ast))&&n.initializer){function values(v){if(ts.isPropertyAssignment(v)){values(v.initializer);return;}if(ts.isStringLiteral(v)&&/[\p{L}]/u.test(v.text))sources.add(v.text);else ts.forEachChild(v,values);}values(n.initializer);}ts.forEachChild(n,visit);}visit(ast);}
metadata('ui/src/lib/i18n/messages.ts',['tr']);
metadata('ui/src/components/PageHeader.tsx',['PAGE_HEADERS']);
metadata('ui/src/lib/api.ts',['unitKinds']);
metadata('ui/src/components/reports/model.ts',['labels','categoryLabels']);
metadata('ui/src/components/kanban/model.ts',['COLUMNS']);
const keys=[...sources].sort((a,b)=>a.localeCompare(b,'tr'));
fs.writeFileSync('ui/src/lib/i18n/application-source.json',JSON.stringify(Object.fromEntries(keys.map(k=>[k,k])),null,2)+'\n');
fs.writeFileSync('output/app-i18n/source-locations.json',JSON.stringify(locations,null,2)+'\n');
const core=JSON.parse(fs.readFileSync('ui/src/lib/i18n/application-core.json','utf8'));
const fold=s=>s.trim().replace(/\s+/g,' ').toLocaleLowerCase('tr');
const coverage={};
for(const locale of Object.keys(core)){const marketing=JSON.parse(fs.readFileSync(`ui/src/lib/i18n/marketing/${locale}.json`,'utf8'));const available=new Set([...Object.keys(marketing),...Object.keys(core[locale])].map(fold));const missing=keys.filter(k=>!available.has(fold(k)));coverage[locale]={total:keys.length,translated:keys.length-missing.length,missing};}
fs.writeFileSync('output/app-i18n/coverage.json',JSON.stringify(coverage,null,2)+'\n');
console.log('Source catalog',keys.length,'messages. English translated',coverage.en.translated,'missing',coverage.en.missing.length);
