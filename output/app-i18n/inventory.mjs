import ts from '../../ui/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
import path from 'node:path';
const sourceMap=new Map();
const attr=new Set(['label','title','placeholder','aria-label','alt','description','caption','emptyText','emptyLabel','closeLabel','error','hint','eyebrow']);
function add(text,file,line,kind){text=text.trim().replace(/\s+/g,' ');if(!text||!/[A-Za-zÇĞİÖŞÜçğıöşü]/u.test(text)||/^([\w-]+[./:][\w./:-]+|https?:|[A-Z_]+)$/.test(text))return;const record=sourceMap.get(text)||[];record.push({file,line,kind});sourceMap.set(text,record);}
function walk(dir){for(const file of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,file.name);if(file.isDirectory()){if(!['landing','i18n'].includes(file.name))walk(f);continue;}if(!/\.(tsx|ts)$/.test(f)||/generated|\.d\.ts$|phone\/|countries\.ts/.test(f))continue;const content=fs.readFileSync(f,'utf8');const ast=ts.createSourceFile(f,content,ts.ScriptTarget.Latest,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);function visit(n){const line=ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1;if(ts.isJsxText(n))add(n.text,f,line,'jsx');if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)){const p=n.parent;const prop=ts.isJsxAttribute(p)?p.name.getText(ast):ts.isPropertyAssignment(p)?p.name.getText(ast).replace(/["']/g,''):'';if(attr.has(prop)||/[çğıöşüÇĞİÖŞÜ]/.test(n.text))add(n.text,f,line,prop||'literal');}if(ts.isTemplateExpression(n)&&(/[çğıöşüÇĞİÖŞÜ]/.test(n.getText(ast))||ts.isJsxAttribute(n.parent?.parent))){let text=n.head.text;n.templateSpans.forEach((s,i)=>text+=`{value${i+1}}`+s.literal.text);add(text,f,line,'template');}ts.forEachChild(n,visit);}visit(ast);}}
walk('ui/src/components');walk('ui/src/lib');const app='ui/src/App.tsx';// App is included through a temporary scan directory-free pass below.
const sources=Object.fromEntries([...sourceMap].sort(([a],[b])=>a.localeCompare(b,'tr')));
fs.writeFileSync('output/app-i18n/inventory.json',JSON.stringify(sources,null,2)+'\n');
console.log({strings:sourceMap.size,files:new Set([...sourceMap.values()].flat().map(x=>x.file)).size});
