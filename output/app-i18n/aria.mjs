import ts from '../../ui/node_modules/typescript/lib/typescript.js';import fs from 'node:fs';
for(const {file}of JSON.parse(fs.readFileSync('output/app-i18n/migration.json','utf8'))){let s=fs.readFileSync(file,'utf8');const ast=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
function scope(n){for(let p=n;p;p=p.parent)if(ts.isFunctionLike(p)&&p.body?.getText(ast).match(/const \{m: _uiText/))return true;return false;}
function visit(n){if(ts.isJsxAttribute(n)&&n.name.getText(ast)==='ariaLabel'&&n.initializer&&scope(n)){
const value=ts.isJsxExpression(n.initializer)?n.initializer.expression:n.initializer;
if(value&&ts.isStringLiteral(value))edits.push([n.initializer.getStart(ast),n.initializer.end,`{_uiText(${JSON.stringify(value.text)})}`]);
if(value&&ts.isTemplateExpression(value)){let key=value.head.text;const params=[];value.templateSpans.forEach((span,i)=>{key+=`{value${i+1}}`+span.literal.text;params.push(`value${i+1}:String(${span.expression.getText(ast)})`);});edits.push([n.initializer.getStart(ast),n.initializer.end,`{_uiText(${JSON.stringify(key)},{${params.join(',')}})}`]);}}
ts.forEachChild(n,visit);}visit(ast);for(const[a,b,text]of edits.sort((a,b)=>b[0]-a[0]))s=s.slice(0,a)+text+s.slice(b);fs.writeFileSync(file,s);}
