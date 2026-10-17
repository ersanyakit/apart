import ts from '../../ui/node_modules/typescript/lib/typescript.js';import fs from 'node:fs';
const files=JSON.parse(fs.readFileSync('output/app-i18n/migration.json','utf8')).map(x=>x.file);
for(const file of files){let s=fs.readFileSync(file,'utf8');const ast=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
function inScope(n){for(let p=n;p;p=p.parent)if((ts.isFunctionDeclaration(p)||ts.isArrowFunction(p)||ts.isFunctionExpression(p))&&p.body?.getText(ast).match(/const \{[^\n]*locale:\s*_uiLocale/))return true;return false;}
function visit(n){if(!inScope(n)){ts.forEachChild(n,visit);return;}
if(ts.isStringLiteral(n)&&['tr-TR','tr'].includes(n.text)&&(ts.isCallExpression(n.parent)||ts.isNewExpression(n.parent))&&/(?:toLocale|Intl\.)/.test(n.parent.expression.getText(ast)))edits.push([n.getStart(ast),n.end,'_uiLocale']);
if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&['boardDate','display'].includes(n.expression.text)){
 const args=n.arguments.map(x=>x.getText(ast));if(n.expression.text==='boardDate'&&args.length===1)edits.push([n.arguments.end,n.arguments.end,', _uiLocale']);
 if(n.expression.text==='display'&&args.length<4){const fill=args.length===1?", '', 'TRY', _uiLocale":args.length===2?", 'TRY', _uiLocale":', _uiLocale';edits.push([n.arguments.end,n.arguments.end,fill]);}
}
ts.forEachChild(n,visit);}visit(ast);for(const[a,b,t]of edits.sort((a,b)=>b[0]-a[0]))s=s.slice(0,a)+t+s.slice(b);fs.writeFileSync(file,s);}
