import ts from '../../ui/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
const path='ui/src/lib/i18n/marketing/tr.json';const values=new Set(Object.keys(JSON.parse(fs.readFileSync(path,'utf8'))));
for(const folder of ['ui/src/components/landing','ui/src/app/pricing','ui/src/app/screenshots','ui/src/app/contact'])for(const name of fs.readdirSync(folder).filter(n=>n.endsWith('.tsx'))){
 const source=ts.createSourceFile(name,fs.readFileSync(folder+'/'+name,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n){if(ts.isStringLiteral(n)){
 let ancestor=n.parent;let inArray=false;while(ancestor&&!ts.isSourceFile(ancestor)){if(ts.isArrayLiteralExpression(ancestor))inArray=true;ancestor=ancestor.parent;}
 const parent=n.parent;const prop=ts.isPropertyAssignment(parent)?parent.name.getText(source):'';
 const content=(inArray&&!['name','slug','id','image','color','href'].includes(prop))||['title','description'].includes(prop)||(ts.isCallExpression(parent)&&parent.expression.getText(source)==='m');
 if(content&&!/^([0-9]+|\.|\/|#)/.test(n.text)&&n.text.trim()&&!['Tümü'].includes(n.text)&&!n.text.includes('.avif'))values.add(n.text);
 }ts.forEachChild(n,visit);}visit(source);
}
for(const value of ['Fiyatlar','Rezervasyon & takvim','Raporlardaki veriler nereden geliyor?','Yalnızca örnek veriler gösterilir.'])values.add(value);
for(const value of ['rapor ·','kategori','E-posta uygulamanız açılmadıysa doğrudan','adresine yazabilirsiniz.'])values.delete(value);
fs.writeFileSync(path,JSON.stringify(Object.fromEntries([...values].sort().map(v=>[v,v])),null,2)+'\n');
fs.writeFileSync('output/i18n/source-index.json',JSON.stringify([...values].sort(),null,2)+'\n');
console.log(values.size);
