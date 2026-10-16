import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightLeft, Banknote, CalendarPlus, ChevronRight, DoorOpen, FileText, LogIn, LogOut, Pencil, ReceiptText, UsersRound, X, Check, type LucideIcon } from 'lucide-react';
import type { Room, RoomStatus } from '../types';
import { STATUS_PALETTE, roomStatusKey } from '../lib/status-palette';
import styles from './ContextMenu.module.css';

type DocumentKind = 'sales' | 'reservation' | 'cancellation' | 'rental' | 'sale_contract';
type MenuTab = 'operations' | 'status' | 'documents';
interface ContextMenuProps {
  room: Room; saleLabel: string; saleDisabled: boolean; canCheckOut: boolean; canExchange: boolean;
  canReserve: boolean; allowedStatuses: RoomStatus[]; operationalStatus: string; guestName?: string;
  bookingHint?: string; onEditBooking?: () => void; onDetails?: () => void;
  onPayment?: () => void; initialTab?: MenuTab;
  onClose: () => void; onOperation: (type: 'reserve' | 'sale' | 'checkout' | 'exchange') => void;
  renderStatus: (onBusyChange: (busy: boolean) => void) => React.ReactNode; onCancel?: () => void;
  onGuests?: () => void; hasBooking: boolean; onPrint: (type: DocumentKind) => void;
}
export function ContextMenu(props: ContextMenuProps) {
  const { room, onClose } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const resolveTab = (tab: MenuTab): MenuTab => {
    if (tab === 'status' && !props.allowedStatuses.length) return 'operations';
    if (tab === 'documents' && !props.hasBooking) return 'operations';
    return tab;
  };
  const [tab, setTab] = useState<MenuTab>(() => resolveTab(props.initialTab ?? 'operations'));
  const [busy, setBusy] = useState(false);
  const condition = STATUS_PALETTE[roomStatusKey(props.operationalStatus)];
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; if (!document.querySelector('dialog[open]')) previous?.focus({preventScroll:true}); };
  }, []);
  const act = (callback: () => void) => { dialog.current?.close(); onClose(); callback(); };
  return createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
    onCancel={event=>{event.preventDefault();if(!busy&&!dialog.current?.querySelector('[aria-expanded="true"]'))onClose();}}
    onClick={event=>{const r=event.currentTarget.getBoundingClientRect();if(!busy&&event.target===event.currentTarget&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))onClose();}}>
    <header className={styles.header}>
      <span className={styles.roomIcon}><DoorOpen size={24} strokeWidth={1.8} aria-hidden="true"/></span>
      <div className={styles.heading}><p>Oda işlemleri</p><h2 id={titleId}>Oda {room.number}</h2><span>{props.guestName || room.name || 'Aktif konaklama yok'}</span></div>
      <button type="button" autoFocus disabled={busy} className={`nav-icon-button ${styles.close}`} aria-label="Oda işlemlerini kapat" onClick={onClose}><X size={20}/></button>
    </header>
    <div className={styles.summary}><span style={{color:condition.text}}><i style={{background:condition.accent}}/>{condition.label}</span>{props.bookingHint && <p>{props.bookingHint}</p>}</div>
    <nav className={styles.tabs} aria-label="Oda işlem bölümleri">
      <button type="button" disabled={busy} aria-pressed={tab==='operations'} onClick={()=>setTab('operations')}>İşlemler</button>
      {!!props.allowedStatuses.length && <button type="button" disabled={busy} aria-pressed={tab==='status'} onClick={()=>setTab('status')}>Oda durumu</button>}
      {props.hasBooking && <button type="button" disabled={busy} aria-pressed={tab==='documents'} onClick={()=>setTab('documents')}>Belgeler</button>}
    </nav>
    <div className={styles.content}>
      {tab==='operations' && <>
        <section className={styles.group} aria-label="Konaklama işlemleri">
          {props.onDetails && <Action icon={ReceiptText} label="Rezervasyon detayı" detail="Misafirler, folyo ve hizmetler" onClick={()=>act(props.onDetails!)}/>}
          {props.onPayment && <Action icon={Banknote} label="Tahsilat al" detail="Oda borcuna ödeme işle" onClick={()=>act(props.onPayment!)}/>}
          {props.canReserve && <Action icon={CalendarPlus} label="Rezerve Et" detail="Bu oda için yeni rezervasyon" onClick={()=>act(()=>props.onOperation('reserve'))}/>}
          {!props.saleDisabled && <Action icon={props.canCheckOut?FileText:LogIn} label={props.saleLabel} onClick={()=>act(()=>props.onOperation('sale'))}/>}
          {props.canCheckOut && <Action icon={LogOut} label="Çıkış İşlemleri" onClick={()=>act(()=>props.onOperation('checkout'))}/>}
          {props.canExchange && <Action icon={ArrowRightLeft} label="Oda Değiştir" onClick={()=>act(()=>props.onOperation('exchange'))}/>}
          {props.onEditBooking && <Action icon={Pencil} label="Rezervasyon tarihlerini düzenle" onClick={()=>act(props.onEditBooking!)}/>}
          {props.onGuests && <Action icon={UsersRound} label="Misafirleri Düzenle" onClick={()=>act(props.onGuests!)}/>}
        </section>
        {props.onCancel && <section className={styles.group} aria-label="Diğer işlemler">
          {props.onCancel && <Action icon={X} label="Rezervasyonu İptal Et" danger onClick={()=>act(props.onCancel!)}/>}
        </section>}
      </>}
      {tab==='status' && props.renderStatus(setBusy)}
      {tab==='documents' && <section className={styles.group} aria-label="Konaklama belgeleri">
        {([['reservation','Rezervasyon Dekontu'],['sales','Satış Dekontu'],['cancellation','İptal Dekontu'],['rental','Kira Sözleşmesi'],['sale_contract','Satış Sözleşmesi']] as [DocumentKind,string][]).map(([kind,label])=><Action key={kind} icon={FileText} label={label} onClick={()=>act(()=>props.onPrint(kind))}/>)}
      </section>}
    </div>
  </dialog>, document.body);
}
function Action({icon:Icon,label,detail,onClick,danger,selected,color}:{icon:LucideIcon;label:string;detail?:string;onClick:()=>void;danger?:boolean;selected?:boolean;color?:string}) {
  return <button type="button" className={`uni-control ${styles.action}`} data-danger={danger||undefined} onClick={onClick} aria-current={selected?'true':undefined}>
    <span className={styles.actionIcon} style={color?{color}:undefined}><Icon size={19} strokeWidth={1.8} aria-hidden="true"/></span>
    <span className={styles.actionLabel}><strong>{label}</strong>{detail&&<small>{detail}</small>}</span>
    {selected?<Check size={17} aria-label="Mevcut durum"/>:<ChevronRight size={15} className={styles.chevron} aria-hidden="true"/>}
  </button>;
}
