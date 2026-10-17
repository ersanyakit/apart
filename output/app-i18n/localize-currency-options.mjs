import ts from '../../ui/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
for(const name of ['FolioServices.tsx','AppSettingsView.tsx','reports/RecordEditor.tsx','reports/ReportsView.tsx','DocumentsView.tsx']){
 const file=`ui/src/components/${name}`;let source=fs.readFileSync(file,'utf8');
 if(!source.includes('CURRENCIES.map'))continue;
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 for(const declaration of ast.statements){
  if(!ts.isImportDeclaration(declaration))continue;
  const names=declaration.importClause?.namedBindings;
  if(!names||!ts.isNamedImports(names)||names.elements.some(e=>e.name.text==='localizedCurrencies'))continue;
  const target=names.elements.find(e=>e.name.text==='CURRENCIES');
  if(target){source=source.slice(0,target.end)+', localizedCurrencies'+source.slice(target.end);break;}
 }
 source=source.replaceAll('CURRENCIES.map','localizedCurrencies(_uiLocale).map');fs.writeFileSync(file,source);
}
