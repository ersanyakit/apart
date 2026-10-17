const assert=require('node:assert/strict');
const {test,after}=require('node:test');
const {execFileSync}=require('node:child_process');
const {mkdtempSync,rmSync,mkdirSync,copyFileSync}=require('node:fs');
const path=require('node:path'),os=require('node:os');
const ui=path.resolve(__dirname,'..'),out=mkdtempSync(path.join(os.tmpdir(),'otel-kanban-'));
after(()=>rmSync(out,{recursive:true,force:true}));
execFileSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--skipLibCheck','--strict','--esModuleInterop','--resolveJsonModule','--jsx','react-jsx','--outDir',out,'src/components/kanban/KanbanView.tsx','src/components/OriginalShell.tsx','src/lib/audit-presentation.ts','node_modules/next/types/global.d.ts'],{cwd:ui,stdio:'pipe'});
process.env.NODE_PATH=path.join(ui,'node_modules');require('node:module').Module._initPaths();
mkdirSync(path.join(out,'components/kanban'),{recursive:true});copyFileSync(path.join(ui,'src/components/kanban/KanbanView.module.css'),path.join(out,'components/kanban/KanbanView.module.css'));for(const css of ['ContextMenu.module.css','RoomOperationDialog.module.css'])copyFileSync(path.join(ui,'src/components',css),path.join(out,'components',css));
require.extensions['.css']=(module)=>{module.exports={}};
const React=require('react'),{renderToStaticMarkup:render}=require('react-dom/server');
const {KanbanView,NoteCard}=require(path.join(out,'components/kanban/KanbanView.js'));
const {OriginalShell}=require(path.join(out,'components/OriginalShell.js'));
const {COLUMNS,noteInput}=require(path.join(out,'components/kanban/model.js'));
const {NotificationProvider}=require(path.join(out,'components/Toast.js'));
const {UserPreferencesProvider}=require(path.join(out,'components/UserPreferences.js'));
const {auditChanges,auditEntities,auditSummary}=require(path.join(out,'lib/audit-presentation.js'));
const snapshot={hotel_id:'h',branch_id:'b',user:{user_id:'u',role:'reception',displayname:'Ayşe',username:'ayse'},hotels:[],branches:[],rooms:[],bookings:[],feature_registry:{categories:[],definitions:[]}};
const wrap=c=>React.createElement(NotificationProvider,null,c);
const note={id:'n',hotel_id:'h',branch_id:'b',title:'204 geç çıkış',body:'Saat 14.00 için görüşülecek.\nİkinci not.',status:'todo',priority:'urgent',archived:false,version:2,created_by:'u',created_by_name:'Ayşe',updated_by:'u2',updated_by_name:'Can',created_at:'2026-10-14T08:00:00Z',updated_at:'2026-10-14T09:00:00Z'};
const capture=(Component,props)=>{let result;const Host=()=>{result=Component(props);return result;};render(React.createElement(Host));return result;};
const nodes=n=>n&&typeof n==='object'?[n,...React.Children.toArray(n.props?.children).flatMap(nodes)]:[];
test('board uses three clear columns, shared collapsible header, search and archive switch',()=>{
 const html=render(wrap(React.createElement(KanbanView,{snapshot})));
 for(const text of ['Resepsiyon Notları','Yapılacak','Devam ediyor','Tamamlandı','Yeni not','Notlarda ara','Arşivdeki notları göster'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/<h2/g)||[]).length,1);assert.ok(html.includes('role="switch"'));
 const collapsed=render(wrap(React.createElement(UserPreferencesProvider,{initial:{'header.kanban':true}},React.createElement(KanbanView,{snapshot}))));assert.ok(collapsed.includes('class="page-header-details" hidden=""'));assert.ok(collapsed.includes('Resepsiyon Kanban panosu'));
 const denied=render(React.createElement(KanbanView,{snapshot:{...snapshot,user:{...snapshot.user,role:'housekeeping'}}}));assert.ok(!denied.includes('Yeni not'));assert.ok(denied.includes('yalnızca'));
});
test('note cards have author history and keyboard/touch controls besides dragging',()=>{
 let opened=false,moved='',archived=false,dragged=false;
 const props={note,disabled:false,onOpen(){opened=true},onMove:s=>moved=s,onArchive(){archived=true},onDrag(){dragged=true},onDragEnd(){}};
 const tree=capture(NoteCard,props),all=nodes(tree),html=render(tree);
 for(const text of ['204 geç çıkış','Ayşe','Can','Son işlem','Acil'])assert.ok(html.includes(text));assert.ok(html.includes('draggable="true"'));
 all.find(n=>n.type==='button'&&n.props['aria-label'].endsWith('notu aç')).props.onClick();assert.ok(opened);
 all.find(n=>n.props.ariaLabel==='204 geç çıkış: durum').props.onChange('doing');assert.equal(moved,'doing');
 all.find(n=>n.type==='button'&&n.props['aria-label'].endsWith('arşive taşı')).props.onClick();assert.ok(archived);
 tree.props.onDragStart({dataTransfer:{setData(type,id){assert.equal(type,'application/x-hotel-note');assert.equal(id,'n')}}});assert.ok(dragged);
 const locked=capture(NoteCard,{...props,disabled:true});assert.equal(locked.props.draggable,false);assert.ok(nodes(locked).find(n=>n.type==='fieldset').props.disabled);
 assert.ok(render(React.createElement(NoteCard,{...props,note:{...note,archived:true}})).includes('arşivden geri al'));
 const input=noteInput(note);assert.equal(input.version,2);assert.ok(!('created_by' in input));assert.ok(!('updated_by_name' in input));assert.deepEqual(COLUMNS.map(c=>c.value),['todo','doing','done']);
});
test('header exposes notes shortcuts and the operation menu for reception staff',()=>{
 let active='';const tree=OriginalShell;const props={snapshot,activeTab:'kanban',setActiveTab:v=>active=v,openTabs:['board','kanban'],onCloseTab(){},onSelection(){},onLogout(){},at:'2026-10-14T08:00:00Z',onDate(){},children:null};
 const html=render(React.createElement(tree,props));assert.ok(html.includes('Resepsiyon Notları'));assert.equal((html.match(/aria-label="Bildirimler: resepsiyon notlarını aç"/g)||[]).length,2);for(const button of html.match(/<button[^>]*aria-label="Bildirimler: resepsiyon notlarını aç"[\s\S]*?<\/button>/g)||[])assert.ok(!button.includes('bg-red-500'));
 const denied=render(React.createElement(tree,{...props,snapshot:{...snapshot,user:{...snapshot.user,role:'housekeeping'}},activeTab:'board',openTabs:['board']}));assert.ok(!denied.includes('title="Resepsiyon Notları"'));assert.ok(denied.includes('disabled=""'));

});
test('note audit entries are readable without raw JSON',()=>{
 const entry={entity:'reception_notes',action:'archive',details:{before:{title:'Vardiya',body:'Eski',status:'todo',archived:false},after:{title:'Vardiya',body:'Yeni',status:'done',archived:true}}};
 assert.equal(auditEntities.reception_notes,'Resepsiyon notu');assert.equal(auditSummary(entry),'Vardiya · Arşive taşındı');const changes=auditChanges(entry);assert.ok(changes.some(c=>c.key==='status'&&c.after==='Tamamlandı'));assert.ok(changes.some(c=>c.label==='Not metni'));
});
