import ts from '../../ui/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
const dir='ui/src/components/landing/';const sources=new Set();
const add=s=>{if(s.trim()&&!/^([\d\s.®©·↗↑]+|interactiveotel|Interactiveotel|i\.)$/i.test(s.trim()))sources.add(s.trim());};
const attrs=new Set(['alt','aria-label','title','placeholder','eyebrow','description']);
for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.tsx'))){
 const path=dir+file,source=fs.readFileSync(path,'utf8'),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const edits=[];
 function visit(node){
  if(ts.isJsxText(node)){const text=node.text.trim().replace(/\s+/g,' ');if(text&&!/^([\d\s.®©·↗↑]+|interactiveotel|Interactiveotel|i\.|© 2026 Interactiveotel)$/i.test(text)){add(text);edits.push([node.pos,node.end,`{m(${JSON.stringify(text)})}`]);}}
  if(ts.isStringLiteral(node)){
   if(/[çğıöşüÇĞİÖŞÜ]/.test(node.text)||['Otel','Apart','Hostel','Rezervasyon','Raporlama','Tesis yönetimi'].includes(node.text))add(node.text);
   if(ts.isJsxAttribute(node.parent)&&attrs.has(node.parent.name.text)&&node.text){add(node.text);edits.push([node.getStart(ast),node.end,`{m(${JSON.stringify(node.text)})}`]);}
   if(ts.isPropertyAssignment(node.parent)&&['title','label','desc','description','text','alt','category'].includes(node.parent.name.getText(ast)))add(node.text);
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);
 if(!['PageIntro.tsx','SectionArtwork.tsx'].includes(file)){
  let changed=source;for(const [a,b,value] of edits.sort((a,b)=>b[0]-a[0]))changed=changed.slice(0,a)+value+changed.slice(b);
  if(!changed.startsWith('"use client"'))changed='"use client";\n'+changed;
  changed=changed.replace(/(export function \w+\([\s\S]*?\)\s*\{)/, '$1\n const { m } = useMarketingI18n();');
  changed=changed.replace(/("use client";)/,'$1\nimport { useMarketingI18n } from "./MarketingI18n";');
  fs.writeFileSync(path,changed);
 }
}
const contracts=JSON.parse(fs.readFileSync('ui/src/lib/contracts.generated.json','utf8'));
for(const r of contracts.reports){add(r.name);add(r.description);add(r.category);}
for(const s of ['Dil seçin','Dil değiştiriliyor…','Dil yüklenemedi. Yeniden deneyin.','{reports} rapor · {categories} kategori','{title} ekranını büyüt','{title}: örnek Mavi Avlu Otel kayıtlarıyla gerçek uygulama ekranı','E-posta uygulamanız açılmadıysa doğrudan {email} adresine yazabilirsiniz.','Ad soyad: {name}\nE-posta: {email}\nTesis: {property}\n\n{message}','Görüntüler Türkçe arayüzden alınmıştır.','Tümü'])add(s);
fs.writeFileSync('ui/src/lib/i18n/marketing/tr.json',JSON.stringify(Object.fromEntries([...sources].sort().map(s=>[s,s])),null,2)+'\n');
console.log(sources.size+' marketing strings extracted');
