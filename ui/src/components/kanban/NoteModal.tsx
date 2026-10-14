"use client";
import React,{useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {StickyNote,X} from 'lucide-react';
import {buttonStyle,secondaryStyle} from '../FormKit';
import styles from './KanbanView.module.css';

/** Native modal keeps keyboard focus and background interaction inside the note. */
export function NoteModal({title,busy,dirty,onClose,children}:{title:string;busy:boolean;dirty:boolean;onClose:()=>void;children:(requestClose:()=>void)=>React.ReactNode}) {
 const [mounted,setMounted]=useState(false),[discard,setDiscard]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),keepEditing=useRef<HTMLButtonElement>(null);
 const titleId=useId();
 useEffect(()=>setMounted(true),[]);
 useEffect(()=>{
  if(!mounted)return;
  const element=dialog.current!;
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  element.showModal();
  document.body.style.overflow='hidden';
  element.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true});
  return()=>{element.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus({preventScroll:true})};
 },[mounted]);
 useEffect(()=>{if(discard)keepEditing.current?.focus({preventScroll:true});else if(mounted)dialog.current?.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true})},[discard,mounted]);
 const close=()=>{if(busy)return;if(dirty)setDiscard(true);else onClose()};
 if(!mounted)return null;
 return createPortal(<dialog ref={dialog} className={styles.modal} aria-modal="true" aria-labelledby={titleId}
  onCancel={event=>{event.preventDefault();if(discard)setDiscard(false);else close()}}>
  <div className={styles.scrim} aria-hidden="true" onClick={close}/>
  <section className={styles.modalPanel}>
   <header className={styles.modalHeader}><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-uni-surface)]"><StickyNote size={20} aria-hidden="true"/></span><h2 id={titleId}>{discard?'Değişiklikler kaydedilmedi':title}</h2></div><button type="button" className="nav-icon-button" aria-label="Not penceresini kapat" disabled={busy} onClick={close}><X size={20}/></button></header>
   <div className={styles.modalBody}>
    {discard?<div className="space-y-5"><p className="text-sm leading-6 text-uni-muted">Pencereyi kapatırsanız yazdığınız değişiklikler kaybolacak.</p><div className={styles.actions}><button ref={keepEditing} type="button" className={secondaryStyle} onClick={()=>setDiscard(false)}>Düzenlemeye devam et</button><button type="button" className={buttonStyle} onClick={onClose}>Değişikliklerden vazgeç</button></div></div>:children(close)}
   </div>
  </section>
 </dialog>,document.body);
}
