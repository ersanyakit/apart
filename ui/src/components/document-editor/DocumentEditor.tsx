"use client";
import { useI18n } from "../I18n";

import React,{useEffect,useRef,useState} from 'react';
import {createEditor,$getRoot,$getSelection,$setSelection,$isRangeSelection,$createParagraphNode,$createTextNode,FORMAT_TEXT_COMMAND,FORMAT_ELEMENT_COMMAND,UNDO_COMMAND,REDO_COMMAND,CAN_UNDO_COMMAND,CAN_REDO_COMMAND,COMMAND_PRIORITY_LOW,type LexicalEditor,type BaseSelection} from 'lexical';
import {HeadingNode,QuoteNode,registerRichText,$createHeadingNode} from '@lexical/rich-text';
import {ListNode,ListItemNode,registerList,INSERT_ORDERED_LIST_COMMAND,INSERT_UNORDERED_LIST_COMMAND} from '@lexical/list';
import {TableNode,TableRowNode,TableCellNode,registerTablePlugin,registerTableSelectionObserver,INSERT_TABLE_COMMAND} from '@lexical/table';
import {$generateHtmlFromNodes,$generateNodesFromDOM} from '@lexical/html';
import {$setBlocksType} from '@lexical/selection';
import {createEmptyHistoryState,registerHistory} from '@lexical/history';
import {Bold,Italic,Underline,Undo2,Redo2,List,ListOrdered,AlignLeft,AlignCenter,AlignRight,Table2} from 'lucide-react';
import {InlineSelectField} from '../fields';
import {sanitizeMarkup} from './markup';
import styles from './DocumentEditor.module.css';

export function DocumentEditor({value,onChange,fields={},language='TR',label='Belge metni',disabled=false}:{value:string;onChange:(html:string)=>void;fields?:Record<string,string>;language?:string;label?:string;disabled?:boolean}){
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const root=useRef<HTMLDivElement>(null),editorRef=useRef<LexicalEditor|null>(null),selection=useRef<BaseSelection|null>(null);
 const latest=useRef({value,onChange,disabled});latest.current={value,onChange,disabled};
 const lastHTML=useRef(value),[format,setFormat]=useState({bold:false,italic:false,underline:false}),[undo,setUndo]=useState(false),[redo,setRedo]=useState(false),[words,setWords]=useState(0),[error,setError]=useState('');
 useEffect(()=>{
  const editor=createEditor({namespace:'OtelDocumentEditor',nodes:[HeadingNode,QuoteNode,ListNode,ListItemNode,TableNode,TableRowNode,TableCellNode],theme:{text:{bold:styles.bold,italic:styles.italic,underline:styles.underline,strikethrough:styles.strike,underlineStrikethrough:styles.underlineStrike}},onError:()=>setError(_uiText("Metin düzenlenemedi. İçeriğinizi kontrol edip tekrar deneyin.")),editable:!latest.current.disabled});
  editorRef.current=editor;editor.setRootElement(root.current);
  const cleanup=[registerRichText(editor),registerList(editor),registerTablePlugin(editor),registerTableSelectionObserver(editor),registerHistory(editor,createEmptyHistoryState(),300),editor.registerCommand(CAN_UNDO_COMMAND,v=>{setUndo(v);return false},COMMAND_PRIORITY_LOW),editor.registerCommand(CAN_REDO_COMMAND,v=>{setRedo(v);return false},COMMAND_PRIORITY_LOW)];
  cleanup.push(editor.registerUpdateListener(({editorState,dirtyElements,dirtyLeaves,tags})=>editorState.read(()=>{
   const current=$getSelection();if(current)selection.current=current.clone();
   if($isRangeSelection(current))setFormat({bold:current.hasFormat('bold'),italic:current.hasFormat('italic'),underline:current.hasFormat('underline')});
   const text=$getRoot().getTextContent().trim();setWords(text?text.split(/\s+/).length:0);
   if(tags.has('external')||(!dirtyElements.size&&!dirtyLeaves.size))return;
   const html=sanitizeMarkup($generateHtmlFromNodes(editor));lastHTML.current=html;latest.current.onChange(html);
  })));
  editor.update(()=>{const r=$getRoot();r.clear();const nodes=$generateNodesFromDOM(editor,new DOMParser().parseFromString(sanitizeMarkup(latest.current.value),'text/html'));if(nodes.length)r.append(...nodes);else r.append($createParagraphNode());},{tag:'external'});
  return()=>{cleanup.forEach(fn=>fn());editor.setRootElement(null);editorRef.current=null};
 },[]);
 useEffect(()=>{const e=editorRef.current;if(!e||value===lastHTML.current)return;lastHTML.current=value;selection.current=null;e.update(()=>{const r=$getRoot();r.clear();const nodes=$generateNodesFromDOM(e,new DOMParser().parseFromString(sanitizeMarkup(value),'text/html'));if(nodes.length)r.append(...nodes);else r.append($createParagraphNode());},{tag:'external'});},[value]);
 useEffect(()=>{editorRef.current?.setEditable(!disabled)},[disabled]);
 const act=(fn:(e:LexicalEditor)=>void)=>{const e=editorRef.current;if(!e||disabled)return;e.update(()=>{if(selection.current)$setSelection(selection.current.clone());else $getRoot().selectEnd();fn(e)});e.focus()};
 const tool=(title:string,icon:React.ReactNode,fn:(e:LexicalEditor)=>void,pressed?:boolean,off=false)=><button key={title} type="button" className={styles.tool} title={title} aria-label={title} aria-pressed={pressed} disabled={disabled||off} onMouseDown={e=>e.preventDefault()} onClick={()=>act(fn)}>{icon}</button>;
 return <section className={styles.editor} aria-label={label}>
  <div className={styles.toolbar} role="toolbar" aria-label={_uiText("Metin biçimlendirme")}>
   {tool('Geri al',<Undo2 size={17}/>,e=>e.dispatchCommand(UNDO_COMMAND,undefined),undefined,!undo)}
   {tool('Yinele',<Redo2 size={17}/>,e=>e.dispatchCommand(REDO_COMMAND,undefined),undefined,!redo)}
   <span className={styles.separator}/>
   {tool('Normal metin',<>{_uiText("Metin")}</>,()=>{$setBlocksType($getSelection(),()=>$createParagraphNode())})}
   {tool('Başlık',<>{_uiText("H2")}</>,()=>{$setBlocksType($getSelection(),()=>$createHeadingNode('h2'))})}
   {tool('Alt başlık',<>{_uiText("H3")}</>,()=>{$setBlocksType($getSelection(),()=>$createHeadingNode('h3'))})}
   {tool('Kalın',<Bold size={17}/>,e=>e.dispatchCommand(FORMAT_TEXT_COMMAND,'bold'),format.bold)}
   {tool('İtalik',<Italic size={17}/>,e=>e.dispatchCommand(FORMAT_TEXT_COMMAND,'italic'),format.italic)}
   {tool('Altı çizili',<Underline size={17}/>,e=>e.dispatchCommand(FORMAT_TEXT_COMMAND,'underline'),format.underline)}
   {tool('Madde listesi',<List size={17}/>,e=>e.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND,undefined))}
   {tool('Numaralı liste',<ListOrdered size={17}/>,e=>e.dispatchCommand(INSERT_ORDERED_LIST_COMMAND,undefined))}
   {tool('Sola hizala',<AlignLeft size={17}/>,e=>e.dispatchCommand(FORMAT_ELEMENT_COMMAND,'left'))}
   {tool('Ortala',<AlignCenter size={17}/>,e=>e.dispatchCommand(FORMAT_ELEMENT_COMMAND,'center'))}
   {tool('Sağa hizala',<AlignRight size={17}/>,e=>e.dispatchCommand(FORMAT_ELEMENT_COMMAND,'right'))}
   {tool('Tablo ekle (3 satır, 2 sütun)',<Table2 size={17}/>,e=>e.dispatchCommand(INSERT_TABLE_COMMAND,{rows:'3',columns:'2',includeHeaders:true}))}
   {Object.keys(fields).length>0&&<div className={styles.fields}><InlineSelectField label={_uiText("Otomatik bilgi ekle")} value="" disabled={disabled} options={[{value:'',label:_uiText("Alan seçin…")},...Object.entries(fields).map(([value,label])=>({value,label}))]} onChange={key=>{if(key)act(()=>{const s=$getSelection();if($isRangeSelection(s))s.insertNodes([$createTextNode(`{{${key}}}`)])})}}/></div>}
  </div>
  {error&&<p role="alert" className="p-3 text-red-600 text-sm">{error}</p>}
  <div ref={root} contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label} aria-disabled={disabled} spellCheck lang={language.toLowerCase()} dir={language==='AR'?"rtl":"ltr"} className={styles.body}/>
  <div className={styles.footer}><span>{words} {_uiText("kelime")}</span><span>{Object.keys(fields).length?_uiText("Eklediğiniz bilgi alanları belge oluşturulurken otomatik doldurulur."):_uiText("Metni ve biçimini burada düzenleyebilirsiniz.")}</span></div>
 </section>;
}
export function DocumentPreview({body,format,language='TR'}:{body:string;format?:string;language?:string}){
  const {m: _uiText, locale: _uiLocale} = useI18n();

 const [safe,setSafe]=useState('');useEffect(()=>setSafe(format==='html'?sanitizeMarkup(body):''),[body,format]);
 return <div className={styles.preview} lang={language.toLowerCase()} dir={language==='AR'?"rtl":"ltr"}>{format==='html'?<div dangerouslySetInnerHTML={{__html:safe}}/>:<div className="whitespace-pre-wrap">{body}</div>}</div>;
}
