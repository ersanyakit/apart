import ts from '../../ui/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
const targets={
 'GuestView.tsx':{date:1},'reports/CustomerDetail.tsx':{date:1,assessmentDate:1},
 'GuestHistoryModal.tsx':{dayFmt:1,shortDay:1},'GuestAssessment.tsx':{assessmentDate:1},
 'CheckoutFolio.tsx':{date:1,money:2},'kanban/KanbanView.tsx':{noteDate:1},
};
for(const [name,calls]of Object.entries(targets)){
 const file=`ui/src/components/${name}`,source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
 function visit(n){
  if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&calls[n.expression.text]===n.arguments.length){
   let scope=n.parent;while(scope&&!ts.isFunctionDeclaration(scope))scope=scope.parent;
   if(scope?.body?.getText(ast).includes('_uiLocale'))edits.push([n.arguments.end,', _uiLocale']);
  }
  ts.forEachChild(n,visit);
 }
 visit(ast);let result=source;
 for(const [position,value]of edits.sort((a,b)=>b[0]-a[0]))result=result.slice(0,position)+value+result.slice(position);
 if(edits.length)fs.writeFileSync(file,result);
 console.log(name,edits.length);
}
