import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ui=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.dirname(ui), base=path.join(ui,'src/lib/i18n');
const messages=new Map();
const presentation=new Set(['label','title','description','hint','placeholder','caption','emptyText','emptyLabel','aria-label','alt','subtitle','tooltip','message','name','backLabel','sub','helpText','submitLabel','cancelLabel','confirmLabel','searchPlaceholder']);
const metadata=new Set(['steps','descriptions','profiles','roles','names','labels','categoryLabels','sourceOptions','paymentOptions','PAGE_HEADERS','COLUMNS','unitKinds','CUSTOMER_DIRECTORY','auditActions','auditEntities','roleLabels','templates','kinds','categories']);
function add(text,file,line,force=false){
 if(!text||['use client','use server','use strict'].includes(text)||!/[\p{L}]/u.test(text)||(!force&&/^[a-z0-9_.-]+$/.test(text)))return;
 const locations=messages.get(text)||[];
 if(!locations.some(p=>p.file===file&&p.line===line))locations.push({file,line});
 messages.set(text,locations);
}
function files(dir,extensions){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 const file=path.join(dir,e.name);
 return e.isDirectory()?files(file,extensions):extensions.some(ext=>file.endsWith(ext))?[file]:[];
});}
function human(text){return /[çğıöşüÇĞİÖŞÜ]|\p{L}[ ,;:…]\p{L}/u.test(text)&&!/[\n\r]|https?:|var\(--|SELECT |INSERT |UPDATE |DELETE |CREATE |ALTER |JOIN /i.test(text)&&!/(?:^|\s)(?:flex|grid|rounded-|text-|bg-|border-|gap-|items-|justify-|w-|h-|px-|py-|mt-|mb-|fixed|absolute|overflow-|space-|shadow-|font-|min-|max-|hover:|sm:|md:|lg:|uni-|divide-|leading-|tracking-|object-|pointer-|whitespace-|break-|outline-|ring-|select-|transition-|duration-|ease-)/.test(text);}
// Follow the real application graph. Unused design prototypes are not screens
// reachable through the application's sidebar, and do not belong to its audit.
const reachable=new Set();
function visitModule(file){
 if(reachable.has(file))return;
 reachable.add(file);
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 function dependency(specifier){
  if(!specifier.startsWith('.'))return;
  const stem=path.resolve(path.dirname(file),specifier);
  const target=[stem,stem+'.tsx',stem+'.ts',path.join(stem,'index.tsx'),path.join(stem,'index.ts')].find(candidate=>fs.existsSync(candidate)&&fs.statSync(candidate).isFile()&&/\.tsx?$/.test(candidate));
  if(target)visitModule(target);
 }
 function visit(n){
  if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier))dependency(n.moduleSpecifier.text);
  if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0]))dependency(n.arguments[0].text);
  ts.forEachChild(n,visit);
 }
 visit(ast);
}
visitModule(path.join(ui,'src/App.tsx'));
for(const file of files(path.join(ui,'src'),['.ts','.tsx'])){
 if(!reachable.has(file)||file.includes('/lib/i18n/')||file.includes('/landing/')||file.endsWith('.d.ts')||file.endsWith('/lib/countries.ts'))continue;
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),relative=path.relative(repo,file);
 const record=(n,text,force=false)=>add(text,relative,ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,force);
 function literals(n){if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))record(n,n.text);else ts.forEachChild(n,literals);}
 function visit(n){
  if(file.endsWith('/components/Currency.tsx')&&ts.isVariableDeclaration(n)&&n.name.getText(ast)==='CURRENCIES')return;
  if(file.endsWith('/lib/audit-presentation.ts')&&ts.isVariableDeclaration(n)&&n.name.getText(ast)==='fields'&&n.initializer)literals(n.initializer);
  if(ts.isCallExpression(n)&&['_uiText','m','translate'].includes(n.expression.getText(ast))&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0]))record(n.arguments[0],n.arguments[0].text,true);
  if(ts.isPropertyAssignment(n)&&presentation.has(n.name.getText(ast).replace(/^['"]|['"]$/g,''))&&(ts.isStringLiteral(n.initializer)||ts.isNoSubstitutionTemplateLiteral(n.initializer)))record(n.initializer,n.initializer.text);
  if(ts.isVariableDeclaration(n)&&metadata.has(n.name.getText(ast))&&n.initializer)literals(n.initializer);
  // Domain validation and formatting helpers can return visible messages too.
  if((ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))&&human(n.text))record(n,n.text);
  if(ts.isJsxText(n)&&n.text.trim())record(n,n.text.trim().replace(/\s+/g,' '),true);
  ts.forEachChild(n,visit);
 }
 visit(ast);
}
const contracts=JSON.parse(fs.readFileSync(path.join(ui,'src/lib/contracts.generated.json'),'utf8'));
for(const text of Object.values(contracts.errors))add(text,'ui/src/lib/contracts.generated.json',1);
for(const item of [...contracts.reports,...contracts.report_groups,...contracts.report_record_kinds])for(const key of ['name','description','hint','category'])add(item[key],'ui/src/lib/contracts.generated.json',1);
const builtins={};
// Legacy semantic keys also have canonical source messages. Preserve their
// existing translations when extending the application catalogs to all locales.
const semanticFile=path.join(base,'messages.ts'),semanticText=fs.readFileSync(semanticFile,'utf8');
const semanticAst=ts.createSourceFile(semanticFile,semanticText,ts.ScriptTarget.Latest,true);
const semanticDictionaries={};
function stringProperties(object){return Object.fromEntries(object.properties.flatMap(property=>ts.isPropertyAssignment(property)&&ts.isStringLiteral(property.initializer)?[[property.name.getText(semanticAst).replace(/^['"]|['"]$/g,''),property.initializer.text]]:[]));}
function semanticVisit(n){
 if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer&&ts.isObjectLiteralExpression(n.initializer)){
  if(n.name.text==='tr')semanticDictionaries.tr=stringProperties(n.initializer);
  if(n.name.text==='messages')for(const property of n.initializer.properties){
   if(ts.isPropertyAssignment(property)&&ts.isObjectLiteralExpression(property.initializer))semanticDictionaries[property.name.getText(semanticAst).replace(/^['"]|['"]$/g,'')]=stringProperties(property.initializer);
  }
 }
 ts.forEachChild(n,semanticVisit);
}
semanticVisit(semanticAst);
const semanticSource=Object.fromEntries(Object.entries(semanticDictionaries.tr).map(([key,text])=>{
 add(text,'ui/src/lib/i18n/messages.ts',1,true);
 return [text,Object.fromEntries(Object.entries(semanticDictionaries).flatMap(([locale,dictionary])=>dictionary[key]?[[locale.toUpperCase(),dictionary[key]]]:[]))];
}));
fs.writeFileSync(path.join(base,'semantic-source.json'),JSON.stringify(semanticSource,null,2)+'\n');
function localized(value,file){if(typeof value==='string'){add(value,file,1,true);return;}if(!value||!value.TR)return;add(value.TR,file,1);builtins[value.TR]=value;}
const catalog=JSON.parse(fs.readFileSync(path.join(repo,'internal/domain/catalog/defaults.json'),'utf8'));
for(const category of catalog.categories){localized(category.label,'internal/domain/catalog/defaults.json');for(const group of category.groups){localized(group.label,'internal/domain/catalog/defaults.json');for(const entry of group.entries){localized(entry.label,'internal/domain/catalog/defaults.json');localized(entry.description,'internal/domain/catalog/defaults.json');}}}
for(const item of [...contracts.bed_presets,...Object.values(contracts.bed_types),...contracts.floor_presets]){if(typeof item==='string'){localized(item,'ui/src/lib/contracts.generated.json');continue;}localized(item.label,'ui/src/lib/contracts.generated.json');localized(item.description,'ui/src/lib/contracts.generated.json');if(typeof item.label==='string'&&item.name_en)builtins[item.label]={TR:item.label,EN:item.name_en};}
for(const file of files(path.join(repo,'internal/domain'),['.go']).filter(f=>!f.endsWith('_test.go'))){
 const source=fs.readFileSync(file,'utf8');
 for(const match of source.matchAll(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|`[\s\S]*?`|"(?:[^"\\\n]|\\.)*"/g)){
  if(!match[0].startsWith('"'))continue;
  let value;try{value=JSON.parse(match[0]);}catch{continue;}
  if(human(value))add(value,path.relative(repo,file),source.slice(0,match.index).split('\n').length);
 }
}
// Existing explicit m() keys remain registered even if they do not contain spaces.
const sorted=[...messages.keys()].sort((a,b)=>a.localeCompare(b,'tr'));
fs.writeFileSync(path.join(base,'application-source.json'),JSON.stringify(Object.fromEntries(sorted.map(key=>[key,key])),null,2)+'\n');
fs.writeFileSync(path.join(base,'catalog-source.json'),JSON.stringify(builtins,null,2)+'\n');
const output=path.join(repo,'output/app-i18n');fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'source-locations.json'),JSON.stringify(Object.fromEntries(sorted.map(key=>[key,messages.get(key)])),null,2)+'\n');
console.log(`Extracted ${sorted.length} messages from UI, metadata, catalog and domain messages.`);
