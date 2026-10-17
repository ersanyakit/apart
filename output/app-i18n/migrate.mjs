import ts from '../../ui/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
import path from 'node:path';
const attrs=new Set(['label','title','placeholder','aria-label','alt','description','caption','emptyText','emptyLabel','closeLabel','hint','eyebrow','subtitle','text','message','detail','tooltip']);
const calls=new Set(['setError','setMessage','notify','confirmDialog','alert','setHint']);
const sources=new Set(), report=[];
const ignore=new Set(['I18n.tsx','UserPreferences.tsx','NavigationIcon.tsx','RoomGradient.tsx','Theme.tsx','FontSize.tsx']);
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==='landing'?[]:files(path.join(dir,e.name))):e.name.endsWith('.tsx')?[path.join(dir,e.name)]:[]);}
for(const file of ['ui/src/App.tsx',...files('ui/src/components')]){
 if(ignore.has(path.basename(file)))continue;
 let content=fs.readFileSync(file,'utf8');if(content.includes('m: _uiText'))continue;
 const ast=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[],used=new Set();
 function scope(n){for(let p=n.parent;p;p=p.parent){if(ts.isFunctionDeclaration(p)&&p.parent===ast&&p.name&&/^[A-Z]/.test(p.name.text)&&p.body)return p;if((ts.isArrowFunction(p)||ts.isFunctionExpression(p))&&ts.isBlock(p.body)){let q=p.parent;while(q&&(ts.isCallExpression(q)||ts.isParenthesizedExpression(q)))q=q.parent;if(q&&ts.isVariableDeclaration(q)&&ts.isIdentifier(q.name)&&/^[A-Z]/.test(q.name.text)&&q.parent?.parent?.parent===ast)return p;}}}
 function uiContext(n){const p=n.parent;if(ts.isJsxAttribute(p))return attrs.has(p.name.getText(ast));if(ts.isPropertyAssignment(p))return attrs.has(p.name.getText(ast).replace(/["']/g,''));if(ts.isCallExpression(p))return calls.has(p.expression.getText(ast).split('.').pop())&&p.arguments[0]===n;if(ts.isReturnStatement(p)&&/[çğıöşüÇĞİÖŞÜ]/.test(n.getText(ast)))return true;for(let a=p;a;a=a.parent){if(ts.isJsxAttribute(a))return attrs.has(a.name.getText(ast));if(ts.isJsxExpression(a))return true;if(ts.isCallExpression(a)||ts.isPropertyAssignment(a)||ts.isStatement(a))break;}return false;}
 function add(n,text,replacement){if(!/[\p{L}]/u.test(text)||/^INTERACTIVEOTEL$/i.test(text.trim()))return false;const s=scope(n);if(!s)return false;sources.add(text);used.add(s);edits.push([n.getStart(ast),n.end,replacement]);return true;}
 function visit(n){
  if(ts.isJsxText(n)){
   const text=n.text.trim().replace(/\s+/g,' ');const s=scope(n);
   if(s&&text&&/\p{L}/u.test(text)&&!/^INTERACTIVEOTEL$/i.test(text)){
    sources.add(text);used.add(s);const prefix=/^[ \t]/.test(n.text)?' ':'';const suffix=/[ \t]$/.test(n.text)?' ':'';
    edits.push([n.pos,n.end,`${prefix}{_uiText(${JSON.stringify(text)})}${suffix}`]);
   }return;
  }
  if((ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))&&uiContext(n)){
   const text=n.text;if(!text.trim())return;
   // Values passed through API payloads, comparisons, CSS and identifiers are excluded.
   if(n.parent&&ts.isBinaryExpression(n.parent)&&['===','!==','==','!='].includes(n.parent.operatorToken.getText(ast)))return;
   add(n,text,(ts.isJsxAttribute(n.parent)?'{':'')+`_uiText(${JSON.stringify(text)})`+(ts.isJsxAttribute(n.parent)?'}':''));return;
  }
  if(ts.isTemplateExpression(n)&&uiContext(n)){
   let text=n.head.text;const params=[];
   n.templateSpans.forEach((span,i)=>{const key=`value${i+1}`;text+=`{${key}}`+span.literal.text;params.push(`${key}: String(${span.expression.getText(ast)})`);});
   if(add(n,text,`_uiText(${JSON.stringify(text)}, {${params.join(', ')}})`))return;
  }
  ts.forEachChild(n,visit);
 }
 visit(ast);
 if(!edits.length)continue;
 for(const node of used)edits.push([node.body.getStart(ast)+1,node.body.getStart(ast)+1,'\n  const {m: _uiText, locale: _uiLocale} = useI18n();\n']);
 // Existing named useI18n import is reused. Injection follows client directives.
 const hasImport=ast.statements.some(n=>ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)&&n.importClause.namedBindings.elements.some(e=>e.name.text==='useI18n'));
 if(!hasImport){const rel=path.relative(path.dirname(file),'ui/src/components/I18n').replaceAll('\\','/');const pos=ast.statements[0]&&ts.isExpressionStatement(ast.statements[0])&&ts.isStringLiteral(ast.statements[0].expression)?ast.statements[0].end:0;edits.push([pos,pos,`\nimport { useI18n } from ${JSON.stringify(rel.startsWith('.')?rel:'./'+rel)};\n`]);}
 for(const [a,b,value]of edits.sort((a,b)=>b[0]-a[0]||b[1]-a[1]))content=content.slice(0,a)+value+content.slice(b);
 fs.writeFileSync(file,content);report.push({file,edits:edits.length,components:used.size});
}
fs.writeFileSync('output/app-i18n/migration.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('ui/src/lib/i18n/application-source.json',JSON.stringify(Object.fromEntries([...sources].sort().map(s=>[s,s])),null,2)+'\n');
console.log({files:report.length,messages:sources.size});
