import ts from '../../ui/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
import path from 'node:path';
const attributes=new Set(['label','title','placeholder','aria-label','alt','description','caption','emptyText','emptyLabel','closeLabel','hint','eyebrow','subtitle','text','message','detail','tooltip','backLabel','sub','helpText','submitLabel','cancelLabel','confirmLabel','searchPlaceholder']);
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==='landing'?[]:files(path.join(dir,e.name))):e.name.endsWith('.tsx')?[path.join(dir,e.name)]:[]);}
let count=0;
for(const file of ['ui/src/App.tsx',...files('ui/src/components')]){
 const source=fs.readFileSync(file,'utf8');if(!source.includes('_uiText'))continue;
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
 function component(n){for(let p=n.parent;p;p=p.parent){if(ts.isFunctionDeclaration(p)&&p.parent===ast)return p.body?.getText(ast).includes('m: _uiText')?p:undefined;}return undefined;}
 function literal(n){
  if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)){
   if(n.text.trim()&&/\p{L}/u.test(n.text)&&n.text!=='INTERACTIVEOTEL')edits.push([n.getStart(ast),n.end,`_uiText(${JSON.stringify(n.text)})`]);
  }else if(ts.isConditionalExpression(n)){literal(n.whenTrue);literal(n.whenFalse);}
  else if(ts.isTemplateExpression(n)){
   let key=n.head.text;const params=[];
   n.templateSpans.forEach((span,i)=>{key+=`{value${i+1}}`+span.literal.text;params.push(`value${i+1}: String(${span.expression.getText(ast)})`);});
   if(/[\p{L}]/u.test(key.replace(/\{value\d+\}/g,'')))edits.push([n.getStart(ast),n.end,`_uiText(${JSON.stringify(key)}, {${params.join(', ')}})`]);
  }
 }
 function visit(n){
  if(ts.isJsxExpression(n)&&n.expression&&component(n)){
   if(!ts.isJsxAttribute(n.parent)||attributes.has(n.parent.name.getText(ast)))literal(n.expression);
  }
  if(ts.isPropertyAssignment(n)&&attributes.has(n.name.getText(ast).replace(/['"]/g,''))&&component(n))literal(n.initializer);
  ts.forEachChild(n,visit);
 }
 visit(ast);
 const unique=[...new Map(edits.map(e=>[e[0],e])).values()];
 if(unique.length){let result=source;for(const [a,b,text] of unique.sort((a,b)=>b[0]-a[0]))result=result.slice(0,a)+text+result.slice(b);fs.writeFileSync(file,result);count+=unique.length;}
}
console.log('Connected remaining literal UI expressions:',count);
