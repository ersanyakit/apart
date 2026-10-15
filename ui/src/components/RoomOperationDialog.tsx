import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, type LucideIcon } from 'lucide-react';
import menu from './ContextMenu.module.css';
import styles from './RoomOperationDialog.module.css';

/** Room-operation shell shares the context menu's surface, backdrop and responsive behavior. */
export function RoomOperationDialog({title, subtitle, icon: Icon, busy = false, onClose, children}: {
  title: string; subtitle?: string; icon: LucideIcon; busy?: boolean; onClose: () => void; children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null), id = useId();
  useEffect(() => {
    const el=dialog.current!, previous=document.activeElement as HTMLElement | null;
    const overflow=document.body.style.overflow;
    el.showModal();document.body.style.overflow='hidden';
    return()=>{el.close();document.body.style.overflow=overflow;if(previous?.isConnected&&!document.querySelector('dialog[open]'))previous.focus({preventScroll:true});};
  },[]);
  return createPortal(<dialog ref={dialog} className={`${menu.dialog} ${styles.dialog}`} aria-labelledby={id} aria-busy={busy} onCancel={event=>{
    event.preventDefault();
    if(!busy&&!dialog.current?.querySelector('[aria-expanded="true"]'))onClose();
  }}>
    <header className={menu.header}>
      <span className={menu.roomIcon}><Icon size={24} strokeWidth={1.8} aria-hidden="true"/></span>
      <div className={menu.heading}><p>Oda ve konaklama işlemleri</p><h2 id={id}>{title}</h2>{subtitle&&<span>{subtitle}</span>}</div>
      <button type="button" autoFocus disabled={busy} className={`nav-icon-button ${menu.close}`} aria-label="Pencereyi kapat" onClick={onClose}><X size={20}/></button>
    </header>
    <div className={`${menu.content} ${styles.content}`}>{children}</div>
  </dialog>,document.body);
}
